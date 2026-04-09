import React, { useState, useEffect } from 'react';
import { Home, Gift, Hammer, Map, Coins, Sparkles, AlertCircle, ArrowRightLeft, MapPin, Footprints, Hand, ArrowDownCircle } from 'lucide-react';

// --- データ定義 ---
const MATERIALS = {
  m1: { id: 'm1', name: '木の枝', icon: '🪵', rarity: 1, price: 5 },
  m2: { id: 'm2', name: '石ころ', icon: '🪨', rarity: 1, price: 5 },
  m3: { id: 'm3', name: 'きれいな水', icon: '💧', rarity: 2, price: 15 },
  m4: { id: 'm4', name: '鉄くず', icon: '🔩', rarity: 2, price: 15 },
  m5: { id: 'm5', name: '謎の草', icon: '🌿', rarity: 3, price: 30 },
  m6: { id: 'm6', name: '火の粉', icon: '🔥', rarity: 3, price: 30 },
  m7: { id: 'm7', name: '街の噂', icon: '💬', rarity: 4, price: 50 },
};

const RECIPES = [
  { id: 'i1', name: '石の斧', icon: '🪓', reqLevel: 1, materials: ['m1', 'm2'], desc: '木を切るのに便利な斧。', price: 30 },
  { id: 'i2', name: 'キズぐすり', icon: '🩹', reqLevel: 1, materials: ['m3', 'm5'], desc: '少しだけ傷を癒やす。', price: 60 },
  { id: 'i3', name: '鉄のインゴット', icon: '🧱', reqLevel: 2, materials: ['m2', 'm4'], desc: '様々な武器の素材。', price: 50 },
  { id: 'i4', name: 'たいまつ', icon: '🔦', reqLevel: 2, materials: ['m1', 'm6'], desc: '暗い夜道を照らす。', price: 60 },
  { id: 'i5', name: '鉄の剣', icon: '🗡️', reqLevel: 3, materials: ['m1', 'm4'], desc: 'モンスターと戦う武器。', price: 100 },
  { id: 'i6', name: '魔法の薬', icon: '🧪', reqLevel: 3, materials: ['m5', 'm6'], desc: '不思議な力が湧く。', price: 150 },
  { id: 'i7', name: '通信機', icon: '📻', reqLevel: 4, materials: ['m4', 'm7'], desc: '電波をキャッチする。', price: 300 },
];

const INITIAL_STATE = {
  distance: 0,
  points: 100,
  level: 1,
  exp: 0,
  inventory: { m1: 5, m2: 5, m3: 2, m4: 1, m5: 0, m6: 0, m7: 0, i1: 0, i2: 0, i3: 0, i4: 0, i5: 0, i6: 0, i7: 0 },
  collection: [],
};

const SAVE_KEY = 'walkcraft_save';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? { ...INITIAL_STATE, ...JSON.parse(raw) } : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

export default function App() {
  const saved = loadSave();
  const [activeTab, setActiveTab] = useState('home');
  const [distance, setDistance] = useState(saved.distance);
  const [points, setPoints] = useState(saved.points);
  const [level, setLevel] = useState(saved.level);
  const [exp, setExp] = useState(saved.exp);
  const [inventory, setInventory] = useState(saved.inventory);
  const [collection, setCollection] = useState(saved.collection);

  const [localDrops, setLocalDrops] = useState([]);
  const [showDropModal, setShowDropModal] = useState(false);
  const [itemToDrop, setItemToDrop] = useState('');
  const [selectedMat1, setSelectedMat1] = useState(null);
  const [selectedMat2, setSelectedMat2] = useState(null);
  const [craftResult, setCraftResult] = useState(null);
  const [gachaResult, setGachaResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [geoDrops, setGeoDrops] = useState([
    { id: 'd1', user: 'プレイヤー1', offering: 'm3', requesting: 'm1', message: '水をあげるので木をください！' },
    { id: 'd2', user: 'プレイヤー2', offering: 'i1', requesting: 'm4', message: '斧と鉄を交換しませんか？' },
  ]);
  const [tradeOffer, setTradeOffer] = useState('');
  const [tradeRequest, setTradeRequest] = useState('');
  const [tradeMessage, setTradeMessage] = useState('');
  const [levelUpMsg, setLevelUpMsg] = useState(null);

  // --- localStorage 保存 ---
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ distance, points, level, exp, inventory, collection }));
  }, [distance, points, level, exp, inventory, collection]);

  // --- レベルアップ判定 ---
  useEffect(() => {
    if (exp >= level * 3) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setExp(prev => prev - level * 3);
      setLevelUpMsg(`🎉 レベルアップ！ Lv.${newLevel} になった！`);
      setTimeout(() => setLevelUpMsg(null), 3000);
    }
  }, [exp, level]);

  const getItemData = (id) => MATERIALS[id] || RECIPES.find(r => r.id === id);

  // --- 歩く ---
  const handleRecordLocation = () => {
    const walked = Math.floor(Math.random() * 40) + 10;
    setDistance(prev => prev + walked);
    setPoints(prev => prev + Math.floor(walked / 2));
    if (Math.random() < 0.3) {
      const pool = Object.values(MATERIALS).filter(m => m.rarity <= 2);
      const mat = pool[Math.floor(Math.random() * pool.length)];
      setLocalDrops(prev => [...prev, mat.id]);
    }
  };

  const handlePickLocalDrops = () => {
    if (localDrops.length === 0) return;
    setInventory(prev => {
      const n = { ...prev };
      localDrops.forEach(id => { n[id] = (n[id] || 0) + 1; });
      return n;
    });
    setLocalDrops([]);
  };

  const handleDropItem = () => {
    if (!itemToDrop || inventory[itemToDrop] <= 0) return;
    setInventory(prev => ({ ...prev, [itemToDrop]: prev[itemToDrop] - 1 }));
    setShowDropModal(false);
    setItemToDrop('');
  };

  const handleSell = (id) => {
    const item = getItemData(id);
    if (inventory[id] > 0) {
      setInventory(prev => ({ ...prev, [id]: prev[id] - 1 }));
      setPoints(prev => prev + item.price);
    }
  };

  // --- ガチャ ---
  const handleGacha = () => {
    if (points < 50) return;
    setPoints(prev => prev - 50);
    const rand = Math.random() * 100;
    let pool = rand < 60
      ? Object.values(MATERIALS).filter(m => m.rarity === 1)
      : rand < 90
        ? Object.values(MATERIALS).filter(m => m.rarity === 2)
        : Object.values(MATERIALS).filter(m => m.rarity >= 3);
    const drop = pool[Math.floor(Math.random() * pool.length)];
    setInventory(prev => ({ ...prev, [drop.id]: (prev[drop.id] || 0) + 1 }));
    setGachaResult(drop);
    setTimeout(() => setGachaResult(null), 3000);
  };

  // --- クラフト ---
  const toggleMaterial = (matId) => {
    if (inventory[matId] <= 0) return;
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
      setCraftResult({ success: false, message: `レベル${recipe.reqLevel}が必要です！` });
    } else if (recipe) {
      setInventory(prev => ({
        ...prev,
        [selectedMat1]: prev[selectedMat1] - 1,
        [selectedMat2]: prev[selectedMat2] - 1,
        [recipe.id]: (prev[recipe.id] || 0) + 1,
      }));
      setExp(prev => prev + (collection.includes(recipe.id) ? 1 : 2));
      if (!collection.includes(recipe.id)) setCollection(prev => [...prev, recipe.id]);
      setCraftResult({ success: true, item: recipe });
    } else {
      setCraftResult({ success: false, message: 'この組み合わせでは何も作れない...' });
    }
    setTimeout(() => setCraftResult(null), 2500);
    setSelectedMat1(null);
    setSelectedMat2(null);
  };

  // --- GeoDrop ---
  const handleGeoScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      if (Math.random() > 0.4) {
        const pool = ['m1', 'm2', 'm4', 'i1', 'i2'];
        setGeoDrops(prev => [{
          id: `d${Date.now()}`,
          user: '見知らぬ人',
          offering: pool[Math.floor(Math.random() * pool.length)],
          requesting: pool[Math.floor(Math.random() * pool.length)],
          message: '交換お願いします！',
        }, ...prev]);
      }
    }, 1500);
  };

  const handleTradeAccept = (drop) => {
    if (inventory[drop.requesting] > 0) {
      setInventory(prev => ({
        ...prev,
        [drop.requesting]: prev[drop.requesting] - 1,
        [drop.offering]: (prev[drop.offering] || 0) + 1,
      }));
      setGeoDrops(prev => prev.filter(d => d.id !== drop.id));
    }
  };

  const handleCreateTrade = () => {
    if (!tradeOffer || !tradeRequest || inventory[tradeOffer] <= 0) return;
    setInventory(prev => ({ ...prev, [tradeOffer]: prev[tradeOffer] - 1 }));
    setTradeOffer(''); setTradeRequest(''); setTradeMessage('');
  };

  // --- XP バー ---
  const xpMax = level * 3;
  const xpPct = Math.min(100, Math.round((exp / xpMax) * 100));

  // --- レンダリング ---
  const renderHome = () => (
    <div className="flex flex-col h-full bg-slate-100 relative">
      <div className="relative flex-1 bg-gray-300 w-full overflow-hidden">
        <iframe
          title="map" width="100%" height="100%" frameBorder="0" scrolling="no"
          src="https://www.openstreetmap.org/export/embed.html?bbox=139.69,35.68,139.73,35.71&layer=mapnik"
          className="absolute inset-0 z-0 pointer-events-none opacity-70"
        />
        <div className="absolute top-4 left-4 right-4 flex gap-3 z-10">
          <div className="bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg flex-1 text-center border-b-4 border-blue-500">
            <p className="text-[10px] text-gray-500 font-bold tracking-wider">累計距離</p>
            <p className="text-3xl font-black text-blue-600 tracking-tighter">{distance}<span className="text-sm font-bold ml-1">m</span></p>
          </div>
          <div className="bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg flex-1 text-center border-b-4 border-yellow-500">
            <p className="text-[10px] text-gray-500 font-bold tracking-wider">所持ポイント</p>
            <p className="text-3xl font-black text-yellow-500 tracking-tighter">{points}<span className="text-sm font-bold ml-1">pt</span></p>
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="relative">
            <MapPin className="text-red-500 w-10 h-10 -mt-10 drop-shadow-md" />
            {localDrops.length > 0 && (
              <div className="absolute -top-16 -right-16 flex gap-1 animate-bounce">
                {localDrops.map((id, idx) => (
                  <div key={idx} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl border-2 border-green-400">
                    {MATERIALS[id].icon}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-5 z-20 flex flex-col gap-3">
        <button onClick={handleRecordLocation}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2">
          <Footprints className="w-6 h-6" /> 現在地を記録する
        </button>
        <div className="flex gap-3">
          <button onClick={handlePickLocalDrops}
            className="flex-1 py-3 bg-green-100 text-green-700 rounded-xl font-bold flex justify-center items-center gap-2 border border-green-200 active:scale-95 transition-transform">
            <Hand className="w-5 h-5" /> 拾う
            {localDrops.length > 0 && <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{localDrops.length}</span>}
          </button>
          <button onClick={() => setShowDropModal(true)}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold flex justify-center items-center gap-2 border border-slate-200 active:scale-95 transition-transform">
            <ArrowDownCircle className="w-5 h-5" /> 置く
          </button>
        </div>
      </div>

      {showDropModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDropModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2 text-center">アイテムをその場に置く</h3>
            <p className="text-xs text-gray-500 text-center mb-4">他の人が拾えるようになります。</p>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 mb-4">
              {[...Object.values(MATERIALS), ...RECIPES].filter(i => inventory[i.id] > 0).map(item => (
                <div key={item.id} onClick={() => setItemToDrop(item.id)}
                  className={`border-2 rounded-lg p-2 text-center cursor-pointer transition-all ${itemToDrop === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[10px] block mt-1">x{inventory[item.id]}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDropModal(false)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold">キャンセル</button>
              <button onClick={handleDropItem} disabled={!itemToDrop} className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-40">ドロップする</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderGacha = () => (
    <div className="flex flex-col items-center h-full p-4 bg-slate-50">
      <h2 className="text-xl font-black mb-4 tracking-tight">素材探索</h2>
      <div className="bg-white p-6 rounded-3xl shadow-sm w-full max-w-sm text-center border-t-4 border-yellow-400">
        <p className="text-gray-600 mb-4 text-sm font-bold">歩いて貯めたポイントで周辺を深く探索！</p>
        <div className="my-6 h-36 flex flex-col items-center justify-center">
          {gachaResult ? (
            <div className="animate-bounce">
              <span className="text-7xl block">{gachaResult.icon}</span>
              <span className="font-black text-lg text-yellow-600 mt-2 block">{gachaResult.name} 発見！</span>
            </div>
          ) : (
            <div className="relative">
              <Map className="w-24 h-24 text-slate-200" />
              <MapPin className="w-8 h-8 text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full animate-pulse" />
            </div>
          )}
        </div>
        <div className="text-xs text-slate-400 mb-4 space-y-1">
          <p>🟢 60% — Rarity 1（木の枝・石ころ）</p>
          <p>🔵 30% — Rarity 2（きれいな水・鉄くず）</p>
          <p>🟣 10% — Rarity 3-4（謎の草・火の粉・街の噂）</p>
        </div>
        <button onClick={handleGacha} disabled={points < 50}
          className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95
            ${points >= 50 ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          <Coins className="w-5 h-5" /> 探索する (50pt)
        </button>
      </div>
    </div>
  );

  const renderCraft = () => (
    <div className="flex flex-col h-full p-4 max-w-md mx-auto w-full bg-slate-50">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-black tracking-tight">クラフト</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white bg-slate-800 px-3 py-1 rounded-full">Lv.{level}</span>
        </div>
      </div>

      {/* XPバー */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
          <span>EXP</span><span>{exp} / {xpMax}</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all duration-500" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-3xl flex items-center justify-between mb-3">
        <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-500">
          {selectedMat1
            ? <span className="text-4xl cursor-pointer" onClick={() => setSelectedMat1(null)}>{MATERIALS[selectedMat1]?.icon}</span>
            : <span className="text-slate-500 text-xs font-bold">素材1</span>}
        </div>
        <span className="text-slate-400 font-black text-2xl">+</span>
        <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-500">
          {selectedMat2
            ? <span className="text-4xl cursor-pointer" onClick={() => setSelectedMat2(null)}>{MATERIALS[selectedMat2]?.icon}</span>
            : <span className="text-slate-500 text-xs font-bold">素材2</span>}
        </div>
      </div>

      <button onClick={handleCraft} disabled={!selectedMat1 || !selectedMat2}
        className={`w-full py-4 rounded-xl font-black text-lg mb-3 flex justify-center items-center gap-2 transition-all active:scale-95
          ${selectedMat1 && selectedMat2 ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
        <Hammer className="w-6 h-6" /> 組み合わせる
      </button>

      {craftResult && (
        <div className={`p-3 rounded-xl mb-3 text-center font-bold animate-pulse
          ${craftResult.success ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
          {craftResult.success
            ? <><Sparkles className="inline-block mr-1 w-4 h-4" />【{craftResult.item.name}】が完成！</>
            : <><AlertCircle className="inline-block mr-1 w-4 h-4" />{craftResult.message}</>}
        </div>
      )}

      <h3 className="font-bold text-slate-700 mb-2 text-sm">インベントリ（素材タップでセット）</h3>
      <div className="grid grid-cols-3 gap-3 overflow-y-auto pb-4 p-1">
        {[...Object.values(MATERIALS), ...RECIPES].map(item => {
          const count = inventory[item.id] || 0;
          if (count === 0 && selectedMat1 !== item.id && selectedMat2 !== item.id) return null;
          const isSelected = selectedMat1 === item.id || selectedMat2 === item.id;
          const isMat = !!MATERIALS[item.id];
          return (
            <div key={item.id} className="relative bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-col items-center">
              <div onClick={() => isMat && toggleMaterial(item.id)}
                className={`w-full p-2 text-center rounded-xl transition-all ${isSelected ? 'bg-orange-100 scale-95' : (isMat ? 'cursor-pointer hover:bg-slate-50 active:scale-95' : '')}`}>
                <span className="text-3xl block mb-1">{item.icon}</span>
                <span className="block text-[10px] font-black text-slate-700 truncate">{item.name}</span>
                <span className="block text-xs font-bold text-slate-500">x{count}</span>
              </div>
              <button onClick={() => handleSell(item.id)} disabled={count === 0}
                className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 py-1 rounded disabled:opacity-30">
                <Coins className="w-3 h-3 text-yellow-500" />{item.price}で売る
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGeoDrop = () => (
    <div className="flex flex-col h-full p-4 max-w-md mx-auto w-full bg-slate-900 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black flex items-center gap-2">
          <ArrowRightLeft className="text-teal-400" /> GeoDrop
        </h2>
        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700">条件付き交換</span>
      </div>

      <button onClick={handleGeoScan} disabled={isScanning}
        className="w-full bg-teal-500 text-teal-950 py-4 rounded-xl font-black flex justify-center items-center gap-2 active:scale-95 transition-transform mb-5 shadow-lg disabled:opacity-60">
        {isScanning ? '🔍 検索中...' : '周囲の交換ボックスを探す'}
      </button>

      <div className="flex-1 bg-slate-800/50 rounded-3xl p-4 border border-slate-700 overflow-y-auto mb-4">
        <h3 className="text-sm font-bold text-teal-300 mb-3 flex items-center gap-1">
          <MapPin className="w-4 h-4" /> 発見したトレード
        </h3>
        {geoDrops.length === 0
          ? <p className="text-center text-slate-500 text-sm py-8 font-bold">周囲にトレードはありません。</p>
          : (
            <div className="space-y-3">
              {geoDrops.map(drop => {
                const canAccept = (inventory[drop.requesting] || 0) > 0;
                const offerData = getItemData(drop.offering);
                const reqData = getItemData(drop.requesting);
                return (
                  <div key={drop.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-600">
                    <p className="text-sm font-bold mb-3">💬 {drop.message}</p>
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <span className="text-3xl block">{offerData?.icon}</span>
                          <span className="text-[10px] text-teal-300 font-bold mt-1 block">貰える</span>
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                        <div className="text-center">
                          <span className="text-3xl block opacity-50">{reqData?.icon}</span>
                          <span className="text-[10px] text-red-400 font-bold mt-1 block">要求</span>
                        </div>
                      </div>
                      <button onClick={() => handleTradeAccept(drop)}
                        className={`px-4 py-3 rounded-xl text-sm font-black transition-colors
                          ${canAccept ? 'bg-teal-500 text-teal-950 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                        交換する
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      <div className="bg-slate-800 p-4 rounded-3xl border border-slate-600 shrink-0">
        <h3 className="text-sm font-bold text-orange-400 mb-3">自分の交換条件を置く</h3>
        <div className="flex gap-2 mb-3">
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
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors" />
          <button onClick={handleCreateTrade} disabled={!tradeOffer || !tradeRequest}
            className="bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 rounded-xl font-black flex items-center justify-center active:scale-95 transition-transform">
            置く
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-black text-slate-800 font-sans flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl relative">
      {/* レベルアップ通知 */}
      {levelUpMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-yellow-900 font-black px-6 py-3 rounded-full shadow-2xl text-sm animate-bounce">
          {levelUpMsg}
        </div>
      )}

      <header className="bg-slate-900 px-4 py-3 flex justify-between items-center z-20 shrink-0">
        <h1 className="font-extrabold text-white text-xl flex items-center gap-2 tracking-tight">
          <MapPin className="text-teal-400 w-5 h-5" />
          Walk & Craft
        </h1>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
            ME
          </div>
          <span className="text-xs text-slate-300 font-bold">Lv.{level}</span>
          <span className="text-xs text-yellow-400 font-bold">{points}pt</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-slate-50 relative">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'gacha' && renderGacha()}
        {activeTab === 'craft' && renderCraft()}
        {activeTab === 'geodrop' && renderGeoDrop()}
      </main>

      <nav className="bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-30 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {[
          { tab: 'home', icon: <Home className="w-6 h-6" />, label: 'Home', color: 'text-blue-600 bg-blue-50' },
          { tab: 'gacha', icon: <Gift className="w-6 h-6" />, label: '探索', color: 'text-yellow-500 bg-yellow-50' },
          { tab: 'craft', icon: <Hammer className="w-6 h-6" />, label: 'クラフト', color: 'text-orange-500 bg-orange-50' },
          { tab: 'geodrop', icon: <ArrowRightLeft className="w-6 h-6" />, label: 'GeoDrop', color: 'text-teal-600 bg-teal-50' },
        ].map(({ tab, icon, label, color }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === tab ? `${color} -translate-y-1` : 'text-slate-400'}`}>
            {icon}
            <span className="text-[10px] mt-1 font-black">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
