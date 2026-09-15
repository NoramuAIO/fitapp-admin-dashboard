'use client';

import { 
  Home, Users, Dumbbell, Activity, Target, BarChart2, 
  Clock, Scale, Settings, LogOut, HelpCircle, ChevronRight, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function FloatingSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const menuItems = [
    { id: 'home', icon: Home, label: 'Ana Sayfa', href: '/' },
    { id: 'users', icon: Users, label: 'Kullanıcılar', href: '/users' },
    { id: 'programs', icon: Dumbbell, label: 'Programlar', href: '/programs' },
    { id: 'exercises', icon: Activity, label: 'Hareketler', href: '/exercises' },
    { id: 'goals', icon: Target, label: 'Hedefler', href: '/goals' },
    { id: 'analytics', icon: BarChart2, label: 'Analizler', href: '/analytics' },
    { id: 'time', icon: Clock, label: 'Süre Takibi', href: '/time' },
    { id: 'body', icon: Scale, label: 'Vücut Takibi', href: '/body' },
    { id: 'settings', icon: Settings, label: 'Ayarlar', href: '/settings' }
  ];

  const handleLogout = async () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/login';
    }
  };

  return (
    <aside 
      className={`fixed left-4 top-4 bottom-4 z-50 rounded-3xl bg-[#141414]/90 backdrop-blur-xl border border-[#2A2A2A] shadow-2xl transition-all duration-300 flex flex-col ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
    >
      {/* Header & Logo */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-[#2A2A2A]/50">
        <div className="flex items-center overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">FA</span>
          </div>
          <span 
            className={`font-bold text-white ml-3 whitespace-nowrap transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0'
            }`}
          >
            FitApp Admin
          </span>
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-24 w-6 h-6 bg-[#2A2A2A] rounded-full border border-[#141414] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-2 scrollbar-hide">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.id} 
              href={item.href}
              className={`group flex items-center rounded-xl p-3 transition-all duration-200 relative ${
                isActive ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
              title={!isExpanded ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#6366F1] rounded-r-full shadow-[0_0_8px_#6366F1]" />
              )}
              
              <Icon 
                size={22} 
                className={`shrink-0 transition-colors ${
                  isActive ? 'text-[#6366F1]' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              />
              
              <span 
                className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                } ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[#2A2A2A]/50 flex flex-col gap-2">
        <button 
          className="group flex items-center rounded-xl p-3 hover:bg-white/5 transition-all"
          title={!isExpanded ? 'Yardım' : undefined}
        >
          <HelpCircle size={22} className="shrink-0 text-gray-400 group-hover:text-gray-200" />
          <span 
            className={`ml-3 text-sm font-medium text-gray-400 group-hover:text-gray-200 whitespace-nowrap transition-all duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'
            }`}
          >
            Yardım
          </span>
        </button>

        <button 
          onClick={handleLogout}
          className="group flex items-center rounded-xl p-3 hover:bg-red-500/10 transition-all"
          title={!isExpanded ? 'Çıkış Yap' : undefined}
        >
          <LogOut size={22} className="shrink-0 text-red-500/70 group-hover:text-red-500" />
          <span 
            className={`ml-3 text-sm font-medium text-red-500/70 group-hover:text-red-500 whitespace-nowrap transition-all duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'
            }`}
          >
            Çıkış Yap
          </span>
        </button>
      </div>
    </aside>
  );
}
