'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, Activity } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Başarılı giriş
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
      }
    } catch (err) {
      setError('Bağlantı sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#6366F1]/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#8B5CF6]/20 rounded-full blur-[120px] mix-blend-screen"></div>
      </div>

      <div className="bg-[#141414]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-3xl shadow-2xl p-10 w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#6366F1]/20">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-gray-400 mt-2 text-sm">Yönetim paneline erişim için giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
              E-posta Adresİ
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-500" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-xl focus:ring-2 focus:ring-[#6366F1]/50 focus:border-[#6366F1] outline-none transition-all placeholder-gray-600 text-sm"
                placeholder="admin@fitapp.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
              Şİfre
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-xl focus:ring-2 focus:ring-[#6366F1]/50 focus:border-[#6366F1] outline-none transition-all placeholder-gray-600 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#FF6B4A]/10 border border-[#FF6B4A]/20 text-[#FF6B4A] px-4 py-3 rounded-xl text-sm flex items-start gap-3">
              <ShieldCheck size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Giriş yapılıyor...
              </span>
            ) : (
              <>
                Giriş Yap
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#2A2A2A] text-center">
          <p className="text-xs text-gray-500 font-medium">Güvenli Yönetim Sistemi v2.0</p>
        </div>
      </div>
    </div>
  );
}
