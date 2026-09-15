'use client'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'home', icon: '🏠', label: 'Ana Sayfa', href: '/' },
    { id: 'users', icon: '👥', label: 'Kullanıcılar', href: '/users' },
    { id: 'programs', icon: '🏋️', label: 'Programlar', href: '/programs' },
    { id: 'exercises', icon: '💪', label: 'Tüm Hareketler', href: '/exercises' },
    { id: 'goals', icon: '🎯', label: 'Hedefler', href: '/goals' },
    { id: 'analytics', icon: '📊', label: 'Analizler', href: '/analytics' },
    { id: 'time', icon: '🕐', label: 'Zaman', href: '/time' },
    { id: 'settings', icon: '⚙️', label: 'Ayarlar', href: '/settings' }
  ]

  return (
    <div className="w-24 bg-gradient-to-b from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] flex flex-col items-center py-8 shadow-2xl relative">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-0 w-32 h-32 bg-white rounded-full -translate-x-16"></div>
        <div className="absolute bottom-20 right-0 w-40 h-40 bg-white rounded-full translate-x-20"></div>
      </div>

      {/* Logo */}
      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-12 shadow-lg border border-white/10 relative z-10">
        <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-sm"></div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 flex flex-col space-y-4 relative z-10">
        {menuItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            onClick={() => setActiveTab(item.id)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative group ${
              activeTab === item.id
                ? 'bg-white/30 shadow-xl backdrop-blur-sm scale-110'
                : 'hover:bg-white/10 hover:scale-105'
            }`}
            title={item.label}
          >
            <span className="text-2xl filter drop-shadow-lg">{item.icon}</span>
            
            {/* Active indicator */}
            {activeTab === item.id && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
            )}

            {/* Tooltip */}
            <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              {item.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
            </div>
          </a>
        ))}
      </div>

      {/* Help Button */}
      <button className="w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all duration-300 relative z-10 group mt-auto">
        <span className="text-2xl filter drop-shadow-lg">❓</span>
        
        {/* Tooltip */}
        <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
          Yardım
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
        </div>
      </button>

      {/* Logout Button */}
      <button 
        onClick={async () => {
          if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/login';
          }
        }}
        className="w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-red-500/20 transition-all duration-300 relative z-10 group mt-2"
      >
        <span className="text-2xl filter drop-shadow-lg">🚪</span>
        
        {/* Tooltip */}
        <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
          Çıkış Yap
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
        </div>
      </button>
    </div>
  )
}
