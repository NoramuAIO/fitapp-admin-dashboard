'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart2,
  Activity,
  Clock,
  Dumbbell,
  User,
  Calendar,
  PieChart,
  TrendingUp,
  Award,
  Zap,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  MessageSquare,
  Sparkles,
  Trophy,
  Flame,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  X,
  Check
} from 'lucide-react';
import { useConfirm } from '@/components/ConfirmModal';
import { apiFetch } from '@/lib/clientCache';
import {
  formatIstanbulLocaleDate,
  getStoredSelectedUserId,
  setStoredSelectedUserId,
  subscribeUserSelected,
} from '@/lib/userSelection';
import {
  isRealWorkoutSession,
  isManualTimerSession,
  parseDurationToMinutes,
  getLocalDateString,
  calculateCompletionVolume,
  calculateDurationMinutesForCompletions,
  calculateDurationPRs,
  calculateExercisePRs,
  calculateWorkoutCalories,
  calculateMuscleDistribution,
  calculateAthleteRank,
  extractCompletionDurationSeconds,
  getCompletionTrackingType,
} from '@/lib/fitnessCalculations';
import { formatDurationSeconds, stripDurationNoteTag } from '@/lib/exerciseTracking';

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

interface ExerciseCompletion {
  id: number;
  userId: number;
  exerciseId: number;
  sessionId?: number | null;
  completedAt: string;
  sets: number;
  reps: number;
  weight?: number | null;
  notes?: string | null;
  exercises?: {
    id: number;
    name: string;
    sets: number;
    reps: number;
  } | null;
  users?: {
    id: number;
    name: string;
  } | null;
}

interface WeightLog {
  id: number;
  userId: number;
  date: string;
  weight: number;
  notes?: string | null;
}

interface AthleteRank {
  id: number;
  title: string;
  icon: string;
  color: string;
  min_volume_kg: number;
  max_volume_kg: number;
  min_workouts?: number;
  description: string;
}

export default function AnalyticsPage() {
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [completions, setCompletions] = useState<ExerciseCompletion[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(true);

  // Sporcu Seviyeleri (Athlete Ranks) State
  const [ranks, setRanks] = useState<AthleteRank[]>([]);
  const [showRanksModal, setShowRanksModal] = useState(false);
  const [editingRank, setEditingRank] = useState<AthleteRank | null>(null);
  const [showRankForm, setShowRankForm] = useState(false);
  const [rankTitle, setRankTitle] = useState('');
  const [rankIcon, setRankIcon] = useState('⚡');
  const [rankColor, setRankColor] = useState('#5DD97C');
  const [rankMinKg, setRankMinKg] = useState('0');
  const [rankMaxKg, setRankMaxKg] = useState('15000');
  const [rankMinWorkouts, setRankMinWorkouts] = useState('0');
  const [rankDesc, setRankDesc] = useState('');
  const [rankFormError, setRankFormError] = useState<string | null>(null);
  const [isSavingRank, setIsSavingRank] = useState(false);

  const selectedUserIdRef = useRef<number | null | undefined>(selectedUserId);
  selectedUserIdRef.current = selectedUserId;

  const searchParams = useSearchParams();
  const urlUserId = searchParams.get('userId');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/users?lite=1');
      if (!res.ok) return;
      const data = await res.json();
      const safeUsers: UserModel[] = Array.isArray(data) ? data : [];
      setUsers(safeUsers);
      const currentUid = selectedUserIdRef.current;
      if (
        typeof currentUid === 'number' &&
        safeUsers.length > 0 &&
        !safeUsers.some((u) => Number(u.id) === currentUid)
      ) {
        selectedUserIdRef.current = null;
        setSelectedUserId(null);
        setStoredSelectedUserId(null);
      }
    } catch {}
  }, []);

  const loadRanks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/athlete-ranks');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setRanks(data);
    } catch {}
  }, []);

  const loadData = useCallback(
    async (
      targetUserId: number | null | undefined = selectedUserIdRef.current,
      options?: { silent?: boolean; forceRefresh?: boolean }
    ) => {
      if (targetUserId === undefined) return;
      const silent = Boolean(options?.silent);
      const forceRefresh = Boolean(options?.forceRefresh);
      try {
        if (!silent) setLoading(true);
        const sessionUrl = targetUserId
          ? `/api/workout-sessions?userId=${targetUserId}`
          : '/api/workout-sessions';
        const completionUrl = targetUserId
          ? `/api/exercise-completions?userId=${targetUserId}&limit=2000`
          : '/api/exercise-completions?limit=2000';
        const weightUrl = targetUserId
          ? `/api/weight-logs?userId=${targetUserId}`
          : '/api/weight-logs';

        const [sessionsRes, completionsRes, weightRes] = await Promise.all([
          apiFetch(sessionUrl, { forceRefresh }),
          apiFetch(completionUrl, { forceRefresh }),
          apiFetch(weightUrl, { forceRefresh }),
        ]);

        const [sessionsData, completionsData, weightData] = await Promise.all([
          sessionsRes.ok ? sessionsRes.json() : [],
          completionsRes.ok ? completionsRes.json() : [],
          weightRes.ok ? weightRes.json() : [],
        ]);

        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setCompletions(Array.isArray(completionsData) ? completionsData : []);
        setWeightLogs(Array.isArray(weightData) ? weightData : []);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsers();
    loadRanks();
    if (urlUserId) {
      const parsed = parseInt(urlUserId, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        selectedUserIdRef.current = parsed;
        setSelectedUserId(parsed);
        setStoredSelectedUserId(parsed);
        return;
      }
    }
    const stored = getStoredSelectedUserId();
    selectedUserIdRef.current = stored;
    setSelectedUserId(stored);
  }, [urlUserId, fetchUsers, loadRanks]);

  useEffect(() => {
    const unsubscribe = subscribeUserSelected((uid) => {
      if (uid !== selectedUserIdRef.current) {
        selectedUserIdRef.current = uid;
        setSelectedUserId(uid);
      }
    });
    const onFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadData(selectedUserIdRef.current, { silent: true, forceRefresh: true });
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [loadData]);

  useEffect(() => {
    if (selectedUserId === undefined) return;
    loadData(selectedUserId);
  }, [selectedUserId, loadData]);

  const handleOpenRankForm = (r?: AthleteRank) => {
    setRankFormError(null);
    if (r) {
      setEditingRank(r);
      setRankTitle(r.title);
      setRankIcon(r.icon);
      setRankColor(r.color);
      setRankMinKg(String(r.min_volume_kg));
      setRankMaxKg(String(r.max_volume_kg));
      setRankMinWorkouts(String(r.min_workouts ?? 0));
      setRankDesc(r.description);
    } else {
      setEditingRank(null);
      setRankTitle('');
      setRankIcon('⚡');
      setRankColor('#5DD97C');
      const lastRank = ranks[ranks.length - 1];
      const nextMin = lastRank ? lastRank.max_volume_kg : 0;
      const nextWorkouts = lastRank ? (lastRank.min_workouts ?? 0) + 10 : 0;
      setRankMinKg(String(nextMin));
      setRankMaxKg(String(nextMin + 50000));
      setRankMinWorkouts(String(nextWorkouts));
      setRankDesc('');
    }
    setShowRankForm(true);
  };

  const handleSaveRank = async (e: React.FormEvent) => {
    e.preventDefault();
    setRankFormError(null);
    if (!rankTitle.trim()) {
      setRankFormError('Seviye adı zorunludur.');
      return;
    }
    const minVal = Number(rankMinKg);
    const maxVal = Number(rankMaxKg);
    const minWorkoutsVal = Number(rankMinWorkouts);
    if (!Number.isFinite(minVal) || minVal < 0) {
      setRankFormError('Min tonaj 0 veya daha büyük olmalıdır.');
      return;
    }
    if (!Number.isFinite(maxVal) || maxVal <= minVal) {
      setRankFormError('Maksimum tonaj değeri minimum değerden büyük olmalıdır.');
      return;
    }
    if (!Number.isFinite(minWorkoutsVal) || minWorkoutsVal < 0) {
      setRankFormError('Min antrenman sayısı 0 veya daha büyük olmalıdır.');
      return;
    }

    setIsSavingRank(true);
    try {
      const payload = {
        title: rankTitle.trim(),
        icon: rankIcon.trim() || '⚡',
        color: rankColor,
        min_volume_kg: minVal,
        max_volume_kg: maxVal,
        min_workouts: Math.round(minWorkoutsVal),
        description: rankDesc.trim(),
      };
      const res = editingRank
        ? await apiFetch('/api/athlete-ranks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingRank.id, ...payload }),
          })
        : await apiFetch('/api/athlete-ranks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setRankFormError(errData.error || 'Seviye kaydedilemedi.');
        return;
      }
      await loadRanks();
      setShowRankForm(false);
      setEditingRank(null);
    } catch (err) {
      console.error('Error saving rank:', err);
      setRankFormError('Seviye kaydedilirken bir ağ hatası oluştu.');
    } finally {
      setIsSavingRank(false);
    }
  };

  const handleDeleteRank = async (id: number) => {
    const ok = await confirm({
      title: 'Sporcu Seviyesini Sil',
      message: 'Bu seviye kademesini silmek istediğinizden emin misiniz?',
      confirmText: 'Evet, Sil',
    });
    if (!ok) return;

    try {
      const numericId = Number(id);
      setRanks((prev) => prev.filter((r) => Number(r.id) !== numericId));
      let res = await apiFetch('/api/athlete-ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: numericId }),
      });
      if (!res.ok) {
        res = await apiFetch(`/api/athlete-ranks?id=${numericId}`, {
          method: 'DELETE',
        });
      }
      if (!res.ok) {
        await loadRanks();
      }
    } catch {
      await loadRanks();
    }
  };

  const handleResetDefaultRanks = async () => {
    const ok = await confirm({
      title: 'Seviyeleri Sıfırla',
      message: 'Tüm özel seviye kademeleri silinip varsayılan 7 seviyeye döndürülecek. Devam edilsin mi?',
      confirmText: 'Varsayılanlara Sıfırla',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      const res = await apiFetch('/api/athlete-ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_defaults' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Seviyeler sıfırlanamadı.');
        return;
      }
      await loadRanks();
    } catch {
      alert('Seviyeler sıfırlanırken bir hata oluştu.');
    }
  };

  // Date filtering helper (Europe/Istanbul calendar day parity)
  const todayStr = getLocalDateString(new Date());
  const todayMid = new Date(`${todayStr}T12:00:00Z`).getTime();
  const filterByTime = (dateStr: string) => {
    if (timeRange === 'all') return true;
    const itemYmd = getLocalDateString(dateStr);
    if (!itemYmd) return false;
    const itemMid = new Date(`${itemYmd}T12:00:00Z`).getTime();
    if (Number.isNaN(itemMid)) return false;
    const diffDays = (todayMid - itemMid) / (1000 * 3600 * 24);
    if (timeRange === '7d') return diffDays >= 0 && diffDays <= 6;
    if (timeRange === '30d') return diffDays >= 0 && diffDays <= 29;
    return true;
  };

  // Filter sessions and completions based on time range
  const filteredSessions = sessions.filter(s => filterByTime(s.startTime));
  const filteredCompletions = completions.filter(c => filterByTime(c.completedAt));

  // Separate real workout sessions from manual timer logs
  const workoutSessions = filteredSessions.filter(isRealWorkoutSession);
  const durationSessions = filteredSessions.filter(isManualTimerSession);

  // Key Stats
  const totalWorkouts = workoutSessions.length;
  const totalExercises = workoutSessions.reduce((sum, s) => sum + (s.completed_exercises || 0), 0);

  // Total sets, reps and volume calculated identically to mobile (excluding duration_only from sets)
  const { totalSets, totalReps, totalVolumeKg } = filteredCompletions.reduce(
    (acc, c) => {
      const trackingType = getCompletionTrackingType(c);
      const { sets, reps, volume } = calculateCompletionVolume(c);
      const setCount = trackingType === 'duration_only' ? 0 : sets > 0 ? sets : 0;
      const repCount = Array.isArray((c as any)?.setsDetail) && (c as any).setsDetail.length > 0
        ? (c as any).setsDetail.reduce((rSum: number, s: any) => rSum + (Number(s?.reps) || 0), 0)
        : setCount * reps;
      acc.totalSets += setCount;
      acc.totalReps += repCount;
      acc.totalVolumeKg += volume;
      return acc;
    },
    { totalSets: 0, totalReps: 0, totalVolumeKg: 0 }
  );

  const avgVolumePerWorkout = totalWorkouts > 0 ? Math.round(totalVolumeKg / totalWorkouts) : 0;

  // Separated Durations: pure workout duration vs gym stay duration
  const workoutMinutes = workoutSessions.reduce((sum, s) => sum + parseDurationToMinutes(s.duration), 0);
  const workoutHours = Math.floor(workoutMinutes / 60);
  const remainingWorkoutMinutes = workoutMinutes % 60;

  const gymMinutes = durationSessions.reduce((sum, s) => sum + parseDurationToMinutes(s.duration), 0);
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

  // Daily Activity Chart Bars (7 or 14 Istanbul calendar days depending on range)
  const daysToShow = timeRange === '30d' ? 14 : 7;
  const daysList = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date(`${todayStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (daysToShow - 1 - i));
    return getLocalDateString(d);
  });

  const dailyWorkouts = daysList.map(date => {
    const daySessions = workoutSessions.filter(s => s.startTime && getLocalDateString(s.startTime) === date);
    const dayCompletions = filteredCompletions.filter(c => c.completedAt && getLocalDateString(c.completedAt) === date);
    const dayVolume = dayCompletions.reduce((sum, c) => sum + calculateCompletionVolume(c).volume, 0);
    return {
      date,
      count: daySessions.length,
      volume: dayVolume,
    };
  });
  const maxDailyCount = Math.max(...dailyWorkouts.map(d => d.count), 1);

  // Personal Records (PRs) with Epley Estimated 1RM parity & Duration PRs
  const prNoteMap: Record<string, string> = {};
  filteredCompletions.forEach(c => {
    const cleanNote = stripDurationNoteTag(c.notes);
    if (cleanNote) {
      const key = String(c.exercises?.name || `Hareket #${c.exerciseId}`).trim().toLowerCase();
      const { weight } = calculateCompletionVolume(c);
      prNoteMap[`${key}|${weight}`] = cleanNote;
    }
  });
  const prList = calculateExercisePRs(filteredCompletions).slice(0, 6);
  const durationPRList = calculateDurationPRs(filteredCompletions).slice(0, 6);
  const timedMinutes = calculateDurationMinutesForCompletions(filteredCompletions);
  const allTimeTimedMinutes = calculateDurationMinutesForCompletions(completions);
  const allTimeWorkouts = sessions.filter(isRealWorkoutSession).length;

  // Top Exercises by Volume
  const exerciseVolumeMap: Record<string, { name: string; volume: number; sets: number; maxWeight: number }> = {};
  filteredCompletions.forEach(c => {
    const displayName = (c.exercises?.name || `Hareket #${c.exerciseId}`).trim();
    const key = displayName.toLowerCase();
    const { weight, sets, volume } = calculateCompletionVolume(c);
    if (!exerciseVolumeMap[key]) {
      exerciseVolumeMap[key] = { name: displayName, volume: 0, sets: 0, maxWeight: 0 };
    }
    exerciseVolumeMap[key].volume += volume;
    exerciseVolumeMap[key].sets += sets;
    exerciseVolumeMap[key].maxWeight = Math.max(exerciseVolumeMap[key].maxWeight, weight);
  });
  const topVolumeExercises = Object.values(exerciseVolumeMap).sort((a, b) => b.volume - a.volume).slice(0, 5);
  const maxExerciseVolume = Math.max(...topVolumeExercises.map(e => e.volume), 1);

  // Recent Exercise Stream
  const recentCompletions = completions.slice(0, 7);

  // Body Weight Tracker Snapshot (strictly scoped to single selected athlete)
  const scopedWeightLogs =
    selectedUserId !== null && selectedUserId !== undefined
      ? weightLogs.filter((w) => Number(w.userId) === selectedUserId)
      : [];
  const latestWeight = scopedWeightLogs.length > 0 ? scopedWeightLogs[0].weight : null;
  const initialWeight =
    scopedWeightLogs.length > 1 ? scopedWeightLogs[scopedWeightLogs.length - 1].weight : null;
  const weightChange =
    latestWeight !== null && initialWeight !== null
      ? Number((latestWeight - initialWeight).toFixed(1))
      : null;

  // Cumulative Athlete Rank, Estimated Calories & Muscle Distribution (mobile parity)
  const allTimeVolumeKg = completions.reduce((sum, c) => sum + calculateCompletionVolume(c).volume, 0);
  const athleteRank = calculateAthleteRank(
    allTimeVolumeKg,
    ranks.length > 0 ? ranks : undefined,
    allTimeWorkouts,
    allTimeTimedMinutes
  );
  const estimatedCalories = calculateWorkoutCalories(
    workoutMinutes,
    totalVolumeKg,
    totalSets,
    latestWeight || 75,
    totalReps,
    timedMinutes
  );
  const muscleDistribution = calculateMuscleDistribution(filteredCompletions);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Analizler
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/20 font-semibold">
              Canlı Metrikler
            </span>
          </h1>
          <p className="text-gray-400">Antrenman hacmi, kaldırılan ağırlıklar, PR rekorları ve performans analizleri</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sporcu Seviyeleri & Tonaj Eşikleri Butonu */}
          <button
            onClick={() => {
              setShowRanksModal(true);
              setShowRankForm(false);
            }}
            className="flex items-center gap-2 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-sm"
          >
            <Trophy size={14} className="stroke-[2.5]" />
            <span>Sporcu Seviyeleri ({ranks.length})</span>
          </button>

          {/* Time Filter Pills */}
          <div className="flex items-center bg-[#141414] p-1 rounded-xl border border-[#2A2A2A]">
            {[
              { id: '7d', label: 'Son 7 Gün' },
              { id: '30d', label: 'Son 30 Gün' },
              { id: 'all', label: 'Tüm Zamanlar' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === tab.id
                    ? 'bg-[#6366F1] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* User Filter Dropdown */}
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              className="bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2 pl-9 pr-9 text-xs font-medium focus:outline-none focus:border-[#6366F1] appearance-none cursor-pointer"
              value={selectedUserId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const id = parseInt(val, 10);
                  selectedUserIdRef.current = id;
                  setSelectedUserId(id);
                  setStoredSelectedUserId(id);
                } else {
                  selectedUserIdRef.current = null;
                  setSelectedUserId(null);
                  setStoredSelectedUserId(null);
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
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Analiz verileri yükleniyor...</p>
        </div>
      ) : sessions.length === 0 && completions.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
            <BarChart2 size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Veri Bulunamadı</h3>
          <p className="text-gray-400">Seçilen kriterlere uygun oturum veya antrenman kaydı yok.</p>
        </div>
      ) : (
        <>
          {/* Athlete Rank Progress Banner (Cumulative Tonnage) */}
          <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border shrink-0"
                style={{
                  backgroundColor: `${athleteRank.color}18`,
                  borderColor: `${athleteRank.color}40`,
                }}
              >
                {athleteRank.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                    Sporcu Rütbesi
                  </span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                    style={{
                      color: athleteRank.color,
                      backgroundColor: `${athleteRank.color}15`,
                      borderColor: `${athleteRank.color}35`,
                    }}
                  >
                    {athleteRank.title}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{athleteRank.description}</p>
              </div>
            </div>

            <div className="md:w-96 space-y-1.5">
              <div className="flex justify-between text-xs gap-2">
                <span className="text-gray-400">
                  Skor: <strong className="text-white">{athleteRank.effectiveScore.toLocaleString('tr-TR')}</strong>
                  {' '}• <strong className="text-white">{athleteRank.totalWorkouts}</strong> ant.
                </span>
                <span className="font-bold" style={{ color: athleteRank.color }}>
                  %{athleteRank.pct}
                </span>
              </div>
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#262626]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${athleteRank.pct}%`, backgroundColor: athleteRank.color }}
                />
              </div>
              <p className="text-[11px] text-gray-500 text-right">
                {athleteRank.nextTitle
                  ? `Sonraki: ${athleteRank.nextTitle} (${athleteRank.nextTarget.toLocaleString('tr-TR')} puan • min ${athleteRank.nextMinWorkouts} ant.)`
                  : 'Maksimum seviyeye ulaşıldı'}
              </p>
            </div>
          </div>

          {/* Top KPI Cards (6 Metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 1. Toplam Antrenman */}
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#6366F1]/10 border border-[#6366F1]/20">
                  <Activity size={18} className="text-[#6366F1]" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Toplam Antrenman</span>
              </div>
              <p className="text-3xl font-extrabold text-white">{totalWorkouts}</p>
              <p className="text-xs text-gray-500 mt-1">Efor seansı</p>
            </div>

            {/* 2. Antrenman Süresi */}
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#5DD97C]/10 border border-[#5DD97C]/20">
                  <Clock size={18} className="text-[#5DD97C]" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Antrenman Süresi</span>
              </div>
              <p className="text-3xl font-extrabold text-white">
                {workoutHours > 0 ? `${workoutHours}s ` : ''}{remainingWorkoutMinutes}dk
              </p>
              {gymMinutes > 0 && (
                <p className="text-xs text-purple-400 mt-1 font-medium">
                  ⏱️ Salon: {gymHours > 0 ? `${gymHours}s ` : ''}{remainingGymMinutes}dk
                </p>
              )}
            </div>

            {/* 3. En Yüksek Ağırlık & Hacim */}
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#4ECDC4]/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#4ECDC4]/10 border border-[#4ECDC4]/20">
                  <Dumbbell size={18} className="text-[#4ECDC4]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium">En Yüksek Ağırlık (PR)</span>
                  <span className="text-[10px] text-[#4ECDC4] font-medium">
                    {prList.length > 0 ? prList[0].exerciseName : 'Kişisel Rekor'}
                  </span>
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[#4ECDC4]">
                {prList.length > 0 ? `${prList[0].maxWeight} kg` : '0 kg'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Toplam İş: <strong className="text-white">{(totalVolumeKg / 1000).toFixed(2)} ton</strong> ({totalVolumeKg.toLocaleString('tr-TR')} kg)
              </p>
            </div>

            {/* 4. Tamamlanan Set */}
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF6B4A]/10 border border-[#FF6B4A]/20">
                  <Dumbbell size={18} className="text-[#FF6B4A]" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Tamamlanan Set</span>
              </div>
              <p className="text-3xl font-extrabold text-white">{totalSets} Set</p>
              <p className="text-xs text-gray-500 mt-1">Toplam {totalReps.toLocaleString('tr-TR')} tekrar</p>
            </div>

            {/* 5. Tahmini Kalori */}
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                  <Flame size={18} className="text-[#F59E0B]" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Tahmini Kalori</span>
              </div>
              <p className="text-3xl font-extrabold text-white">
                {estimatedCalories.toLocaleString('tr-TR')} kcal
              </p>
              <p className="text-xs text-gray-500 mt-1">Süre + Hacim (MET) hesabı</p>
            </div>

            {/* 6. Vücut Ağırlığı / Kilo */}
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#9B6FFF]/10 border border-[#9B6FFF]/20">
                  <Scale size={18} className="text-[#9B6FFF]" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Vücut Ağırlığı</span>
              </div>
              <p className="text-3xl font-extrabold text-white">
                {latestWeight !== null ? `${latestWeight} kg` : '-'}
              </p>
              {selectedUserId === null ? (
                <p className="text-xs text-gray-500 mt-1">Tek sporcu seçin</p>
              ) : weightChange !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {weightChange >= 0 ? (
                    <span className="text-xs text-green-400 font-semibold flex items-center">
                      <ArrowUpRight size={13} /> +{weightChange} kg
                    </span>
                  ) : (
                    <span className="text-xs text-orange-400 font-semibold flex items-center">
                      <ArrowDownRight size={13} /> {weightChange} kg
                    </span>
                  )}
                  <span className="text-xs text-gray-500">başlangıçtan</span>
                </div>
              )}
            </div>
          </div>

          {/* Info banner for manual timer */}
          {durationSessions.length > 0 && (
            <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-purple-500/20 flex items-center justify-between">
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

          {/* Personal Records & Duration PRs */}
          {durationPRList.length > 0 && (
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#5DD97C]/10 border border-[#5DD97C]/25 flex items-center justify-center">
                    <Clock size={16} className="text-[#5DD97C]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">En Uzun Süre Rekorları</h3>
                    <p className="text-xs text-gray-400">Kardiyo ve süreli hareketlerde en iyi performanslar</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{durationPRList.length} kayıtlı hareket</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {durationPRList.map((dpr, idx) => (
                  <div
                    key={dpr.key}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#5DD97C]">#{idx + 1}</span>
                        <p className="font-semibold text-white text-sm truncate">{dpr.exerciseName}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {dpr.trackingType === 'sets_duration'
                          ? `${dpr.setsAtMax} set • Toplam ${formatDurationSeconds(dpr.totalDurationSeconds)}`
                          : `Toplam ${formatDurationSeconds(dpr.totalDurationSeconds)}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-extrabold text-[#5DD97C]">
                        {formatDurationSeconds(dpr.maxDurationSeconds)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Records (PR Vitrini) */}
          <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] border border-[#FFD700]/20">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    Kişisel Rekorlar (PR Vitrini)
                    <span className="text-xs font-normal text-gray-400">· En Yüksek Ağırlıklar</span>
                  </h3>
                </div>
              </div>
              <span className="text-xs text-gray-400">{prList.length} kayıtlı hareket</span>
            </div>

            {prList.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                Henüz ağırlık girişi yapılmış egzersiz bulunmuyor. Mobil uygulamada girilen setler burada PR olarak listelenecektir.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prList.map((pr, index) => {
                  const prNote = prNoteMap[`${pr.key}|${pr.maxWeight}`];
                  return (
                    <div
                      key={pr.key}
                      className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] hover:border-[#4ECDC4]/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-[#252525] text-xs font-bold flex items-center justify-center text-gray-400 group-hover:bg-[#4ECDC4]/20 group-hover:text-[#4ECDC4] transition-colors shrink-0">
                            #{index + 1}
                          </span>
                          <h4 className="text-sm font-bold text-white truncate max-w-[150px]">
                            {pr.exerciseName}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#4ECDC4]/15 text-[#4ECDC4] border border-[#4ECDC4]/25 shrink-0">
                          {pr.maxWeight} kg
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#262626]">
                        <span>
                          {pr.repsAtMax > 0 ? `${pr.repsAtMax} tekrar` : 'Tekrar yok'}
                          {pr.estimated1RM > 0 && (
                            <span className="ml-2 text-[#FFD700] font-semibold">
                              · 1RM ~{pr.estimated1RM} kg
                            </span>
                          )}
                        </span>
                        <span className="text-gray-500">
                          {pr.date ? formatIstanbulLocaleDate(pr.date, { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>

                      {prNote ? (
                        <div className="mt-2.5 text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 truncate">
                          📌 {prNote}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity & Volume Chart */}
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-[#6366F1]" /> Antrenman & Hacim Aktivitesi
                </h3>
                <span className="text-xs text-gray-400">Son {daysToShow} Gün</span>
              </div>

              <div className="flex items-end justify-between h-48 gap-2">
                {dailyWorkouts.map((day) => {
                  const heightPercent = (day.count / maxDailyCount) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-3 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-12 bg-[#2A2A2A] border border-[#3A3A3A] text-white text-xs py-1.5 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl">
                        <div className="font-bold">{day.count} Antrenman</div>
                        {day.volume > 0 && (
                          <div className="text-[#4ECDC4] text-[11px]">{day.volume.toLocaleString('tr-TR')} kg hacim</div>
                        )}
                      </div>

                      <div className="w-full bg-[#1A1A1A] rounded-t-lg mt-auto overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-[#6366F1] to-[#8B5CF6] transition-all duration-500 rounded-t-lg group-hover:brightness-110"
                          style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {formatIstanbulLocaleDate(day.date, { weekday: 'short' })}
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
                  {Object.entries(programCounts)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, count]: any, idx) => {
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

          {/* Muscle Distribution Breakdown */}
          {muscleDistribution.length > 0 && (
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-[#9B6FFF]" /> Kas Grubu Dağılımı
                </h3>
                <span className="text-xs text-gray-400">Set ve Hacim Payı</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {muscleDistribution.map((item) => (
                  <div key={item.group} className="bg-[#1A1A1A] rounded-xl p-4 border border-[#262626]">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-semibold text-white">{item.group}</span>
                      <span className="font-bold" style={{ color: item.color }}>
                        %{item.percent}
                      </span>
                    </div>
                    <div className="h-2 bg-[#252525] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{item.count} set</span>
                      <span>{item.volume.toLocaleString('tr-TR')} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Row: Top Volume Exercises & Recent Exercise Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Exercises by Volume */}
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#4ECDC4]" /> En Çok Hacim Yapılan Hareketler
                </h3>
                <span className="text-xs text-gray-400">Toplam Tonaj</span>
              </div>

              {topVolumeExercises.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  Henüz ağırlık kaydı bulunmuyor.
                </div>
              ) : (
                <div className="space-y-4">
                  {topVolumeExercises.map((ex, idx) => {
                    const percent = Math.round((ex.volume / maxExerciseVolume) * 100);
                    return (
                      <div key={ex.name} className="bg-[#1A1A1A] p-3.5 rounded-xl border border-[#262626]">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-white flex items-center gap-2">
                            <span className="text-xs text-gray-500">#{idx + 1}</span>
                            {ex.name}
                          </span>
                          <span className="font-bold text-[#4ECDC4]">
                            {ex.volume.toLocaleString('tr-TR')} kg
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#252525] rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-[#4ECDC4] rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{ex.sets} set tamamlandı</span>
                          <span>Maks: {ex.maxWeight > 0 ? `${ex.maxWeight} kg` : '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Lift & Machine Notes Stream */}
            <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-[#9B6FFF]" /> Son Tamamlanan Egzersizler
                </h3>
                <span className="text-xs text-gray-400">Canlı Akış</span>
              </div>

              {recentCompletions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  Henüz tamamlanan hareket kaydı bulunmuyor.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCompletions.map((comp) => (
                    <div
                      key={comp.id}
                      className="bg-[#1A1A1A] p-3.5 rounded-xl border border-[#262626] flex items-center justify-between gap-3 hover:border-[#3A3A3A] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-white truncate">
                            {comp.exercises?.name || `Hareket #${comp.exerciseId}`}
                          </h4>
                          <span className="text-xs text-gray-500 truncate">
                            · {comp.users?.name || `Kullanıcı #${comp.userId}`}
                          </span>
                        </div>
                        {comp.notes && stripDurationNoteTag(comp.notes) ? (
                          <div className="text-xs text-purple-300 truncate mt-1 flex items-center gap-1 font-mono">
                            <MessageSquare size={11} className="text-purple-400 shrink-0" />
                            <span>{stripDurationNoteTag(comp.notes)}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="text-right shrink-0">
                        {(() => {
                          const durSec = extractCompletionDurationSeconds(comp);
                          const mode = getCompletionTrackingType(comp);
                          if (durSec > 0 && (Number(comp.reps) === 0 || mode !== 'weight_reps')) {
                            return (
                              <>
                                <div className="text-xs font-extrabold text-[#5DD97C] bg-[#5DD97C]/10 px-2 py-0.5 rounded border border-[#5DD97C]/20 inline-block mb-1">
                                  ⏱️ {formatDurationSeconds(durSec)}
                                </div>
                                <div className="text-xs text-gray-400 font-medium">
                                  {mode === 'sets_duration'
                                    ? `${comp.sets || 1} set`
                                    : 'Süreli Efor'}
                                </div>
                              </>
                            );
                          }
                          return (
                            <>
                              <div className="text-xs font-extrabold text-[#4ECDC4] bg-[#4ECDC4]/10 px-2 py-0.5 rounded border border-[#4ECDC4]/20 inline-block mb-1">
                                {comp.weight !== null && comp.weight !== undefined && Number(comp.weight) > 0
                                  ? `${comp.weight} kg`
                                  : 'Vücut Ağ.'}
                              </div>
                              <div className="text-xs text-gray-400 font-medium">
                                {comp.sets || 1} set × {comp.reps} tekrar
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* SPORCU SEVİYELERİ YÖNETİM MODALI */}
      {showRanksModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#2E2E2E] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A] bg-[#141414]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy size={20} className="text-[#FFD700]" />
                  <span>Sporcu Seviyeleri & Tonaj Eşikleri</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Mobil uygulamadaki "Analizlerim" ekranında sporcuların hangi toplam tonajda hangi seviyeye ulaşacağını buradan özelleştirin.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRanksModal(false);
                  setShowRankForm(false);
                }}
                className="w-9 h-9 rounded-xl bg-[#222] hover:bg-[#333] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {showRankForm ? (
                /* Rank Add/Edit Form */
                <form onSubmit={handleSaveRank} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Trophy size={16} style={{ color: rankColor }} />
                      <span>{editingRank ? 'Seviyeyi Düzenle' : 'Yeni Seviye Ekle'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowRankForm(false)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      İptal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Seviye / Rütbe Adı *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Gümüş Güç"
                        value={rankTitle}
                        onChange={(e) => setRankTitle(e.target.value)}
                        className="w-full bg-[#202020] border border-[#333] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">İkon / Emoji *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={rankIcon}
                          onChange={(e) => setRankIcon(e.target.value)}
                          className="w-16 bg-[#202020] border border-[#333] rounded-xl px-3 py-2 text-white text-base text-center focus:outline-none focus:border-[#FFD700]"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {['⚡', '🥉', '🥈', '🥇', '💎', '🔥', '🏆', '👑', '🥋'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setRankIcon(emoji)}
                              className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-all ${
                                rankIcon === emoji ? 'bg-[#FFD700]/20 border-[#FFD700]' : 'bg-[#202020] border-[#333]'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Rozet Rengi *</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={rankColor}
                        onChange={(e) => setRankColor(e.target.value)}
                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={rankColor}
                        onChange={(e) => setRankColor(e.target.value)}
                        className="w-28 bg-[#202020] border border-[#333] rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#FFD700]"
                      />
                      <div className="flex gap-1.5">
                        {['#5DD97C', '#FF6B4A', '#9B6FFF', '#F59E0B', '#4ECDC4', '#FF6B9D', '#FFD700'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setRankColor(c)}
                            className="w-6 h-6 rounded-full border border-white/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Volume Range (kg) & Min Workouts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Min Tonaj / Puan *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={rankMinKg}
                        onChange={(e) => setRankMinKg(e.target.value)}
                        className="w-full bg-[#202020] border border-[#333] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Sonraki Hedef / Max *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={rankMaxKg}
                        onChange={(e) => setRankMaxKg(e.target.value)}
                        className="w-full bg-[#202020] border border-[#333] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Min Antrenman Sayısı *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={rankMinWorkouts}
                        onChange={(e) => setRankMinWorkouts(e.target.value)}
                        className="w-full bg-[#202020] border border-[#333] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                  </div>

                  {rankFormError && (
                    <div className="text-xs text-red-300 bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2">
                      {rankFormError}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Açıklama / Unvan Detayı</label>
                    <input
                      type="text"
                      placeholder="Örn: Disiplinli çalışan ve kuvvetlenen sporcu"
                      value={rankDesc}
                      onChange={(e) => setRankDesc(e.target.value)}
                      className="w-full bg-[#202020] border border-[#333] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRankForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#222] text-gray-300 hover:bg-[#2C2C2C]"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRank}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FFD700] hover:bg-[#E5C100] text-gray-950 transition-all flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>{isSavingRank ? 'Kaydediliyor...' : 'Kaydet'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Ranks List Table */
                <>
                  <div className="flex items-center justify-between pb-2">
                    <div className="text-xs text-gray-400 font-medium">
                      Tanımlı Seviyeler: <span className="text-white font-bold">{ranks.length} Rütbe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetDefaultRanks}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#222] text-gray-400 hover:text-white hover:bg-[#2C2C2C] transition-all"
                        title="Önerilen 7 seviyeye sıfırla"
                      >
                        <RotateCcw size={12} />
                        <span>Varsayılanlara Sıfırla</span>
                      </button>
                      <button
                        onClick={() => handleOpenRankForm()}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#FFD700] hover:bg-[#E5C100] text-gray-950 transition-all shadow-sm"
                      >
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>Yeni Seviye</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {ranks.map((r, index) => (
                      <div
                        key={r.id || index}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#141414] border border-[#262626] hover:border-[#383838] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border"
                            style={{ backgroundColor: r.color + '15', borderColor: r.color + '40' }}
                          >
                            {r.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-white text-sm">{r.title}</h5>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                style={{ backgroundColor: r.color + '20', color: r.color }}
                              >
                                {r.min_volume_kg.toLocaleString('tr-TR')} - {r.max_volume_kg.toLocaleString('tr-TR')} kg
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#222] text-gray-300 border border-[#333]">
                                min {r.min_workouts ?? 0} ant.
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{r.description || 'Sporcu seviye eşiği'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenRankForm(r)}
                            className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2C2C2C] text-gray-400 hover:text-white flex items-center justify-center transition-all"
                            title="Düzenle"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteRank(r.id)}
                            className="w-8 h-8 rounded-lg bg-[#222] hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all"
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2A2A2A] bg-[#141414] flex justify-end">
              <button
                onClick={() => {
                  setShowRanksModal(false);
                  setShowRankForm(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#222] text-white hover:bg-[#2C2C2C]"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
