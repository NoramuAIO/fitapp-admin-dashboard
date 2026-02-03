'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Program {
  id: number;
  name: string;
  isPrimary: boolean;
}

interface UserProgram {
  id: number;
  userId: number;
  programId: number;
  isActive: boolean;
  assignedAt: string;
  programs: { id: number; name: string; isPrimary: boolean };
  users: { id: number; name: string; email: string };
}

export default function UserProgramsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [userPrograms, setUserPrograms] = useState<UserProgram[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadPrograms(), loadUserPrograms()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPrograms = async () => {
    try {
      const response = await fetch('/api/programs');
      const data = await response.json();
      setPrograms(data);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadUserPrograms = async () => {
    try {
      const response = await fetch('/api/user-programs');
      const data = await response.json();
      setUserPrograms(data);
    } catch (error) {
      console.error('Error loading user programs:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedProgram) {
      alert('Lütfen kullanıcı ve program seçin');
      return;
    }

    try {
      const response = await fetch('/api/user-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          programId: selectedProgram,
          isActive: true,
        }),
      });

      if (response.ok) {
        alert('Program atandı');
        setSelectedUser(null);
        setSelectedProgram(null);
        loadUserPrograms();
      } else {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'Program atanamadı'));
      }
    } catch (error) {
      alert('Program atanamadı');
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const response = await fetch(`/api/user-programs?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadUserPrograms();
      }
    } catch (error) {
      alert('Program kaldırılamadı');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Kullanıcı Programları</h1>
        <p className="text-gray-400">Kullanıcılara özel program atayın</p>
      </div>

      {/* Assign Form */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 mb-8 border border-[#2A2A2A]">
        <h2 className="text-xl font-bold text-white mb-6">Yeni Program Ata</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Kullanıcı</label>
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="">Kullanıcı Seçin</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Program</label>
            <select
              value={selectedProgram || ''}
              onChange={(e) => setSelectedProgram(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <option value="">Program Seçin</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAssign}
              className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Program Ata
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Programs List */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
        <h2 className="text-xl font-bold text-white mb-6">Atanmış Programlar</h2>
        
        {userPrograms.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            Henüz atanmış program yok
          </div>
        ) : (
          <div className="space-y-4">
            {userPrograms.map((up) => (
              <div
                key={up.id}
                className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A] flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-semibold">{up.users.name}</span>
                    <span className="text-gray-400 text-sm">({up.users.email})</span>
                    {up.isActive && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Program: <span className="text-white">{up.programs.name}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Atanma: {new Date(up.assignedAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(up.id)}
                  className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
