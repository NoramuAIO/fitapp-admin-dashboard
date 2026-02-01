'use client';

import { useEffect, useState } from 'react';

interface WorkoutSession {
  id: number;
  userId: number;
  programId: number;
  startTime: string;
  endTime?: string;
  duration?: string;
  category: string;
  program_name: string;
  user_name: string;
  completed_exercises: number;
  total_reps: number;
}

export default function TimePage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workout-sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return '-';
    return duration;
  };

  const getTotalDuration = () => {
    return sessions.reduce((total, session) => {
      if (session.duration) {
        // Duration formatı: "1s 15dk" veya "45dk"
        let totalMinutes = 0;
        
        // Saat varsa
        const hourMatch = session.duration.match(/(\d+)s/);
        if (hourMatch) {
          totalMinutes += parseInt(hourMatch[1]) * 60;
        }
        
        // Dakika varsa
        const minuteMatch = session.duration.match(/(\d+)dk/);
        if (minuteMatch) {
          totalMinutes += parseInt(minuteMatch[1]);
        }
        
        return total + totalMinutes;
      }
      return total;
    }, 0);
  };

  const getTotalWorkouts = () => {
    return sessions.length;
  };

  const getAverageDuration = () => {
    const total = getTotalDuration();
    const count = sessions.filter(s => s.duration).length;
    if (count === 0) return 0;
    return Math.round(total / count);
  };

  const totalMinutes = getTotalDuration();
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const avgDuration = getAverageDuration();

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Zaman Yönetimi</h1>
        <p className="text-gray-400">Antrenman süreleri ve istatistikler</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {totalHours}s {remainingMinutes}dk
          </div>
          <div className="text-sm text-gray-400">Toplam Antrenman Süresi</div>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏋️</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{getTotalWorkouts()}</div>
          <div className="text-sm text-gray-400">Toplam Antrenman</div>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{avgDuration} dk</div>
          <div className="text-sm text-gray-400">Ortalama Süre</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'all'
              ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white'
              : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
          }`}
        >
          Tümü
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'today'
              ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white'
              : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
          }`}
        >
          Bugün
        </button>
        <button
          onClick={() => setFilter('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'week'
              ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white'
              : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
          }`}
        >
          Bu Hafta
        </button>
        <button
          onClick={() => setFilter('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'month'
              ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white'
              : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
          }`}
        >
          Bu Ay
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Kullanıcı</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Program</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Kategori</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Tarih</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Süre</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Hareketler</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Toplam Tekrar</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Henüz antrenman kaydı yok
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-b border-[#2A2A2A] hover:bg-[#222] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg flex items-center justify-center text-white font-bold">
                          {session.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-white font-medium">{session.user_name || 'Bilinmeyen'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white">{session.program_name}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded-full text-sm font-medium">
                        {session.category || 'Antreman'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{formatDate(session.startTime)}</td>
                    <td className="p-4 text-white font-medium">{formatDuration(session.duration)}</td>
                    <td className="p-4 text-gray-400">{session.completed_exercises || 0}</td>
                    <td className="p-4 text-gray-400">{session.total_reps || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
