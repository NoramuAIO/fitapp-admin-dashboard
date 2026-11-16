'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/clientCache';
import {
  getStoredSelectedUserId,
  setStoredSelectedUserId,
  subscribeUserSelected,
} from '@/lib/userSelection';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export default function Header() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSelectedUserId(getStoredSelectedUserId());
    loadUsers();
    updateTime();
    const interval = setInterval(updateTime, 1000);
    const unsub = subscribeUserSelected((uid) => {
      setSelectedUserId(uid);
      loadUsers(true);
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const updateTime = () => {
    const now = new Date();
    setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  };

  const loadUsers = async (force = false) => {
    try {
      const res = await apiFetch('/api/users?lite=1', { forceRefresh: force });
      if (!res.ok) return;
      const allUsers = await res.json();
      if (Array.isArray(allUsers)) {
        setUsers(allUsers);
        const currentStored = getStoredSelectedUserId();
        if (currentStored !== null && !allUsers.some((u: User) => Number(u.id) === currentStored)) {
          setStoredSelectedUserId(null);
          setSelectedUserId(null);
        }
      }
    } catch {}
  };

  const selectedUser = selectedUserId
    ? users.find((u) => Number(u.id) === selectedUserId) || null
    : null;

  return (
    <header className="h-16 border-b border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0 z-30">
      <form
        className="relative flex-1 min-w-0 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          const q = searchQuery.trim();
          router.push(q ? `/exercises?search=${encodeURIComponent(q)}` : '/exercises');
        }}
      >
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hareketlerde ara..."
          className="w-full bg-[#141414] border border-[#2A2A2A] text-white placeholder-gray-600 rounded-xl px-4 py-2 pl-9 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
        />
      </form>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-2 select-none">
          <Clock size={14} className="text-[#6366F1]" />
          <span className="text-white font-semibold text-sm tabular-nums">{currentTime}</span>
        </div>

        <div className="relative">
          <select
            aria-label="Küresel kullanıcı filtresi"
            className="appearance-none bg-[#141414] border border-[#2A2A2A] text-white rounded-xl px-4 py-2 pr-10 text-sm focus:outline-none focus:border-[#6366F1] cursor-pointer"
            value={selectedUser?.id ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              const nextId = val ? parseInt(val, 10) : null;
              setSelectedUserId(nextId);
              setStoredSelectedUserId(nextId);
            }}
          >
            <option value="">Kullanıcı Seç (Genel)</option>
            {users.map((u) => (
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
