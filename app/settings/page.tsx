'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDeleteAllSessions = async () => {
    if (!confirm('Tüm antreman kayıtlarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings/delete-sessions', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Başarılı! ${data.deletedCount} antreman kaydı silindi.`);
      } else {
        setMessage(`❌ Hata: ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Bir hata oluştu: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllProgress = async () => {
    if (!confirm('Tüm egzersiz ilerlemelerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings/delete-progress', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Başarılı! ${data.deletedCount} ilerleme kaydı silindi.`);
      } else {
        setMessage(`❌ Hata: ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Bir hata oluştu: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Ayarlar</h1>

        {/* Tehlikeli İşlemler */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">⚠️ Tehlikeli İşlemler</h2>
          <p className="text-gray-600 mb-6">
            Bu işlemler geri alınamaz. Lütfen dikkatli olun!
          </p>

          <div className="space-y-4">
            {/* Tüm Antreman Kayıtlarını Sil */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="font-semibold text-gray-900 mb-2">Tüm Antreman Kayıtlarını Sil</h3>
              <p className="text-sm text-gray-600 mb-4">
                Tüm kullanıcıların antreman geçmişini siler (workout_sessions tablosu).
              </p>
              <button
                onClick={handleDeleteAllSessions}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Siliniyor...' : 'Tüm Antreman Kayıtlarını Sil'}
              </button>
            </div>

            {/* Tüm Egzersiz İlerlemelerini Sil */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="font-semibold text-gray-900 mb-2">Tüm Egzersiz İlerlemelerini Sil</h3>
              <p className="text-sm text-gray-600 mb-4">
                Tüm egzersiz set/tekrar kayıtlarını siler (exercise_progress tablosu).
              </p>
              <button
                onClick={handleDeleteAllProgress}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Siliniyor...' : 'Tüm İlerleme Kayıtlarını Sil'}
              </button>
            </div>
          </div>

          {/* Mesaj */}
          {message && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Bilgi */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Bilgi</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Antreman kayıtları: Kullanıcıların tamamladığı antremanların geçmişi</li>
            <li>• İlerleme kayıtları: Her egzersizin set ve tekrar detayları</li>
            <li>• Bu işlemler programları, egzersizleri veya kullanıcıları silmez</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
