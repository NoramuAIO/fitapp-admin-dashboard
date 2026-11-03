'use client';

import { useEffect, useState } from 'react';
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
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  X,
  Check
} from 'lucide-react';
import { useConfirm } from '@/components/ConfirmModal';

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
  description: string;
}

export default function AnalyticsPage() {
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [completions, setCompletions] = useState<ExerciseCompletion[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
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
  const [rankMinKg, setRankMinKg] = useState(0);
  const [rankMaxKg, setRankMaxKg] = useState(300);
  const [rankDesc, setRankDesc] = useState('');
  const [isSavingRank, setIsSavingRank] = useState(false);

  useEffect(() => {
    fetchUsers();
    loadRanks();
    const saved = localStorage.getItem('selectedUserId');
    if (saved) setSelectedUserId(parseInt(saved));
  }, []);

  const loadRanks = async () => {
    try {
      const res = await fetch('/api/athlete-ranks');
      const data = await res.json();
      if (Array.isArray(data)) setRanks(data);
    } catch {}
  };

  const handleOpenRankForm = (r?: AthleteRank) => {
    if (r) {
      setEditingRank(r);
      setRankTitle(r.title);
      setRankIcon(r.icon);
      setRankColor(r.color);
      setRankMinKg(r.min_volume_kg);
      setRankMaxKg(r.max_volume_kg);
      setRankDesc(r.description);
    } else {
      setEditingRank(null);
      setRankTitle('');
      setRankIcon('⚡');
      setRankColor('#5DD97C');
      const lastRank = ranks[ranks.length - 1];
      const nextMin = lastRank ? lastRank.max_volume_kg : 0;
      setRankMinKg(nextMin);
      setRankMaxKg(nextMin + 2500);
      setRankDesc('');
    }
    setShowRankForm(true);
  };

  const handleSaveRank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rankTitle.trim()) return;
    setIsSavingRank(true);
    try {
      const payload = {
        title: rankTitle.trim(),
        icon: rankIcon,
        color: rankColor,
        min_volume_kg: Number(rankMinKg) || 0,
        max_volume_kg: Number(rankMaxKg) || 1000,
        description: rankDesc.trim(),
      };
      if (editingRank) {
        await fetch('/api/athlete-ranks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingRank.id, ...payload }),
        });
      } else {
        await fetch('/api/athlete-ranks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await loadRanks();
      setShowRankForm(false);
      setEditingRank(null);
    } catch (err) {
      console.error('Error saving rank:', err);
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
      let res = await fetch('/api/athlete-ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: numericId }),
      });
      if (!res.ok) {
        res = await fetch(`/api/athlete-ranks?id=${numericId}`, {
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
    try {
      await fetch('/api/athlete-ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_defaults' }),
      });
      await loadRanks();
    } catch {}
  };

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
      const sessionUrl = selectedUserId ? `/api/workout-sessions?userId=${selectedUserId}` : '/api/workout-sessions';
      const completionUrl = selectedUserId ? `/api/exercise-completions?userId=${selectedUserId}` : '/api/exercise-completions';
      const weightUrl = selectedUserId ? `/api/weight-logs?userId=${selectedUserId}` : '/api/weight-logs';

      const [sessionsRes, programsRes, completionsRes, weightRes] = await Promise.all([
        fetch(sessionUrl),
        fetch('/api/programs'),
        fetch(completionUrl),
        fetch(weightUrl),
      ]);

      const sessionsData = await sessionsRes.json();
      const programsData = await programsRes.json();
      const completionsData = await completionsRes.json();
      const weightData = await weightRes.json();

      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setPrograms(Array.isArray(programsData) ? programsData : []);
      setCompletions(Array.isArray(completionsData) ? completionsData : []);
      setWeightLogs(Array.isArray(weightData) ? weightData : []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
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

  // Date filtering helper
  const now = new Date();
  const filterByTime = (dateStr: string) => {
    if (timeRange === 'all') return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
    if (timeRange === '7d') return diffDays <= 7;
    if (timeRange === '30d') return diffDays <= 30;
    return true;
  };

  // Filter sessions and completions based on time range
  const filteredSessions = sessions.filter(s => filterByTime(s.startTime));
  const filteredCompletions = completions.filter(c => filterByTime(c.completedAt));

  // Separate real workout sessions from manual timer logs
  const workoutSessions = filteredSessions.filter(
    s => !s.is_manual_timer && s.programId != null
  );
  const durationSessions = filteredSessions.filter(
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
      const avgSets = program?.exercises?.length
        ? program.exercises.reduce((sum: number, ex: any) => sum + (ex.sets || 0), 0) / program.exercises.length
        : 3;
      totalSets += (session.completed_exercises || 0) * avgSets;
    }
  });
  totalSets = Math.round(totalSets);

  // Total Volume Lifted (Tonaj Hesabı): weight * reps * sets
  const totalVolumeKg = filteredCompletions.reduce((sum, c) => {
    const w = Number(c.weight) || 0;
    const r = Number(c.reps) || 10;
    const s = Number(c.sets) || 1;
    return sum + (w * r * s);
  }, 0);

  const avgVolumePerWorkout = totalWorkouts > 0 ? Math.round(totalVolumeKg / totalWorkouts) : 0;

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

  // Daily Activity Chart Bars (7 or 14 days depending on range)
  const daysToShow = timeRange === '30d' ? 14 : 7;
  const daysList = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysToShow - 1 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyWorkouts = daysList.map(date => {
    const daySessions = workoutSessions.filter(s => s.startTime && s.startTime.split('T')[0] === date);
    const dayCompletions = completions.filter(c => c.completedAt && c.completedAt.split('T')[0] === date);
    const dayVolume = dayCompletions.reduce((sum, c) => {
      const w = Number(c.weight) || 0;
      const r = Number(c.reps) || 10;
      const s = Number(c.sets) || 1;
      return sum + (w * r * s);
    }, 0);
    return {
      date,
      count: daySessions.length,
      volume: dayVolume,
    };
  });
  const maxDailyCount = Math.max(...dailyWorkouts.map(d => d.count), 1);

  // Personal Records (PRs): Best weight lifted for each exercise
  const prMap: Record<string, { exerciseName: string; maxWeight: number; reps: number; date: string; userName: string; notes?: string | null }> = {};
  completions.forEach(c => {
    const exName = c.exercises?.name || `Hareket #${c.exerciseId}`;
    const w = Number(c.weight) || 0;
    if (w > 0) {
      if (!prMap[exName] || w > prMap[exName].maxWeight) {
        prMap[exName] = {
          exerciseName: exName,
          maxWeight: w,
          reps: c.reps,
          date: c.completedAt,
          userName: c.users?.name || 'Kullanıcı',
          notes: c.notes || null,
        };
      }
    }
  });
  const prList = Object.values(prMap).sort((a, b) => b.maxWeight - a.maxWeight).slice(0, 6);

  // Top Exercises by Volume
  const exerciseVolumeMap: Record<string, { name: string; volume: number; sets: number; maxWeight: number }> = {};
  filteredCompletions.forEach(c => {
    const name = c.exercises?.name || `Hareket #${c.exerciseId}`;
    const vol = (Number(c.weight) || 0) * (Number(c.reps) || 10) * (Number(c.sets) || 1);
    if (!exerciseVolumeMap[name]) {
      exerciseVolumeMap[name] = { name, volume: 0, sets: 0, maxWeight: 0 };
    }
    exerciseVolumeMap[name].volume += vol;
    exerciseVolumeMap[name].sets += Number(c.sets) || 1;
    exerciseVolumeMap[name].maxWeight = Math.max(exerciseVolumeMap[name].maxWeight, Number(c.weight) || 0);
  });
  const topVolumeExercises = Object.values(exerciseVolumeMap).sort((a, b) => b.volume - a.volume).slice(0, 5);
  const maxExerciseVolume = Math.max(...topVolumeExercises.map(e => e.volume), 1);

  // Recent Exercise Stream
  const recentCompletions = completions.slice(0, 7);

  // Body Weight Tracker Snapshot
  const latestWeight = weightLogs.length > 0 ? weightLogs[0].weight : null;
  const initialWeight = weightLogs.length > 1 ? weightLogs[weightLogs.length - 1].weight : null;
  const weightChange = latestWeight && initialWeight ? Number((latestWeight - initialWeight).toFixed(1)) : null;

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
          {/* Top KPI Cards (5 Metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <p className="text-3xl font-extrabold text-white">{totalSets}</p>
              <p className="text-xs text-gray-500 mt-1">{totalExercises} hareket tamamlandı</p>
            </div>

            {/* 5. Vücut Ağırlığı / Kilo */}
            <div className="bg-[#141414] rounded-2xl p-5 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#9B6FFF]/10 border border-[#9B6FFF]/20">
                  <Scale size={18} className="text-[#9B6FFF]" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Vücut Ağırlığı</span>
              </div>
              <p className="text-3xl font-extrabold text-white">
                {latestWeight ? `${latestWeight} kg` : '-'}
              </p>
              {weightChange !== null && (
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
                {prList.map((pr, index) => (
                  <div
                    key={pr.exerciseName}
                    className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] hover:border-[#4ECDC4]/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#252525] text-xs font-bold flex items-center justify-center text-gray-400 group-hover:bg-[#4ECDC4]/20 group-hover:text-[#4ECDC4] transition-colors">
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
                      <span>{pr.reps} tekrar</span>
                      <span className="text-gray-500">
                        {pr.date ? new Date(pr.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}
                      </span>
                    </div>

                    {pr.notes ? (
                      <div className="mt-2.5 text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 truncate">
                        📌 {pr.notes}
                      </div>
                    ) : null}
                  </div>
                ))}
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
                        {comp.notes ? (
                          <div className="text-xs text-purple-300 truncate mt-1 flex items-center gap-1 font-mono">
                            <MessageSquare size={11} className="text-purple-400 shrink-0" />
                            <span>{comp.notes}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold text-[#4ECDC4] bg-[#4ECDC4]/10 px-2 py-0.5 rounded border border-[#4ECDC4]/20 inline-block mb-1">
                          {comp.weight !== null && comp.weight !== undefined && Number(comp.weight) > 0
                            ? `${comp.weight} kg`
                            : 'Vücut Ağ.'}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">
                          {comp.sets || 1} set × {comp.reps} tekrar
                        </div>
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

                  {/* Volume Range (kg) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Min Tonaj (kg) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={rankMinKg}
                        onChange={(e) => setRankMinKg(Number(e.target.value) || 0)}
                        className="w-full bg-[#202020] border border-[#333] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Sonraki Hedef / Max Tonaj (kg) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={rankMaxKg}
                        onChange={(e) => setRankMaxKg(Number(e.target.value) || 1000)}
                        className="w-full bg-[#202020] border border-[#333] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                  </div>

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
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-white text-sm">{r.title}</h5>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                style={{ backgroundColor: r.color + '20', color: r.color }}
                              >
                                {r.min_volume_kg.toLocaleString('tr-TR')} - {r.max_volume_kg.toLocaleString('tr-TR')} kg
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
