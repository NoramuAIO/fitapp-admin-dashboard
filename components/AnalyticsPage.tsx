'use client';

import { useEffect, useState } from 'react';

interface WorkoutSession {
  id: number;
  userId: number;
  programId: number;
  startTime: string;
  duration?: string;
  category: string;
  program_name: string;
  user_name: string;
  completed_exercises: number;
  total_reps: number;
}

interface Program {
  id: number;
  name: string;
  exercises: any[];
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    // Get selected user from localStorage
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('selectedUserId');
      if (savedUserId) {
        setSelectedUserId(parseInt(savedUserId));
      }
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadData();
    }
  }, [selectedUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, programsRes] = await Promise.all([
        fetch(`/api/workout-sessions?userId=${selectedUserId}`),
        fetch('/api/programs'),
      ]);
      
      const sessionsData = await sessionsRes.json();
      const programsData = await programsRes.json();
      
      setSessions(sessionsData);
      setPrograms(programsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Analizler
  const totalWorkouts = sessions.length;
  const totalExercises = sessions.reduce((sum, s) => sum + (s.completed_exercises || 0), 0);
  
  // Set hesaplama - her exercise için ortalama set sayısı
  let totalSets = 0;
  sessions.forEach(session => {
    const program = programs.find(p => p.id === session.programId);
    if (program?.exercises) {
      const avgSets = program.exercises.reduce((sum, ex) => sum + ex.sets, 0) / program.exercises.length;
      totalSets += (session.completed_exercises || 0) * avgSets;
    }
  });
  totalSets = Math.round(totalSets);

  // Toplam süre hesaplama
  const getTotalMinutes = () => {
    return sessions.reduce((total, session) => {
      if (session.duration) {
        const hourMatch = session.duration.match(/(\d+)s/);
        const minuteMatch = session.duration.match(/(\d+)dk/);
        let minutes = 0;
        if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
        if (minuteMatch) minutes += parseInt(minuteMatch[1]);
        return total + minutes;
      }
      return total;
    }, 0);
  };

  const totalMinutes = getTotalMinutes();
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // En çok yapılan program
  const programCounts = sessions.reduce((acc: any, session) => {
    acc[session.program_name] = (acc[session.program_name] || 0) + 1;
    return acc;
  }, {});
  const mostUsedProgram = Object.entries(programCounts).sort((a: any, b: any) => b[1] - a[1])[0];

  // Haftalık aktivite
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyWorkouts = last7Days.map(date => {
    const count = sessions.filter(s => s.startTime.split('T')[0] === date).length;
    return { date, count };
  });

  // Kategori dağılımı
  const categoryStats = sessions.reduce((acc: any, session) => {
    const cat = session.category === 'workout' ? 'Antreman' : 'Set';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Son antrenmanlar
  const recentWorkouts = sessions.slice(0, 10);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (!selectedUserId) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-gray-400 text-xl">Lütfen bir kullanıcı seçin</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Detaylı Analizler</h1>
        <p className="text-gray-400">Kullanıcı performans ve aktivite analizi</p>
      </div>

      {/* Genel İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏋️</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalWorkouts}</div>
          <div className="text-sm text-gray-400">Toplam Antreman</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💪</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalSets}</div>
          <div className="text-sm text-gray-400">Toplam Set</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-2xl p-6 border border-orange-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalExercises}</div>
          <div className="text-sm text-gray-400">Toplam Hareket</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalHours}s {remainingMinutes}dk</div>
          <div className="text-sm text-gray-400">Toplam Süre</div>
        </div>
      </div>

      {/* İki Sütunlu Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Haftalık Aktivite */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-white mb-6">Son 7 Gün Aktivitesi</h2>
          <div className="space-y-4">
            {dailyWorkouts.map((day, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-400">
                  {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-[#0F0F0F] rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] h-full flex items-center justify-center text-white text-sm font-semibold transition-all duration-500"
                      style={{ width: `${Math.min((day.count / Math.max(...dailyWorkouts.map(d => d.count), 1)) * 100, 100)}%` }}
                    >
                      {day.count > 0 && day.count}
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-gray-400">
                  {day.count} antreman
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Program Dağılımı */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-white mb-6">Program Dağılımı</h2>
          <div className="space-y-4">
            {Object.entries(programCounts).map(([program, count], index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-white font-medium mb-2">{program}</div>
                  <div className="w-full bg-[#0F0F0F] rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-500"
                      style={{ width: `${((count as number) / totalWorkouts) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-white font-bold">{count as number}</div>
                  <div className="text-xs text-gray-400">{(((count as number) / totalWorkouts) * 100).toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* En Çok Kullanılan Program */}
      {mostUsedProgram && (
        <div className="bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 rounded-2xl p-6 border border-[#6366F1]/30 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-2xl flex items-center justify-center text-3xl">
              🏆
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">En Çok Kullanılan Program</div>
              <div className="text-2xl font-bold text-white">{String(mostUsedProgram[0])}</div>
              <div className="text-sm text-gray-400">{mostUsedProgram[1] as number} kez yapıldı</div>
            </div>
          </div>
        </div>
      )}

      {/* Kategori İstatistikleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {Object.entries(categoryStats).map(([category, count], index) => (
          <div key={index} className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{category}</h3>
              <span className="text-3xl">{category === 'Antreman' ? '🏋️' : '⚡'}</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{count as number}</div>
            <div className="text-sm text-gray-400">
              Toplam {category.toLowerCase()} sayısı
            </div>
          </div>
        ))}
      </div>

      {/* Son Antrenmanlar */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="p-6 border-b border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-white">Son Antrenmanlar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Tarih</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Program</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Kategori</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Süre</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-400">Hareketler</th>
              </tr>
            </thead>
            <tbody>
              {recentWorkouts.map((session) => (
                <tr key={session.id} className="border-b border-[#2A2A2A] hover:bg-[#222] transition-colors">
                  <td className="p-4 text-white">
                    {new Date(session.startTime).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-4 text-white font-medium">{session.program_name}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      session.category === 'workout' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {session.category === 'workout' ? 'Antreman' : 'Set'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{session.duration || '-'}</td>
                  <td className="p-4 text-gray-400">{session.completed_exercises || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
