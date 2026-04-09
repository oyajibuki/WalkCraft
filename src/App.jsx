import React, { useState, useEffect, useRef } from 'react';
import { Home, Gift, Hammer, Coins, Sparkles, AlertCircle, ArrowRightLeft, MapPin, Footprints, Hand, ArrowDownCircle, Navigation, Building2, LogOut } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabase';
import ProfileSetup from './ProfileSetup';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- アイコン定義 ---
const currentPosIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.4)"></div>',
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
});
const waypointIcon = L.divIcon({
  html: '<div style="width:8px;height:8px;background:#94a3b8;border:2px solid white;border-radius:50%"></div>',
  className: '', iconSize: [8, 8], iconAnchor: [4, 4],
});
const exchangeIcon = L.divIcon({
  html: '<div style="font-size:22px;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.7));line-height:1">🔄</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
});

const getItemById = (id) => MATERIALS[id] || RECIPES.find(r => r.id === id);
const matIcon = (id) => {
  const item = getItemById(id);
  return L.divIcon({
    html: `<div style="font-size:22px;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6));line-height:1">${item?.icon ?? '❓'}</div>`,
    className: '', iconSize: [28, 28], iconAnchor: [14, 14],
  });
};

// --- データ定義 ---
const MATERIALS = {
  // Tier 1 — よく見つかる素材
  m1:  { id: 'm1',  name: '木の枝',       icon: '🪵', rarity: 1, price: 5   },
  m2:  { id: 'm2',  name: '石ころ',        icon: '🪨', rarity: 1, price: 5   },
  m3:  { id: 'm3',  name: 'きれいな水',    icon: '💧', rarity: 1, price: 5   },
  m5:  { id: 'm5',  name: '薬草',          icon: '🌿', rarity: 1, price: 5   },
  m6:  { id: 'm6',  name: '火打ち石',      icon: '🔥', rarity: 1, price: 8   },
  m16: { id: 'm16', name: 'ツタ',          icon: '🍃', rarity: 1, price: 5   },
  m17: { id: 'm17', name: '鳥の羽',        icon: '🪶', rarity: 1, price: 5   },
  m18: { id: 'm18', name: '謎のキノコ',    icon: '🍄', rarity: 1, price: 5   },
  m22: { id: 'm22', name: 'リンゴ',        icon: '🍎', rarity: 1, price: 5   },
  m25: { id: 'm25', name: '海草',          icon: '🌿', rarity: 1, price: 5   },
  m27: { id: 'm27', name: '竹',            icon: '🎋', rarity: 1, price: 5   },
  m31: { id: 'm31', name: 'バナナ',        icon: '🍌', rarity: 1, price: 5   },
  // Tier 2 — やや珍しい素材
  m4:  { id: 'm4',  name: '鉄鉱石',        icon: '🔩', rarity: 2, price: 15  },
  m8:  { id: 'm8',  name: '粘土',          icon: '🏺', rarity: 2, price: 10  },
  m9:  { id: 'm9',  name: '砂',            icon: '⏳', rarity: 2, price: 10  },
  m10: { id: 'm10', name: '石炭',          icon: '⬛', rarity: 2, price: 15  },
  m11: { id: 'm11', name: '銅鉱石',        icon: '🟤', rarity: 2, price: 15  },
  m12: { id: 'm12', name: 'ゴムの樹液',    icon: '🌰', rarity: 2, price: 15  },
  m21: { id: 'm21', name: 'クモの糸',      icon: '🕸️', rarity: 2, price: 10  },
  m23: { id: 'm23', name: 'ケモノ肉',      icon: '🍖', rarity: 2, price: 15  },
  m24: { id: 'm24', name: '貝殻',          icon: '🐚', rarity: 2, price: 10  },
  m26: { id: 'm26', name: '骨',            icon: '🦴', rarity: 2, price: 10  },
  m28: { id: 'm28', name: '綿花',          icon: '☁️', rarity: 2, price: 10  },
  m29: { id: 'm29', name: '麻',            icon: '🌾', rarity: 2, price: 10  },
  m30: { id: 'm30', name: 'ヤシの実',      icon: '🥥', rarity: 2, price: 15  },
  m32: { id: 'm32', name: '毒消し草',      icon: '🌱', rarity: 2, price: 10  },
  m33: { id: 'm33', name: '辛いトウガラシ',icon: '🌶️', rarity: 2, price: 15  },
  m34: { id: 'm34', name: 'ひんやりメロン',icon: '🍈', rarity: 2, price: 15  },
  m37: { id: 'm37', name: '獣の皮',        icon: '🟤', rarity: 2, price: 15  },
  // Tier 3 — レアな素材（探索ガチャで入手）
  m13: { id: 'm13', name: 'ハチミツ',      icon: '🍯', rarity: 3, price: 30  },
  m14: { id: 'm14', name: '原油',          icon: '🛢️', rarity: 3, price: 50  },
  m15: { id: 'm15', name: '水晶',          icon: '💎', rarity: 3, price: 50  },
  m19: { id: 'm19', name: '金鉱石',        icon: '🟡', rarity: 3, price: 80  },
  m35: { id: 'm35', name: 'ビリビリキノコ',icon: '⚡', rarity: 3, price: 30  },
  m38: { id: 'm38', name: 'サンゴ',        icon: '🪸', rarity: 3, price: 40  },
  m40: { id: 'm40', name: '銀鉱石',        icon: '⚪', rarity: 3, price: 60  },
  m45: { id: 'm45', name: '硫黄',          icon: '🟨', rarity: 3, price: 40  },
  m46: { id: 'm46', name: '硝石',          icon: '🧂', rarity: 3, price: 40  },
  m47: { id: 'm47', name: '鉛',            icon: '🪨', rarity: 3, price: 30  },
  m49: { id: 'm49', name: '蛍石',          icon: '❇️', rarity: 3, price: 50  },
  m51: { id: 'm51', name: '赤い砂',        icon: '🔴', rarity: 3, price: 50  },
  // Tier 4 — 超レア素材
  m7:  { id: 'm7',  name: '街の噂',        icon: '💬', rarity: 4, price: 50  },
  m20: { id: 'm20', name: '隕石の欠片',    icon: '☄️', rarity: 4, price: 200 },
  m36: { id: 'm36', name: 'マックスラディッシュ', icon: '🥕', rarity: 4, price: 80 },
  m39: { id: 'm39', name: '真珠',          icon: '⚪', rarity: 4, price: 100 },
  m41: { id: 'm41', name: 'ダイヤモンド',  icon: '💎', rarity: 4, price: 200 },
  m42: { id: 'm42', name: 'エメラルド',    icon: '💚', rarity: 4, price: 150 },
  m43: { id: 'm43', name: 'ルビー',        icon: '❤️', rarity: 4, price: 150 },
  m44: { id: 'm44', name: 'サファイア',    icon: '💙', rarity: 4, price: 150 },
  m48: { id: 'm48', name: 'タングステン',  icon: '🔩', rarity: 4, price: 100 },
  m52: { id: 'm52', name: '黒曜石',        icon: '⬛', rarity: 4, price: 100 },
  // Tier 5 — 超激レア素材
  m50: { id: 'm50', name: 'ウラン鉱石',    icon: '☢️', rarity: 5, price: 500 },
  // ── ガチャ限定素材（ga prefix） ──
  ga1:  { id: 'ga1',  name: '古代の歯車',        icon: '⚙️', rarity: 4, price: 150  },
  ga2:  { id: 'ga2',  name: '古代のコア',         icon: '👁️', rarity: 5, price: 300  },
  ga3:  { id: 'ga3',  name: 'マナの結晶',         icon: '🔮', rarity: 4, price: 150  },
  ga4:  { id: 'ga4',  name: 'ドラゴンの鱗',       icon: '🐉', rarity: 5, price: 500  },
  ga5:  { id: 'ga5',  name: '賢者の石の欠片',     icon: '🟥', rarity: 5, price: 500  },
  ga6:  { id: 'ga6',  name: '星の砂',             icon: '✨', rarity: 4, price: 150  },
  ga7:  { id: 'ga7',  name: '時空の砂',           icon: '⏳', rarity: 5, price: 300  },
  ga8:  { id: 'ga8',  name: '未知の合金',         icon: '🛸', rarity: 5, price: 300  },
  ga9:  { id: 'ga9',  name: '妖精の粉',           icon: '✨', rarity: 4, price: 150  },
  ga10: { id: 'ga10', name: 'レインボークリスタル',icon: '💎', rarity: 5, price: 1000 },
  ga11: { id: 'ga11', name: '黄金のチケットの切れ端', icon: '🎫', rarity: 4, price: 100 },
  ga12: { id: 'ga12', name: '名匠のハンマー',     icon: '🔨', rarity: 4, price: 150  },
  ga13: { id: 'ga13', name: '幸運のクローバー',   icon: '🍀', rarity: 4, price: 150  },
  ga14: { id: 'ga14', name: '謎の設計図',         icon: '📜', rarity: 5, price: 500  },
  // ── 地域限定素材（l prefix, 47都道府県） ──
  l1:  { id: 'l1',  name: '北海道メロン',       icon: '🍈', rarity: 4, price: 100 },
  l2:  { id: 'l2',  name: '青森りんご',         icon: '🍎', rarity: 4, price: 100 },
  l3:  { id: 'l3',  name: '南部鉄器の欠片',     icon: '🫖', rarity: 4, price: 100 },
  l4:  { id: 'l4',  name: '極上牛タン',         icon: '👅', rarity: 4, price: 100 },
  l5:  { id: 'l5',  name: 'なまはげの藁',       icon: '👹', rarity: 4, price: 100 },
  l6:  { id: 'l6',  name: 'さくらんぼ',         icon: '🍒', rarity: 4, price: 100 },
  l7:  { id: 'l7',  name: '桃',                 icon: '🍑', rarity: 4, price: 100 },
  l8:  { id: 'l8',  name: '納豆菌',             icon: '🦠', rarity: 4, price: 100 },
  l9:  { id: 'l9',  name: 'とちおとめ',         icon: '🍓', rarity: 4, price: 100 },
  l10: { id: 'l10', name: 'こんにゃく芋',       icon: '🥔', rarity: 4, price: 100 },
  l11: { id: 'l11', name: '草加せんべい',       icon: '🍘', rarity: 4, price: 100 },
  l12: { id: 'l12', name: '落花生',             icon: '🥜', rarity: 4, price: 100 },
  l13: { id: 'l13', name: 'ネオンの欠片',       icon: '🚥', rarity: 4, price: 100 },
  l14: { id: 'l14', name: 'しゅうまい',         icon: '🥟', rarity: 4, price: 100 },
  l15: { id: 'l15', name: 'コシヒカリ',         icon: '🍚', rarity: 4, price: 100 },
  l16: { id: 'l16', name: 'ホタルイカ',         icon: '🦑', rarity: 4, price: 100 },
  l17: { id: 'l17', name: '金箔',               icon: '✨', rarity: 4, price: 100 },
  l18: { id: 'l18', name: '恐竜の化石',         icon: '🦴', rarity: 4, price: 100 },
  l19: { id: 'l19', name: '甲州ぶどう',         icon: '🍇', rarity: 4, price: 100 },
  l20: { id: 'l20', name: '蕎麦の実',           icon: '🌾', rarity: 4, price: 100 },
  l21: { id: 'l21', name: 'さるぼぼの布',       icon: '👘', rarity: 4, price: 100 },
  l22: { id: 'l22', name: 'お茶の葉',           icon: '🍵', rarity: 4, price: 100 },
  l23: { id: 'l23', name: '八丁味噌',           icon: '🍲', rarity: 4, price: 100 },
  l24: { id: 'l24', name: '真珠貝',             icon: '🦪', rarity: 4, price: 100 },
  l25: { id: 'l25', name: '琵琶湖の水',         icon: '💧', rarity: 4, price: 100 },
  l26: { id: 'l26', name: '竹炭',               icon: '🎋', rarity: 4, price: 100 },
  l27: { id: 'l27', name: 'たこ焼き粉',         icon: '🐙', rarity: 4, price: 100 },
  l28: { id: 'l28', name: '神戸牛',             icon: '🥩', rarity: 4, price: 100 },
  l29: { id: 'l29', name: '鹿の角',             icon: '🦌', rarity: 4, price: 100 },
  l30: { id: 'l30', name: '紀州みかん',         icon: '🍊', rarity: 4, price: 100 },
  l31: { id: 'l31', name: '砂丘の砂',           icon: '🐫', rarity: 4, price: 100 },
  l32: { id: 'l32', name: '勾玉',               icon: '🪨', rarity: 4, price: 100 },
  l33: { id: 'l33', name: 'きびだんご',         icon: '🍡', rarity: 4, price: 100 },
  l34: { id: 'l34', name: 'もみじ饅頭',         icon: '🍁', rarity: 4, price: 100 },
  l35: { id: 'l35', name: 'ふぐのヒレ',         icon: '🐡', rarity: 4, price: 100 },
  l36: { id: 'l36', name: 'すだち',             icon: '🍋', rarity: 4, price: 100 },
  l37: { id: 'l37', name: 'コシのある小麦',     icon: '🌾', rarity: 4, price: 100 },
  l38: { id: 'l38', name: 'いよかん',           icon: '🍊', rarity: 4, price: 100 },
  l39: { id: 'l39', name: '鰹のタタキ',         icon: '🐟', rarity: 4, price: 100 },
  l40: { id: 'l40', name: '辛子明太子',         icon: '🌶️', rarity: 4, price: 100 },
  l41: { id: 'l41', name: '有田焼の欠片',       icon: '🏺', rarity: 4, price: 100 },
  l42: { id: 'l42', name: 'カステラ',           icon: '🍰', rarity: 4, price: 100 },
  l43: { id: 'l43', name: 'スイカ',             icon: '🍉', rarity: 4, price: 100 },
  l44: { id: 'l44', name: '温泉の素',           icon: '♨️', rarity: 4, price: 100 },
  l45: { id: 'l45', name: '完熟マンゴー',       icon: '🥭', rarity: 4, price: 100 },
  l46: { id: 'l46', name: '桜島の火山灰',       icon: '🌋', rarity: 4, price: 100 },
  l47: { id: 'l47', name: '琉球ガラス',         icon: '🥂', rarity: 4, price: 100 },
};
const RECIPES = [
  // ── 既存レシピ i1-i20（変更不可） ──
  // Tier 1（Lv1解放）サバイバル基本
  { id: 'i1',  name: '石の斧',          icon: '🪓', reqLevel: 1, materials: ['m1', 'm2'],   desc: '木を切るのに便利な斧。建築の基礎。',           price: 30   },
  { id: 'i2',  name: 'たいまつ',        icon: '🔦', reqLevel: 1, materials: ['m1', 'm6'],   desc: '暗い夜道を照らす。火打ち石で点火。',           price: 25   },
  { id: 'i3',  name: '弓',              icon: '🏹', reqLevel: 1, materials: ['m1', 'm16'],  desc: '遠くの敵を射る。ツタを弦にした手作り弓。',     price: 30   },
  { id: 'i4',  name: '矢',              icon: '🪃', reqLevel: 1, materials: ['m1', 'm17'],  desc: '弓の弾丸。鳥の羽で軌道が安定する。',           price: 15   },
  { id: 'i5',  name: '回復薬',          icon: '🧪', reqLevel: 1, materials: ['m5', 'm5'],   desc: '薬草を調合した回復薬。少し傷が癒える。',       price: 25   },
  // Tier 2（Lv2解放）鉄・建築
  { id: 'i6',  name: '鉄のインゴット',  icon: '🧱', reqLevel: 2, materials: ['m4', 'm10'],  desc: '石炭で鉄鉱石を精錬。鉄器時代の幕開け。',       price: 50   },
  { id: 'i7',  name: 'レンガ',          icon: '🏗️', reqLevel: 2, materials: ['m8', 'm10'],  desc: '粘土を石炭で焼いた丈夫な建築素材。',           price: 40   },
  { id: 'i8',  name: 'ガラス',          icon: '🪟', reqLevel: 2, materials: ['m9', 'm10'],  desc: '砂を高熱で溶かした透明な素材。',               price: 40   },
  { id: 'i9',  name: '鉄の剣',          icon: '🗡️', reqLevel: 2, materials: ['m4', 'm6'],   desc: '鉄鉱石と火打ち石で鍛えた剣。',                 price: 100  },
  { id: 'i10', name: '回復薬グレート',  icon: '💊', reqLevel: 2, materials: ['m5', 'm13'],  desc: '薬草にハチミツを加えた高性能回復薬。',         price: 80   },
  // Tier 3（Lv3解放）電気・工業
  { id: 'i11', name: '銅のインゴット',  icon: '🥉', reqLevel: 3, materials: ['m11', 'm10'], desc: '銅鉱石を精錬した電気伝導体。',                 price: 60   },
  { id: 'i12', name: '銅線',            icon: '🔌', reqLevel: 3, materials: ['m11', 'm12'], desc: '銅鉱石とゴムで作った電気の通り道。',           price: 80   },
  { id: 'i13', name: 'ランタン',        icon: '🏮', reqLevel: 3, materials: ['m8', 'm14'],  desc: '粘土の器に原油を注いだランタン。',             price: 70   },
  { id: 'i14', name: '爆薬',            icon: '💥', reqLevel: 3, materials: ['m18', 'm6'],  desc: '謎のキノコと火打ち石で作った危険な爆薬。',     price: 90   },
  { id: 'i15', name: '魔法の薬',        icon: '🔮', reqLevel: 3, materials: ['m15', 'm13'], desc: '水晶とハチミツが生む不思議な力の薬。',         price: 150  },
  // Tier 4（Lv4解放）精密・近代
  { id: 'i16', name: '金のインゴット',  icon: '🥇', reqLevel: 4, materials: ['m19', 'm10'], desc: '金鉱石を精錬した高価な金属。装飾や精密機器に。', price: 150 },
  { id: 'i17', name: '電球',            icon: '💡', reqLevel: 4, materials: ['m9', 'm15'],  desc: '砂のガラスと水晶のフィラメントで光る。',       price: 120  },
  { id: 'i18', name: 'プラスチック',    icon: '🧴', reqLevel: 4, materials: ['m14', 'm2'],  desc: '原油と石から生まれた現代の素材。',             price: 100  },
  { id: 'i19', name: '通信機',          icon: '📻', reqLevel: 4, materials: ['m7', 'm12'],  desc: '街の噂とゴムで作った謎の通信装置。',           price: 300  },
  { id: 'i20', name: 'ワールドコンパス',icon: '🧭', reqLevel: 4, materials: ['m20', 'm15'], desc: '隕石と水晶が示す、世界の中心への道。伝説の工芸品。', price: 1000 },
  // ── 中間素材レシピ r1-r12 ──
  { id: 'r1',  name: '木の板',          icon: '🪧', reqLevel: 1, materials: ['m1', 'm1'],   desc: '建築の基本素材',                               price: 15   },
  { id: 'r2',  name: '木炭',            icon: '⬛', reqLevel: 1, materials: ['m1', 'm6'],   desc: '木を焼いて作る燃料',                           price: 15   },
  { id: 'r3',  name: '布',              icon: '🧻', reqLevel: 2, materials: ['m28', 'm21'],  desc: '綿花とクモの糸',                               price: 30   },
  { id: 'r4',  name: '紙',              icon: '📄', reqLevel: 1, materials: ['m1', 'm3'],   desc: '木と水から作る記録媒体',                       price: 20   },
  { id: 'r5',  name: '硫酸',            icon: '⚗️', reqLevel: 3, materials: ['m45', 'm3'],   desc: '硫黄と水の危険な混合物',                       price: 60   },
  { id: 'r6',  name: '火薬',            icon: '🧨', reqLevel: 3, materials: ['m45', 'm46'],  desc: '爆発的なエネルギー',                           price: 70   },
  { id: 'r7',  name: '石鹸',            icon: '🧼', reqLevel: 2, materials: ['m24', 'm25'],  desc: '貝殻と海草の命の石',                           price: 40   },
  { id: 'r8',  name: '復活の液',        icon: '💧', reqLevel: 3, materials: ['m46', 'm13'],  desc: '硝石とハチミツの神秘',                         price: 80   },
  { id: 'r9',  name: 'サルファ薬',      icon: '💊', reqLevel: 3, materials: ['m45', 'm18'],  desc: '万能の抗生物質',                               price: 100  },
  { id: 'r10', name: '乾電池',          icon: '🔋', reqLevel: 3, materials: ['m47', 'm45'],  desc: '持ち運べる電力',                               price: 80   },
  { id: 'r11', name: '歯車',            icon: '⚙️', reqLevel: 2, materials: ['m4', 'm4'],    desc: '機械工学の基本',                               price: 60   },
  { id: 'r12', name: '真空管',          icon: '🪩', reqLevel: 3, materials: ['m9', 'm11'],   desc: '初期コンピュータの要',                         price: 100  },
  // ── 食料レシピ f1-f15 ──
  { id: 'f1',  name: '焼きリンゴ',      icon: '🍎', reqLevel: 1, materials: ['m22', 'm6'],   desc: '基本食料',                                     price: 20   },
  { id: 'f2',  name: '携帯食料',        icon: '🍖', reqLevel: 1, materials: ['m23', 'm6'],   desc: 'スタミナ回復',                                 price: 30   },
  { id: 'f3',  name: '解毒薬',          icon: '🧪', reqLevel: 1, materials: ['m32', 'm3'],   desc: '毒を治す',                                     price: 35   },
  { id: 'f4',  name: 'がんばり薬',      icon: '🧪', reqLevel: 2, materials: ['m18', 'm23'],  desc: '移動距離ボーナス',                             price: 50   },
  { id: 'f5',  name: 'ピリ辛肉料理',    icon: '🥩', reqLevel: 2, materials: ['m23', 'm33'],  desc: '寒冷地バフ',                                   price: 60   },
  { id: 'f6',  name: 'ひんやりフルーツ',icon: '🍧', reqLevel: 2, materials: ['m22', 'm34'],  desc: '猛暑バフ',                                     price: 60   },
  { id: 'f7',  name: 'ラーメン',        icon: '🍜', reqLevel: 2, materials: ['m29', 'm3'],   desc: '体力回復',                                     price: 40   },
  { id: 'f8',  name: 'コーラ',          icon: '🥤', reqLevel: 2, materials: ['m13', 'm3'],   desc: '清涼飲料水',                                   price: 35   },
  { id: 'f9',  name: '綿あめ',          icon: '☁️', reqLevel: 1, materials: ['m28', 'm1'],   desc: '甘くてふわふわ',                               price: 25   },
  { id: 'f10', name: 'マックス料理',    icon: '🍲', reqLevel: 4, materials: ['m23', 'm36'],  desc: '最大体力超過回復',                             price: 200  },
  { id: 'f11', name: '魔法のポーション',icon: '🔮', reqLevel: 4, materials: ['ga3', 'm3'],   desc: '全効率UP',                                     price: 300  },
  { id: 'f12', name: 'フリーズドライ',  icon: '🧊', reqLevel: 3, materials: ['m23', 'm47'],  desc: '長期保存食',                                   price: 80   },
  { id: 'f13', name: 'ヤシジュース',    icon: '🥥', reqLevel: 1, materials: ['m30', 'm3'],   desc: '南国の栄養補給',                               price: 30   },
  { id: 'f14', name: 'ハチミツ漬け',    icon: '🍯', reqLevel: 2, materials: ['m22', 'm13'],  desc: '長期保存の甘味',                               price: 50   },
  { id: 'f15', name: '海草スープ',      icon: '🌿', reqLevel: 1, materials: ['m25', 'm3'],   desc: '海の栄養素',                                   price: 25   },
  // ── 武器・道具レシピ w1-w15 ──
  { id: 'w1',  name: '木のピッケル',    icon: '⛏️', reqLevel: 1, materials: ['m1', 'm27'],   desc: '竹を使ったピッケル',                           price: 25   },
  { id: 'w2',  name: '石のピッケル',    icon: '⛏️', reqLevel: 1, materials: ['m27', 'm2'],   desc: '竹と石のピッケル',                             price: 30   },
  { id: 'w3',  name: '鉄のピッケル',    icon: '⛏️', reqLevel: 2, materials: ['m4', 'm16'],   desc: '採掘効率UP',                                   price: 80   },
  { id: 'w4',  name: 'ダイヤのピッケル',icon: '⛏️', reqLevel: 4, materials: ['m41', 'm1'],   desc: '最強のツルハシ',                               price: 500  },
  { id: 'w5',  name: 'ダイヤの剣',      icon: '🗡️', reqLevel: 4, materials: ['m41', 'm16'],  desc: 'マイクラ最強の剣',                             price: 600  },
  { id: 'w6',  name: '勇者の剣',        icon: '🗡️', reqLevel: 4, materials: ['ga2', 'm4'],   desc: '退魔の剣',                                     price: 800  },
  { id: 'w7',  name: '日本刀',          icon: '🗡️', reqLevel: 3, materials: ['m4', 'l26'],   desc: '鉄と竹炭で鍛えた刀',                           price: 400  },
  { id: 'w8',  name: '木の盾',          icon: '🛡️', reqLevel: 1, materials: ['m1', 'm37'],   desc: '獣の皮で補強した盾',                           price: 35   },
  { id: 'w9',  name: '鉄の盾',          icon: '🛡️', reqLevel: 2, materials: ['m4', 'm28'],   desc: '綿でパッドした鉄盾',                           price: 100  },
  { id: 'w10', name: '弓矢セット',      icon: '🏹', reqLevel: 2, materials: ['m27', 'm21'],  desc: '竹とクモの糸の弓',                             price: 60   },
  { id: 'w11', name: '炎の矢',          icon: '🔥', reqLevel: 3, materials: ['m6', 'm17'],   desc: '着弾すると燃える',                             price: 50   },
  { id: 'w12', name: '氷の矢',          icon: '❄️', reqLevel: 4, materials: ['m44', 'm17'],  desc: 'サファイアの矢',                               price: 120  },
  { id: 'w13', name: '雷の矢',          icon: '⚡', reqLevel: 4, materials: ['m35', 'm17'],  desc: 'ビリビリキノコの矢',                           price: 120  },
  { id: 'w14', name: 'バクダン',        icon: '💣', reqLevel: 3, materials: ['m8', 'm45'],   desc: '粘土と硫黄の爆弾',                             price: 150  },
  { id: 'w15', name: '魔法の杖',        icon: '🪄', reqLevel: 4, materials: ['m1', 'ga3'],   desc: 'マナの結晶の杖',                               price: 400  },
  // ── 建物・乗り物レシピ b1-b12 ──
  { id: 'b1',  name: '作業台',          icon: '🪚', reqLevel: 1, materials: ['m27', 'm28'],  desc: 'クラフトの基本設備',                           price: 30   },
  { id: 'b2',  name: 'かまど',          icon: '🧱', reqLevel: 1, materials: ['m2', 'm10'],   desc: '鉱石を精錬する炉',                             price: 40   },
  { id: 'b3',  name: 'チェスト',        icon: '🧰', reqLevel: 2, materials: ['m27', 'm4'],   desc: '収納が増える',                                 price: 60   },
  { id: 'b4',  name: 'ベッド',          icon: '🛏️', reqLevel: 2, materials: ['m1', 'm28'],   desc: 'リスポーン地点設定',                           price: 50   },
  { id: 'b5',  name: 'エンチャント台',  icon: '📖', reqLevel: 4, materials: ['m52', 'm41'],  desc: '装備に魔法付与',                               price: 800  },
  { id: 'b6',  name: '醸造台',          icon: '⚗️', reqLevel: 3, materials: ['m4', 'm15'],   desc: 'ポーションを作る',                             price: 200  },
  { id: 'b7',  name: '自転車',          icon: '🚲', reqLevel: 3, materials: ['m4', 'm12'],   desc: '歩行ボーナス付与',                             price: 300  },
  { id: 'b8',  name: 'パラセール',      icon: '🪂', reqLevel: 3, materials: ['m29', 'm1'],   desc: '麻と木の滑空装備',                             price: 200  },
  { id: 'b9',  name: '気球',            icon: '🎈', reqLevel: 4, materials: ['m29', 'm6'],   desc: '上空から地形把握',                             price: 500  },
  { id: 'b10', name: '科学船',          icon: '⛵', reqLevel: 3, materials: ['m27', 'm29'],  desc: '竹と麻の帆船',                                 price: 400  },
  { id: 'b11', name: 'シーカー端末',    icon: '📱', reqLevel: 4, materials: ['ga1', 'm15'],  desc: '地図が詳細になる',                             price: 600  },
  { id: 'b12', name: 'ワープポイント',  icon: '🗼', reqLevel: 4, materials: ['m49', 'ga2'],  desc: 'ファストトラベル',                             price: 1000 },
  // ── プレミアムレシピ p1-p8 ──
  { id: 'p1',  name: '黄金のコンパス',  icon: '🧭', reqLevel: 4, materials: ['i16', 'ga10'], desc: 'レアドロップ率2倍',                            price: 2000 },
  { id: 'p2',  name: 'メガホン',        icon: '📣', reqLevel: 3, materials: ['i19', 'ga9'],  desc: '交換条件を全国通知',                           price: 1500 },
  { id: 'p3',  name: '無限のリュック',  icon: '🎒', reqLevel: 3, materials: ['m37', 'ga10'], desc: 'インベントリ拡張',                             price: 2000 },
  { id: 'p4',  name: 'クローンの鏡',    icon: '🪞', reqLevel: 4, materials: ['i8', 'ga3'],   desc: 'アイテム複製',                                 price: 3000 },
  { id: 'p5',  name: 'プレミアムガチャ券', icon: '🎟️', reqLevel: 1, materials: ['ga11', 'ga10'], desc: 'Tier4-5限定ガチャ',                       price: 500  },
  { id: 'p6',  name: 'ゴージャスな玉座',icon: '💺', reqLevel: 4, materials: ['i16', 'm41'],  desc: '拠点最高級デコ',                               price: 5000 },
  { id: 'p7',  name: 'クリエイターの証',icon: '🎖️', reqLevel: 1, materials: ['ga10', 'ga14'],desc: '開発者支援の証',                               price: 10000},
  { id: 'p8',  name: '時をかける時計',  icon: '⏱️', reqLevel: 4, materials: ['ga1', 'ga7'],  desc: 'クラフト即完了',                               price: 3000 },
  // ── 地域コラボレシピ lr1-lr8 ──
  { id: 'lr1', name: '黄金の茶室',      icon: '🍵', reqLevel: 4, materials: ['l17', 'l22'],  desc: '金箔+お茶',                                    price: 5000 },
  { id: 'lr2', name: '精巧な砂時計',    icon: '⏳', reqLevel: 3, materials: ['l31', 'i8'],   desc: '砂丘の砂+ガラス',                              price: 2000 },
  { id: 'lr3', name: '特製アップルパイ',icon: '🥧', reqLevel: 2, materials: ['l2', 'm13'],   desc: '青森りんご+ハチミツ',                          price: 1000 },
  { id: 'lr4', name: 'コシ強うどん',    icon: '🍜', reqLevel: 2, materials: ['l37', 'm3'],   desc: '香川小麦+水',                                  price: 800  },
  { id: 'lr5', name: 'ネオン看板',      icon: '🚥', reqLevel: 3, materials: ['l13', 'i8'],   desc: '東京ネオン+ガラス',                            price: 2000 },
  { id: 'lr6', name: '絶品海鮮丼',      icon: '🍱', reqLevel: 3, materials: ['l15', 'l40'],  desc: '新潟米+明太子',                                price: 3000 },
  { id: 'lr7', name: '鹿角の魔杖',      icon: '🪄', reqLevel: 4, materials: ['l29', 'ga3'],  desc: '奈良鹿角+マナの結晶',                          price: 4000 },
  { id: 'lr8', name: '日本地図の完成図',icon: '🗺️', reqLevel: 4, materials: ['i20', 'l1'],   desc: 'ワールドコンパス+北海道メロン（代表）',         price: 99999},
];
const BASE_STAGES = [
  { stage: 1, name: '焚き火キャンプ',   icon: '🔥', phase: 'Phase 1: サバイバル期',   desc: '焚き火を囲む原野のキャンプ。旅の始まり。',                              cost: { m1: 10, m2: 5 } },
  { stage: 2, name: 'テント',           icon: '⛺', phase: 'Phase 1: サバイバル期',   desc: '雨風をしのげるテント。ツタで編んだベッドも快適。',                       cost: { m1: 20, m16: 5 } },
  { stage: 3, name: '丸太小屋',         icon: '🏕️', phase: 'Phase 1: サバイバル期',   desc: '石の斧で木を切り倒して建てた小屋。ここから開拓が始まる！',              cost: { i1: 1, m1: 20, m2: 10 } },
  { stage: 4, name: 'レンガの家',       icon: '🏠', phase: 'Phase 2: 開拓村期',       desc: 'レンガを積み上げた頑丈な家。Tier2レシピが全解放される！',               cost: { i7: 8, m8: 10 } },
  { stage: 5, name: '鉄工所',           icon: '⚙️', phase: 'Phase 2: 開拓村期',       desc: '鉄のインゴットで作った工業施設。機械化の夜明け。',                       cost: { i6: 5, m4: 15 } },
  { stage: 6, name: '蒸気工場',         icon: '🏭', phase: 'Phase 3: 産業革命期',     desc: '銅線と蒸気が動力を生む。Tier3レシピ解放！産業革命の幕開け！',           cost: { i11: 3, i12: 5 } },
  { stage: 7, name: '研究施設',         icon: '🏛️', phase: 'Phase 3: 産業革命期',     desc: '魔法の薬と水晶で動く高度な研究拠点。謎が解き明かされる。',               cost: { i15: 2, m15: 10 } },
  { stage: 8, name: 'メガロポリス',     icon: '🌆', phase: 'Phase 4: 現代都市期',     desc: '電球・プラスチック・ワールドコンパス。あなたは伝説の開拓者！',           cost: { i17: 2, i18: 3, i20: 1 } },
];
const INITIAL_INVENTORY = {
  // 既存素材 m1-m20
  m1: 5, m2: 5, m3: 2, m4: 0, m5: 0, m6: 0, m7: 0,
  m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, m13: 0, m14: 0, m15: 0,
  m16: 0, m17: 0, m18: 0, m19: 0, m20: 0,
  // 新規素材 m21-m52
  m21: 0, m22: 0, m23: 0, m24: 0, m25: 0, m26: 0, m27: 0, m28: 0, m29: 0, m30: 0,
  m31: 0, m32: 0, m33: 0, m34: 0, m35: 0, m36: 0, m37: 0, m38: 0, m39: 0, m40: 0,
  m41: 0, m42: 0, m43: 0, m44: 0, m45: 0, m46: 0, m47: 0, m48: 0, m49: 0, m50: 0,
  m51: 0, m52: 0,
  // ガチャ限定素材 ga1-ga14
  ga1: 0, ga2: 0, ga3: 0, ga4: 0, ga5: 0, ga6: 0, ga7: 0,
  ga8: 0, ga9: 0, ga10: 0, ga11: 0, ga12: 0, ga13: 0, ga14: 0,
  // 地域限定素材 l1-l47
  l1: 0, l2: 0, l3: 0, l4: 0, l5: 0, l6: 0, l7: 0, l8: 0, l9: 0, l10: 0,
  l11: 0, l12: 0, l13: 0, l14: 0, l15: 0, l16: 0, l17: 0, l18: 0, l19: 0, l20: 0,
  l21: 0, l22: 0, l23: 0, l24: 0, l25: 0, l26: 0, l27: 0, l28: 0, l29: 0, l30: 0,
  l31: 0, l32: 0, l33: 0, l34: 0, l35: 0, l36: 0, l37: 0, l38: 0, l39: 0, l40: 0,
  l41: 0, l42: 0, l43: 0, l44: 0, l45: 0, l46: 0, l47: 0,
  // 既存レシピ i1-i20
  i1: 0, i2: 0, i3: 0, i4: 0, i5: 0, i6: 0, i7: 0, i8: 0, i9: 0, i10: 0,
  i11: 0, i12: 0, i13: 0, i14: 0, i15: 0, i16: 0, i17: 0, i18: 0, i19: 0, i20: 0,
  // 中間素材レシピ r1-r12
  r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0, r7: 0, r8: 0, r9: 0, r10: 0, r11: 0, r12: 0,
  // 食料レシピ f1-f15
  f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, f9: 0, f10: 0,
  f11: 0, f12: 0, f13: 0, f14: 0, f15: 0,
  // 武器・道具レシピ w1-w15
  w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, w6: 0, w7: 0, w8: 0, w9: 0, w10: 0,
  w11: 0, w12: 0, w13: 0, w14: 0, w15: 0,
  // 建物・乗り物レシピ b1-b12
  b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, b7: 0, b8: 0, b9: 0, b10: 0, b11: 0, b12: 0,
  // プレミアムレシピ p1-p8
  p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0,
  // 地域コラボレシピ lr1-lr8
  lr1: 0, lr2: 0, lr3: 0, lr4: 0, lr5: 0, lr6: 0, lr7: 0, lr8: 0,
};
const SAVE_KEY = 'walkcraft_routes_v1';
const MIN_MOVE_M = 10;

// --- GPS ---
const haversineM = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const fetchOSRMRoute = async (from, to) => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const url = `https://router.project-osrm.org/route/v1/walking/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes[0])
      return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  } catch { }
  return [[from.lat, from.lon], [to.lat, to.lon]];
};
function loadRouteSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}

// --- Leaflet 追従 ---
const RecenterOnTrigger = ({ pos, trigger }) => {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo([pos.lat, pos.lon], 17, { duration: 1.2 }); }, [trigger]);
  return null;
};

// --- Leaflet サイズ再計算（display:none→flex 切替時に必要） ---
const MapSizeInvalidator = ({ isVisible }) => {
  const map = useMap();
  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => map.invalidateSize(), 50);
      return () => clearTimeout(t);
    }
  }, [isVisible]);
  return null;
};

// --- 地図コンポーネント ---
const GameMap = ({ currentPos, waypoints, routeSegments, gpsDrops, tradeMarkers, recenterTrigger, isVisible }) => {
  const center = currentPos ? [currentPos.lat, currentPos.lon] : [35.6762, 139.6503];
  return (
    <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false} touchZoom scrollWheelZoom>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RecenterOnTrigger pos={currentPos} trigger={recenterTrigger} />
      <MapSizeInvalidator isVisible={isVisible} />
      {currentPos && (
        <>
          <Marker position={[currentPos.lat, currentPos.lon]} icon={currentPosIcon} />
          <Circle center={[currentPos.lat, currentPos.lon]} radius={100}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.07, weight: 1.5, dashArray: '4 4' }} />
        </>
      )}
      {waypoints.map((wp, i) => <Marker key={i} position={[wp.lat, wp.lon]} icon={waypointIcon} />)}
      {routeSegments.map((seg, i) => <Polyline key={i} positions={seg} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} />)}
      {gpsDrops.map(d => <Marker key={d.uid} position={[d.lat, d.lon]} icon={matIcon(d.materialId)} />)}
      {tradeMarkers.map(t => <Marker key={t.id} position={[t.lat, t.lon]} icon={exchangeIcon} />)}
    </MapContainer>
  );
};

// --- ログイン画面 ---
const LoginScreen = () => {
  const [loading, setLoading] = useState(null);
  const redirectTo = window.location.origin + window.location.pathname;

  const handleGoogle = async () => {
    setLoading('google');
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  };
  const handleTwitter = async () => {
    setLoading('twitter');
    await supabase.auth.signInWithOAuth({ provider: 'twitter', options: { redirectTo } });
  };
  const handleLine = () => {
    setLoading('line');
    const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const edgeFnUrl = `${supabaseUrl}/functions/v1/line-auth`;
    const state = Math.random().toString(36).substring(2);
    window.location.href =
      `https://access.line.me/oauth2/v2.1/authorize?response_type=code` +
      `&client_id=${lineChannelId}&redirect_uri=${encodeURIComponent(edgeFnUrl)}` +
      `&state=${state}&scope=profile%20openid`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-green-50 to-blue-100 p-8">
      <div className="text-8xl mb-6 drop-shadow-lg">🗺️</div>
      <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">WalkCraft</h1>
      <p className="text-slate-500 mb-10 text-center text-sm leading-relaxed">
        歩いて、集めて、街を作る<br />リアル散歩RPG
      </p>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button onClick={handleLine} disabled={!!loading}
          className="w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-60"
          style={{ backgroundColor: '#06C755' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          {loading === 'line' ? 'ログイン中...' : 'LINEでログイン'}
        </button>
        <button onClick={handleGoogle} disabled={!!loading}
          className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-60">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
          {loading === 'google' ? 'ログイン中...' : 'Googleでログイン'}
        </button>
        <button onClick={handleTwitter} disabled={!!loading}
          className="w-full py-4 bg-black border border-slate-700 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-60">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {loading === 'twitter' ? 'ログイン中...' : 'Xでログイン'}
        </button>
      </div>
      <div className="mt-8 text-center text-xs text-slate-400 space-x-3">
        <a href="./privacy.html" target="_blank" className="underline hover:text-slate-600">プライバシーポリシー</a>
        <span>·</span>
        <a href="./terms.html" target="_blank" className="underline hover:text-slate-600">利用規約</a>
      </div>
    </div>
  );
};

// --- メインApp ---
export default function App() {
  const routeSave = loadRouteSave() || {};

  // 認証
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // プロフィール
  const [profile, setProfile] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);

  // ゲームデータ (Supabaseから読み込む)
  const dataLoadedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('home');
  const [distance, setDistance] = useState(0);
  const [points, setPoints] = useState(100);
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [collection, setCollection] = useState([]);
  const [baseStage, setBaseStage] = useState(0);

  // ルート (localStorage)
  const [waypoints, setWaypoints] = useState(routeSave.waypoints ?? []);
  const [routeSegments, setRouteSegments] = useState(routeSave.routeSegments ?? []);

  // GPS & UI
  const [currentPos, setCurrentPos] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMat1, setSelectedMat1] = useState(null);
  const [selectedMat2, setSelectedMat2] = useState(null);
  const [craftResult, setCraftResult] = useState(null);
  const [gachaResult, setGachaResult] = useState(null);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [showDropModal, setShowDropModal] = useState(false);
  const [itemToDrop, setItemToDrop] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [gpsDrops, setGpsDrops] = useState([]);
  const [geoDrops, setGeoDrops] = useState([]);        // 交換タブのリスト
  const [tradeMarkers, setTradeMarkers] = useState([]); // 地図上の交換マーカー
  const [tradeOffer, setTradeOffer] = useState('');
  const [tradeRequest, setTradeRequest] = useState('');
  const [tradeMessage, setTradeMessage] = useState('');

  const saveTimerRef = useRef(null);
  const authUserRef = useRef(null);

  // --- 認証チェック ---
  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 5000);
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    }).catch(() => { clearTimeout(timeout); setAuthLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      authUserRef.current = user;
      setAuthLoading(false);
    });
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  // --- ログイン後: データ読み込み ---
  useEffect(() => {
    if (!authUser) return;
    dataLoadedRef.current = false;
    setProfileChecked(false);
    loadPlayerData(authUser.id);
    loadProfile(authUser.id);
    loadGpsDrops();
    loadTradeOffers();
  }, [authUser]);

  // --- リアルタイム: 交換条件の追加/削除を全ユーザーに反映 ---
  useEffect(() => {
    const channel = supabase.channel('trade_offers_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_offers' }, (payload) => {
        const d = payload.new;
        setGeoDrops(p => [toTradeItem(d), ...p.filter(x => x.id !== d.id)]);
        if (d.lat && d.lon) setTradeMarkers(p => [...p.filter(x => x.id !== d.id), { id: d.id, lat: d.lat, lon: d.lon }]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trade_offers' }, (payload) => {
        setGeoDrops(p => p.filter(x => x.id !== payload.old.id));
        setTradeMarkers(p => p.filter(x => x.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const loadPlayerData = async (userId) => {
    const { data } = await supabase.from('player_data').select('*').eq('id', userId).single();
    if (data) {
      setDistance(data.distance);
      setPoints(data.points);
      setLevel(data.level);
      setExp(data.exp);
      setBaseStage(data.base_stage);
      setInventory(data.inventory);
      setCollection(data.collection ?? []);
    }
    dataLoadedRef.current = true;
  };

  const loadProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
    setProfileChecked(true);
  };

  // DBの行をUI用オブジェクトに変換（authUserRef経由でリアルタイム時も正しく判定）
  const toTradeItem = (d) => ({
    id: d.id,
    user: d.placer_name || '冒険者',
    avatar: d.placer_avatar || null,
    offering: d.offering_item_id,
    requesting: d.requesting_item_id,
    message: d.message || '',
    isOwn: d.user_id === (authUserRef.current?.id ?? authUser?.id),
  });

  const loadGpsDrops = async () => {
    const { data } = await supabase.from('geo_drops').select('*');
    if (data) setGpsDrops(data.map(d => ({ uid: d.id, materialId: d.material_id, lat: d.lat, lon: d.lon })));
  };

  const loadTradeOffers = async () => {
    const { data } = await supabase.from('trade_offers').select('*').order('created_at', { ascending: false });
    if (data) {
      setGeoDrops(data.map(toTradeItem));
      setTradeMarkers(data.filter(d => d.lat && d.lon).map(d => ({ id: d.id, lat: d.lat, lon: d.lon })));
    }
  };

  // --- GPS追跡 ---
  const firstPosRef = useRef(false);
  useEffect(() => {
    if (!navigator.geolocation) { showStatus('⚠️ GPSに対応していません'); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCurrentPos(newPos);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        // 初回GPS取得時に自動でマップを中央に移動
        if (!firstPosRef.current) {
          firstPosRef.current = true;
          setRecenterTrigger(t => t + 1);
        }
      },
      (err) => showStatus(`GPS取得エラー: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- ルートをlocalStorageに保存 ---
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ waypoints, routeSegments }));
  }, [waypoints, routeSegments]);

  // --- ゲームデータをSupabaseに保存（3秒デバウンス） ---
  useEffect(() => {
    if (!authUser || !dataLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await supabase.from('player_data').upsert({
        id: authUser.id, distance, points, level, exp,
        base_stage: baseStage, inventory, collection,
        updated_at: new Date().toISOString(),
      });
    }, 3000);
  }, [distance, points, level, exp, baseStage, inventory, collection]);

  // --- レベルアップ ---
  useEffect(() => {
    if (exp >= level * 3) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setExp(prev => prev - level * 3);
      setLevelUpMsg(`🎉 Lv.${newLevel} にアップ！`);
      setTimeout(() => setLevelUpMsg(null), 3000);
    }
  }, [exp, level]);

  const showStatus = (msg, duration = 3000) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), duration);
  };
  const getItemData = (id) => MATERIALS[id] || RECIPES.find(r => r.id === id);

  // --- 現在地記録 ---
  const handleRecordLocation = async () => {
    if (!currentPos) { showStatus('📡 GPS取得中...'); return; }
    if (isRecording) return;
    const lastWp = waypoints[waypoints.length - 1];
    const moved = lastWp ? haversineM(lastWp.lat, lastWp.lon, currentPos.lat, currentPos.lon) : 0;
    if (lastWp && moved < MIN_MOVE_M) { showStatus(`🚶 もっと歩いてください（現在 ${Math.round(moved)}m）`); return; }
    setIsRecording(true);
    const newWaypoints = [...waypoints, { ...currentPos, timestamp: Date.now() }];
    setWaypoints(newWaypoints);
    const walked = lastWp ? Math.round(moved) : 0;
    if (walked > 0) { setDistance(p => p + walked); setPoints(p => p + Math.floor(walked / 2)); }
    if (lastWp) { const seg = await fetchOSRMRoute(lastWp, currentPos); setRouteSegments(p => [...p, seg]); }

    if (Math.random() < 0.3) {
      const pool = Object.values(MATERIALS).filter(m => m.rarity <= 2);
      const mat = pool[Math.floor(Math.random() * pool.length)];
      const offset = () => (Math.random() - 0.5) * 0.0006;
      const lat = currentPos.lat + offset(), lon = currentPos.lon + offset();
      const { data } = await supabase.from('geo_drops').insert({ user_id: authUser.id, material_id: mat.id, lat, lon }).select().single();
      if (data) setGpsDrops(p => [...p, { uid: data.id, materialId: data.material_id, lat: data.lat, lon: data.lon }]);
      showStatus(`✨ ${mat.icon} ${mat.name} が周辺に出現！`);
    } else {
      showStatus(walked > 0 ? `✅ ${walked}m 記録しました！` : '📌 スタート地点を記録しました');
    }
    setRecenterTrigger(t => t + 1);
    setIsRecording(false);
  };

  // --- 拾う ---
  const handlePickLocalDrops = async () => {
    if (!currentPos) { showStatus('📡 GPS取得中...'); return; }
    const nearby = gpsDrops.filter(d => haversineM(currentPos.lat, currentPos.lon, d.lat, d.lon) <= 100);
    if (!nearby.length) { showStatus('🔍 半径100m以内に拾えるものはありません'); return; }
    const ids = nearby.map(d => d.uid);
    await supabase.from('geo_drops').delete().in('id', ids);
    setInventory(prev => {
      const n = { ...prev };
      nearby.forEach(d => { n[d.materialId] = (n[d.materialId] || 0) + 1; });
      return n;
    });
    setGpsDrops(p => p.filter(d => !ids.includes(d.uid)));
    showStatus(`👜 ${nearby.length}個 拾いました！`);
  };

  // --- 置く ---
  const handleDropItem = async () => {
    if (!itemToDrop || !currentPos || inventory[itemToDrop] <= 0) return;
    const offset = () => (Math.random() - 0.5) * 0.0002;
    const lat = currentPos.lat + offset(), lon = currentPos.lon + offset();
    const { data } = await supabase.from('geo_drops').insert({ user_id: authUser.id, material_id: itemToDrop, lat, lon }).select().single();
    if (data) setGpsDrops(p => [...p, { uid: data.id, materialId: data.material_id, lat: data.lat, lon: data.lon }]);
    setInventory(prev => ({ ...prev, [itemToDrop]: prev[itemToDrop] - 1 }));
    setShowDropModal(false); setItemToDrop('');
    showStatus('📦 アイテムをマップに置きました');
  };

  const handleSell = (id) => {
    const item = getItemData(id);
    if ((inventory[id] || 0) > 0) {
      setInventory(prev => ({ ...prev, [id]: prev[id] - 1 }));
      setPoints(prev => prev + item.price);
    }
  };

  // --- ガチャ ---
  const handleGacha = () => {
    if (points < 50) return;
    setPoints(p => p - 50);
    const rand = Math.random() * 100;
    const pool = rand < 55 ? Object.values(MATERIALS).filter(m => m.rarity === 1)
      : rand < 85 ? Object.values(MATERIALS).filter(m => m.rarity === 2)
      : rand < 97 ? Object.values(MATERIALS).filter(m => m.rarity === 3)
      : Object.values(MATERIALS).filter(m => m.rarity === 4);
    const drop = pool[Math.floor(Math.random() * pool.length)];
    setInventory(prev => ({ ...prev, [drop.id]: (prev[drop.id] || 0) + 1 }));
    setGachaResult(drop);
    setTimeout(() => setGachaResult(null), 3000);
  };

  // --- クラフト ---
  const toggleMaterial = (matId) => {
    if ((inventory[matId] || 0) <= 0) return;
    if (selectedMat1 === matId) setSelectedMat1(null);
    else if (selectedMat2 === matId) setSelectedMat2(null);
    else if (!selectedMat1) setSelectedMat1(matId);
    else if (!selectedMat2) setSelectedMat2(matId);
  };
  const handleCraft = () => {
    if (!selectedMat1 || !selectedMat2) return;
    const recipe = RECIPES.find(r =>
      r.materials.includes(selectedMat1) && r.materials.includes(selectedMat2) &&
      (selectedMat1 !== selectedMat2 || r.materials[0] === r.materials[1])
    );
    if (recipe && level < recipe.reqLevel) {
      setCraftResult({ success: false, message: `Lv.${recipe.reqLevel} が必要です！` });
    } else if (recipe) {
      setInventory(prev => ({
        ...prev, [selectedMat1]: prev[selectedMat1] - 1,
        [selectedMat2]: prev[selectedMat2] - 1,
        [recipe.id]: (prev[recipe.id] || 0) + 1,
      }));
      setExp(p => p + (collection.includes(recipe.id) ? 1 : 2));
      if (!collection.includes(recipe.id)) setCollection(p => [...p, recipe.id]);
      setCraftResult({ success: true, item: recipe });
    } else {
      setCraftResult({ success: false, message: 'この組み合わせでは何も作れない...' });
    }
    setTimeout(() => setCraftResult(null), 2500);
    setSelectedMat1(null); setSelectedMat2(null);
  };

  // --- 交換: 承認（RPC経由で双方のインベントリを原子的に更新） ---
  const handleTradeAccept = async (drop) => {
    if (drop.isOwn) { showStatus('自分の交換条件は受けられません'); return; }
    if ((inventory[drop.requesting] || 0) < 1) {
      showStatus(`❌ ${getItemData(drop.requesting)?.name} が足りません`); return;
    }
    const { data, error } = await supabase.rpc('accept_trade', {
      p_trade_id: drop.id,
      p_acceptor_id: authUser.id,
    });
    if (error || !data?.success) {
      showStatus(`❌ 交換に失敗しました（${data?.error ?? error?.message}）`); return;
    }
    // ローカルのインベントリを即時反映（DB保存は自動デバウンス）
    setInventory(prev => ({
      ...prev,
      [drop.requesting]: (prev[drop.requesting] || 0) - 1,
      [drop.offering]: (prev[drop.offering] || 0) + 1,
    }));
    // リストとマップから削除（リアルタイムでも来るが即時反映）
    setGeoDrops(p => p.filter(d => d.id !== drop.id));
    setTradeMarkers(p => p.filter(t => t.id !== drop.id));
    const icon = getItemData(drop.offering)?.icon ?? '';
    const name = getItemData(drop.offering)?.name ?? '';
    showStatus(`✅ ${data.placer_name} と交換成立！ ${icon} ${name} を受け取った`);
  };

  // --- 交換: 設置（Supabaseに保存） ---
  const handleCreateTrade = async () => {
    if (!tradeOffer || !tradeRequest || (inventory[tradeOffer] || 0) <= 0) return;
    const myName = profile?.display_name ?? '冒険者';
    const myAvatar = profile?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? null;

    // アイテムを先に減らす
    setInventory(prev => ({ ...prev, [tradeOffer]: prev[tradeOffer] - 1 }));

    const { error } = await supabase.from('trade_offers').insert({
      user_id: authUser.id,
      offering_item_id: tradeOffer,
      requesting_item_id: tradeRequest,
      message: tradeMessage || '交換希望',
      placer_name: myName,
      placer_avatar: myAvatar,
      lat: currentPos?.lat ?? null,
      lon: currentPos?.lon ?? null,
    });

    if (error) {
      // 失敗したらアイテムを戻す
      setInventory(prev => ({ ...prev, [tradeOffer]: (prev[tradeOffer] || 0) + 1 }));
      showStatus('❌ 設置に失敗しました'); return;
    }
    setTradeOffer(''); setTradeRequest(''); setTradeMessage('');
    showStatus('🔄 交換条件をマップに設置しました！');
  };

  // --- 自分の交換条件を取り下げる ---
  const handleCancelTrade = async (drop) => {
    const { error } = await supabase.from('trade_offers').delete().eq('id', drop.id);
    if (error) { showStatus('❌ 取り下げに失敗しました'); return; }
    // アイテムを返却
    setInventory(prev => ({ ...prev, [drop.offering]: (prev[drop.offering] || 0) + 1 }));
    showStatus('↩️ 交換条件を取り下げました');
  };

  // --- 建設 ---
  const handleBuild = () => {
    const next = BASE_STAGES[baseStage];
    if (!next) return;
    const canBuild = Object.entries(next.cost).every(([id, qty]) => (inventory[id] || 0) >= qty);
    if (!canBuild) return;
    setInventory(prev => {
      const n = { ...prev };
      Object.entries(next.cost).forEach(([id, qty]) => { n[id] -= qty; });
      return n;
    });
    setBaseStage(p => p + 1);
    showStatus(`🎉 ${next.name} が完成した！`);
  };

  // --- UI計算 ---
  const xpMax = level * 3;
  const xpPct = Math.min(100, Math.round((exp / xpMax) * 100));
  const nearbyCount = currentPos ? gpsDrops.filter(d => haversineM(currentPos.lat, currentPos.lon, d.lat, d.lon) <= 100).length : 0;

  // --- レンダー: 拠点 ---
  const renderBase = () => {
    const current = BASE_STAGES[baseStage - 1];
    const next = BASE_STAGES[baseStage];
    return (
      <div className="flex flex-col h-full p-4 bg-amber-50 overflow-y-auto">
        <h2 className="text-xl font-black mb-4 text-amber-900">🏘️ 拠点</h2>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-200 mb-4 text-center">
          <div className="text-7xl mb-3">{current?.icon ?? '🌿'}</div>
          <h3 className="text-lg font-black text-slate-800">{current?.name ?? '荒野'}</h3>
          <p className="text-sm text-slate-500 mt-1">{current?.desc ?? 'まだ何もない荒野。クラフトして建設しよう！'}</p>
          <div className="mt-3 flex justify-center gap-1 flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`w-4 h-2 rounded-full ${i < baseStage ? 'bg-amber-500' : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">Lv {baseStage} / 8</p>
          {current && <p className="text-[10px] text-amber-500 font-bold mt-1">{BASE_STAGES[baseStage - 1]?.phase}</p>}
        </div>
        {next ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-200">
            <h3 className="text-sm font-black text-amber-700 mb-3">次のアップグレード</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{next.icon}</span>
              <div><p className="font-black text-slate-800">{next.name}</p><p className="text-xs text-slate-500">{next.desc}</p></div>
            </div>
            <p className="text-xs font-bold text-slate-600 mb-2">必要素材:</p>
            <div className="space-y-2 mb-4">
              {Object.entries(next.cost).map(([id, qty]) => {
                const item = getItemById(id);
                const have = inventory[id] || 0;
                const ok = have >= qty;
                return (
                  <div key={id} className={`flex items-center justify-between px-3 py-2 rounded-xl ${ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <span className="text-sm">{item?.icon} {item?.name}</span>
                    <span className={`text-sm font-black ${ok ? 'text-green-600' : 'text-red-500'}`}>{have}/{qty} {ok ? '✅' : '❌'}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={handleBuild}
              disabled={!Object.entries(next.cost).every(([id, qty]) => (inventory[id] || 0) >= qty)}
              className="w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform shadow-md disabled:opacity-40 bg-amber-500 text-white">
              🔨 建設する
            </button>
          </div>
        ) : (
          <div className="bg-amber-100 rounded-3xl p-6 text-center border border-amber-300">
            <p className="text-3xl mb-2">🏆</p>
            <p className="font-black text-amber-800">メガロポリス完成！</p>
            <p className="text-sm text-amber-600 mt-1">あなたは伝説の開拓者です</p>
            <p className="text-xs text-amber-500 mt-2">Phase 4: 現代都市期 — 達成！</p>
          </div>
        )}
      </div>
    );
  };

  // --- レンダー: ホーム ---
  const renderHome = () => (
    <div className="flex flex-col h-full relative">
      <div className="relative flex-1 overflow-hidden">
        <GameMap currentPos={currentPos} waypoints={waypoints} routeSegments={routeSegments}
          gpsDrops={gpsDrops} tradeMarkers={tradeMarkers} recenterTrigger={recenterTrigger} isVisible={activeTab === 'home'} />
        <div className="absolute top-3 right-3 z-[500]">
          <div className={`text-[10px] font-bold px-2 py-1 rounded-full shadow ${currentPos ? 'bg-green-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
            {currentPos ? `📡 ±${gpsAccuracy}m` : '📡 取得中...'}
          </div>
        </div>
        <div className="absolute top-3 left-3 z-[500] flex flex-col gap-1.5">
          <div className="bg-white/95 backdrop-blur rounded-xl px-3 py-1.5 shadow text-center border-b-2 border-blue-400">
            <p className="text-[9px] text-gray-500 font-bold">累計距離</p>
            <p className="text-lg font-black text-blue-600">{distance}<span className="text-xs ml-0.5">m</span></p>
          </div>
          <div className="bg-white/95 backdrop-blur rounded-xl px-3 py-1.5 shadow text-center border-b-2 border-yellow-400">
            <p className="text-[9px] text-gray-500 font-bold">ポイント</p>
            <p className="text-lg font-black text-yellow-500">{points}<span className="text-xs ml-0.5">pt</span></p>
          </div>
        </div>
        <button onClick={() => setRecenterTrigger(t => t + 1)}
          className="absolute bottom-3 right-3 z-[500] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-200 active:scale-95 transition-transform">
          <Navigation className="w-5 h-5 text-blue-500" />
        </button>
      </div>
      <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 pt-4 pb-3 z-20 flex flex-col gap-2.5">
        <button onClick={handleRecordLocation} disabled={isRecording}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2 disabled:opacity-60">
          <Footprints className="w-6 h-6" />
          {isRecording ? 'ルート取得中...' : '現在地を記録する'}
        </button>
        <div className="flex gap-2.5">
          <button onClick={handlePickLocalDrops}
            className="flex-1 py-3 bg-green-100 text-green-700 rounded-xl font-bold flex justify-center items-center gap-1.5 border border-green-200 active:scale-95 transition-transform">
            <Hand className="w-5 h-5" /> 拾う
            {nearbyCount > 0 && <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{nearbyCount}</span>}
          </button>
          <button onClick={() => setShowDropModal(true)}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold flex justify-center items-center gap-1.5 border border-slate-200 active:scale-95 transition-transform">
            <ArrowDownCircle className="w-5 h-5" /> 置く
          </button>
        </div>
      </div>
      {showDropModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center pb-4 px-4" onClick={() => setShowDropModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2 text-center">アイテムをマップに置く</h3>
            <p className="text-xs text-gray-500 text-center mb-4">現在地付近に設置。他の人が100m以内で拾えます。</p>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto mb-4">
              {[...Object.values(MATERIALS), ...RECIPES].filter(i => (inventory[i.id] || 0) > 0).map(item => (
                <div key={item.id} onClick={() => setItemToDrop(item.id)}
                  className={`border-2 rounded-lg p-2 text-center cursor-pointer ${itemToDrop === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[10px] block mt-1">x{inventory[item.id]}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDropModal(false)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold">キャンセル</button>
              <button onClick={handleDropItem} disabled={!itemToDrop} className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-40">置く</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // --- レンダー: 探索 ---
  const renderGacha = () => (
    <div className="flex flex-col items-center h-full p-4 bg-slate-50 overflow-y-auto">
      <h2 className="text-xl font-black mb-4">素材探索</h2>
      <div className="bg-white p-6 rounded-3xl shadow-sm w-full max-w-sm text-center border-t-4 border-yellow-400">
        <p className="text-gray-600 mb-4 text-sm font-bold">歩いて貯めたポイントで周辺を深く探索！</p>
        <div className="my-6 h-36 flex flex-col items-center justify-center">
          {gachaResult
            ? <div className="animate-bounce"><span className="text-7xl block">{gachaResult.icon}</span><span className="font-black text-lg text-yellow-600 mt-2 block">{gachaResult.name} 発見！</span></div>
            : <div className="text-6xl">🗺️</div>}
        </div>
        <div className="text-xs text-slate-400 mb-4 space-y-1">
          <p>🟢 55% — Tier1（木の枝・石ころ・薬草・火打ち石 etc）</p>
          <p>🔵 30% — Tier2（鉄鉱石・石炭・銅鉱石・ゴムの樹液 etc）</p>
          <p>🟣 12% — Tier3（ハチミツ・原油・水晶・金鉱石）</p>
          <p>⭐  3% — Tier4（街の噂・隕石の欠片）</p>
        </div>
        <button onClick={handleGacha} disabled={points < 50}
          className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform ${points >= 50 ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          <Coins className="w-5 h-5" /> 探索する (50pt)
        </button>
      </div>
    </div>
  );

  // --- レンダー: クラフト ---
  const renderCraft = () => (
    <div className="flex flex-col h-full p-4 max-w-md mx-auto w-full bg-slate-50">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black">クラフト</h2>
        <span className="text-sm font-black text-white bg-slate-800 px-3 py-1 rounded-full">Lv.{level}</span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 font-bold mb-1"><span>EXP</span><span>{exp}/{xpMax}</span></div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all duration-500" style={{ width: `${xpPct}%` }} />
        </div>
      </div>
      <div className="bg-slate-800 p-5 rounded-3xl flex items-center justify-between mb-3">
        {[selectedMat1, selectedMat2].map((mat, i) => (
          <React.Fragment key={i}>
            {i === 1 && <span className="text-slate-400 font-black text-2xl">+</span>}
            <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-500">
              {mat ? <span className="text-4xl cursor-pointer" onClick={() => i === 0 ? setSelectedMat1(null) : setSelectedMat2(null)}>{getItemData(mat)?.icon}</span>
                : <span className="text-slate-500 text-xs font-bold">素材{i + 1}</span>}
            </div>
          </React.Fragment>
        ))}
      </div>
      <button onClick={handleCraft} disabled={!selectedMat1 || !selectedMat2}
        className={`w-full py-4 rounded-xl font-black text-lg mb-3 flex justify-center items-center gap-2 active:scale-95 transition-transform ${selectedMat1 && selectedMat2 ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
        <Hammer className="w-6 h-6" /> 組み合わせる
      </button>
      {craftResult && (
        <div className={`p-3 rounded-xl mb-3 text-center font-bold animate-pulse ${craftResult.success ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
          {craftResult.success ? <><Sparkles className="inline-block mr-1 w-4 h-4" />【{craftResult.item.name}】が完成！</>
            : <><AlertCircle className="inline-block mr-1 w-4 h-4" />{craftResult.message}</>}
        </div>
      )}
      <h3 className="font-bold text-slate-700 mb-2 text-sm">インベントリ</h3>
      <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-4">
        {[...Object.values(MATERIALS), ...RECIPES].map(item => {
          const count = inventory[item.id] || 0;
          if (count === 0 && selectedMat1 !== item.id && selectedMat2 !== item.id) return null;
          const isSelected = selectedMat1 === item.id || selectedMat2 === item.id;
          return (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-col items-center">
              <div onClick={() => count > 0 && toggleMaterial(item.id)}
                className={`w-full p-2 text-center rounded-xl transition-all ${isSelected ? 'bg-orange-100 scale-95' : (count > 0 ? 'cursor-pointer active:scale-95' : '')}`}>
                <span className="text-3xl block mb-1">{item.icon}</span>
                <span className="block text-[10px] font-black text-slate-700 truncate">{item.name}</span>
                <span className="block text-xs font-bold text-slate-500">x{count}</span>
              </div>
              <button onClick={() => handleSell(item.id)} disabled={count === 0}
                className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 py-1 rounded disabled:opacity-30">
                <Coins className="w-3 h-3 text-yellow-500" />{item.price}で売る
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- レンダー: 交換（旧GeoDrop） ---
  const renderExchange = () => (
    <div className="flex flex-col h-full p-4 max-w-md mx-auto w-full bg-slate-900 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black flex items-center gap-2">
          🔄 交換
        </h2>
        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700">{geoDrops.length}件</span>
      </div>
      <div className="flex-1 bg-slate-800/50 rounded-3xl p-4 border border-slate-700 overflow-y-auto mb-4">
        <h3 className="text-sm font-bold text-teal-300 mb-3 flex items-center gap-1">
          <MapPin className="w-4 h-4" /> みんなの交換リスト
        </h3>
        {geoDrops.length === 0
          ? <p className="text-center text-slate-500 text-sm py-8 font-bold">まだ交換条件がありません。<br/>最初に設置してみよう！</p>
          : (
            <div className="space-y-3">
              {geoDrops.map(drop => {
                const canAccept = !drop.isOwn && (inventory[drop.requesting] || 0) > 0;
                const offerData = getItemData(drop.offering);
                const reqData = getItemData(drop.requesting);
                return (
                  <div key={drop.id} className={`rounded-2xl p-4 border ${drop.isOwn ? 'bg-slate-700/60 border-orange-600/40' : 'bg-slate-800 border-slate-600'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {drop.avatar
                          ? <img src={drop.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                          : <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs">🧑</div>
                        }
                        <span className="text-xs font-bold text-slate-300">{drop.user}</span>
                        {drop.isOwn && <span className="text-[10px] bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded-full">自分</span>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">💬 {drop.message}</p>
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <span className="text-3xl block">{offerData?.icon}</span>
                          <span className="text-[10px] text-teal-300 font-bold block mt-1">貰える</span>
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                        <div className="text-center">
                          <span className="text-3xl block opacity-60">{reqData?.icon}</span>
                          <span className="text-[10px] text-red-400 font-bold block mt-1">渡す</span>
                        </div>
                      </div>
                      {drop.isOwn
                        ? <button onClick={() => handleCancelTrade(drop)}
                            className="px-3 py-3 rounded-xl text-xs font-black bg-slate-600 text-slate-300 active:scale-95 transition-colors">
                            取り下げ
                          </button>
                        : <button onClick={() => handleTradeAccept(drop)}
                            className={`px-4 py-3 rounded-xl text-sm font-black transition-colors active:scale-95 ${canAccept ? 'bg-teal-500 text-teal-950' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                            交換する
                          </button>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
      {/* 交換条件を置く */}
      <div className="bg-slate-800 p-4 rounded-3xl border border-slate-600 shrink-0">
        <h3 className="text-sm font-bold text-orange-400 mb-3">🔄 交換条件を設置する</h3>
        <div className="flex gap-2 mb-2">
          <div className="flex-1 bg-slate-900 p-2 rounded-xl border border-slate-700 relative">
            <label className="text-[10px] text-slate-400 absolute top-2 left-3 font-bold">出すアイテム</label>
            <select className="w-full bg-transparent text-white pt-5 pb-1 px-2 outline-none font-bold text-sm"
              value={tradeOffer} onChange={e => setTradeOffer(e.target.value)}>
              <option value="" className="text-black">選択...</option>
              {[...Object.values(MATERIALS), ...RECIPES].filter(i => (inventory[i.id] || 0) > 0).map(item => (
                <option key={item.id} value={item.id} className="text-black">{item.icon} {item.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 bg-slate-900 p-2 rounded-xl border border-slate-700 relative">
            <label className="text-[10px] text-slate-400 absolute top-2 left-3 font-bold">欲しいアイテム</label>
            <select className="w-full bg-transparent text-white pt-5 pb-1 px-2 outline-none font-bold text-sm"
              value={tradeRequest} onChange={e => setTradeRequest(e.target.value)}>
              <option value="" className="text-black">選択...</option>
              {[...Object.values(MATERIALS), ...RECIPES].map(item => (
                <option key={item.id} value={item.id} className="text-black">{item.icon} {item.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="メッセージ（任意）" value={tradeMessage}
            onChange={e => setTradeMessage(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors" />
          <button onClick={handleCreateTrade} disabled={!tradeOffer || !tradeRequest}
            className="bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 rounded-xl font-black active:scale-95 transition-transform">
            設置
          </button>
        </div>
        {currentPos
          ? <p className="text-xs text-teal-400 mt-2">📍 現在地にマーカーが表示されます</p>
          : <p className="text-xs text-slate-500 mt-2">📡 GPS取得後にマーカーが表示されます</p>
        }
      </div>
    </div>
  );

  // --- ローディング ---
  if (authLoading) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-green-50 to-blue-100">
      <div className="text-center"><div className="text-6xl mb-4 animate-bounce">🗺️</div><p className="text-slate-500 font-bold text-sm">読み込み中...</p></div>
    </div>
  );

  // --- ログイン画面 ---
  if (!authUser) return <div className="h-screen w-full max-w-md mx-auto shadow-2xl"><LoginScreen /></div>;

  // --- プロフィール設定画面 ---
  if (profileChecked && (!profile || !profile.display_name)) {
    return (
      <div className="h-screen w-full max-w-md mx-auto shadow-2xl">
        <ProfileSetup authUser={authUser} onSave={(p) => setProfile(p)} />
      </div>
    );
  }

  // --- ゲーム本体 ---
  const displayName = profile?.display_name ?? authUser.user_metadata?.name ?? '';
  const avatarUrl = profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null;

  return (
    <div className="h-screen w-full bg-black text-slate-800 font-sans flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl relative">
      {statusMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-2xl whitespace-nowrap">
          {statusMsg}
        </div>
      )}
      {levelUpMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-400 text-yellow-900 font-black px-6 py-3 rounded-full shadow-2xl animate-bounce">
          {levelUpMsg}
        </div>
      )}

      <header className="bg-slate-900 px-4 py-3 flex justify-between items-center z-20 shrink-0">
        <h1 className="font-extrabold text-white text-xl flex items-center gap-2 tracking-tight">
          <MapPin className="text-teal-400 w-5 h-5" /> WalkCraft
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            {avatarUrl
              ? <img src={avatarUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
              : <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                {displayName?.[0] ?? 'ME'}
              </div>
            }
            {displayName && <span className="text-xs text-slate-300 font-bold max-w-[60px] truncate">{displayName}</span>}
            <span className="text-xs text-slate-400">Lv.{level}</span>
            <span className="text-xs text-yellow-400 font-bold">{points}pt</span>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center active:scale-95 transition-transform">
            <LogOut className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-slate-50 relative">
        {/* ホームタブは常時マウント（地図ぷるぷる防止） */}
        <div style={{ display: activeTab === 'home' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          {renderHome()}
        </div>
        {activeTab === 'gacha' && renderGacha()}
        {activeTab === 'craft' && renderCraft()}
        {activeTab === 'base' && renderBase()}
        {activeTab === 'exchange' && renderExchange()}
      </main>

      <nav className="bg-white border-t border-slate-200 flex justify-around p-2 z-30 shrink-0"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {[
          { tab: 'home', icon: <Home className="w-5 h-5" />, label: 'Home', color: 'text-blue-600 bg-blue-50' },
          { tab: 'gacha', icon: <Gift className="w-5 h-5" />, label: '探索', color: 'text-yellow-500 bg-yellow-50' },
          { tab: 'craft', icon: <Hammer className="w-5 h-5" />, label: 'クラフト', color: 'text-orange-500 bg-orange-50' },
          { tab: 'exchange', icon: <ArrowRightLeft className="w-5 h-5" />, label: '交換', color: 'text-teal-600 bg-teal-50' },
          { tab: 'base', icon: <Building2 className="w-5 h-5" />, label: '拠点', color: 'text-amber-600 bg-amber-50' },
        ].map(({ tab, icon, label, color }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center p-2 rounded-xl w-14 transition-all ${activeTab === tab ? `${color} -translate-y-1` : 'text-slate-400'}`}>
            {icon}
            <span className="text-[9px] mt-1 font-black">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
