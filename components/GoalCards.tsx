'use client'

export default function GoalCards() {
  return (
    <div className="space-y-4">
      {/* Daily Walking Card */}
      <div className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 -translate-y-16"></div>
        </div>
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl">👟</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Günlük Yürüyüş</h3>
            <p className="text-white/80 text-sm">10,000 adım hedefi</p>
          </div>
        </div>
      </div>

      {/* Water Card */}
      <div className="bg-gradient-to-br from-[#FF6B9D] to-[#FF8FAB] rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 translate-y-20"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">💧</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Su</h3>
            </div>
          </div>
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-white/80 text-sm mb-1">Toplam Bardak</p>
            <p className="text-white text-5xl font-bold">4</p>
          </div>
        </div>
      </div>

      {/* Goals Menu Item */}
      <div className="bg-[#1A1A1A] hover:bg-[#252525] rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all shadow-lg border border-[#2A2A2A] group">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-2xl">🎯</span>
          </div>
          <span className="text-white font-semibold">Hedefler</span>
        </div>
        <svg className="w-6 h-6 text-gray-500 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Diet Menu Item */}
      <div className="bg-[#1A1A1A] hover:bg-[#252525] rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all shadow-lg border border-[#2A2A2A] group">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-2xl">🍎</span>
          </div>
          <span className="text-white font-semibold">Diyet</span>
        </div>
        <svg className="w-6 h-6 text-gray-500 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Settings Menu Item */}
      <div className="bg-[#1A1A1A] hover:bg-[#252525] rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all shadow-lg border border-[#2A2A2A] group">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-2xl">⚙️</span>
          </div>
          <span className="text-white font-semibold">Ayarlar</span>
        </div>
        <svg className="w-6 h-6 text-gray-500 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Weight Loss Goal */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 shadow-lg border border-[#2A2A2A]">
        <h3 className="text-white font-bold mb-2">Kilo Kaybı Hedefi</h3>
        <p className="text-3xl font-bold text-white mb-1">Kayıp: 5kg</p>
        <p className="text-gray-500 text-sm mb-6">/Ay</p>
        
        {/* Gauge Chart */}
        <div className="relative w-36 h-36 mx-auto">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="60"
              fill="none"
              stroke="#2A2A2A"
              strokeWidth="12"
            />
            <circle
              cx="72"
              cy="72"
              r="60"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="12"
              strokeDasharray="377"
              strokeDashoffset="94"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">📊</span>
          </div>
        </div>
      </div>
    </div>
  )
}
