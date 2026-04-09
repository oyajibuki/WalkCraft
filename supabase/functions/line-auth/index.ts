import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!;
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://oyajibuki.github.io/WalkCraft/';

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/line-auth`;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return Response.redirect(`${APP_URL}?error=line_cancelled`, 302);
  }

  try {
    // 1. LINEのcodeをtokenに交換
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(`LINE token error: ${JSON.stringify(tokenData)}`);
    }

    // 2. LINEプロフィール取得
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    const lineUserId: string = profile.userId;

    // 3. 既存ユーザーを検索 (決定論的メールで管理)
    const email = `line_${lineUserId}@walkcraft-line.internal`;

    // まず既存ユーザーをリストから探す
    let userId: string | undefined;
    let page = 1;
    outer: while (true) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      for (const u of data.users) {
        if (u.user_metadata?.line_user_id === lineUserId) {
          userId = u.id;
          break outer;
        }
      }
      if (data.users.length < 1000) break;
      page++;
    }

    // 4. いなければ新規作成
    if (!userId) {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          line_user_id: lineUserId,
          name: profile.displayName,
          avatar_url: profile.pictureUrl,
          provider: 'line',
        },
      });
      if (createErr) throw createErr;
      userId = newUser.user.id;
    } else {
      // アバター等を最新に更新
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          line_user_id: lineUserId,
          name: profile.displayName,
          avatar_url: profile.pictureUrl,
          provider: 'line',
        },
      });
    }

    // 5. マジックリンクでセッション発行 → アプリにリダイレクト
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: APP_URL },
    });
    if (linkErr) throw linkErr;

    // Supabaseのマジックリンクを経由してアプリに戻る
    return Response.redirect(linkData.properties.action_link, 302);

  } catch (err) {
    console.error('LINE auth error:', err);
    return Response.redirect(`${APP_URL}?error=line_auth_failed`, 302);
  }
});
