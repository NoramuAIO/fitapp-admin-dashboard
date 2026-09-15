'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Calendar, Activity, Dumbbell, Trash2, Search, UserCheck } from 'lucide-react';

interface UserModel {
  id: number;
  name: string;
  email: string;
  created_at: string;
  total_workouts: number;
  total_programs: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    try {
      const response = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setUsers(users.filter(u => u.id !== id));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Kullanıcılar</h1>
          <p className="text-gray-400">Tüm kayıtlı kullanıcıları görüntüleyin ve yönetin</p>
        </div>
        
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-[#141414] border border-[#2A2A2A] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
            <User size={24} className="text-[#6366F1]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Toplam Kullanıcı</p>
            <h3 className="text-2xl font-bold text-white">{users.length}</h3>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5DD97C]/10 flex items-center justify-center shrink-0">
            <Activity size={24} className="text-[#5DD97C]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Toplam Antreman</p>
            <h3 className="text-2xl font-bold text-white">
              {users.reduce((sum, u) => sum + Number(u.total_workouts || 0), 0)}
            </h3>
          </div>
        </div>

        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FF6B4A]/10 flex items-center justify-center shrink-0">
            <UserCheck size={24} className="text-[#FF6B4A]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Yeni Kayıt (Son 7 Gün)</p>
            <h3 className="text-2xl font-bold text-white">
              {users.filter(u => {
                const diffTime = Math.abs(new Date().getTime() - new Date(u.created_at).getTime());
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
              }).length}
            </h3>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Kullanıcı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#1A1A1A]">
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kullanıcı</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kayıt Tarihi</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktivite</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={14} />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={14} />
                        <span className="text-sm">{formatDate(user.created_at)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#5DD97C]/10 text-[#5DD97C] rounded-lg text-xs font-medium" title="Antremanlar">
                          <Activity size={12} /> {user.total_workouts || 0}
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#9B6FFF]/10 text-[#9B6FFF] rounded-lg text-xs font-medium" title="Programlar">
                          <Dumbbell size={12} /> {user.total_programs || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
