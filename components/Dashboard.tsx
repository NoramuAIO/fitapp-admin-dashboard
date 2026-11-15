'use client';

import { useEffect, useState } from 'react';
import {
  Dumbbell, Users, Activity, Flame, TrendingUp, TrendingDown,
  Clock, ChevronRight, Scale, Target, CalendarDays, CheckCircle2,
  Sparkles, RefreshCw, Coffee,
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/clientCache';
import {
  isRealWorkoutSession,
  isManualTimerSession,
  getLocalDateString,
} from '@/lib/fitnessCalculations';
import {
  REST_DAY_LABEL,
  UserWorkoutSchedule,
  calculateWeeklyAdherence,
  getSmartTodayAndNextRecommendation,
  getWeekCalendarDays,
  normalizeUserSchedule,
} from '@/lib/workoutSchedule';

interface DashboardStats {
  totalPrograms: number;
  totalExercises: number;
  totalUsers: number;
  totalSessions: number;
  todaySessions: number;
  totalGoals: number;
  activeGoals: number;
}

interface RecentSession {
  id: number;
  program_name: string;
  duration?: string;
  startTime: string;
  user_name?: string;
  category: string;
  programId?: number | null;
  is_manual_timer?: boolean;
}

interface WeightLog {
  weight: number;
  date: string;
}

interface BodyFatLog {
  fatPercent: number;
  date: string;
}

const COLORS = {
  purple: '#9B6FFF',
  green: '#5DD97C',
  orange: '#FF6B4A',
  blue: '#4ECDC4',
  pink: '#FF6B9D',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPrograms: 0, totalExercises: 0, totalUsers: 0,
    totalSessions: 0, todaySessions: 0, totalGoals: 0, activeGoals: 0,
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [fatLogs, setFatLogs] = useState<BodyFatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [schedule, setSchedule] = useState<UserWorkoutSchedule>(() =>
    normalizeUserSchedule(null, null)
  );
  const [scheduleOwnerName, setScheduleOwnerName] = useState<string>('');
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allCompletions, setAllCompletions] = useState<any[]>([]);
  const [enrichedPrograms, setEnrichedPrograms] = useState<any[]>([]);

  useEffect(() => {
    loadAll();
    window.addEventListener('userSelected', loadAll);
    return () => window.removeEventListener('userSelected', loadAll);
  }, []);

  const loadAll = async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('selectedUserId') : null;
      const parsedUserId = userId ? parseInt(userId, 10) : NaN;
      const selectedId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;

      const programsUrl = selectedId ? `/api/programs?userId=${selectedId}` : '/api/programs';
      const sessionsUrl = selectedId ? `/api/workout-sessions?userId=${selectedId}` : '/api/workout-sessions';
      const goalsUrl = selectedId ? `/api/goals?userId=${selectedId}` : '/api/goals';
      const completionsUrl = selectedId
        ? `/api/exercise-completions?userId=${selectedId}&limit=300`
        : '/api/exercise-completions?limit=300';

      const [
        usersRes,
        programsRes,
        sessionsRes,
        goalsRes,
        exercisesRes,
        workoutsRes,
        completionsRes,
        scheduleRes,
        wRes,
        fRes,
      ] = await Promise.all([
        apiFetch('/api/users?lite=1').catch(() => null),
        apiFetch(programsUrl).catch(() => null),
        apiFetch(sessionsUrl).catch(() => null),
        apiFetch(goalsUrl).catch(() => null),
        apiFetch('/api/exercises').catch(() => null),
        apiFetch('/api/workouts?lite=1').catch(() => null),
        apiFetch(completionsUrl).catch(() => null),
        selectedId
          ? apiFetch(`/api/workout-schedules?userId=${selectedId}`).catch(() => null)
          : Promise.resolve(null),
        selectedId
          ? apiFetch(`/api/weight-logs?userId=${selectedId}`).catch(() => null)
          : Promise.resolve(null),
        selectedId
          ? apiFetch(`/api/body-fat-logs?userId=${selectedId}`).catch(() => null)
          : Promise.resolve(null),
      ]);

      const parsedUsers = usersRes?.ok ? await usersRes.json() : [];
      const loadedUsers: any[] = Array.isArray(parsedUsers) ? parsedUsers : [];
      const selectedUserObj = selectedId
        ? loadedUsers.find((x: any) => Number(x.id) === selectedId)
        : null;
      if (selectedUserObj) {
        setUserName(selectedUserObj.name);
      } else {
        setUserName('');
      }

      const scheduleUserId = selectedUserObj?.id ?? loadedUsers[0]?.id ?? null;
      setScheduleOwnerName(selectedUserObj?.name || loadedUsers[0]?.name || '');

      const [
        programs,
        sessions,
        goals,
        exercises,
        workoutsList,
        initialScheduleData,
        initialCompletionsData,
        wData,
        fData,
      ] = await Promise.all([
        programsRes?.ok ? programsRes.json() : [],
        sessionsRes?.ok ? sessionsRes.json() : [],
        goalsRes?.ok ? goalsRes.json() : [],
        exercisesRes?.ok ? exercisesRes.json() : [],
        workoutsRes?.ok ? workoutsRes.json() : [],
        scheduleRes?.ok ? scheduleRes.json() : null,
        completionsRes?.ok ? completionsRes.json() : [],
        wRes?.ok ? wRes.json() : [],
        fRes?.ok ? fRes.json() : [],
      ]);

      let scheduleData = initialScheduleData;
      let completionsData = initialCompletionsData;

      if (!selectedId && scheduleUserId) {
        const [fallbackSchedRes, fallbackCompRes] = await Promise.all([
          apiFetch(`/api/workout-schedules?userId=${scheduleUserId}`).catch(() => null),
          apiFetch(`/api/exercise-completions?userId=${scheduleUserId}&limit=300`).catch(() => null),
        ]);
        if (fallbackSchedRes?.ok) {
          scheduleData = await fallbackSchedRes.json();
        }
        if (fallbackCompRes?.ok) {
          completionsData = await fallbackCompRes.json();
        }
      }

      const users = loadedUsers;
      const safePrograms = Array.isArray(programs) ? programs : [];
      const safeWorkouts = Array.isArray(workoutsList) ? workoutsList : [];
      const safeSessions = Array.isArray(sessions) ? sessions : [];
      const safeCompletions = Array.isArray(completionsData) ? completionsData : [];

      setEnrichedPrograms(
        safePrograms.map((p: any) => ({
          ...p,
          workouts: safeWorkouts.filter((w: any) => Number(w.programId) === Number(p.id)),
        }))
      );
      setAllSessions(safeSessions);
      setAllCompletions(safeCompletions);
      setSchedule(normalizeUserSchedule(scheduleData, scheduleUserId));

      const todayDateStr = getLocalDateString(new Date());

      const todaySessions = Array.isArray(sessions)
        ? sessions.filter((s: any) => {
            if (!isRealWorkoutSession(s)) return false;
            if (!s.startTime) return false;
            return getLocalDateString(s.startTime) === todayDateStr;
          }).length
        : 0;

      const totalExercises = Array.isArray(exercises) ? exercises.length : 0;
      const actualWorkoutSessions = Array.isArray(sessions)
        ? sessions.filter(isRealWorkoutSession)
        : [];

      setStats({
        totalPrograms: Array.isArray(programs) ? programs.length : 0,
        totalExercises,
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalSessions: actualWorkoutSessions.length,
        todaySessions,
        totalGoals: Array.isArray(goals) ? goals.length : 0,
        activeGoals: Array.isArray(goals) ? goals.filter((g: any) => g.status === 'active').length : 0,
      });

      setRecentSessions(Array.isArray(sessions) ? sessions.slice(0, 5) : []);

      // Body stats
      if (selectedId) {
        setWeightLogs(Array.isArray(wData) ? wData.slice(0, 5) : []);
        setFatLogs(Array.isArray(fData) ? fData.slice(0, 5) : []);
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Antreman Programı', value: stats.totalPrograms, icon: Dumbbell, color: COLORS.purple, href: '/programs' },
    { label: 'Toplam Hareket', value: stats.totalExercises, icon: Activity, color: COLORS.pink, href: '/exercises' },
    { label: 'Kullanıcılar', value: stats.totalUsers, icon: Users, color: COLORS.green, href: '/users' },
    { label: 'Toplam Antreman', value: stats.totalSessions, icon: Flame, color: COLORS.orange, href: '/time' },
    { label: 'Bugünkü Antreman', value: stats.todaySessions, icon: Clock, color: COLORS.blue, href: '/time' },
    { label: 'Aktif Hedef', value: stats.activeGoals, icon: Target, color: COLORS.pink, href: '/goals' },
  ];

  const latestWeight = weightLogs[0]?.weight;
  const prevWeight = weightLogs[1]?.weight;
  const wDiff = latestWeight && prevWeight ? +(latestWeight - prevWeight).toFixed(1) : null;

  const latestFat = fatLogs[0]?.fatPercent;
  const prevFat = fatLogs[1]?.fatPercent;
  const fDiff = latestFat && prevFat ? +(latestFat - prevFat).toFixed(1) : null;

  const todayDateStr = getLocalDateString(new Date());
  const weeklyAdherence = calculateWeeklyAdherence(todayDateStr, schedule, allSessions);
  const smartRec = getSmartTodayAndNextRecommendation(
    todayDateStr,
    schedule,
    allSessions,
    enrichedPrograms
  );
  const weekStrip = getWeekCalendarDays(
    todayDateStr,
    schedule,
    allSessions,
    allCompletions,
    todayDateStr
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {userName ? `Hoş geldin, ${userName.split(' ')[0]}! 👋` : 'Hoş Geldiniz! 👋'}
        </h1>
        <p className="text-gray-400 mt-1">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-2xl h-28 animate-pulse border border-[#2A2A2A]" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.label} href={card.href}
                  className="bg-[#141414] hover:bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: card.color + '22' }}>
                      <Icon size={22} style={{ color: card.color }} />
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors mt-1" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
                  <p className="text-sm text-gray-400">{card.label}</p>
                </Link>
              );
            })}
          </div>

          {/* Smart Schedule Overview Card */}
          <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#242424]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6366F1]/20 flex items-center justify-center text-[#6366F1]">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-white flex items-center gap-2">
                    <span>Antrenman Takvimi & Haftalık İlerleme</span>
                    {scheduleOwnerName && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                        {scheduleOwnerName}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Bugünün planı, haftalık uyum oranı ve otomatik sıradaki antrenman önerisi
                  </p>
                </div>
              </div>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-bold transition-colors w-fit"
              >
                <span>Takvim & Planlayıcıyı Aç</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Bugünün Planı */}
              <div className="bg-[#1A1A1F] border border-[#292932] rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 mb-1.5">
                  Bugünün Planı
                </p>
                <p className="text-lg font-bold text-white truncate">
                  {smartRec.todayDay.isRestDay
                    ? REST_DAY_LABEL
                    : smartRec.todayDay.plannedWorkout?.workoutName || REST_DAY_LABEL}
                </p>
                {smartRec.todayDay.note && (
                  <p className="text-xs text-[#4ECDC4] mt-1">{smartRec.todayDay.note}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {smartRec.todayDay.completedSessions.length > 0 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Tamamlandı
                    </span>
                  ) : smartRec.todayDay.isRestDay ? (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Coffee size={13} /> Aktif toparlanma
                    </span>
                  ) : smartRec.todayDay.isAlternating ? (
                    <span className="text-purple-300 flex items-center gap-1">
                      <RefreshCw size={12} /> Dönüşümlü gün
                    </span>
                  ) : (
                    <span className="text-gray-400">Planlanan gün</span>
                  )}
                </div>
              </div>

              {/* Bu Haftaki Tamamlanma Oranı */}
              <div className="bg-[#1A1A1F] border border-[#292932] rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                    Bu Haftaki Hedef / Tamamlanma
                  </p>
                  <span className="text-xs font-bold text-emerald-400">
                    %{weeklyAdherence.completionPercent}
                  </span>
                </div>
                <p className="text-lg font-bold text-white">
                  {weeklyAdherence.completedCount}/{weeklyAdherence.plannedCount} Antrenman
                </p>
                <div className="h-2 bg-[#25252D] rounded-full overflow-hidden mt-2.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#5DD97C] to-[#4ECDC4] rounded-full transition-all duration-500"
                    style={{ width: `${weeklyAdherence.completionPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">{weeklyAdherence.summaryText}</p>
              </div>

              {/* Sıradaki Antrenman Önerisi */}
              <div className="bg-[#1A1A1F] border border-[#292932] rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-300">
                    Sıradaki Antrenman Önerisi
                  </p>
                  <Sparkles size={14} className="text-[#9B6FFF]" />
                </div>
                <p className="text-lg font-bold text-white truncate">
                  {smartRec.nextWorkout?.workoutName || REST_DAY_LABEL}
                </p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {smartRec.recommendationReason}
                </p>
              </div>
            </div>

            {/* 7-Day Mini Weekly Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {weekStrip.map((d) => (
                <Link
                  key={d.date}
                  href="/calendar"
                  className={`rounded-xl p-3 border transition-all hover:brightness-110 ${
                    d.status === 'completed'
                      ? 'bg-emerald-500/12 border-emerald-500/35'
                      : d.isToday
                        ? 'bg-indigo-500/18 border-indigo-400/50'
                        : d.isRestDay
                          ? 'bg-[#17171B] border-[#25252B]'
                          : 'bg-[#1B1B22] border-[#2C2C38]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-400">
                      {d.dayShort} {d.dayNumber}
                    </span>
                    {d.status === 'completed' ? (
                      <CheckCircle2 size={13} className="text-emerald-400" />
                    ) : d.isToday ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#6366F1] text-white rounded">
                        BUGÜN
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-white truncate">
                    {d.status === 'completed'
                      ? d.completedSessions[0]?.workout_name ||
                        d.completedSessions[0]?.program_name ||
                        d.plannedWorkout?.workoutName ||
                        'Antrenman'
                      : d.isRestDay
                        ? REST_DAY_LABEL
                        : d.plannedWorkout?.workoutName || REST_DAY_LABEL}
                  </p>
                  {d.note && (
                    <p className="text-[10px] text-[#4ECDC4] truncate mt-0.5">{d.note}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent Workouts */}
            <div className="lg:col-span-2 bg-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
                <h2 className="font-bold text-white">Son Oturumlar</h2>
                <Link href="/time" className="text-xs text-[#6366F1] hover:underline">Tümünü gör</Link>
              </div>
              {recentSessions.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">Henüz oturum kaydı yok</div>
              ) : (
                <div className="divide-y divide-[#2A2A2A]">
                  {recentSessions.map((s) => {
                    const isManual = isManualTimerSession(s);
                    return (
                      <div key={s.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (isManual ? COLORS.orange : COLORS.purple) + '22' }}>
                          {isManual ? (
                            <Clock size={16} style={{ color: COLORS.orange }} />
                          ) : (
                            <Dumbbell size={16} style={{ color: COLORS.purple }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {isManual ? 'Salonda Geçirilen Vakit' : (s.program_name || 'Antrenman')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(s.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {s.duration ? ` · ${s.duration}` : ''}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ 
                            backgroundColor: (isManual ? COLORS.orange : COLORS.green) + '18', 
                            color: isManual ? COLORS.orange : COLORS.green 
                          }}>
                          {isManual ? 'Süre' : 'Antrenman'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Body Metrics */}
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
                <h2 className="font-bold text-white">Vücut Metrikleri</h2>
                <Link href="/body" className="text-xs text-[#6366F1] hover:underline">Detay</Link>
              </div>
              <div className="p-6 flex flex-col gap-5">
                {/* Weight */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Scale size={16} className="text-[#4ECDC4]" />
                      <span className="text-sm text-gray-400">Kilo</span>
                    </div>
                    {wDiff !== null && (
                      <div className="flex items-center gap-1 text-xs font-bold"
                        style={{ color: wDiff > 0 ? '#FF6B4A' : '#5DD97C' }}>
                        {wDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {wDiff > 0 ? '+' : ''}{wDiff} kg
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold" style={{ color: '#4ECDC4' }}>
                    {latestWeight ? `${latestWeight} kg` : <span className="text-gray-600 text-base">Kayıt yok</span>}
                  </p>
                  {weightLogs[0] && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(weightLogs[0].date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>

                <div className="border-t border-[#2A2A2A]" />

                {/* Body Fat */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-[#FF8C42]" />
                      <span className="text-sm text-gray-400">Yağ Oranı</span>
                    </div>
                    {fDiff !== null && (
                      <div className="flex items-center gap-1 text-xs font-bold"
                        style={{ color: fDiff > 0 ? '#FF6B4A' : '#5DD97C' }}>
                        {fDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {fDiff > 0 ? '+' : ''}{fDiff}%
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold" style={{ color: '#FF8C42' }}>
                    {latestFat ? `${latestFat}%` : <span className="text-gray-600 text-base">Kayıt yok</span>}
                  </p>
                  {fatLogs[0] && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(fatLogs[0].date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>

                <Link href="/body"
                  className="mt-2 w-full text-center py-2.5 rounded-xl border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#3A3A3A] transition-all">
                  Tüm Kayıtları Gör
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            <h2 className="text-lg font-bold text-white mb-4">Hızlı İşlemler</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { href: '/programs', icon: Dumbbell, color: COLORS.green, title: 'Yeni Program', desc: 'Antreman programı oluştur' },
                { href: '/analytics', icon: TrendingUp, color: COLORS.purple, title: 'Analizleri Görüntüle', desc: 'Detaylı istatistikler' },
                { href: '/settings', icon: Activity, color: COLORS.orange, title: 'Ayarlar', desc: 'Sistem yapılandırması' },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}
                    className="bg-[#141414] hover:bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: action.color + '22' }}>
                      <Icon size={22} style={{ color: action.color }} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold mb-0.5">{action.title}</h3>
                      <p className="text-gray-400 text-sm">{action.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
