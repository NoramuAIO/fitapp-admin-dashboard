'use client';

import { useEffect, useState } from 'react';
import { Target, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Calendar, User, Scale } from 'lucide-react';
import { useConfirm } from '@/components/ConfirmModal';

interface Goal {
  id: number;
  userId: number;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
}

interface UserModel {
  id: number;
  name: string;
  email?: string;
}

export default function GoalsPage() {
  const { confirm } = useConfirm();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formUserId, setFormUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetValue: 0,
    currentValue: 0,
    unit: 'kg',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'active' as 'active' | 'completed' | 'failed'
  });

  useEffect(() => {
    fetchUsers();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedUserId');
      if (saved) setSelectedUserId(parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadGoals = async () => {
    try {
      setLoading(true);
      const url = selectedUserId ? `/api/goals?userId=${selectedUserId}` : '/api/goals';
      const response = await fetch(url);
      const data = await response.json();
      setGoals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveUserId = formUserId || selectedUserId || (users[0]?.id ?? 1);
    
    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals';
      const method = editingGoal ? 'PUT' : 'POST';
      
      const payload = { ...formData, userId: effectiveUserId };
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingGoal(null);
        setSuccessMsg(editingGoal ? 'Hedef başarıyla güncellendi!' : 'Yeni hedef başarıyla oluşturuldu!');
        setTimeout(() => setSuccessMsg(null), 3000);
        loadGoals();
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Hedefi Sil',
      message: 'Bu hedef kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Evet, Sil',
    });
    if (!ok) return;

    const numericId = Number(id);
    // Instant optimistic removal from UI
    setGoals((prev) => prev.filter((g) => Number(g.id) !== numericId));

    try {
      let response = await fetch(`/api/goals/${numericId}`, { method: 'DELETE' });
      if (!response.ok) {
        response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: numericId }),
        });
      }
      if (!response.ok) {
        throw new Error('Hedef silinemedi');
      }
      setSuccessMsg('Hedef başarıyla silindi!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Error deleting goal:', error);
      loadGoals();
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormUserId(goal.userId);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      startDate: goal.startDate ? goal.startDate.split('T')[0] : '',
      endDate: goal.endDate ? goal.endDate.split('T')[0] : '',
      status: goal.status
    });
    setShowForm(true);
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const openNewForm = () => {
    const defaultUser = selectedUserId || (users[0]?.id ?? 1);
    setEditingGoal(null);
    setFormUserId(defaultUser);
    setFormData({
      title: 'Hedef Kilo',
      description: 'Hedeflenen vücut ağırlığı takibi',
      targetValue: 70,
      currentValue: 0,
      unit: 'kg',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'active'
    });
    setShowForm(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative">
      {/* Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#5DD97C] text-gray-950 font-bold px-5 py-3 rounded-2xl shadow-2xl transition-all animate-bounce">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2.5">
            <span>Hedefler & Kilo Takibi</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
              Kişiye Özel
            </span>
          </h1>
          <p className="text-gray-400 text-sm">
            Her kullanıcı için kilo hedeflerini ve özel fitness hedeflerini ayrı ayrı yönetin
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              className="bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-[#6366F1] appearance-none cursor-pointer"
              value={selectedUserId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const id = parseInt(val, 10);
                  setSelectedUserId(id);
                  if (typeof window !== 'undefined') localStorage.setItem('selectedUserId', id.toString());
                } else {
                  setSelectedUserId(null);
                  if (typeof window !== 'undefined') localStorage.removeItem('selectedUserId');
                }
              }}
            >
              <option value="">🌍 Tüm Kullanıcılar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>👤 {u.name} (ID: #{u.id})</option>
              ))}
            </select>
          </div>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#5558DD] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-[#6366F1]/20"
          >
            <Plus size={18} />
            <span>Yeni Hedef Ekle</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : goals.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4 text-[#818CF8]">
            <Target size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Hedef Bulunamadı</h3>
          <p className="text-gray-400 mb-6 max-w-md text-sm">
            {selectedUserId ? 'Bu kullanıcının henüz tanımlanmış bir hedefi yok.' : 'Sistemde henüz kayıtlı bir hedef bulunmuyor.'}
          </p>
          <button onClick={openNewForm} className="bg-[#6366F1] text-white px-5 py-2.5 rounded-xl font-medium text-sm">
            Yeni Hedef Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.currentValue, goal.targetValue);
            const isCompleted = goal.status === 'completed';
            const user = users.find(u => u.id === goal.userId);
            const isKg = goal.unit === 'kg';
            
            return (
              <div key={goal.id} className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6 group hover:border-[#3A3A3A] transition-colors relative flex flex-col justify-between">
                {/* Status Badge */}
                <div className={`absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isCompleted ? 'bg-[#5DD97C]/10 text-[#5DD97C]' : 
                  goal.status === 'failed' ? 'bg-[#FF6B4A]/10 text-[#FF6B4A]' : 
                  'bg-[#6366F1]/10 text-[#6366F1]'
                }`}>
                  {isCompleted ? <CheckCircle2 size={14} /> : 
                   goal.status === 'failed' ? <XCircle size={14} /> : 
                   isKg ? <Scale size={14} /> : <Target size={14} />}
                  {isCompleted ? 'Tamamlandı' : goal.status === 'failed' ? 'Başarısız' : 'Aktif'}
                </div>

                <div>
                  <h3 className="font-bold text-white text-lg mb-1 pr-24">{goal.title}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                      <User size={11} /> {user?.name || `Kullanıcı #${goal.userId}`}
                    </span>
                    {isKg && (
                      <span className="text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        Kilo Hedefi
                      </span>
                    )}
                  </div>
                  {goal.description && <p className="text-sm text-gray-400 mb-4">{goal.description}</p>}

                  {/* Progress Bar */}
                  <div className="mt-3 mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-semibold text-gray-300">İlerleme</span>
                      <span className="font-bold text-white">{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-[#5DD97C]' : isKg ? 'bg-emerald-400' : 'bg-[#6366F1]'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-gray-400">
                      <span>Güncel: <strong className="text-white">{goal.currentValue} {goal.unit}</strong></span>
                      <span>Hedef: <strong className="text-emerald-400">{goal.targetValue} {goal.unit}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[#222] flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(goal)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-[#1F1F1F] hover:bg-[#2A2A2A] transition-colors border border-[#2E2E2E]"
                  >
                    <Edit2 size={13} /> Düzenle
                  </button>
                  <button 
                    onClick={() => handleDelete(goal.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/20"
                  >
                    <Trash2 size={13} /> Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] rounded-3xl border border-[#2A2A2A] p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{editingGoal ? 'Hedefi Düzenle' : 'Yeni Hedef Oluştur'}</h2>
                  <p className="text-xs text-gray-400">Kullanıcıya özel hedef parametrelerini belirleyin</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-500 hover:text-white transition-colors">
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center justify-between">
                  <span>Hedefin Sahibi (Kullanıcı) *</span>
                  <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Kişiye Özel
                  </span>
                </label>
                <select
                  required
                  value={formUserId ?? ''}
                  onChange={(e) => setFormUserId(parseInt(e.target.value, 10))}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      👤 {u.name} (ID: #{u.id} {u.email ? `· ${u.email}` : ''})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Bu hedef yalnızca seçilen kullanıcının mobil profilinde ve ana ekranında görünür.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Hedef Başlığı *</label>
                <input
                  type="text" required
                  placeholder="Örn: Hedef Kilo, 10K Koşu, 100 Şınav..."
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Açıklama (Opsiyonel)</label>
                <textarea
                  placeholder="Hedef ile ilgili motivasyon notu veya ayrıntılar..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none resize-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Hedef Değer *</label>
                  <input
                    type="number" required min="1" step="any"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({...formData, targetValue: Number(e.target.value)})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Birim</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none cursor-pointer"
                  >
                    <option value="kg">Kg (Ağırlık / Kilo)</option>
                    <option value="set">Set</option>
                    <option value="tekrar">Tekrar</option>
                    <option value="hareket">Hareket</option>
                    <option value="program">Program</option>
                    <option value="dakika">Dakika</option>
                  </select>
                </div>
              </div>

              {formData.unit === 'kg' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  🎯 <strong>Kilo Hedefi Entegrasyonu:</strong> Bu değer kullanıcının mobil ana ekranındaki &quot;Kilo Hedefi&quot; widget kartı ve kilo takibi grafiğiyle otomatik senkronize edilir.
                </div>
              )}

              {editingGoal && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Mevcut Değer</label>
                  <input
                    type="number" required min="0" step="any"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({...formData, currentValue: Number(e.target.value)})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Başlangıç Tarihi *</label>
                  <input
                    type="date" required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Bitiş Tarihi (Opsiyonel)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>

              {editingGoal && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none"
                  >
                    <option value="active">Aktif</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="failed">Başarısız</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 bg-[#1F1F1F] text-gray-300 hover:text-white rounded-xl hover:bg-[#2A2A2A] transition-colors font-medium text-sm">
                  İptal
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl hover:bg-[#5558DD] transition-colors font-bold text-sm shadow-lg shadow-[#6366F1]/20">
                  {editingGoal ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
