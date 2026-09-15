'use client';

import { useEffect, useState } from 'react';
import { BarChart2, Activity, Clock, Dumbbell, User, Calendar, PieChart, TrendingUp } from 'lucide-react';

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

interface UserModel {
  id: number;
  name: string;
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    const saved = localStorage.getItem('selectedUserId');
    if (saved) setSelectedUserId(parseInt(saved));
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const url = selectedUserId ? `/api/workout-sessions?userId=${selectedUserId}` : '/api/workout-sessions';
      const [sessionsRes, programsRes] = await Promise.all([
        fetch(url),
        fetch('/api/programs'),
      ]);
      
      const sessionsData = await sessionsRes.json();
      const programsData = await programsRes.json();
      
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setPrograms(Array.isArray(programsData) ? programsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseDuration = (dur?: string) => {
    if (!dur) return 0;
    let mins = 0;
    const hoursMatch = dur.match(/(\d+)s/);
    const minsMatch = dur.match(/(\d+)dk/);
    if (hoursMatch) mins += parseInt(hoursMatch[1]) * 60;
    if (minsMatch) mins += parseInt(minsMatch[1]);
    return mins;
  };

  // Stats
  const totalWorkouts = sessions.length;
  const totalExercises = sessions.reduce((sum, s) => sum + (s.completed_exercises || 0), 0);
  
  let totalSets = 0;
  sessions.forEach(session => {
    const program = programs.find(p => p.id === session.programId);
    if (program?.exercises?.length) {
      const avgSets = program.exercises.reduce((sum: number, ex: any) => sum + (ex.sets || 0), 0) / program.exercises.length;
      totalSets += (session.completed_exercises || 0) * avgSets;
    }
  });
  totalSets = Math.round(totalSets);

  const totalMinutes = sessions.reduce((sum, s) => sum + parseDuration(s.duration), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Program Distribution
  const programCounts = sessions.reduce((acc: any, session) => {
    const name = session.program_name || 'Diğer';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const mostUsedProgram = Object.entries(programCounts).sort((a: any, b: any) => b[1] - a[1])[0];

  // Daily Activity (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  const dailyWorkouts = last7Days.map(date => {
    const count = sessions.filter(s => s.startTime.split('T')[0] === date).length;
    return { date, count };
  });
  const maxDailyCount = Math.max(...dailyWorkouts.map(d => d.count), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analizler</h1>
          <p className="text-gray-400">Genel sistem veya kullanıcı bazlı istatistikler</p>
        </div>
        
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
            <option value="">Tüm Kullanıcılar (Genel)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Yükleniyor...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
            <BarChart2 size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Veri Bulunamadı</h3>
          <p className="text-gray-400">Seçilen kriterlere uygun antrenman kaydı yok.</p>
        </div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#6366F1]/10">
                  <Activity size={18} className="text-[#6366F1]" />
                </div>
                <span className="text-sm text-gray-400">Toplam Antrenman</span>
              </div>
              <p className="text-3xl font-bold text-white">{totalWorkouts}</p>
            </div>

            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#5DD97C]/10">
                  <Clock size={18} className="text-[#5DD97C]" />
                </div>
                <span className="text-sm text-gray-400">Toplam Süre</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {totalHours > 0 ? `${totalHours}s ` : ''}{remainingMinutes}dk
              </p>
            </div>

            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF6B4A]/10">
                  <Dumbbell size={18} className="text-[#FF6B4A]" />
                </div>
                <span className="text-sm text-gray-400">Tamamlanan Set</span>
              </div>
              <p className="text-3xl font-bold text-white">{totalSets}</p>
            </div>

            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF6B9D]/10">
                  <TrendingUp size={18} className="text-[#FF6B9D]" />
                </div>
                <span className="text-sm text-gray-400">Yapılan Hareket</span>
              </div>
              <p className="text-3xl font-bold text-white">{totalExercises}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Chart (Last 7 Days) */}
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-[#6366F1]" /> Son 7 Gün Aktivitesi
                </h3>
              </div>
              
              <div className="flex items-end justify-between h-48 gap-2">
                {dailyWorkouts.map((day, idx) => {
                  const heightPercent = (day.count / maxDailyCount) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-3 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 bg-[#2A2A2A] text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {day.count} Antrenman
                      </div>
                      
                      <div className="w-full bg-[#1A1A1A] rounded-t-lg mt-auto overflow-hidden h-full flex items-end">
                        <div 
                          className="w-full bg-gradient-to-t from-[#6366F1] to-[#8B5CF6] transition-all duration-500 rounded-t-lg"
                          style={{ height: `${Math.max(heightPercent, 5)}%` }} // min 5% for visibility
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Program Distribution */}
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <PieChart size={18} className="text-[#5DD97C]" /> Program Dağılımı
                </h3>
              </div>
              
              <div className="space-y-4">
                {Object.entries(programCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([name, count]: any, idx) => {
                  const percent = Math.round((count / totalWorkouts) * 100);
                  const colors = ['#6366F1', '#5DD97C', '#FF6B4A', '#4ECDC4', '#FF6B9D'];
                  const color = colors[idx % colors.length];
                  
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-white">{name}</span>
                        <span className="text-gray-400">{count} ({percent}%)</span>
                      </div>
                      <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {mostUsedProgram && (
                <div className="mt-6 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center shrink-0">
                    <span className="text-xl">🏆</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">En Çok Kullanılan</p>
                    <p className="text-white font-bold text-sm">{mostUsedProgram[0]}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
