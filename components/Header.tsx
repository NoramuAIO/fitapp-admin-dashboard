'use client'

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export default function Header() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    loadSelectedUser();
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setCurrentTime(`${hours}:${minutes}`);
  };

  const loadSelectedUser = async () => {
    try {
      const savedUserId = localStorage.getItem('selectedUserId');
      if (savedUserId) {
        const response = await fetch('/api/users');
        const users = await response.json();
        const user = users.find((u: User) => u.id === parseInt(savedUserId));
        if (user) {
          setSelectedUser(user);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const getJoinedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} gün önce katıldı`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ay önce katıldı`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} yıl önce katıldı`;
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

  return (
    <header className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-8 py-5">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Aktivite, mesaj ara..."
              className="w-full bg-[#0F0F0F] text-white placeholder-gray-500 rounded-2xl px-5 py-3.5 pl-12 focus:outline-none focus:ring-2 focus:ring-[#6366F1] shadow-lg border border-[#2A2A2A] transition-all"
            />
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Clock */}
          <div className="flex items-center space-x-2 bg-[#0F0F0F] rounded-2xl px-5 py-3.5 shadow-lg border border-[#2A2A2A] pointer-events-none select-none">
            <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white font-semibold text-lg">{currentTime}</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3 bg-[#0F0F0F] rounded-2xl px-4 py-2.5 shadow-lg border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all cursor-pointer">
            <div className="w-11 h-11 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-md text-white font-bold">
              {selectedUser ? getInitials(selectedUser.name) : '👤'}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">
                {selectedUser ? selectedUser.name : 'Kullanıcı Seçin'}
              </p>
              <p className="text-xs text-gray-500">
                {selectedUser ? getJoinedDate(selectedUser.created_at) : 'Yönetim Paneli'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
