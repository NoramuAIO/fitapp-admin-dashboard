'use client'

import { useEffect, useState } from 'react';
import { Search, Clock } from 'lucide-react';

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
    setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  };

  const loadSelectedUser = async () => {
    try {
      const savedUserId = localStorage.getItem('selectedUserId');
      if (!savedUserId) return;
      const res = await fetch('/api/users');
      const users = await res.json();
      const user = Array.isArray(users) ? users.find((u: User) => u.id === parseInt(savedUserId)) : null;
      if (user) setSelectedUser(user);
    } catch {}
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="h-16 border-b border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="relative max-w-md w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Ara..."
          className="w-full bg-[#141414] border border-[#2A2A2A] text-white placeholder-gray-600 rounded-xl px-4 py-2 pl-9 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2 select-none">
          <Clock size={14} className="text-[#6366F1]" />
          <span className="text-white font-semibold text-sm tabular-nums">{currentTime}</span>
        </div>

        {/* User Badge */}
        {selectedUser ? (
          <div className="flex items-center gap-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 cursor-pointer hover:border-[#3A3A3A] transition-colors">
            <div className="w-7 h-7 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(selectedUser.name)}
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-semibold text-white">{selectedUser.name}</p>
              <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{selectedUser.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2">
            <div className="w-7 h-7 bg-[#2A2A2A] rounded-lg flex items-center justify-center text-gray-400 text-xs">
              ?
            </div>
            <span className="text-xs text-gray-500">Kullanıcı seçilmedi</span>
          </div>
        )}
      </div>
    </header>
  );
}
