'use client';

import { useEffect, useState } from 'react';
import { Scale, TrendingDown, TrendingUp, Trash2, BarChart3 } from 'lucide-react';

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

export default function BodyAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [fatLogs, setFatLogs] = useState<BodyFatLog[]>([]);
  const [activeTab, setActiveTab] = useState<'kilo' | 'yag'>('kilo');
  const [loading, setLoading] = useState(false);

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
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    await fetch(`/api/weight-logs?id=${id}`, { method: 'DELETE' });
    if (selectedUserId) loadData(selectedUserId);
  };

  const handleDeleteFat = async (id: number) => {
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    await fetch(`/api/body-fat-logs?id=${id}`, { method: 'DELETE' });
    if (selectedUserId) loadData(selectedUserId);
  };

  const tealAccent = '#4ECDC4';
  const orangeAccent = '#FF8C42';

  const latestWeight = weightLogs[0]?.weight;
  const prevWeight = weightLogs[1]?.weight;
  const wDiff = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null;

  const latestFat = fatLogs[0]?.fatPercent;
  const prevFat = fatLogs[1]?.fatPercent;
  const fDiff = latestFat && prevFat ? (latestFat - prevFat).toFixed(1) : null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Vücut Takibi</h1>
          <p className="text-gray-400 mt-1">Kilo ve yağ oranı kayıtlarını yönetin</p>
        </div>

        {/* User Selector */}
        <select
          className="bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1]"
          value={selectedUserId ?? ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            setSelectedUserId(id);
            localStorage.setItem('selectedUserId', id.toString());
          }}
        >
          <option value="">Kullanıcı Seç</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {!selectedUserId ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
            <Scale size={36} className="text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg">Veri görmek için bir kullanıcı seçin</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Güncel Kilo', value: latestWeight ? `${latestWeight} kg` : '—', color: tealAccent, icon: Scale },
              { label: 'Kilo Değişim', value: wDiff ? `${parseFloat(wDiff) > 0 ? '+' : ''}${wDiff} kg` : '—', color: parseFloat(wDiff ?? '0') > 0 ? '#FF6B4A' : '#5DD97C', icon: parseFloat(wDiff ?? '0') > 0 ? TrendingUp : TrendingDown },
              { label: 'Güncel Yağ', value: latestFat ? `${latestFat}%` : '—', color: orangeAccent, icon: BarChart3 },
              { label: 'Yağ Değişim', value: fDiff ? `${parseFloat(fDiff) > 0 ? '+' : ''}${fDiff}%` : '—', color: parseFloat(fDiff ?? '0') > 0 ? '#FF6B4A' : '#5DD97C', icon: parseFloat(fDiff ?? '0') > 0 ? TrendingUp : TrendingDown },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + '22' }}>
                      <Icon size={18} style={{ color: stat.color }} />
                    </div>
                    <span className="text-sm text-gray-400">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-2 bg-[#1A1A1A] rounded-2xl p-1.5 w-fit mb-6 border border-[#2A2A2A]">
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
                  color: activeTab === tab.id ? '#FFF' : '#9CA3AF',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Yükleniyor...</div>
          ) : activeTab === 'kilo' ? (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <h2 className="font-bold text-white">Kilo Geçmişi</h2>
                <span className="text-sm text-gray-400">{weightLogs.length} kayıt</span>
              </div>
              {weightLogs.length === 0 ? (
                <div className="py-16 text-center text-gray-500">Kayıt bulunamadı</div>
              ) : (
                <div className="divide-y divide-[#2A2A2A]">
                  {weightLogs.map((log, index) => {
                    const prev = weightLogs[index + 1];
                    const d = prev ? (log.weight - prev.weight).toFixed(1) : null;
                    const gain = d ? parseFloat(d) > 0 : false;
                    return (
                      <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tealAccent + '22' }}>
                          <Scale size={18} style={{ color: tealAccent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white">{log.weight} kg</p>
                          <p className="text-sm text-gray-500">
                            {new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          {log.notes && <p className="text-xs text-gray-600 mt-0.5 italic">{log.notes}</p>}
                        </div>
                        {d && (
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                            style={{ backgroundColor: gain ? '#FF6B4A18' : '#5DD97C18', color: gain ? '#FF6B4A' : '#5DD97C' }}>
                            {gain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {gain ? '+' : ''}{d}
                          </div>
                        )}
                        <button onClick={() => handleDeleteWeight(log.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <h2 className="font-bold text-white">Yağ Oranı Geçmişi</h2>
                <span className="text-sm text-gray-400">{fatLogs.length} kayıt</span>
              </div>
              {fatLogs.length === 0 ? (
                <div className="py-16 text-center text-gray-500">Kayıt bulunamadı</div>
              ) : (
                <div className="divide-y divide-[#2A2A2A]">
                  {fatLogs.map((log, index) => {
                    const prev = fatLogs[index + 1];
                    const d = prev ? (log.fatPercent - prev.fatPercent).toFixed(1) : null;
                    const gain = d ? parseFloat(d) > 0 : false;
                    const cat = getFatCategory(log.fatPercent);
                    return (
                      <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: orangeAccent + '22' }}>
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
                          <p className="text-sm text-gray-500">
                            {new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          {log.notes && <p className="text-xs text-gray-600 mt-0.5 italic">{log.notes}</p>}
                        </div>
                        {d && (
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                            style={{ backgroundColor: gain ? '#FF6B4A18' : '#5DD97C18', color: gain ? '#FF6B4A' : '#5DD97C' }}>
                            {gain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {gain ? '+' : ''}{d}%
                          </div>
                        )}
                        <button onClick={() => handleDeleteFat(log.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1">
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
    </div>
  );
}
