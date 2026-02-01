'use client';

import { useEffect, useState } from 'react';

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

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetValue: 0,
    unit: 'set',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goals');
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals';
      const method = editingGoal ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: 1, // TODO: Get from selected user
          currentValue: editingGoal?.currentValue || 0,
          status: editingGoal?.status || 'active',
        }),
      });

      if (response.ok) {
        await loadGoals();
        setShowForm(false);
        setEditingGoal(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await loadGoals();
      }
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
      unit: goal.unit,
      startDate: goal.startDate.split('T')[0],
      endDate: goal.endDate.split('T')[0],
    });
    setShowForm(true);
  };

  const handleStatusChange = async (goal: Goal, newStatus: 'active' | 'completed' | 'failed') => {
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...goal,
          status: newStatus,
        }),
      });

      if (response.ok) {
        await loadGoals();
      }
    } catch (error) {
      console.error('Error updating goal status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetValue: 0,
      unit: 'set',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
  };

  const getProgress = (goal: Goal) => {
    if (!goal.targetValue || goal.targetValue === 0) return 0;
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'failed': return 'Başarısız';
      default: return 'Aktif';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Hedefler</h1>
          <p className="text-gray-400">Kullanıcı hedeflerini yönetin</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingGoal(null);
            resetForm();
          }}
          className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
        >
          {showForm ? 'İptal' : '+ Yeni Hedef Ekle'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-[#1A1A1A] rounded-2xl p-6 mb-8 border border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-white mb-6">
            {editingGoal ? 'Hedef Düzenle' : 'Yeni Hedef Ekle'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Hedef Başlığı</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Birim</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                >
                  <option value="set">Set</option>
                  <option value="hareket">Hareket</option>
                  <option value="program">Program</option>
                  <option value="dakika">Dakika</option>
                  <option value="kg">Kilogram</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Hedef Değer</label>
                <input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Açıklama (Opsiyonel)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                {editingGoal ? 'Güncelle' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                  resetForm();
                }}
                className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            Henüz hedef eklenmemiş
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all"
            >
              {/* Goal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-sm text-gray-400">{goal.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(goal)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">İlerleme</span>
                  <span className="text-white font-semibold">
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </span>
                </div>
                <div className="w-full bg-[#0F0F0F] rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] h-full transition-all duration-500"
                    style={{ width: `${getProgress(goal)}%` }}
                  />
                </div>
                <div className="text-right text-sm text-gray-400 mt-1">
                  {getProgress(goal).toFixed(0)}%
                </div>
              </div>

              {/* Dates */}
              <div className="flex justify-between text-sm text-gray-400 mb-4">
                <div>
                  <div className="text-xs">Başlangıç</div>
                  <div className="text-white">{new Date(goal.startDate).toLocaleDateString('tr-TR')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">Bitiş</div>
                  <div className="text-white">{new Date(goal.endDate).toLocaleDateString('tr-TR')}</div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(goal.status)}`}>
                  {getStatusText(goal.status)}
                </span>
                
                {goal.status === 'active' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(goal, 'completed')}
                      className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      ✓ Tamamla
                    </button>
                    <button
                      onClick={() => handleStatusChange(goal, 'failed')}
                      className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      ✗ Başarısız
                    </button>
                  </div>
                )}
                
                {(goal.status === 'completed' || goal.status === 'failed') && (
                  <button
                    onClick={() => handleStatusChange(goal, 'active')}
                    className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    ↩ Geri Çek
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
