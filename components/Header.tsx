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
  const [users, setUsers] = useState<User[]>([]);
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
      const res = await fetch('/api/users');
      const allUsers = await res.json();
      if (Array.isArray(allUsers)) {
        setUsers(allUsers);
        const savedUserId = localStorage.getItem('selectedUserId');
        if (savedUserId) {
          const user = allUsers.find((u: User) => u.id === parseInt(savedUserId));
          if (user) setSelectedUser(user);
        }
      }
    } catch {}
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="h-16 border-b border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between px-6 shrink-0 z-50">
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

        {/* Global User Selector */}
        <div className="relative">
          <select
            className="appearance-none bg-[#141414] border border-[#2A2A2A] text-white rounded-xl px-4 py-2 pr-10 text-sm focus:outline-none focus:border-[#6366F1] cursor-pointer"
            value={selectedUser?.id ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                localStorage.setItem('selectedUserId', val);
              } else {
                localStorage.removeItem('selectedUserId');
              }
              // Dispatch event so other components refresh
              window.dispatchEvent(new Event('userSelected'));
              window.location.reload(); // Hard reload for data freshness across all pages
            }}
          >
            <option value="">Kullanıcı Seç (Genel)</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>
    </header>
  );
}
