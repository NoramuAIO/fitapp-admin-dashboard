'use client';

import { useEffect, useState, useMemo } from 'react';
import { Scale, TrendingDown, TrendingUp, Trash2, BarChart3, Plus, X, Calendar, Activity, Coffee, Utensils } from 'lucide-react';
import { useConfirm } from '@/components/ConfirmModal';

interface WeightLog {
  id: number;
  userId: number;
  date: string;
  weight: number;
  notes?: string;
  createdAt: string;
}

interface BodyFatLog {
  id: number;
  userId: number;
  date: string;
  fatPercent: number;
  weight?: number;
  notes?: string;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

function getFatCategory(fat: number): { label: string; color: string } {
  if (fat < 6) return { label: 'Çok Düşük', color: '#60A5FA' };
  if (fat < 14) return { label: 'Sporcu', color: '#34D399' };
  if (fat < 18) return { label: 'Fit', color: '#10B981' };
  if (fat < 25) return { label: 'Ortalama', color: '#F59E0B' };
  return { label: 'Yüksek', color: '#EF4444' };
}

function parseMealTag(notes?: string | null): { tag: 'ac' | 'tok' | null; cleanNotes: string } {
  if (!notes) return { tag: null, cleanNotes: '' };
  if (notes.startsWith('[Aç Karnına]')) {
    return { tag: 'ac', cleanNotes: notes.replace('[Aç Karnına]', '').trim() };
  }
  if (notes.startsWith('[Tok]')) {
    return { tag: 'tok', cleanNotes: notes.replace('[Tok]', '').trim() };
  }
  return { tag: null, cleanNotes: notes.trim() };
}

export default function BodyAdminPage() {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [fatLogs, setFatLogs] = useState<BodyFatLog[]>([]);
  const [activeTab, setActiveTab] = useState<'kilo' | 'yag'>('kilo');
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State for adding new weight log
  const [showAddWeightModal, setShowAddWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTag, setNewTag] = useState<'ac' | 'tok' | null>(null);
  const [newNotes, setNewNotes] = useState('');
  const [submittingWeight, setSubmittingWeight] = useState(false);

  // Hover state for interactive chart tooltip
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
    const saved = localStorage.getItem('selectedUserId');
    if (saved) setSelectedUserId(parseInt(saved));
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadData(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
  };

  const loadData = async (userId: number) => {
    setLoading(true);
    try {
      const [wRes, fRes] = await Promise.all([
        fetch(`/api/weight-logs?userId=${userId}`),
        fetch(`/api/body-fat-logs?userId=${userId}`),
      ]);
      const wData = await wRes.json();
      const fData = await fRes.json();
      setWeightLogs(Array.isArray(wData) ? wData : []);
      setFatLogs(Array.isArray(fData) ? fData : []);
    } catch { setWeightLogs([]); setFatLogs([]); }
    finally { setLoading(false); }
  };

  const handleDeleteWeight = async (id: number) => {
    const ok = await confirm({
      title: 'Kilo Kaydını Sil',
      message: 'Bu kilo ölçüm kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Evet, Sil',
    });
    if (!ok) return;

    const numericId = Number(id);
    // Optimistic instant UI removal
    setWeightLogs(prev => prev.filter(w => Number(w.id) !== numericId));
    setSuccessToast('Kilo kaydı başarıyla silindi!');
    setTimeout(() => setSuccessToast(null), 3000);

    try {
      let res = await fetch('/api/weight-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: numericId }),
      });
      if (!res.ok) {
        res = await fetch(`/api/weight-logs?id=${numericId}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.error('Delete weight log error:', err);
      if (selectedUserId) loadData(selectedUserId);
    }
  };

  const handleDeleteFat = async (id: number) => {
    const ok = await confirm({
      title: 'Yağ Oranı Kaydını Sil',
      message: 'Bu vücut yağ oranı ölçüm kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Evet, Sil',
    });
    if (!ok) return;

    const numericId = Number(id);
    // Optimistic instant UI removal
    setFatLogs(prev => prev.filter(f => Number(f.id) !== numericId));
    setSuccessToast('Yağ oranı kaydı başarıyla silindi!');
    setTimeout(() => setSuccessToast(null), 3000);

    try {
      let res = await fetch('/api/body-fat-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: numericId }),
      });
      if (!res.ok) {
        res = await fetch(`/api/body-fat-logs?id=${numericId}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.error('Delete fat log error:', err);
      if (selectedUserId) loadData(selectedUserId);
    }
  };

  const handleCreateWeightLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newWeight || !newDate) return;

    setSubmittingWeight(true);
    let finalNotes = newNotes.trim();
    if (newTag === 'ac') {
      finalNotes = `[Aç Karnına] ${finalNotes}`.trim();
    } else if (newTag === 'tok') {
      finalNotes = `[Tok] ${finalNotes}`.trim();
    }

    try {
      const res = await fetch('/api/weight-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          date: newDate,
          weight: parseFloat(newWeight),
          notes: finalNotes || undefined,
        }),
      });

      if (res.ok) {
        setShowAddWeightModal(false);
        setNewWeight('');
        setNewNotes('');
        setNewTag(null);
        setNewDate(new Date().toISOString().split('T')[0]);
        loadData(selectedUserId);
      } else {
        alert('Kilo kaydı eklenemedi!');
      }
    } catch (err) {
      console.error(err);
      alert('Bağlantı hatası!');
    } finally {
      setSubmittingWeight(false);
    }
  };

  const tealAccent = '#4ECDC4';
  const orangeAccent = '#FF8C42';

  const latestWeight = weightLogs[0]?.weight;
  const prevWeight = weightLogs[1]?.weight;
  const wDiff = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null;

  const latestFat = fatLogs[0]?.fatPercent;
  const prevFat = fatLogs[1]?.fatPercent;
  const fDiff = latestFat && prevFat ? (latestFat - prevFat).toFixed(1) : null;

  // Chronological logs for chart (oldest to newest)
  const chronologicalWeightLogs = useMemo(() => {
    return [...weightLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weightLogs]);

  // Chart coordinate calculations
  const chartData = useMemo(() => {
    if (chronologicalWeightLogs.length < 2) return null;

    const weights = chronologicalWeightLogs.map((l) => l.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const rawSpan = maxW - minW;
    const padding = rawSpan === 0 ? 1 : Math.max(0.5, rawSpan * 0.18);
    const yMin = Math.max(0, parseFloat((minW - padding).toFixed(1)));
    const yMax = parseFloat((maxW + padding).toFixed(1));
    const ySpan = yMax - yMin || 1;

    const svgWidth = 840;
    const svgHeight = 220;
    const padL = 55;
    const padR = 40;
    const padT = 25;
    const padB = 40;
    const plotW = svgWidth - padL - padR;
    const plotH = svgHeight - padT - padB;

    const points = chronologicalWeightLogs.map((log, i) => {
      const x = padL + (i / (chronologicalWeightLogs.length - 1)) * plotW;
      const y = padT + plotH - ((log.weight - yMin) / ySpan) * plotH;
      const { tag, cleanNotes } = parseMealTag(log.notes);
      return { x, y, log, tag, cleanNotes, index: i };
    });

    // Smooth bezier curve path
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const cpX1 = prev.x + (cur.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (cur.x - prev.x) / 2;
      const cpY2 = cur.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${cur.x} ${cur.y}`;
    }

    // Closed area for subtle teal gradient
    const lastP = points[points.length - 1];
    const firstP = points[0];
    const areaPath = `${linePath} L ${lastP.x} ${padT + plotH} L ${firstP.x} ${padT + plotH} Z`;

    // 4 Y-axis guide lines
    const guides = [0, 0.33, 0.66, 1].map((ratio) => {
      const val = parseFloat((yMin + ratio * ySpan).toFixed(1));
      const y = padT + plotH - ratio * plotH;
      return { val, y };
    });

    const netChange = (weights[weights.length - 1] - weights[0]).toFixed(1);

    return {
      svgWidth,
      svgHeight,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      points,
      linePath,
      areaPath,
      guides,
      minW,
      maxW,
      netChange,
    };
  }, [chronologicalWeightLogs]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Vücut Takibi</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#4ECDC4]/15 text-[#4ECDC4] border border-[#4ECDC4]/30">
              Kilo & Hedef
            </span>
          </h1>
          <p className="text-gray-400 mt-1">Kilo ve vücut kompozisyonu kayıtlarını ve zaman içindeki gelişimini yönetin</p>
        </div>

        {/* Actions / User Selector */}
        <div className="flex items-center gap-3">
          {selectedUserId && (
            <button
              onClick={() => setShowAddWeightModal(true)}
              className="flex items-center gap-2 bg-[#4ECDC4] hover:bg-[#45B8B0] text-gray-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#4ECDC4]/20"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Kilo Ekle</span>
            </button>
          )}

          <select
            className="bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ECDC4] transition-colors"
            value={selectedUserId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const id = parseInt(val);
                setSelectedUserId(id);
                localStorage.setItem('selectedUserId', id.toString());
              } else {
                setSelectedUserId(null);
                localStorage.removeItem('selectedUserId');
              }
            }}
          >
            <option value="">Kullanıcı Seç</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium animate-fadeIn">
          <span>✓ {successToast}</span>
        </div>
      )}

      {!selectedUserId ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center mb-4">
            <Scale size={36} className="text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg">Veri görmek için bir kullanıcı seçin</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Güncel Kilo', value: latestWeight ? `${latestWeight} kg` : '—', color: tealAccent, icon: Scale },
              { label: 'Kilo Değişim', value: wDiff ? `${parseFloat(wDiff) > 0 ? '+' : ''}${wDiff} kg` : '—', color: parseFloat(wDiff ?? '0') > 0 ? '#FF6B4A' : '#5DD97C', icon: parseFloat(wDiff ?? '0') > 0 ? TrendingUp : TrendingDown },
              { label: 'Güncel Yağ', value: latestFat ? `${latestFat}%` : '—', color: orangeAccent, icon: BarChart3 },
              { label: 'Yağ Değişim', value: fDiff ? `${parseFloat(fDiff) > 0 ? '+' : ''}${fDiff}%` : '—', color: parseFloat(fDiff ?? '0') > 0 ? '#FF6B4A' : '#5DD97C', icon: parseFloat(fDiff ?? '0') > 0 ? TrendingUp : TrendingDown },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-[#141414] rounded-2xl border border-[#242424] p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + '22' }}>
                      <Icon size={18} style={{ color: stat.color }} />
                    </div>
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold tracking-tight" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* ============ KİLO YÜKSELİŞ GRAFİĞİ (LINE CHART) ============ */}
          {/* Positioned directly under the 4 cards */}
          <div className="bg-[#141414] rounded-2xl border border-[#242424] p-6 mb-8 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-[#242424] gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4ECDC4]/15 border border-[#4ECDC4]/30 flex items-center justify-center">
                  <Activity size={20} className="text-[#4ECDC4]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Kilo Yükseliş ve Değişim Trendi
                  </h2>
                  <p className="text-xs text-gray-400">
                    Zaman içindeki kilo kaydı dalgalanmaları ve aç/tok ölçüm detayları
                  </p>
                </div>
              </div>

              {chartData && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-lg bg-[#1E1E1E] text-gray-300 border border-[#2E2E2E]">
                    En Düşük: <strong className="text-[#4ECDC4]">{chartData.minW} kg</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-[#1E1E1E] text-gray-300 border border-[#2E2E2E]">
                    En Yüksek: <strong className="text-white">{chartData.maxW} kg</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-[#1E1E1E] text-gray-300 border border-[#2E2E2E]">
                    Net Değişim:{' '}
                    <strong style={{ color: parseFloat(chartData.netChange) > 0 ? '#FF6B4A' : '#5DD97C' }}>
                      {parseFloat(chartData.netChange) > 0 ? '+' : ''}{chartData.netChange} kg
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Interactive SVG Chart */}
            {chartData ? (
              <div className="relative pt-4 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`}
                  className="w-full h-[230px] min-w-[620px] select-none"
                >
                  <defs>
                    <linearGradient id="weightGradTeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.32" />
                      <stop offset="60%" stopColor="#4ECDC4" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="tealGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4ECDC4" floodOpacity="0.5" />
                    </filter>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {chartData.guides.map((g, idx) => (
                    <g key={idx}>
                      <line
                        x1={chartData.padL}
                        y1={g.y}
                        x2={chartData.svgWidth - chartData.padR}
                        y2={g.y}
                        stroke="#262626"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={chartData.padL - 10}
                        y={g.y + 4}
                        fill="#6B7280"
                        fontSize="11"
                        textAnchor="end"
                        fontWeight="500"
                      >
                        {g.val} kg
                      </text>
                    </g>
                  ))}

                  {/* Area gradient fill */}
                  <path d={chartData.areaPath} fill="url(#weightGradTeal)" />

                  {/* Main Line */}
                  <path
                    d={chartData.linePath}
                    fill="none"
                    stroke="#4ECDC4"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#tealGlow)"
                  />

                  {/* Data Points */}
                  {chartData.points.map((p, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isAc = p.tag === 'ac';
                    const isTok = p.tag === 'tok';
                    const pointColor = isAc ? '#34D399' : isTok ? '#F59E0B' : '#4ECDC4';

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Invisible larger hit area */}
                        <circle cx={p.x} cy={p.y} r="16" fill="transparent" />

                        {/* Outer hover ripple */}
                        {isHovered && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="11"
                            fill="none"
                            stroke={pointColor}
                            strokeWidth="2"
                            strokeOpacity="0.5"
                          />
                        )}

                        {/* Core Point Dot */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6.5 : 4.5}
                          fill="#141414"
                          stroke={pointColor}
                          strokeWidth="2.5"
                        />

                        {/* X-axis date labels */}
                        <text
                          x={p.x}
                          y={chartData.svgHeight - 12}
                          fill={isHovered ? '#FFF' : '#6B7280'}
                          fontSize="10"
                          fontWeight={isHovered ? '700' : '500'}
                          textAnchor="middle"
                        >
                          {new Date(p.log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip when hovering over a point */}
                {hoveredIndex !== null && chartData.points[hoveredIndex] && (() => {
                  const p = chartData.points[hoveredIndex];
                  const prevP = chartData.points[hoveredIndex - 1];
                  const diff = prevP ? (p.log.weight - prevP.log.weight).toFixed(1) : null;
                  const leftPercent = (p.x / chartData.svgWidth) * 100;

                  return (
                    <div
                      className="absolute z-20 pointer-events-none transform -translate-x-1/2 transition-all duration-150"
                      style={{
                        left: `${leftPercent}%`,
                        top: Math.max(10, p.y - 85),
                      }}
                    >
                      <div className="bg-[#1E1E1E] text-white border border-[#383838] px-3.5 py-2.5 rounded-xl shadow-2xl flex flex-col gap-1 min-w-[150px]">
                        <div className="flex items-center justify-between gap-2 border-b border-[#2E2E2E] pb-1.5">
                          <span className="text-xs text-gray-400">
                            {new Date(p.log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          {diff && (
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: parseFloat(diff) > 0 ? '#FF6B4A' : '#5DD97C' }}
                            >
                              {parseFloat(diff) > 0 ? '+' : ''}{diff} kg
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-[#4ECDC4]">{p.log.weight}</span>
                          <span className="text-xs text-gray-400">kg</span>
                        </div>

                        {/* Aç / Tok Rozeti */}
                        {p.tag === 'ac' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit">
                            🌅 Aç Karnına (Sabah)
                          </span>
                        )}
                        {p.tag === 'tok' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 w-fit">
                            🍽️ Tok / Gün İçi
                          </span>
                        )}

                        {p.cleanNotes ? (
                          <p className="text-[11px] text-gray-400 italic mt-0.5 line-clamp-2">
                            &quot;{p.cleanNotes}&quot;
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}

                {/* Legend bar */}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400 px-2 pt-2 border-t border-[#1F1F1F]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4ECDC4]" />
                      <span>Standart Ölçüm</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
                      <span>🌅 Aç Karnına</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                      <span>🍽️ Tok / Gün İçi</span>
                    </span>
                  </div>
                  <span className="text-gray-500 hidden sm:inline">Detay görmek için noktaların üzerine gelin</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Activity size={28} className="text-gray-600" />
                <p className="text-sm">Grafik oluşturabilmek için en az 2 kilo kaydı gereklidir.</p>
              </div>
            )}
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-2 bg-[#141414] rounded-2xl p-1.5 w-fit mb-6 border border-[#242424]">
            {[
              { id: 'kilo' as const, label: 'Kilo Kayıtları', color: tealAccent },
              { id: 'yag' as const, label: 'Yağ Oranı Kayıtları', color: orangeAccent },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: activeTab === tab.id ? tab.color : 'transparent',
                  color: activeTab === tab.id ? '#111' : '#9CA3AF',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Yükleniyor...</div>
          ) : activeTab === 'kilo' ? (
            <div className="bg-[#141414] rounded-2xl border border-[#242424] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#242424] flex items-center justify-between">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <span>Kilo Geçmişi</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#242424] text-gray-400">
                    {weightLogs.length} kayıt
                  </span>
                </h2>
                <button
                  onClick={() => setShowAddWeightModal(true)}
                  className="text-xs font-semibold text-[#4ECDC4] hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Yeni Ekle
                </button>
              </div>
              {weightLogs.length === 0 ? (
                <div className="py-16 text-center text-gray-500">Kayıt bulunamadı</div>
              ) : (
                <div className="divide-y divide-[#202020]">
                  {weightLogs.map((log, index) => {
                    const prev = weightLogs[index + 1];
                    const d = prev ? (log.weight - prev.weight).toFixed(1) : null;
                    const gain = d ? parseFloat(d) > 0 : false;
                    const { tag, cleanNotes } = parseMealTag(log.notes);

                    return (
                      <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tealAccent + '22' }}>
                          <Scale size={18} style={{ color: tealAccent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="font-bold text-white text-base">{log.weight} kg</p>

                            {/* Aç / Tok Rozetleri */}
                            {tag === 'ac' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                🌅 Aç Karnına (Sabah)
                              </span>
                            )}
                            {tag === 'tok' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                🍽️ Tok / Gün İçi
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-400 mt-0.5">
                            {new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          {cleanNotes && <p className="text-xs text-gray-400 mt-1 italic">&quot;{cleanNotes}&quot;</p>}
                        </div>
                        {d && (
                          <div
                            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shrink-0"
                            style={{ backgroundColor: gain ? '#FF6B4A18' : '#5DD97C18', color: gain ? '#FF6B4A' : '#5DD97C' }}
                          >
                            {gain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {gain ? '+' : ''}{d} kg
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteWeight(log.id)}
                          className="text-gray-600 hover:text-red-500 transition-colors p-1 shrink-0"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#141414] rounded-2xl border border-[#242424] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#242424] flex items-center justify-between">
                <h2 className="font-bold text-white">Yağ Oranı Geçmişi</h2>
                <span className="text-sm text-gray-400">{fatLogs.length} kayıt</span>
              </div>
              {fatLogs.length === 0 ? (
                <div className="py-16 text-center text-gray-500">Kayıt bulunamadı</div>
              ) : (
                <div className="divide-y divide-[#202020]">
                  {fatLogs.map((log, index) => {
                    const prev = fatLogs[index + 1];
                    const d = prev ? (log.fatPercent - prev.fatPercent).toFixed(1) : null;
                    const gain = d ? parseFloat(d) > 0 : false;
                    const cat = getFatCategory(log.fatPercent);
                    return (
                      <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: orangeAccent + '22' }}>
                          <BarChart3 size={18} style={{ color: orangeAccent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white">{log.fatPercent}%</p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ backgroundColor: cat.color + '22', color: cat.color }}>
                              {cat.label}
                            </span>
                            {log.weight && <span className="text-xs text-gray-500">{log.weight} kg</span>}
                          </div>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          {log.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{log.notes}</p>}
                        </div>
                        {d && (
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shrink-0"
                            style={{ backgroundColor: gain ? '#FF6B4A18' : '#5DD97C18', color: gain ? '#FF6B4A' : '#5DD97C' }}>
                            {gain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {gain ? '+' : ''}{d}%
                          </div>
                        )}
                        <button onClick={() => handleDeleteFat(log.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1 shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ YENİ KİLO KAYDI EKLEME MODALI ============ */}
      {showAddWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4ECDC4]/20 flex items-center justify-center text-[#4ECDC4]">
                  <Scale size={18} />
                </div>
                <h3 className="font-bold text-lg text-white">Yeni Kilo Kaydı Ekle</h3>
              </div>
              <button
                onClick={() => setShowAddWeightModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWeightLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Kilo (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Örn: 74.5"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tarih *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              {/* Aç / Tok Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Ölçüm Durumu (Aç / Tok)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTag(newTag === 'ac' ? null : 'ac')}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      newTag === 'ac'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-[#222] text-gray-400 border-[#333] hover:border-[#444]'
                    }`}
                  >
                    <span>🌅</span>
                    <span>Aç Karnına (Sabah)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTag(newTag === 'tok' ? null : 'tok')}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      newTag === 'tok'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-[#222] text-gray-400 border-[#333] hover:border-[#444]'
                    }`}
                  >
                    <span>🍽️</span>
                    <span>Tok / Gün İçi</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Not (İsteğe bağlı)</label>
                <textarea
                  rows={2}
                  placeholder="Ölçümle ilgili notlar..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddWeightModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submittingWeight || !newWeight || !newDate}
                  className="bg-[#4ECDC4] hover:bg-[#45B8B0] disabled:opacity-40 text-gray-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                >
                  {submittingWeight ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
