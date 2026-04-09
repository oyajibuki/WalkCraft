import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Gift, Hammer, Coins, Sparkles, AlertCircle, ArrowRightLeft, MapPin, Footprints, Hand, ArrowDownCircle, Navigation, Building2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default icon fix for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- カスタムアイコン ---
const currentPosIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.4)"></div>',
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
});
const waypointIcon = L.divIcon({
  html: '<div style="width:8px;height:8px;background:#94a3b8;border:2px solid white;border-radius:50%"></div>',
  className: '', iconSize: [8, 8], iconAnchor: [4, 4],
});
// 素材・クラフトアイテム両対応
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

// --- 街づくり（拠点アップグレード）---
const BASE_STAGES = [
  { stage: 1, name: 'テントキャンプ', icon: '🏕️', desc: '焚き火を囲む小さなキャンプ。旅の始まり。', cost: { m1: 5, m2: 3 } },
  { stage: 2, name: 'ログハウス', icon: '🏠', desc: '石の斧で木を切り、丸太小屋を建てた。', cost: { i1: 2, m4: 3 } },
  { stage: 3, name: '鉄の砦', icon: '🏯', desc: '鉄のインゴットで補強した頑丈な拠点。', cost: { i3: 3, i5: 1 } },
  { stage: 4, name: '研究施設', icon: '🏛️', desc: '通信機と魔法の薬で動く高度な研究拠点。解放できるレシピが増える！', cost: { i7: 1, i6: 2 } },
];

const INITIAL_INVENTORY = { m1: 5, m2: 5, m3: 2, m4: 1, m5: 0, m6: 0, m7: 0, i1: 0, i2: 0, i3: 0, i4: 0, i5: 0, i6: 0, i7: 0 };
const SAVE_KEY = 'walkcraft_save_v2';
const MIN_MOVE_M = 10; // GPS誤差フィルタ: 10m未満は無視

// --- GPS ユーティリティ ---
const haversineM = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
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
    if (data.code === 'Ok' && data.routes[0]) {
      return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    }
  } catch { /* ネット切断など: 直線フォールバック */ }
  return [[from.lat, from.lon], [to.lat, to.lon]];
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// --- Leaflet: 現在地に追従するコンポーネント ---
const RecenterOnTrigger = ({ pos, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lon], 17, { duration: 1.2 });
  }, [trigger]);
  return null;
};

// --- 地図コンポーネント ---
const GameMap = ({ currentPos, waypoints, routeSegments, gpsDrops, recenterTrigger }) => {
  const defaultCenter = [35.6762, 139.6503];
  const center = currentPos ? [currentPos.lat, currentPos.lon] : defaultCenter;

  return (
    <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false} touchZoom={true} scrollWheelZoom={true}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RecenterOnTrigger pos={currentPos} trigger={recenterTrigger} />

      {/* 現在地 */}
      {currentPos && (
        <>
          <Marker position={[currentPos.lat, currentPos.lon]} icon={currentPosIcon} />
          <Circle
            center={[currentPos.lat, currentPos.lon]} radius={100}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.07, weight: 1.5, dashArray: '4 4' }}
          />
        </>
      )}

      {/* 通過地点 */}
      {waypoints.map((wp, i) => (
        <Marker key={i} position={[wp.lat, wp.lon]} icon={waypointIcon} />
      ))}

      {/* OSRM ルート */}
      {routeSegments.map((seg, i) => (
        <Polyline key={i} positions={seg} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} />
      ))}

      {/* マップ上のアイテム（素材・クラフト品両対応） */}
      {gpsDrops.map(d => (
        <Marker key={d.uid} position={[d.lat, d.lon]} icon={matIcon(d.materialId)} />
      ))}
    </MapContainer>
  );
};

// --- メインApp ---
export default function App() {
  const saved = loadSave() || {};

  const [activeTab, setActiveTab] = useState('home');
  const [distance, setDistance] = useState(saved.distance ?? 0);
  const [points, setPoints] = useState(saved.points ?? 100);
  const [level, setLevel] = useState(saved.level ?? 1);
  const [exp, setExp] = useState(saved.exp ?? 0);
  const [inventory, setInventory] = useState(saved.inventory ?? INITIAL_INVENTORY);
  const [collection, setCollection] = useState(saved.collection ?? []);
  const [waypoints, setWaypoints] = useState(saved.waypoints ?? []);
  const [routeSegments, setRouteSegments] = useState(saved.routeSegments ?? []);
  const [gpsDrops, setGpsDrops] = useState(saved.gpsDrops ?? []);

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
  const [geoDrops, setGeoDrops] = useState([]);
  const [baseStage, setBaseStage] = useState(saved.baseStage ?? 0);
  const [tradeOffer, setTradeOffer] = useState('');
  const [tradeRequest, setTradeRequest] = useState('');
  const [tradeMessage, setTradeMessage] = useState('');

  // --- GPS 追跡 ---
  useEffect(() => {
    if (!navigator.geolocation) {
      showStatus('⚠️ このデバイスはGPSに対応していません');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCurrentPos(p);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
      },
      (err) => showStatus(`GPS取得エラー: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // --- localStorage 保存 ---
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      distance, points, level, exp, inventory, collection,
      waypoints, routeSegments, gpsDrops, baseStage,
    }));
  }, [distance, points, level, exp, inventory, collection, waypoints, routeSegments, gpsDrops]);

  // --- レベルアップ判定 ---
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

  // --- 現在地を記録（本番GPS） ---
  const handleRecordLocation = async () => {
    if (!currentPos) { showStatus('📡 GPS取得中... しばらくお待ちください'); return; }
    if (isRecording) return;

    const lastWp = waypoints[waypoints.length - 1];
    const moved = lastWp ? haversineM(lastWp.lat, lastWp.lon, currentPos.lat, currentPos.lon) : 0;

    if (lastWp && moved < MIN_MOVE_M) {
      showStatus(`🚶 もっと歩いてください（現在 ${Math.round(moved)}m）`);
      return;
    }

    setIsRecording(true);
    const newWp = { ...currentPos, timestamp: Date.now() };
    const newWaypoints = [...waypoints, newWp];
    setWaypoints(newWaypoints);

    const walked = lastWp ? Math.round(moved) : 0;
    if (walked > 0) {
      setDistance(prev => prev + walked);
      setPoints(prev => prev + Math.floor(walked / 2));
    }

    // OSRM でルートを取得
    if (lastWp) {
      const seg = await fetchOSRMRoute(lastWp, currentPos);
      setRouteSegments(prev => [...prev, seg]);
    }

    // 現在地周辺に素材をドロップ（30%）
    if (Math.random() < 0.3) {
      const pool = Object.values(MATERIALS).filter(m => m.rarity <= 2);
      const mat = pool[Math.floor(Math.random() * pool.length)];
      const offset = () => (Math.random() - 0.5) * 0.0006; // 約30m以内のランダムオフセット
      setGpsDrops(prev => [...prev, {
        uid: Date.now(),
        materialId: mat.id,
        lat: currentPos.lat + offset(),
        lon: currentPos.lon + offset(),
      }]);
      showStatus(`✨ ${mat.icon} ${mat.name} が周辺に出現！`);
    } else {
      showStatus(walked > 0 ? `✅ ${walked}m 記録しました！` : '📌 スタート地点を記録しました');
    }

    setRecenterTrigger(t => t + 1);
    setIsRecording(false);
  };

  // --- 拾う（100m以内） ---
  const handlePickLocalDrops = () => {
    if (!currentPos) { showStatus('📡 GPS取得中...'); return; }
    const nearby = gpsDrops.filter(d =>
      haversineM(currentPos.lat, currentPos.lon, d.lat, d.lon) <= 100
    );
    if (nearby.length === 0) {
      showStatus('🔍 半径100m以内に拾えるものはありません');
      return;
    }
    setInventory(prev => {
      const n = { ...prev };
      nearby.forEach(d => { n[d.materialId] = (n[d.materialId] || 0) + 1; });
      return n;
    });
    setGpsDrops(prev => prev.filter(d => !nearby.find(n => n.uid === d.uid)));
    showStatus(`👜 ${nearby.length}個 拾いました！`);
  };

  // --- 置く ---
  const handleDropItem = () => {
    if (!itemToDrop || !currentPos || inventory[itemToDrop] <= 0) return;
    const offset = () => (Math.random() - 0.5) * 0.0002;
    setGpsDrops(prev => [...prev, {
      uid: Date.now(),
      materialId: itemToDrop,
      lat: currentPos.lat + offset(),
      lon: currentPos.lon + offset(),
    }]);
    setInventory(prev => ({ ...prev, [itemToDrop]: prev[itemToDrop] - 1 }));
    setShowDropModal(false);
    setItemToDrop('');
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
    setPoints(prev => prev - 50);
    const rand = Math.random() * 100;
    const pool = rand < 60
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
    setSelectedMat1(null); setSelectedMat2(null);
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
          user: '見知らぬ冒険者',
          offering: pool[Math.floor(Math.random() * pool.length)],
          requesting: pool[Math.floor(Math.random() * pool.length)],
          message: '交換お願いします！',
          isBot: false,
        }, ...prev]);
      } else {
        showStatus('近くに交換ボックスは見つかりませんでした');
      }
    }, 1500);
  };

  const handleTradeAccept = (drop) => {
    if ((inventory[drop.requesting] || 0) > 0) {
      setInventory(prev => ({
        ...prev,
        [drop.requesting]: prev[drop.requesting] - 1,
        [drop.offering]: (prev[drop.offering] || 0) + 1,
      }));
      if (!drop.isBot) setGeoDrops(prev => prev.filter(d => d.id !== drop.id));
      showStatus(`✅ トレード成立！ ${getItemData(drop.offering)?.icon} ${getItemData(drop.offering)?.name} を受け取った`);
    } else {
      showStatus(`❌ ${getItemData(drop.requesting)?.name} が足りません`);
    }
  };

  const handleCreateTrade = () => {
    if (!tradeOffer || !tradeRequest || (inventory[tradeOffer] || 0) <= 0) return;
    setInventory(prev => ({ ...prev, [tradeOffer]: prev[tradeOffer] - 1 }));
    setGeoDrops(prev => [{
      id: `my${Date.now()}`,
      user: '自分',
      offering: tradeOffer, requesting: tradeRequest, message: tradeMessage || '交換希望',
      isBot: false,
    }, ...prev]);
    setTradeOffer(''); setTradeRequest(''); setTradeMessage('');
    showStatus('📦 交換条件をマップに設置しました');
  };

  // --- UI ---
  const xpMax = level * 3;
  const xpPct = Math.min(100, Math.round((exp / xpMax) * 100));
  const nearbyCount = currentPos
    ? gpsDrops.filter(d => haversineM(currentPos.lat, currentPos.lon, d.lat, d.lon) <= 100).length
    : 0;

  // --- 建設 ---
  const handleBuild = () => {
    const next = BASE_STAGES[baseStage]; // baseStage=0 → BASE_STAGES[0] = stage1
    if (!next) return;
    const canBuild = Object.entries(next.cost).every(([id, qty]) => (inventory[id] || 0) >= qty);
    if (!canBuild) return;
    setInventory(prev => {
      const n = { ...prev };
      Object.entries(next.cost).forEach(([id, qty]) => { n[id] -= qty; });
      return n;
    });
    setBaseStage(prev => prev + 1);
    showStatus(`🎉 ${next.name} が完成した！`);
  };

  const renderBase = () => {
    const current = BASE_STAGES[baseStage - 1];
    const next = BASE_STAGES[baseStage];
    const baseIcon = current ? current.icon : '🌿';
    const baseName = current ? current.name : '荒野';
    const baseDesc = current ? current.desc : 'まだ何もない荒野。クラフトして建設しよう！';

    return (
      <div className="flex flex-col h-full p-4 bg-amber-50 overflow-y-auto">
        <h2 className="text-xl font-black mb-4 tracking-tight text-amber-900">🏘️ 拠点</h2>

        {/* 現在の拠点 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-200 mb-4 text-center">
          <div className="text-7xl mb-3">{baseIcon}</div>
          <h3 className="text-lg font-black text-slate-800">{baseName}</h3>
          <p className="text-sm text-slate-500 mt-1">{baseDesc}</p>
          <div className="mt-3 flex justify-center gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`w-4 h-2 rounded-full ${i < baseStage ? 'bg-amber-500' : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">Lv {baseStage} / 4</p>
        </div>

        {/* 次のアップグレード */}
        {next ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-200">
            <h3 className="text-sm font-black text-amber-700 mb-3">次のアップグレード</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{next.icon}</span>
              <div>
                <p className="font-black text-slate-800">{next.name}</p>
                <p className="text-xs text-slate-500">{next.desc}</p>
              </div>
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
                    <span className={`text-sm font-black ${ok ? 'text-green-600' : 'text-red-500'}`}>
                      {have} / {qty} {ok ? '✅' : '❌'}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleBuild}
              disabled={!Object.entries(next.cost).every(([id, qty]) => (inventory[id] || 0) >= qty)}
              className="w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform shadow-md disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 text-white"
            >
              🔨 建設する
            </button>
          </div>
        ) : (
          <div className="bg-amber-100 rounded-3xl p-6 text-center border border-amber-300">
            <p className="text-3xl mb-2">🏆</p>
            <p className="font-black text-amber-800">すべての拠点を建設完了！</p>
            <p className="text-sm text-amber-600 mt-1">あなたは伝説の開拓者です</p>
          </div>
        )}
      </div>
    );
  };

  const renderHome = () => (
    <div className="flex flex-col h-full relative">
      {/* 地図 */}
      <div className="relative flex-1 overflow-hidden">
        <GameMap
          currentPos={currentPos}
          waypoints={waypoints}
          routeSegments={routeSegments}
          gpsDrops={gpsDrops}
          recenterTrigger={recenterTrigger}
        />

        {/* GPS精度バッジ */}
        <div className="absolute top-3 right-3 z-[500]">
          <div className={`text-[10px] font-bold px-2 py-1 rounded-full shadow ${currentPos ? 'bg-green-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
            {currentPos ? `📡 ±${gpsAccuracy}m` : '📡 取得中...'}
          </div>
        </div>

        {/* ステータス */}
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

        {/* 現在地に戻るボタン */}
        <button
          onClick={() => setRecenterTrigger(t => t + 1)}
          className="absolute bottom-3 right-3 z-[500] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-200 active:scale-95 transition-transform"
        >
          <Navigation className="w-5 h-5 text-blue-500" />
        </button>
      </div>

      {/* アクションパネル */}
      <div className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 pt-4 pb-3 z-20 flex flex-col gap-2.5">
        <button
          onClick={handleRecordLocation}
          disabled={isRecording}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2 disabled:opacity-60"
        >
          <Footprints className="w-6 h-6" />
          {isRecording ? 'ルート取得中...' : '現在地を記録する'}
        </button>
        <div className="flex gap-2.5">
          <button
            onClick={handlePickLocalDrops}
            className="flex-1 py-3 bg-green-100 text-green-700 rounded-xl font-bold flex justify-center items-center gap-1.5 border border-green-200 active:scale-95 transition-transform"
          >
            <Hand className="w-5 h-5" /> 拾う
            {nearbyCount > 0 && <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{nearbyCount}</span>}
          </button>
          <button
            onClick={() => setShowDropModal(true)}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold flex justify-center items-center gap-1.5 border border-slate-200 active:scale-95 transition-transform"
          >
            <ArrowDownCircle className="w-5 h-5" /> 置く
          </button>
        </div>
      </div>

      {/* ドロップモーダル */}
      {showDropModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center pb-4 px-4" onClick={() => setShowDropModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2 text-center">アイテムをマップに置く</h3>
            <p className="text-xs text-gray-500 text-center mb-4">現在地付近に設置。他の人が100m以内で拾えます。</p>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto mb-4">
              {[...Object.values(MATERIALS), ...RECIPES].filter(i => (inventory[i.id] || 0) > 0).map(item => (
                <div key={item.id} onClick={() => setItemToDrop(item.id)}
                  className={`border-2 rounded-lg p-2 text-center cursor-pointer transition-all ${itemToDrop === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
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

  const renderGacha = () => (
    <div className="flex flex-col items-center h-full p-4 bg-slate-50 overflow-y-auto">
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
            <div className="text-6xl">🗺️</div>
          )}
        </div>
        <div className="text-xs text-slate-400 mb-4 space-y-1">
          <p>🟢 60% — Rarity 1（木の枝・石ころ）</p>
          <p>🔵 30% — Rarity 2（きれいな水・鉄くず）</p>
          <p>🟣 10% — Rarity 3-4（謎の草・火の粉・街の噂）</p>
        </div>
        <button onClick={handleGacha} disabled={points < 50}
          className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform
            ${points >= 50 ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          <Coins className="w-5 h-5" /> 探索する (50pt)
        </button>
      </div>
    </div>
  );

  const renderCraft = () => (
    <div className="flex flex-col h-full p-4 max-w-md mx-auto w-full bg-slate-50">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black tracking-tight">クラフト</h2>
        <span className="text-sm font-black text-white bg-slate-800 px-3 py-1 rounded-full">Lv.{level}</span>
      </div>
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
        className={`w-full py-4 rounded-xl font-black text-lg mb-3 flex justify-center items-center gap-2 active:scale-95 transition-transform
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
      <h3 className="font-bold text-slate-700 mb-2 text-sm">インベントリ</h3>
      <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-4">
        {[...Object.values(MATERIALS), ...RECIPES].map(item => {
          const count = inventory[item.id] || 0;
          if (count === 0 && selectedMat1 !== item.id && selectedMat2 !== item.id) return null;
          const isSelected = selectedMat1 === item.id || selectedMat2 === item.id;
          const isMat = !!MATERIALS[item.id];
          return (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-col items-center">
              <div onClick={() => isMat && toggleMaterial(item.id)}
                className={`w-full p-2 text-center rounded-xl transition-all ${isSelected ? 'bg-orange-100 scale-95' : (isMat ? 'cursor-pointer active:scale-95' : '')}`}>
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

  const renderGeoDrop = () => (
    <div className="flex flex-col h-full p-4 max-w-md mx-auto w-full bg-slate-900 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black flex items-center gap-2">
          <ArrowRightLeft className="text-teal-400" /> GeoDrop
        </h2>
        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700">条件付き交換</span>
      </div>
      <button onClick={handleGeoScan} disabled={isScanning}
        className="w-full bg-teal-500 text-teal-950 py-4 rounded-xl font-black flex justify-center items-center gap-2 active:scale-95 transition-transform mb-4 shadow-lg disabled:opacity-60">
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
                  <div key={drop.id} className={`rounded-2xl p-4 border ${drop.isBot ? 'bg-teal-900/40 border-teal-700' : 'bg-slate-800 border-slate-600'}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-bold text-slate-300">{drop.user}</span>
                      {drop.isBot && <span className="text-[10px] bg-teal-600 text-teal-100 px-1.5 py-0.5 rounded-full">BOT</span>}
                    </div>
                    <p className="text-sm mb-3">💬 {drop.message}</p>
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <span className="text-3xl block">{offerData?.icon}</span>
                          <span className="text-[10px] text-teal-300 font-bold block mt-1">貰える</span>
                        </div>
                        <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                        <div className="text-center">
                          <span className="text-3xl block opacity-60">{reqData?.icon}</span>
                          <span className="text-[10px] text-red-400 font-bold block mt-1">要求</span>
                        </div>
                      </div>
                      <button onClick={() => handleTradeAccept(drop)}
                        className={`px-4 py-3 rounded-xl text-sm font-black transition-colors active:scale-95
                          ${canAccept ? 'bg-teal-500 text-teal-950' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
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
            置く
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-black text-slate-800 font-sans flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl relative">
      {/* 全画面ステータスメッセージ */}
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
          <MapPin className="text-teal-400 w-5 h-5" /> Walk & Craft
        </h1>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-[10px]">ME</div>
          <span className="text-xs text-slate-300 font-bold">Lv.{level}</span>
          <span className="text-xs text-yellow-400 font-bold">{points}pt</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-slate-50 relative">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'gacha' && renderGacha()}
        {activeTab === 'craft' && renderCraft()}
        {activeTab === 'base' && renderBase()}
        {activeTab === 'geodrop' && renderGeoDrop()}
      </main>

      <nav className="bg-white border-t border-slate-200 flex justify-around p-2 z-30 shrink-0"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {[
          { tab: 'home', icon: <Home className="w-5 h-5" />, label: 'Home', color: 'text-blue-600 bg-blue-50' },
          { tab: 'gacha', icon: <Gift className="w-5 h-5" />, label: '探索', color: 'text-yellow-500 bg-yellow-50' },
          { tab: 'craft', icon: <Hammer className="w-5 h-5" />, label: 'クラフト', color: 'text-orange-500 bg-orange-50' },
          { tab: 'geodrop', icon: <ArrowRightLeft className="w-5 h-5" />, label: 'GeoDrop', color: 'text-teal-600 bg-teal-50' },
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
