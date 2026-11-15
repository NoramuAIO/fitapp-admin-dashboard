'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Dumbbell,
  Flame,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import { getLocalDateString } from '@/lib/fitnessCalculations';
import { apiFetch } from '@/lib/clientCache';
import {
  MONDAY_FIRST_DAYS,
  REST_DAY_LABEL,
  ResolvedCalendarDay,
  ScheduledWorkoutItem,
  UserWorkoutSchedule,
  WeeklyDaySchedule,
  calculateWeeklyAdherence,
  getMonthCalendarDays,
  getSmartTodayAndNextRecommendation,
  getWeekCalendarDays,
  normalizeUserSchedule,
  resolveAlternatingWorkout,
} from '@/lib/workoutSchedule';

interface UserItem {
  id: number;
  name: string;
  email?: string;
}

interface ProgramItem {
  id: number;
  name: string;
  isPrimary?: boolean;
  userId?: number | null;
}

interface WorkoutItem {
  id: number;
  programId: number;
  name: string;
  dayNumber?: number;
  orderIndex?: number;
  exercises?: any[];
}

const MONTH_NAMES_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

function isSameScheduledWorkout(a: ScheduledWorkoutItem, b: ScheduledWorkoutItem): boolean {
  if (a.workoutId && b.workoutId) return Number(a.workoutId) === Number(b.workoutId);
  return (
    String(a.workoutName).trim().toLowerCase() === String(b.workoutName).trim().toLowerCase() &&
    Number(a.programId || 0) === Number(b.programId || 0)
  );
}

export default function CalendarPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<UserWorkoutSchedule>(() =>
    normalizeUserSchedule(null, null)
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Page view tabs & calendar view state
  const [mainTab, setMainTab] = useState<'calendar' | 'planner'>('calendar');
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());

  // Selected Day Detail / Flexible Override modal
  const [selectedDay, setSelectedDay] = useState<ResolvedCalendarDay | null>(null);
  const [overrideMode, setOverrideMode] = useState<'workout' | 'rest'>('workout');
  const [overrideWorkoutKey, setOverrideWorkoutKey] = useState<string>('');
  const [overrideNote, setOverrideNote] = useState<string>('');

  // Quick day editor inside Weekly Planner
  const [editingWeekday, setEditingWeekday] = useState<number | null>(null);

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async (explicitUserId?: number | null) => {
    setLoading(true);
    try {
      let targetId = explicitUserId ?? null;
      if (!targetId && typeof window !== 'undefined') {
        const stored = localStorage.getItem('selectedUserId');
        const parsed = stored ? parseInt(stored, 10) : NaN;
        if (!Number.isNaN(parsed) && parsed > 0) {
          targetId = parsed;
        }
      }

      if (targetId) {
        setActiveUserId(targetId);
        const userQuery = `?userId=${targetId}`;
        const [usersRes, progRes, workoutsRes, sessionsRes, completionsRes, schedRes] =
          await Promise.all([
            apiFetch('/api/users?lite=1').catch(() => null),
            apiFetch(`/api/programs${userQuery}`).catch(() => null),
            apiFetch('/api/workouts?lite=1').catch(() => null),
            apiFetch(`/api/workout-sessions${userQuery}`).catch(() => null),
            apiFetch(`/api/exercise-completions${userQuery}&limit=300`).catch(() => null),
            apiFetch(`/api/workout-schedules${userQuery}`).catch(() => null),
          ]);

        const [usersList, progData, workoutsData, sessionsData, completionsData, schedData] =
          await Promise.all([
            usersRes?.ok ? usersRes.json() : [],
            progRes?.ok ? progRes.json() : [],
            workoutsRes?.ok ? workoutsRes.json() : [],
            sessionsRes?.ok ? sessionsRes.json() : [],
            completionsRes?.ok ? completionsRes.json() : [],
            schedRes?.ok ? schedRes.json() : null,
          ]);

        setUsers(Array.isArray(usersList) ? usersList : []);
        setPrograms(Array.isArray(progData) ? progData : []);
        setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setCompletions(Array.isArray(completionsData) ? completionsData : []);
        setSchedule(normalizeUserSchedule(schedData, targetId));
        return;
      }

      const [usersRes, workoutsRes] = await Promise.all([
        apiFetch('/api/users?lite=1').catch(() => null),
        apiFetch('/api/workouts?lite=1').catch(() => null),
      ]);
      const usersList: UserItem[] = usersRes?.ok ? await usersRes.json() : [];
      const workoutsData = workoutsRes?.ok ? await workoutsRes.json() : [];
      setUsers(Array.isArray(usersList) ? usersList : []);
      setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);

      if (Array.isArray(usersList) && usersList.length > 0) {
        targetId = usersList[0].id;
      }
      setActiveUserId(targetId);

      const userQuery = targetId ? `?userId=${targetId}` : '';
      const completionsQuery = targetId
        ? `?userId=${targetId}&limit=300`
        : '?limit=300';
      const [progRes, sessionsRes, completionsRes, schedRes] = await Promise.all([
        apiFetch(`/api/programs${userQuery}`).catch(() => null),
        apiFetch(`/api/workout-sessions${userQuery}`).catch(() => null),
        apiFetch(`/api/exercise-completions${completionsQuery}`).catch(() => null),
        apiFetch(`/api/workout-schedules${userQuery}`).catch(() => null),
      ]);

      const [progData, sessionsData, completionsData, schedData] = await Promise.all([
        progRes?.ok ? progRes.json() : [],
        sessionsRes?.ok ? sessionsRes.json() : [],
        completionsRes?.ok ? completionsRes.json() : [],
        schedRes?.ok ? schedRes.json() : null,
      ]);

      setPrograms(Array.isArray(progData) ? progData : []);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setCompletions(Array.isArray(completionsData) ? completionsData : []);
      setSchedule(normalizeUserSchedule(schedData, targetId));
    } catch (err) {
      console.error('Calendar page load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const onUserChanged = () => loadData();
    window.addEventListener('userSelected', onUserChanged);
    return () => window.removeEventListener('userSelected', onUserChanged);
  }, [loadData]);

  const handleUserChange = (nextIdStr: string) => {
    const nextId = nextIdStr ? parseInt(nextIdStr, 10) : null;
    if (typeof window !== 'undefined') {
      if (nextId) localStorage.setItem('selectedUserId', String(nextId));
      else localStorage.removeItem('selectedUserId');
    }
    setSelectedDay(null);
    loadData(nextId);
  };

  // Enrich programs with nested workouts for recommendations & grouped pickers
  const enrichedPrograms = useMemo(() => {
    return programs.map((p) => ({
      ...p,
      workouts: workouts.filter((w) => Number(w.programId) === Number(p.id)),
    }));
  }, [programs, workouts]);

  const workoutOptions = useMemo(() => {
    const progMap = new Map<number, ProgramItem>(programs.map((p) => [Number(p.id), p]));
    const visibleProgramIds = new Set(programs.map((p) => Number(p.id)));
    const relevant = workouts.filter(
      (w) => visibleProgramIds.size === 0 || visibleProgramIds.has(Number(w.programId))
    );
    const list = relevant.length > 0 ? relevant : workouts;
    return list.map((w) => {
      const prog = progMap.get(Number(w.programId));
      const item: ScheduledWorkoutItem = {
        workoutId: w.id,
        programId: w.programId,
        workoutName: w.name || `Antrenman #${w.id}`,
        programName: prog?.name || 'Program',
      };
      return {
        key: `${w.programId}:${w.id}`,
        item,
        label: `${item.workoutName}${item.programName ? ` (${item.programName})` : ''}`,
      };
    });
  }, [programs, workouts]);

  const weeklyAdherence = useMemo(
    () => calculateWeeklyAdherence(todayStr, schedule, sessions),
    [todayStr, schedule, sessions]
  );

  const smartRec = useMemo(
    () => getSmartTodayAndNextRecommendation(todayStr, schedule, sessions, enrichedPrograms),
    [todayStr, schedule, sessions, enrichedPrograms]
  );

  const monthDays = useMemo(
    () =>
      getMonthCalendarDays(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        schedule,
        sessions,
        completions,
        todayStr
      ),
    [cursorDate, schedule, sessions, completions, todayStr]
  );

  const cursorYmd = useMemo(() => getLocalDateString(cursorDate), [cursorDate]);

  const weekDays = useMemo(
    () => getWeekCalendarDays(cursorYmd, schedule, sessions, completions, todayStr),
    [cursorYmd, schedule, sessions, completions, todayStr]
  );

  const openDayDetail = (day: ResolvedCalendarDay) => {
    setSelectedDay(day);
    setOverrideMode(day.isRestDay ? 'rest' : 'workout');
    setOverrideNote(day.note || '');
    if (day.plannedWorkout?.workoutId) {
      const match = workoutOptions.find(
        (opt) => Number(opt.item.workoutId) === Number(day.plannedWorkout?.workoutId)
      );
      setOverrideWorkoutKey(match?.key || workoutOptions[0]?.key || '');
    } else if (day.plannedWorkout?.workoutName) {
      const match = workoutOptions.find(
        (opt) =>
          opt.item.workoutName.toLowerCase() === day.plannedWorkout?.workoutName.toLowerCase()
      );
      setOverrideWorkoutKey(match?.key || workoutOptions[0]?.key || '');
    } else {
      setOverrideWorkoutKey(workoutOptions[0]?.key || '');
    }
  };

  const persistWeeklySchedule = async (nextWeekly: WeeklyDaySchedule[]) => {
    if (!activeUserId) {
      showToast('error', 'Lütfen önce bir sporcu seçin.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/workout-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          weeklySchedule: nextWeekly,
          overrides: schedule.overrides,
        }),
      });
      if (!res.ok) throw new Error('Kayıt başarısız');
      const saved = await res.json();
      setSchedule(normalizeUserSchedule(saved, activeUserId));
      showToast('success', 'Haftalık antrenman planı kaydedildi.');
    } catch {
      showToast('error', 'Haftalık plan kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const updateLocalWeekday = (
    dayOfWeek: number,
    updater: (prev: WeeklyDaySchedule) => WeeklyDaySchedule
  ) => {
    setSchedule((prev) => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day) =>
        day.dayOfWeek === dayOfWeek ? updater(day) : day
      ),
    }));
  };

  const handleSaveOverride = async () => {
    if (!selectedDay || !activeUserId) return;
    setSaving(true);
    try {
      const chosen = workoutOptions.find((o) => o.key === overrideWorkoutKey)?.item;
      if (overrideMode === 'workout' && !chosen) {
        showToast('error', 'Lütfen geçerli bir antrenman seçin.');
        setSaving(false);
        return;
      }

      const res = await apiFetch('/api/workout-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_override',
          userId: activeUserId,
          date: selectedDay.date,
          isRestDay: overrideMode === 'rest',
          workoutId: overrideMode === 'workout' ? chosen?.workoutId : null,
          programId: overrideMode === 'workout' ? chosen?.programId : null,
          workoutName: overrideMode === 'rest' ? REST_DAY_LABEL : chosen?.workoutName,
          programName: overrideMode === 'workout' ? chosen?.programName : null,
          note: overrideNote.trim() || null,
        }),
      });

      if (!res.ok) throw new Error('Değişiklik kaydedilemedi');
      const saved = await res.json();
      setSchedule(normalizeUserSchedule(saved, activeUserId));
      setSelectedDay(null);
      showToast(
        'success',
        overrideMode === 'rest'
          ? `${selectedDay.date} için ${REST_DAY_LABEL} uygulandı.`
          : `${selectedDay.date} için özel antrenman kaydedildi.`
      );
    } catch {
      showToast('error', 'Tek seferlik gün değişikliği kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    if (!selectedDay || !activeUserId) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/workout-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_override',
          userId: activeUserId,
          date: selectedDay.date,
        }),
      });
      if (!res.ok) throw new Error('Sıfırlanamadı');
      const saved = await res.json();
      setSchedule(normalizeUserSchedule(saved, activeUserId));
      setSelectedDay(null);
      showToast('success', 'Kalıcı haftalık düzen geri yüklendi.');
    } catch {
      showToast('error', 'Kalıcı düzen geri yüklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleNavigateCursor = (delta: number) => {
    setCursorDate((prev) => {
      const next = new Date(prev);
      if (calendarMode === 'month') {
        next.setMonth(prev.getMonth() + delta, 1);
      } else {
        next.setDate(prev.getDate() + delta * 7);
      }
      return next;
    });
  };

  const getStatusBadgeClasses = (day: ResolvedCalendarDay) => {
    switch (day.status) {
      case 'completed':
        return 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300';
      case 'today_planned':
        return 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200 ring-1 ring-indigo-500/40';
      case 'today_rest':
        return 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200 ring-1 ring-cyan-500/30';
      case 'planned':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-200';
      case 'missed':
        return 'bg-amber-500/10 border-amber-500/25 text-amber-300/80';
      case 'rest':
      default:
        return 'bg-[#18181B] border-[#27272A] text-gray-400';
    }
  };

  const plannedDaysPerWeek = schedule.weeklySchedule.filter((d) => !d.isRestDay).length;
  const restDaysPerWeek = 7 - plannedDaysPerWeek;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#9B6FFF] flex items-center justify-center shadow-lg shadow-[#6366F1]/25">
              <CalendarDays size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Antrenman Takvimi & Haftalık Planlayıcı
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Dönüşümlü rutinler, tek seferlik tatil/değişiklik ve yerel tarihli ilerleme takibi
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Athlete Selector */}
          <div className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2">
            <Users size={15} className="text-[#4ECDC4]" />
            <select
              value={activeUserId ?? ''}
              onChange={(e) => handleUserChange(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer pr-2"
            >
              {users.length === 0 && <option value="">Sporcu Bulunamadı</option>}
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#141414]">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Tab Switcher */}
          <div className="flex bg-[#141414] border border-[#2A2A2A] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMainTab('calendar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mainTab === 'calendar'
                  ? 'bg-[#6366F1] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Takvim Görünümü
            </button>
            <button
              type="button"
              onClick={() => setMainTab('planner')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mainTab === 'planner'
                  ? 'bg-[#6366F1] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Haftalık Planlayıcı (Pzt–Paz)
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Smart Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Bugünün Planı */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Bugünün Planı
              </span>
              {smartRec.todayDay.isOverride && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Tek Seferlik
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-white truncate">
              {smartRec.todayDay.isRestDay
                ? REST_DAY_LABEL
                : smartRec.todayDay.plannedWorkout?.workoutName || REST_DAY_LABEL}
            </p>
            {smartRec.todayDay.note && (
              <p className="text-xs text-[#4ECDC4] mt-1 flex items-center gap-1">
                <Clock size={12} />
                <span>{smartRec.todayDay.note}</span>
              </p>
            )}
            {smartRec.todayDay.completedSessions.length > 0 && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={13} />
                <span>Bugün tamamlandı</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => openDayDetail(smartRec.todayDay)}
            className="mt-4 w-full py-2 rounded-xl bg-[#1D1D22] hover:bg-[#27272E] border border-[#2F2F37] text-xs font-semibold text-gray-200 transition-colors"
          >
            Bugünü Yönet / Değiştir
          </button>
        </div>

        {/* Bu Haftaki Hedef & Uyum */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Bu Haftaki Tamamlanma
              </span>
              <Target size={16} className="text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {weeklyAdherence.completedCount}/{weeklyAdherence.plannedCount}
              </span>
              <span className="text-xs text-gray-400">
                (%{weeklyAdherence.completionPercent})
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{weeklyAdherence.summaryText}</p>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-[#232329] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5DD97C] to-[#4ECDC4] rounded-full transition-all duration-500"
                style={{ width: `${weeklyAdherence.completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sıradaki Antrenman Önerisi */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                Sıradaki Öneri
              </span>
              <Sparkles size={16} className="text-[#9B6FFF]" />
            </div>
            <p className="text-lg font-bold text-white truncate">
              {smartRec.nextWorkout?.workoutName || REST_DAY_LABEL}
            </p>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {smartRec.recommendationReason}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-purple-300 font-semibold">
            Hedef Gün: {smartRec.nextWorkoutDayLabel}
          </div>
        </div>

        {/* Haftalık Ritim Özeti */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                Haftalık Denge
              </span>
              <Flame size={16} className="text-[#FF6B4A]" />
            </div>
            <p className="text-lg font-bold text-white">
              {plannedDaysPerWeek} Antrenman · {restDaysPerWeek} {REST_DAY_LABEL}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Dönüşümlü günler son yapılan seansa göre otomatik seçilir
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMainTab(mainTab === 'calendar' ? 'planner' : 'calendar')}
            className="mt-4 w-full py-2 rounded-xl bg-[#6366F1]/15 hover:bg-[#6366F1]/25 border border-[#6366F1]/30 text-xs font-semibold text-indigo-300 transition-colors"
          >
            {mainTab === 'calendar' ? 'Haftalık Düzeni Planla' : 'Takvime Dön'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-12 text-center text-gray-400">
          Takvim ve antrenman geçmişi yükleniyor...
        </div>
      ) : mainTab === 'calendar' ? (
        /* INTERACTIVE CALENDAR TAB */
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          {/* Calendar Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavigateCursor(-1)}
                className="p-2 rounded-xl bg-[#1B1B1F] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300"
                aria-label="Önceki"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-lg font-bold text-white min-w-[160px] text-center">
                {MONTH_NAMES_TR[cursorDate.getMonth()]} {cursorDate.getFullYear()}
              </h2>
              <button
                type="button"
                onClick={() => handleNavigateCursor(1)}
                className="p-2 rounded-xl bg-[#1B1B1F] hover:bg-[#25252B] border border-[#2E2E35] text-gray-300"
                aria-label="Sonraki"
              >
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => setCursorDate(new Date())}
                className="px-3 py-1.5 rounded-xl bg-[#1B1B1F] hover:bg-[#25252B] border border-[#2E2E35] text-xs font-semibold text-indigo-300"
              >
                Bugün
              </button>
            </div>

            {/* Sub-view Toggle: Aylık / Haftalık */}
            <div className="flex items-center gap-2">
              <div className="flex bg-[#1B1B1F] border border-[#2E2E35] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setCalendarMode('month')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    calendarMode === 'month'
                      ? 'bg-[#6366F1] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Aylık Takvim
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('week')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    calendarMode === 'week'
                      ? 'bg-[#6366F1] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Haftalık Şerit
                </button>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 bg-[#101012] border-b border-[#242428] text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Tamamlanan Antrenman
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Bugün / Planlandı
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" /> {REST_DAY_LABEL}
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw size={12} className="text-purple-400" /> Dönüşümlü Öneri
            </span>
            <span className="flex items-center gap-1.5">
              <Pencil size={12} className="text-amber-400" /> Tek Seferlik Değişiklik
            </span>
          </div>

          {calendarMode === 'month' ? (
            /* MONTHLY GRID */
            <div className="p-3 sm:p-5 overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {MONDAY_FIRST_DAYS.map((d) => (
                    <div
                      key={d.dayOfWeek}
                      className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 py-1.5"
                    >
                      {d.label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day) => {
                    const cardClasses = getStatusBadgeClasses(day);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => openDayDetail(day)}
                        className={`min-h-[112px] p-2.5 rounded-xl border text-left transition-all hover:brightness-110 flex flex-col justify-between ${cardClasses} ${
                          !day.isCurrentMonth ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                              day.isToday ? 'bg-[#6366F1] text-white' : 'text-gray-300'
                            }`}
                          >
                            {day.dayNumber}
                          </span>
                          <div className="flex items-center gap-1">
                            {day.isOverride && (
                              <span title="Tek Seferlik Değişiklik">
                                <Pencil size={11} className="text-amber-400" />
                              </span>
                            )}
                            {day.isAlternating && !day.isRestDay && (
                              <span title="Dönüşümlü">
                                <RefreshCw size={11} className="text-purple-300" />
                              </span>
                            )}
                            {day.status === 'completed' && (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            )}
                            {day.isRestDay && day.status !== 'completed' && (
                              <Coffee size={13} className="text-gray-400" />
                            )}
                          </div>
                        </div>

                        <div className="my-1.5 space-y-1">
                          <p className="text-xs font-semibold leading-snug line-clamp-2">
                            {day.status === 'completed'
                              ? day.completedSessions[0]?.workout_name ||
                                day.completedSessions[0]?.program_name ||
                                day.plannedWorkout?.workoutName ||
                                'Antrenman'
                              : day.isRestDay
                                ? REST_DAY_LABEL
                                : day.plannedWorkout?.workoutName || REST_DAY_LABEL}
                          </p>
                          {day.note && (
                            <p className="text-[10px] text-[#4ECDC4] truncate">
                              {day.note}
                            </p>
                          )}
                        </div>

                        {day.status === 'completed' ? (
                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-emerald-300/90">
                            {day.totalVolumeKg > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20">
                                {day.totalVolumeKg} kg
                              </span>
                            )}
                            {day.totalDurationMinutes > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-black/25">
                                {day.totalDurationMinutes} dk
                              </span>
                            )}
                          </div>
                        ) : day.isToday ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                            Bugün
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* WEEKLY STRIP VIEW (Responsive 7 Cards) */
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => openDayDetail(day)}
                  className={`p-4 rounded-2xl border text-left transition-all hover:brightness-110 flex flex-col justify-between min-h-[168px] ${getStatusBadgeClasses(
                    day
                  )}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {day.dayShort}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          day.isToday ? 'bg-[#6366F1] text-white' : 'bg-black/25 text-gray-300'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white leading-snug">
                      {day.status === 'completed'
                        ? day.completedSessions[0]?.workout_name ||
                          day.completedSessions[0]?.program_name ||
                          day.plannedWorkout?.workoutName ||
                          'Antrenman'
                        : day.isRestDay
                          ? REST_DAY_LABEL
                          : day.plannedWorkout?.workoutName || REST_DAY_LABEL}
                    </p>
                    {day.note && (
                      <p className="text-xs text-[#4ECDC4] mt-1.5 flex items-center gap-1">
                        <Clock size={11} />
                        <span className="truncate">{day.note}</span>
                      </p>
                    )}
                    {day.isAlternating && day.alternatingPool.length > 1 && (
                      <p className="text-[11px] text-purple-300 mt-1.5 flex items-center gap-1">
                        <RefreshCw size={11} />
                        <span>Dönüşümlü</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-[11px]">
                    {day.status === 'completed' ? (
                      <span className="text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        {day.totalVolumeKg > 0 ? `${day.totalVolumeKg} kg` : 'Tamamlandı'}
                      </span>
                    ) : day.isOverride ? (
                      <span className="text-amber-300 font-medium">Tek Seferlik</span>
                    ) : (
                      <span className="text-gray-400">{day.statusLabel}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* WEEKLY ROUTINE PLANNER TAB (Pazartesi - Pazar) */
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                7 Günlük Sabit ve Dönüşümlü Rutin Planlayıcı
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Her gün için sabit antrenman, &quot;{REST_DAY_LABEL}&quot; veya dönüşümlü birden fazla antrenman seçebilirsiniz.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => persistWeeklySchedule(schedule.weeklySchedule)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-[#6366F1]/25 transition-all"
            >
              <Save size={16} />
              <span>{saving ? 'Kaydediliyor...' : 'Haftalık Planı Kaydet'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MONDAY_FIRST_DAYS.map((meta) => {
              const dayRule =
                schedule.weeklySchedule.find((d) => d.dayOfWeek === meta.dayOfWeek) || {
                  dayOfWeek: meta.dayOfWeek,
                  isRestDay: true,
                  isAlternating: false,
                  workouts: [],
                  note: null,
                };

              const mode: 'rest' | 'single' | 'alternating' = dayRule.isRestDay
                ? 'rest'
                : dayRule.isAlternating
                  ? 'alternating'
                  : 'single';

              const alternatingPreview =
                mode === 'alternating' && dayRule.workouts.length > 0
                  ? resolveAlternatingWorkout(dayRule.workouts, sessions, todayStr)
                  : null;

              return (
                <div
                  key={meta.dayOfWeek}
                  className={`bg-[#141414] border rounded-2xl p-5 space-y-4 transition-all ${
                    editingWeekday === meta.dayOfWeek
                      ? 'border-[#6366F1]'
                      : 'border-[#2A2A2A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-[#1D1D23] border border-[#2E2E36] flex items-center justify-center text-xs font-bold text-indigo-300">
                        {meta.short}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white">{meta.label}</h3>
                        <p className="text-xs text-gray-400">
                          {mode === 'rest'
                            ? REST_DAY_LABEL
                            : mode === 'alternating'
                              ? `Dönüşümlü (${dayRule.workouts.length} antrenman)`
                              : dayRule.workouts[0]?.workoutName || 'Antrenman seçiniz'}
                        </p>
                      </div>
                    </div>

                    {/* Mode Pills */}
                    <div className="flex bg-[#1B1B1F] border border-[#2C2C34] rounded-xl p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWeekday(meta.dayOfWeek);
                          updateLocalWeekday(meta.dayOfWeek, (prev) => ({
                            ...prev,
                            isRestDay: true,
                            isAlternating: false,
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          mode === 'rest'
                            ? 'bg-zinc-700 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {REST_DAY_LABEL}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWeekday(meta.dayOfWeek);
                          const defaultWorkout =
                            dayRule.workouts[0] || workoutOptions[0]?.item;
                          updateLocalWeekday(meta.dayOfWeek, (prev) => ({
                            ...prev,
                            isRestDay: !defaultWorkout,
                            isAlternating: false,
                            workouts: defaultWorkout ? [defaultWorkout] : [],
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          mode === 'single'
                            ? 'bg-[#6366F1] text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Sabit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWeekday(meta.dayOfWeek);
                          const seeded =
                            dayRule.workouts.length >= 2
                              ? dayRule.workouts
                              : workoutOptions.slice(0, 2).map((o) => o.item);
                          updateLocalWeekday(meta.dayOfWeek, (prev) => ({
                            ...prev,
                            isRestDay: seeded.length === 0,
                            isAlternating: true,
                            workouts: seeded,
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          mode === 'alternating'
                            ? 'bg-[#9B6FFF] text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Dönüşümlü
                      </button>
                    </div>
                  </div>

                  {/* Single Workout Dropdown */}
                  {mode === 'single' && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                        Atanan Antrenman
                      </label>
                      <select
                        value={
                          workoutOptions.find(
                            (o) =>
                              dayRule.workouts[0] &&
                              isSameScheduledWorkout(o.item, dayRule.workouts[0])
                          )?.key || ''
                        }
                        onChange={(e) => {
                          const found = workoutOptions.find((o) => o.key === e.target.value);
                          if (!found) return;
                          updateLocalWeekday(meta.dayOfWeek, (prev) => ({
                            ...prev,
                            isRestDay: false,
                            isAlternating: false,
                            workouts: [found.item],
                          }));
                        }}
                        className="w-full bg-[#1B1B1F] border border-[#2F2F37] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="">Antrenman seçin...</option>
                        {workoutOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Alternating Multi-Select Pool */}
                  {mode === 'alternating' && (
                    <div className="space-y-2.5">
                      <label className="block text-xs text-gray-400 font-medium">
                        Dönüşümlü Antrenman Havuzu (Birden fazla seçin)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {workoutOptions.map((opt) => {
                          const checked = dayRule.workouts.some((w) =>
                            isSameScheduledWorkout(w, opt.item)
                          );
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                updateLocalWeekday(meta.dayOfWeek, (prev) => {
                                  const exists = prev.workouts.some((w) =>
                                    isSameScheduledWorkout(w, opt.item)
                                  );
                                  const nextWorkouts = exists
                                    ? prev.workouts.filter(
                                        (w) => !isSameScheduledWorkout(w, opt.item)
                                      )
                                    : [...prev.workouts, opt.item];
                                  return {
                                    ...prev,
                                    isRestDay: nextWorkouts.length === 0,
                                    isAlternating: true,
                                    workouts: nextWorkouts,
                                  };
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                checked
                                  ? 'bg-[#9B6FFF]/25 border-[#9B6FFF] text-purple-200'
                                  : 'bg-[#1B1B1F] border-[#2E2E36] text-gray-400 hover:text-white'
                              }`}
                            >
                              {opt.item.workoutName}
                            </button>
                          );
                        })}
                      </div>
                      {alternatingPreview?.selected && (
                        <div className="text-xs bg-purple-500/10 border border-purple-500/25 rounded-xl px-3 py-2 text-purple-200 flex items-center gap-2">
                          <RefreshCw size={13} className="shrink-0" />
                          <span>
                            Sıradaki öneri: <strong>{alternatingPreview.selected.workoutName}</strong>
                            {alternatingPreview.lastCompletedName
                              ? ` (Son yapılan: ${alternatingPreview.lastCompletedName})`
                              : ' (Henüz kayıt yok, ilki önerilir)'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Note / Class Time */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                      İsteğe Bağlı Not / Ders Saati
                    </label>
                    <input
                      type="text"
                      value={dayRule.note || ''}
                      onChange={(e) =>
                        updateLocalWeekday(meta.dayOfWeek, (prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      placeholder="Örn: 20:15 Crunch Dersi"
                      className="w-full bg-[#1B1B1F] border border-[#2F2F37] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ECDC4]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Detail & Single-Date Override Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2E2E36] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon size={18} className="text-[#6366F1]" />
                  <h3 className="text-xl font-bold text-white">
                    {selectedDay.date} · {selectedDay.dayLabel}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Durum: <span className="text-gray-200 font-semibold">{selectedDay.statusLabel}</span>
                  {selectedDay.isOverride && ' · (Tek Seferlik Özel Plan)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Completed Sessions Summary */}
            {selectedDay.completedSessions.length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Tamamlanan Antrenman Özeti
                  </span>
                  <span className="text-xs font-bold text-emerald-200">
                    {selectedDay.totalVolumeKg > 0 ? `${selectedDay.totalVolumeKg} kg Tonaj` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/25 rounded-xl p-2">
                    <p className="text-[11px] text-gray-400">Tonaj</p>
                    <p className="text-sm font-bold text-white">{selectedDay.totalVolumeKg} kg</p>
                  </div>
                  <div className="bg-black/25 rounded-xl p-2">
                    <p className="text-[11px] text-gray-400">Süre</p>
                    <p className="text-sm font-bold text-white">{selectedDay.totalDurationMinutes} dk</p>
                  </div>
                  <div className="bg-black/25 rounded-xl p-2">
                    <p className="text-[11px] text-gray-400">Set / Tekrar</p>
                    <p className="text-sm font-bold text-white">
                      {selectedDay.totalSets} / {selectedDay.totalReps}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {selectedDay.completedSessions.map((s: any, idx: number) => (
                    <div
                      key={s.id || idx}
                      className="text-xs text-gray-200 flex items-center justify-between bg-black/20 px-3 py-2 rounded-xl"
                    >
                      <span className="font-semibold flex items-center gap-1.5">
                        <Dumbbell size={13} className="text-emerald-400" />
                        {s.workout_name || s.workoutName || s.program_name || 'Antrenman'}
                      </span>
                      <span className="text-gray-400">{s.duration || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single-Date Flexible Override Form */}
            <div className="bg-[#1A1A1E] border border-[#2A2A32] rounded-2xl p-4 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Tek Seferlik Gün Yönetimi (Haftalık Düzeni Bozmaz)
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tatil, salon kapanışı veya program değişimi için yalnızca bu tarihi güncelleyin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideMode('workout')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    overrideMode === 'workout'
                      ? 'bg-[#6366F1]/25 border-[#6366F1] text-white'
                      : 'bg-[#141416] border-[#2C2C34] text-gray-400'
                  }`}
                >
                  Başka Antrenman Seç
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideMode('rest')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    overrideMode === 'rest'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#141416] border-[#2C2C34] text-gray-400'
                  }`}
                >
                  {REST_DAY_LABEL}ne Çek
                </button>
              </div>

              {overrideMode === 'workout' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                    Bu Gün İçin Antrenman
                  </label>
                  <select
                    value={overrideWorkoutKey}
                    onChange={(e) => setOverrideWorkoutKey(e.target.value)}
                    className="w-full bg-[#141416] border border-[#2E2E36] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366F1]"
                  >
                    {workoutOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  Bu Güne Özel Not / Saat
                </label>
                <input
                  type="text"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Örn: 20:15 Crunch Dersi veya Salon Kapalı"
                  className="w-full bg-[#141416] border border-[#2E2E36] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveOverride}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-50 text-white text-xs font-bold transition-colors"
                >
                  {saving ? 'Kaydediliyor...' : 'Yalnızca Bu Günü Kaydet'}
                </button>
                {selectedDay.isOverride && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleClearOverride}
                    className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-colors"
                  >
                    <RotateCcw size={13} />
                    <span>Kalıcı Düzeni Geri Yükle</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
