'use client';

import { useEffect, useState } from 'react';
import { Dumbbell, Users, Activity, Flame, TrendingUp, TrendingDown, Clock, ChevronRight, Scale, Target } from 'lucide-react';
import Link from 'next/link';

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

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('selectedUserId') : null;
      if (userId) {
        try {
          const usersRes = await fetch('/api/users');
          const users = await usersRes.json();
          const u = Array.isArray(users) ? users.find((x: any) => x.id === parseInt(userId)) : null;
          if (u) setUserName(u.name);
        } catch {}
      }

      const [programsRes, usersRes, sessionsRes, goalsRes] = await Promise.all([
        fetch('/api/programs').catch(() => null),
        fetch('/api/users').catch(() => null),
        fetch(userId ? `/api/workout-sessions?userId=${userId}` : '/api/workout-sessions').catch(() => null),
        fetch(userId ? `/api/goals?userId=${userId}` : '/api/goals').catch(() => null),
      ]);

      const programs = programsRes?.ok ? await programsRes.json() : [];
      const users = usersRes?.ok ? await usersRes.json() : [];
      const sessions = sessionsRes?.ok ? await sessionsRes.json() : [];
      const goals = goalsRes?.ok ? await goalsRes.json() : [];

      const today = new Date().toISOString().split('T')[0];
      const todaySessions = Array.isArray(sessions)
        ? sessions.filter((s: any) => s.startTime?.startsWith(today)).length
        : 0;

      const totalExercises = Array.isArray(programs)
        ? programs.reduce((sum: number, p: any) => sum + (p.exercises?.length ?? 0), 0)
        : 0;

      setStats({
        totalPrograms: Array.isArray(programs) ? programs.length : 0,
        totalExercises,
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalSessions: Array.isArray(sessions) ? sessions.length : 0,
        todaySessions,
        totalGoals: Array.isArray(goals) ? goals.length : 0,
        activeGoals: Array.isArray(goals) ? goals.filter((g: any) => g.status === 'active').length : 0,
      });

      setRecentSessions(Array.isArray(sessions) ? sessions.slice(0, 5) : []);

      // Body stats
      if (userId) {
        const [wRes, fRes] = await Promise.all([
          fetch(`/api/weight-logs?userId=${userId}`).catch(() => null),
          fetch(`/api/body-fat-logs?userId=${userId}`).catch(() => null),
        ]);
        const wData = wRes?.ok ? await wRes.json() : [];
        const fData = fRes?.ok ? await fRes.json() : [];
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

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent Workouts */}
            <div className="lg:col-span-2 bg-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
                <h2 className="font-bold text-white">Son Antrenmanlar</h2>
                <Link href="/time" className="text-xs text-[#6366F1] hover:underline">Tümünü gör</Link>
              </div>
              {recentSessions.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">Henüz antreman kaydı yok</div>
              ) : (
                <div className="divide-y divide-[#2A2A2A]">
                  {recentSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: COLORS.purple + '22' }}>
                        <Dumbbell size={16} style={{ color: COLORS.purple }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.program_name || 'Bilinmeyen Program'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(s.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {s.duration ? ` · ${s.duration}` : ''}
                        </p>
                      </div>
                      {s.category && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: COLORS.green + '18', color: COLORS.green }}>
                          {s.category}
                        </span>
                      )}
                    </div>
                  ))}
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
