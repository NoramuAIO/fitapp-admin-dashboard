'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface UserSelectorProps {
  onSelectUser: (userId: number) => void;
}

export default function UserSelector({ onSelectUser }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
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

  const getAvatarColor = (id: number) => {
    const colors = [
      'from-purple-500 to-indigo-600',
      'from-green-500 to-emerald-600',
      'from-orange-500 to-red-600',
      'from-blue-500 to-cyan-600',
      'from-pink-500 to-rose-600',
      'from-yellow-500 to-orange-600',
    ];
    return colors[id % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-gray-400 text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        <h1 className="text-5xl font-bold text-white text-center mb-4">
          Kim Yönetilecek?
        </h1>
        <p className="text-gray-400 text-center mb-16 text-lg">
          Yönetmek istediğiniz kullanıcıyı seçin
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className="group flex flex-col items-center gap-4 p-6 rounded-2xl hover:bg-white/5 transition-all duration-300 transform hover:scale-105"
            >
              <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${getAvatarColor(user.id)} flex items-center justify-center text-white text-4xl font-bold shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-300`}>
                {getInitials(user.name)}
              </div>
              <div className="text-center">
                <div className="text-white font-medium text-lg group-hover:text-purple-400 transition-colors">
                  {user.name}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  {user.email}
                </div>
              </div>
            </button>
          ))}

          {/* Add User Card */}
          <button
            onClick={() => window.location.href = '/users'}
            className="group flex flex-col items-center gap-4 p-6 rounded-2xl hover:bg-white/5 transition-all duration-300 transform hover:scale-105"
          >
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-5xl shadow-2xl group-hover:shadow-gray-500/50 transition-all duration-300 border-4 border-dashed border-gray-600">
              +
            </div>
            <div className="text-center">
              <div className="text-gray-400 font-medium text-lg group-hover:text-gray-300 transition-colors">
                Kullanıcı Yönet
              </div>
            </div>
          </button>
        </div>

        {users.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">👤</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Henüz Kullanıcı Yok
            </h2>
            <p className="text-gray-400 mb-8">
              Mobil uygulamadan kayıt olun veya kullanıcı ekleyin
            </p>
            <button
              onClick={() => window.location.href = '/users'}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all"
            >
              Kullanıcı Yönetimine Git
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
