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
  const [searchTerm, setSearchTerm] = useState('');

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
        alert('Program başarıyla atandı');
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

  const filteredUserPrograms = userPrograms.filter(up => {
    const searchLower = searchTerm.toLowerCase();
    return (
      up.users.name.toLowerCase().includes(searchLower) ||
      up.users.email.toLowerCase().includes(searchLower) ||
      up.programs.name.toLowerCase().includes(searchLower)
    );
  });

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
        <p className="text-gray-400">Kullanıcılara özel program atayın ve yönetin</p>
      </div>

      {/* Assign Form */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 mb-8 border border-[#2A2A2A] shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">➕</span>
          Yeni Program Ata
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Kullanıcı Seçin</label>
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
            >
              <option value="">Kullanıcı Seçin</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Program Seçin</label>
            <select
              value={selectedProgram || ''}
              onChange={(e) => setSelectedProgram(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
            >
              <option value="">Program Seçin</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAssign}
              className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
            >
              ✓ Program Ata
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Kullanıcı veya program ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#1A1A1A] text-white rounded-xl px-6 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-all"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-2xl p-6 shadow-xl">
          <div className="text-white/80 text-sm mb-2">Toplam Atama</div>
          <div className="text-white text-3xl font-bold">{userPrograms.length}</div>
        </div>
        <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl p-6 shadow-xl">
          <div className="text-white/80 text-sm mb-2">Aktif Kullanıcı</div>
          <div className="text-white text-3xl font-bold">
            {new Set(userPrograms.map(up => up.userId)).size}
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-2xl p-6 shadow-xl">
          <div className="text-white/80 text-sm mb-2">Atanan Program</div>
          <div className="text-white text-3xl font-bold">
            {new Set(userPrograms.map(up => up.programId)).size}
          </div>
        </div>
      </div>

      {/* Assigned Programs List */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Atanmış Programlar
          </h2>
          <div className="text-gray-400 text-sm">
            {filteredUserPrograms.length} kayıt
          </div>
        </div>
        
        {filteredUserPrograms.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <div className="text-gray-400 text-lg">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz atanmış program yok'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUserPrograms.map((up) => (
              <div
                key={up.id}
                className="bg-[#0F0F0F] rounded-xl p-5 border border-[#2A2A2A] hover:border-[#6366F1] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold">
                        {up.users.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-lg">{up.users.name}</span>
                          {up.isActive && (
                            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                              ✓ Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">{up.users.email}</span>
                      </div>
                    </div>
                    <div className="ml-13 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Program:</span>
                        <span className="text-white font-medium">{up.programs.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Atanma Tarihi:</span>
                        <span className="text-gray-400">
                          {new Date(up.assignedAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(up.id)}
                    className="bg-red-500/20 text-red-400 px-5 py-2.5 rounded-lg hover:bg-red-500/30 transition-all font-medium opacity-0 group-hover:opacity-100"
                  >
                    🗑️ Kaldır
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
