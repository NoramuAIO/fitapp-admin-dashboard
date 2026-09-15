'use client';

import { useEffect, useState } from 'react';
import { Clock, Dumbbell, Calendar, Search, User, Play, CheckSquare } from 'lucide-react';

interface WorkoutSession {
  id: number;
  userId: number;
  programId: number;
  startTime: string;
  endTime?: string;
  duration?: string;
  category: string;
  program_name: string;
  user_name?: string;
  completed_exercises: number;
  total_reps: number;
}

interface UserModel {
  id: number;
  name: string;
}

export default function TimePage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
    const saved = localStorage.getItem('selectedUserId');
    if (saved) setSelectedUserId(parseInt(saved));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const url = selectedUserId ? `/api/workout-sessions?userId=${selectedUserId}` : '/api/workout-sessions';
      const response = await fetch(url);
      const data = await response.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getFilteredSessions = () => {
    let filtered = [...sessions];
    
    // Time filter
    const now = new Date();
    if (filter === 'today') {
      filtered = filtered.filter(s => new Date(s.startTime).toDateString() === now.toDateString());
    } else if (filter === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(s => new Date(s.startTime) >= lastWeek);
    } else if (filter === 'month') {
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(s => new Date(s.startTime) >= lastMonth);
    }

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        (s.program_name && s.program_name.toLowerCase().includes(term)) ||
        (s.user_name && s.user_name.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const parseDuration = (dur?: string) => {
    if (!dur) return 0;
    let mins = 0;
    const hoursMatch = dur.match(/(\d+)s/);
    const minsMatch = dur.match(/(\d+)dk/);
    if (hoursMatch) mins += parseInt(hoursMatch[1]) * 60;
    if (minsMatch) mins += parseInt(minsMatch[1]);
    return mins;
  };

  const filteredSessions = getFilteredSessions();
  const totalDurationMins = filteredSessions.reduce((sum, s) => sum + parseDuration(s.duration), 0);
  const totalReps = filteredSessions.reduce((sum, s) => sum + (s.total_reps || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Antrenman Geçmişi</h1>
          <p className="text-gray-400">Kullanıcıların tamamladığı antrenmanlar ve süreleri</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Program veya kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#6366F1]"
            />
          </div>
          
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              className="bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-[#6366F1] appearance-none cursor-pointer"
              value={selectedUserId ?? ''}
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setSelectedUserId(id);
                if (id) localStorage.setItem('selectedUserId', id.toString());
                else localStorage.removeItem('selectedUserId');
              }}
            >
              <option value="">Tüm Kullanıcılar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-[#1A1A1A] rounded-2xl p-1.5 w-fit mb-8 border border-[#2A2A2A]">
        {[
          { id: 'all', label: 'Tümü' },
          { id: 'today', label: 'Bugün' },
          { id: 'week', label: 'Son 7 Gün' },
          { id: 'month', label: 'Son 30 Gün' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              filter === tab.id 
                ? 'bg-[#6366F1] text-white shadow-md' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
            <Dumbbell size={24} className="text-[#6366F1]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Toplam Antrenman</p>
            <h3 className="text-2xl font-bold text-white">{filteredSessions.length}</h3>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5DD97C]/10 flex items-center justify-center shrink-0">
            <Clock size={24} className="text-[#5DD97C]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Toplam Süre</p>
            <h3 className="text-2xl font-bold text-white">
              {Math.floor(totalDurationMins / 60)}s {totalDurationMins % 60}dk
            </h3>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FF6B4A]/10 flex items-center justify-center shrink-0">
            <Activity size={24} className="text-[#FF6B4A]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Toplam Tekrar</p>
            <h3 className="text-2xl font-bold text-white">{totalReps}</h3>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
              <Calendar size={32} className="text-gray-500" />
            </div>
            <p className="text-gray-400">Bu filtrelere uygun antrenman bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2A]">
            {filteredSessions.map((session) => (
              <div key={session.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg">
                    <Dumbbell size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{session.program_name || 'Bilinmeyen Program'}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                      {!selectedUserId && (
                        <span className="flex items-center gap-1"><User size={12} /> {session.user_name || 'Kullanıcı'}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(session.startTime)}</span>
                      {session.category && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                          {session.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {session.duration && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-500 mb-0.5 flex items-center gap-1"><Clock size={12} /> Süre</span>
                      <span className="text-sm font-bold text-white bg-[#1A1A1A] px-3 py-1 rounded-lg border border-[#2A2A2A]">{session.duration}</span>
                    </div>
                  )}
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 mb-0.5 flex items-center gap-1"><CheckSquare size={12} /> Hareket</span>
                    <span className="text-sm font-bold text-white bg-[#5DD97C]/10 text-[#5DD97C] px-3 py-1 rounded-lg">
                      {session.completed_exercises}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
