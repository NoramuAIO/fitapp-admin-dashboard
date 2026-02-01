'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  total_workouts: number;
}

interface UserDashboardProps {
  userId: number;
  onChangeUser: () => void;
}

export default function UserDashboard({ userId, onChangeUser }: UserDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [workoutStats, setWorkoutStats] = useState({
    totalSets: 0,
    totalExercises: 0,
    totalPrograms: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      // Fetch user info
      const usersResponse = await fetch('/api/users');
      const users = await usersResponse.json();
      const currentUser = users.find((u: User) => u.id === userId);
      setUser(currentUser);

      // Fetch workout sessions
      const sessionsResponse = await fetch(`/api/workout-sessions?userId=${userId}`);
      const sessions = await sessionsResponse.json();
      
      // Fetch programs to get total count
      const programsResponse = await fetch('/api/programs');
      const programs = await programsResponse.json();
      
      // Calculate workout stats
      // Her session'daki completed_exercises aslında tamamlanan hareket sayısı
      const totalExercises = sessions.reduce((sum: number, s: any) => sum + (s.completed_exercises || 0), 0);
      
      // Set sayısını hesaplamak için her session'daki programın exercise'larını kontrol etmeliyiz
      // Şimdilik basit bir hesaplama yapalım: her exercise için ortalama 3 set varsayalım
      // Daha doğru hesaplama için exercise_progress tablosunu kullanmalıyız
      let totalSets = 0;
      for (const session of sessions) {
        // Her tamamlanan hareket için ortalama set sayısı
        const programExercises = programs.find((p: any) => p.id === session.programId)?.exercises || [];
        const avgSetsPerExercise = programExercises.length > 0 
          ? programExercises.reduce((sum: number, ex: any) => sum + ex.sets, 0) / programExercises.length 
          : 3;
        totalSets += (session.completed_exercises || 0) * avgSetsPerExercise;
      }
      
      setWorkoutStats({
        totalSets: Math.round(totalSets),
        totalExercises,
        totalPrograms: programs.length,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id: number) => {
    const colors = [
      'from-purple-500 to-indigo-600',
      'from-green-500 to-emerald-600',
      'from-orange-500 to-red-600',
      'from-blue-500 to-cyan-600',
      'from-pink-500 to-rose-600',
      'from-yellow-500 to-orange-600',
    ];
    return colors[id % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Kullanıcı bulunamadı</div>
      </div>
    );
  }

  const totalSteps = stats.reduce((sum, s) => sum + (s.steps || 0), 0);
  const totalCalories = stats.reduce((sum, s) => sum + (s.calories || 0), 0);
  const totalDistance = stats.reduce((sum, s) => sum + (s.distance || 0), 0);

  return (
    <div className="p-8">
      {/* User Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarColor(user.id)} flex items-center justify-center text-white text-2xl font-bold shadow-xl`}>
            {getInitials(user.name)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{user.name}</h1>
            <p className="text-gray-400">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onChangeUser}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10"
        >
          Kullanıcı Değiştir
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/30">
          <div className="text-gray-300 mb-2">Toplam Set</div>
          <div className="text-4xl font-bold text-white">{workoutStats.totalSets.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30">
          <div className="text-gray-300 mb-2">Toplam Hareket</div>
          <div className="text-4xl font-bold text-white">{workoutStats.totalExercises.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-2xl p-6 border border-orange-500/30">
          <div className="text-gray-300 mb-2">Toplam Program</div>
          <div className="text-4xl font-bold text-white">{workoutStats.totalPrograms}</div>
        </div>
      </div>
    </div>
  );
}
