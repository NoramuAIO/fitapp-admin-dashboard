'use client';

import { useEffect, useState } from 'react';
import { Target, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Calendar, User } from 'lucide-react';

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
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', targetValue: 0, currentValue: 0,
    unit: 'set', startDate: new Date().toISOString().split('T')[0], endDate: '',
    status: 'active'
  });

  useEffect(() => {
    fetchUsers();
    const saved = localStorage.getItem('selectedUserId');
    if (saved) setSelectedUserId(parseInt(saved));
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
    if (!selectedUserId && !editingGoal) {
      alert('Lütfen önce bir kullanıcı seçin.');
      return;
    }
    
    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals';
      const method = editingGoal ? 'PUT' : 'POST';
      
      const payload = { ...formData, userId: selectedUserId || editingGoal?.userId };
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingGoal(null);
        loadGoals();
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu hedefi silmek istediğinizden emin misiniz?')) return;
    try {
      const response = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (response.ok) loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      startDate: new Date(goal.startDate).toISOString().split('T')[0],
      endDate: new Date(goal.endDate).toISOString().split('T')[0],
      status: goal.status
    });
    setShowForm(true);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const openNewForm = () => {
    if (!selectedUserId) {
      alert('Yeni hedef eklemek için lütfen önce bir kullanıcı seçin.');
      return;
    }
    setEditingGoal(null);
    setFormData({
      title: '', description: '', targetValue: 0, currentValue: 0,
      unit: 'set', startDate: new Date().toISOString().split('T')[0], endDate: '',
      status: 'active'
    });
    setShowForm(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Hedefler</h1>
          <p className="text-gray-400">Kullanıcı hedeflerini görüntüleyin ve yönetin</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              className="bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-[#6366F1] appearance-none cursor-pointer"
              value={selectedUserId ?? ''}
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setSelectedUserId(id);
                if (id) localStorage.setItem('selectedUserId', id.toString());
                else localStorage.removeItem('selectedUserId');
              }}
            >
              <option value="">Tüm Kullanıcılar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#5558DD] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={18} />
            Yeni Hedef
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : goals.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
            <Target size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Hedef Bulunamadı</h3>
          <p className="text-gray-400 mb-6 max-w-md">
            {selectedUserId ? 'Bu kullanıcının henüz bir hedefi yok.' : 'Sistemde henüz kayıtlı bir hedef bulunmuyor.'}
          </p>
          {selectedUserId && (
            <button onClick={openNewForm} className="bg-[#6366F1] text-white px-5 py-2.5 rounded-xl font-medium">
              İlk Hedefi Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.currentValue, goal.targetValue);
            const isCompleted = goal.status === 'completed';
            const user = users.find(u => u.id === goal.userId);
            
            return (
              <div key={goal.id} className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6 group hover:border-[#3A3A3A] transition-colors relative">
                {/* Status Badge */}
                <div className={`absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isCompleted ? 'bg-[#5DD97C]/10 text-[#5DD97C]' : 
                  goal.status === 'failed' ? 'bg-[#FF6B4A]/10 text-[#FF6B4A]' : 
                  'bg-[#6366F1]/10 text-[#6366F1]'
                }`}>
                  {isCompleted ? <CheckCircle2 size={14} /> : 
                   goal.status === 'failed' ? <XCircle size={14} /> : 
                   <Target size={14} />}
                  {isCompleted ? 'Tamamlandı' : goal.status === 'failed' ? 'Başarısız' : 'Aktif'}
                </div>

                <h3 className="font-bold text-white text-lg mb-1 pr-24">{goal.title}</h3>
                {!selectedUserId && user && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                    <User size={12} /> {user.name}
                  </p>
                )}
                {goal.description && <p className="text-sm text-gray-400 mb-4">{goal.description}</p>}

                {/* Progress Bar */}
                <div className="mt-4 mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-semibold text-gray-300">İlerleme</span>
                    <span className="font-bold text-white">{progress}%</span>
                  </div>
                  <div className="h-2.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-[#5DD97C]' : 'bg-[#6366F1]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2 text-gray-500">
                    <span>{goal.currentValue} {goal.unit}</span>
                    <span>{goal.targetValue} {goal.unit} hedef</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                  <span className="flex items-center gap-1.5"><Calendar size={14} /> Başlangıç: {new Date(goal.startDate).toLocaleDateString('tr-TR')}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-[#2A2A2A] pt-4">
                  <button 
                    onClick={() => handleEdit(goal)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Edit2 size={16} /> Düzenle
                  </button>
                  <button 
                    onClick={() => handleDelete(goal.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} /> Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] rounded-3xl border border-[#2A2A2A] p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{editingGoal ? 'Hedefi Düzenle' : 'Yeni Hedef'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Başlık</label>
                <input
                  type="text" required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none resize-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Hedef Değer</label>
                  <input
                    type="number" required min="1"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({...formData, targetValue: Number(e.target.value)})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Birim</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none"
                  >
                    <option value="set">Set</option>
                    <option value="tekrar">Tekrar</option>
                    <option value="hareket">Hareket</option>
                    <option value="program">Program</option>
                    <option value="dakika">Dakika</option>
                    <option value="kg">Kg (Ağırlık)</option>
                  </select>
                </div>
              </div>

              {editingGoal && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mevcut Değer</label>
                  <input
                    type="number" required min="0"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({...formData, currentValue: Number(e.target.value)})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Başlangıç</label>
                  <input
                    type="date" required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bitiş (Opsiyonel)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none"
                  />
                </div>
              </div>

              {editingGoal && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl px-4 py-2.5 focus:border-[#6366F1] focus:outline-none"
                  >
                    <option value="active">Aktif</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="failed">Başarısız</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#2A2A2A] transition-colors font-medium">
                  İptal
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl hover:bg-[#5558DD] transition-colors font-medium">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
