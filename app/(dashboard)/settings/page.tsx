'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const danger = async (url: string, label: string) => {
    if (!confirm(`${label} işlemini gerçekleştirmek istiyor musunuz? Bu işlem geri alınamaz!`)) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Başarılı! ${data.deletedCount ?? ''} kayıt silindi.`, ok: true });
      } else {
        setMessage({ text: `Hata: ${data.error}`, ok: false });
      }
    } catch (e) {
      setMessage({ text: 'Bağlantı hatası: ' + (e as Error).message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Ayarlar</h1>
        <p className="text-gray-400 mt-1">Sistem yönetimi ve tehlikeli işlemler</p>
      </div>

      {/* Feedback */}
      {message && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 mb-6 border ${
          message.ok
            ? 'bg-[#5DD97C]/10 border-[#5DD97C]/30 text-[#5DD97C]'
            : 'bg-[#FF6B4A]/10 border-[#FF6B4A]/30 text-[#FF6B4A]'
        }`}>
          <CheckCircle2 size={20} className={message.ok ? 'text-[#5DD97C]' : 'hidden'} />
          <AlertTriangle size={20} className={!message.ok ? 'text-[#FF6B4A]' : 'hidden'} />
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A]">
          <AlertTriangle size={20} className="text-[#FF6B4A]" />
          <h2 className="text-lg font-bold text-white">Tehlikeli İşlemler</h2>
        </div>

        <div className="p-6 space-y-4">
          {[
            {
              title: 'Tüm Antreman Kayıtlarını Sil',
              desc: 'Tüm kullanıcıların antreman geçmişini siler (workout_sessions tablosu).',
              url: '/api/settings/delete-sessions',
              label: 'Antreman Kayıtlarını Sil',
            },
            {
              title: 'Tüm Egzersiz İlerlemelerini Sil',
              desc: 'Tüm egzersiz set/tekrar kayıtlarını siler (exercise_progress tablosu).',
              url: '/api/settings/delete-progress',
              label: 'Egzersiz İlerlemelerini Sil',
            },
          ].map((item) => (
            <div key={item.url} className="bg-[#FF6B4A]/5 border border-[#FF6B4A]/20 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{item.desc}</p>
              <button
                onClick={() => danger(item.url, item.label)}
                disabled={loading}
                className="flex items-center gap-2 bg-[#FF6B4A]/20 hover:bg-[#FF6B4A]/30 border border-[#FF6B4A]/40 text-[#FF6B4A] rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                {loading ? 'Siliniyor...' : item.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info size={20} className="text-[#6366F1]" />
          <h2 className="text-lg font-bold text-white">Bilgi</h2>
        </div>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• <span className="text-gray-300">Antreman kayıtları:</span> Kullanıcıların tamamladığı antremanların geçmişi</li>
          <li>• <span className="text-gray-300">İlerleme kayıtları:</span> Her egzersizin set ve tekrar detayları</li>
          <li>• <span className="text-gray-300">Bu işlemler</span> programları, egzersizleri veya kullanıcıları silmez</li>
        </ul>
      </div>
    </div>
  );
}
