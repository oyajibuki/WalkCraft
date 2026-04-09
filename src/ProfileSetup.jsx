import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

export default function ProfileSetup({ authUser, onSave }) {
  const [displayName, setDisplayName] = useState(
    authUser.user_metadata?.name ?? authUser.user_metadata?.full_name ?? ''
  );
  const [imgSrc, setImgSrc] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const imgObjRef = useRef(null);

  // 画像が変わったら読み込み
  useEffect(() => {
    if (!imgSrc) return;
    setImgLoaded(false);
    const img = new Image();
    img.onload = () => {
      imgObjRef.current = img;
      setImgLoaded(true);
    };
    img.src = imgSrc;
  }, [imgSrc]);

  // zoom/rotate変更時に再描画
  useEffect(() => {
    if (imgLoaded && imgObjRef.current) draw(imgObjRef.current);
  }, [zoom, rotation, imgLoaded]);

  const draw = (img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 240;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, size, size);

    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const base = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    ctx.scale(base * zoom, base * zoom);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      imgObjRef.current = null;
      setImgLoaded(false);
      setZoom(1);
      setRotation(0);
      setImgSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      let avatarUrl = authUser.user_metadata?.avatar_url ?? '';

      // カスタム写真があればStorageにアップロード
      if (canvasRef.current && imgLoaded) {
        const blob = await new Promise((resolve) =>
          canvasRef.current.toBlob(resolve, 'image/jpeg', 0.85)
        );
        const path = `${authUser.id}.jpg`;
        await supabase.storage.from('avatars').upload(path, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      await supabase.from('profiles').upsert({
        id: authUser.id,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

      onSave({ display_name: displayName.trim(), avatar_url: avatarUrl });
    } finally {
      setSaving(false);
    }
  };

  const socialAvatar = authUser.user_metadata?.avatar_url;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 p-6 overflow-y-auto">
      <div className="text-center mb-6 pt-4">
        <div className="text-5xl mb-3">🗺️</div>
        <h2 className="text-2xl font-black text-white mb-1">プロフィール設定</h2>
        <p className="text-slate-400 text-sm">名前とアイコンを設定してください</p>
      </div>

      {/* アバター */}
      <div className="flex flex-col items-center mb-6">
        <div className="mb-4">
          {imgLoaded ? (
            <canvas
              ref={canvasRef}
              style={{ width: 120, height: 120, borderRadius: '50%', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-full bg-slate-700 flex items-center justify-center shadow-xl overflow-hidden border-4 border-slate-600">
              {socialAvatar
                ? <img src={socialAvatar} className="w-full h-full object-cover" alt="" />
                : <span className="text-5xl">🧑</span>
              }
            </div>
          )}
          {/* 隠しcanvas（imgLoadedでない時も描画用に保持） */}
          {!imgLoaded && <canvas ref={canvasRef} className="hidden" />}
        </div>

        <label className="py-2 px-5 bg-white/10 border border-white/20 rounded-full text-sm font-bold text-white cursor-pointer active:scale-95 transition-transform">
          📷 写真を選ぶ
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>

        {imgLoaded && (
          <div className="w-full mt-4 space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10">
            {/* ズーム */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 w-10 shrink-0">拡大</span>
              <input
                type="range" min="1" max="3" step="0.05" value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-green-400"
              />
              <span className="text-xs text-slate-400 w-8 shrink-0">{zoom.toFixed(1)}x</span>
            </div>
            {/* 回転 */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 w-10 shrink-0">回転</span>
              <div className="flex gap-2 flex-1">
                <button onClick={() => setRotation((r) => r - 90)}
                  className="flex-1 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-bold text-white active:scale-95 transition-transform">
                  ↺ 90°
                </button>
                <button onClick={() => setRotation((r) => r + 90)}
                  className="flex-1 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-bold text-white active:scale-95 transition-transform">
                  ↻ 90°
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 名前 */}
      <div className="mb-8">
        <label className="text-sm font-bold text-slate-300 mb-2 block">表示名</label>
        <input
          type="text"
          placeholder="名前を入力..."
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={20}
          className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-2xl text-white font-bold placeholder-slate-500 focus:outline-none focus:border-green-400 transition-colors"
        />
        <p className="text-xs text-slate-500 mt-1 text-right">{displayName.length}/20</p>
      </div>

      <button
        onClick={handleSave}
        disabled={!displayName.trim() || saving}
        className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-40"
      >
        {saving ? '保存中...' : '🎮 ゲームを始める'}
      </button>
    </div>
  );
}
