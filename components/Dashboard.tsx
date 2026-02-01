'use client'

import { useEffect, useState } from 'react'
import ActivityChart from './ActivityChart'
import GoalCards from './GoalCards'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPrograms: 0,
    totalExercises: 0,
    activeUsers: 0,
    todayWorkouts: 0,
  })

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/programs')
      const programs = await response.json()
      
      const totalExercises = programs.reduce((sum: number, p: any) => sum + p.exercises.length, 0)
      
      setStats({
        totalPrograms: programs.length,
        totalExercises,
        activeUsers: 1,
        todayWorkouts: 0,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  return (
    <div className="p-8 bg-[#0F0F0F] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Hoş Geldiniz! 👋</h1>
          <p className="text-gray-400">Fitness uygulamanızın genel durumunu buradan takip edebilirsiniz.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏋️</span>
                </div>
                <span className="text-white/60 text-sm">Toplam</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.totalPrograms}</h3>
              <p className="text-white/80 text-sm">Antreman Programı</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FF6B9D] to-[#FF8FAB] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-12 translate-y-12"></div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💪</span>
                </div>
                <span className="text-white/60 text-sm">Toplam</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.totalExercises}</h3>
              <p className="text-white/80 text-sm">Hareket</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#5DD97C] to-[#4BC766] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-12 -translate-y-12"></div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-2xl">�</span>
                </div>
                <span className="text-white/60 text-sm">Aktif</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.activeUsers}</h3>
              <p className="text-white/80 text-sm">Kullanıcı</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FF6B4A] to-[#FF8A6B] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔥</span>
                </div>
                <span className="text-white/60 text-sm">Bugün</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.todayWorkouts}</h3>
              <p className="text-white/80 text-sm">Antreman</p>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityChart />
          </div>
          <div className="space-y-4">
            <GoalCards />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-[#1A1A1A] hover:bg-[#252525] rounded-xl p-6 text-left transition-all group border border-[#2A2A2A]">
              <div className="w-12 h-12 bg-primary-green/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">➕</span>
              </div>
              <h3 className="text-white font-bold mb-1">Yeni Program</h3>
              <p className="text-gray-400 text-sm">Antreman programı oluştur</p>
            </button>

            <button className="bg-[#1A1A1A] hover:bg-[#252525] rounded-xl p-6 text-left transition-all group border border-[#2A2A2A]">
              <div className="w-12 h-12 bg-primary-purple/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-white font-bold mb-1">Rapor Görüntüle</h3>
              <p className="text-gray-400 text-sm">Detaylı istatistikler</p>
            </button>

            <button className="bg-[#1A1A1A] hover:bg-[#252525] rounded-xl p-6 text-left transition-all group border border-[#2A2A2A]">
              <div className="w-12 h-12 bg-primary-orange/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-white font-bold mb-1">Ayarlar</h3>
              <p className="text-gray-400 text-sm">Sistem yapılandırması</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
