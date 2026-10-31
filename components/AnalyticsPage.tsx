'use client';

import { useEffect, useState } from 'react';
import { BarChart2, Activity, Clock, Dumbbell, User, Calendar, PieChart, TrendingUp } from 'lucide-react';

interface WorkoutSession {
  id: number;
  userId: number;
  programId?: number | null;
  startTime: string;
  duration?: string;
  category: string;
  program_name: string;
  user_name: string;
  completed_exercises: number;
  total_sets?: number;
  total_reps?: number;
  is_manual_timer?: boolean;
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

  // Separate real workout sessions from manual timer logs
  const workoutSessions = sessions.filter(
    s => !s.is_manual_timer && s.programId != null
  );
  const durationSessions = sessions.filter(
    s => s.is_manual_timer || s.programId == null
  );

  // Key Stats
  const totalWorkouts = workoutSessions.length;
  const totalExercises = workoutSessions.reduce((sum, s) => sum + (s.completed_exercises || 0), 0);
  
  let totalSets = 0;
  workoutSessions.forEach(session => {
    if (session.total_sets && session.total_sets > 0) {
      totalSets += session.total_sets;
    } else {
      const program = programs.find(p => p.id === session.programId);
      const avgSets = (program?.exercises?.length)
        ? program.exercises.reduce((sum: number, ex: any) => sum + (ex.sets || 0), 0) / program.exercises.length
        : 3;
      totalSets += (session.completed_exercises || 0) * avgSets;
    }
  });
  totalSets = Math.round(totalSets);

  // Separated Durations: pure workout duration vs gym stay duration
  const workoutMinutes = workoutSessions.reduce((sum, s) => sum + parseDuration(s.duration), 0);
  const workoutHours = Math.floor(workoutMinutes / 60);
  const remainingWorkoutMinutes = workoutMinutes % 60;

  const gymMinutes = durationSessions.reduce((sum, s) => sum + parseDuration(s.duration), 0);
  const gymHours = Math.floor(gymMinutes / 60);
  const remainingGymMinutes = gymMinutes % 60;

  // Program Distribution (Only actual workouts!)
  const programCounts = workoutSessions.reduce((acc: any, session) => {
    const name = session.program_name && session.program_name !== 'Salonda Geçirilen Vakit'
      ? session.program_name 
      : 'Genel Program';
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
    const count = workoutSessions.filter(s => s.startTime && s.startTime.split('T')[0] === date).length;
    return { date, count };
  });
  const maxDailyCount = Math.max(...dailyWorkouts.map(d => d.count), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analizler</h1>
          <p className="text-gray-400">Genel sistem ve kullanıcı bazlı performans analizleri</p>
        </div>
        
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            className="bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-[#6366F1] appearance-none cursor-pointer"
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
          <p className="text-gray-400">Seçilen kriterlere uygun oturum veya antrenman kaydı yok.</p>
        </div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                <span className="text-sm text-gray-400">Antrenman Süresi</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {workoutHours > 0 ? `${workoutHours}s ` : ''}{remainingWorkoutMinutes}dk
              </p>
              {gymMinutes > 0 && (
                <p className="text-xs text-purple-400 mt-1 font-medium flex items-center gap-1">
                  <span>⏱️ Salon Vakti:</span>
                  <span>{gymHours > 0 ? `${gymHours}s ` : ''}{remainingGymMinutes}dk</span>
                </p>
              )}
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

          {/* Info banner if there are manual timer sessions */}
          {durationSessions.length > 0 && (
            <div className="mb-8 p-4 bg-[#1A1A1A] rounded-2xl border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                  <Clock size={16} />
                </div>
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{durationSessions.length} adet serbest süre kaydı ({gymHours > 0 ? `${gymHours}s ` : ''}{remainingGymMinutes}dk)</span> salonda geçirilen vakit olarak ayrıca tutulmaktadır; antrenman efor süresine eklenmeyerek çakışma ve süre şişmesi önlenmiştir.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Chart (Last 7 Days) */}
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-[#6366F1]" /> Son 7 Gün Antrenman Aktivitesi
                </h3>
              </div>
              
              <div className="flex items-end justify-between h-48 gap-2">
                {dailyWorkouts.map((day) => {
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
                          style={{ height: `${Math.max(heightPercent, 5)}%` }}
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
              
              {Object.keys(programCounts).length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  Henüz tamamlanan bir program antrenmanı bulunmuyor.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(programCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([name, count]: any, idx) => {
                    const percent = Math.round((count / (totalWorkouts || 1)) * 100);
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
              )}
              
              {mostUsedProgram && (
                <div className="mt-6 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center shrink-0">
                    <span className="text-xl">🏆</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">En Çok Kullanılan Program</p>
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
