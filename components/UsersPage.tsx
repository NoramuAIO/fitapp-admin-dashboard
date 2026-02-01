'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  total_workouts: number;
  total_programs: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
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
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Kullanıcılar</h1>
        <p className="text-gray-400">Tüm kayıtlı kullanıcıları görüntüleyin ve yönetin</p>
      </div>

      <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-gray-400 font-medium">Kullanıcı</th>
                <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                <th className="text-left p-4 text-gray-400 font-medium">Kayıt Tarihi</th>
                <th className="text-left p-4 text-gray-400 font-medium">Antremanlar</th>
                <th className="text-left p-4 text-gray-400 font-medium">Programlar</th>
                <th className="text-left p-4 text-gray-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-800 hover:bg-[#222] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{user.email}</td>
                  <td className="p-4 text-gray-400">{formatDate(user.created_at)}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      {user.total_workouts}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                      {user.total_programs}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Henüz kayıtlı kullanıcı yok
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/30">
          <div className="text-3xl font-bold text-white mb-2">{users.length}</div>
          <div className="text-gray-300">Toplam Kullanıcı</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30">
          <div className="text-3xl font-bold text-white mb-2">
            {users.reduce((sum, u) => sum + Number(u.total_workouts), 0)}
          </div>
          <div className="text-gray-300">Toplam Antreman</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-2xl p-6 border border-orange-500/30">
          <div className="text-3xl font-bold text-white mb-2">
            {users.filter(u => {
              const date = new Date(u.created_at);
              const today = new Date();
              const diffTime = Math.abs(today.getTime() - date.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 7;
            }).length}
          </div>
          <div className="text-gray-300">Son 7 Gün</div>
        </div>
      </div>
    </div>
  );
}
