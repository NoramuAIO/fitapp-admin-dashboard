'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Send,
  CheckCircle2,
  Sparkles,
  Play,
  Square,
  X,
  Edit2,
  AlertCircle
} from 'lucide-react';

interface NotificationRule {
  id: number;
  title: string;
  subtitle?: string | null;
  message: string;
  category: 'antrenman' | 'motivasyon' | 'dis_fircalama' | 'yuruyus' | 'sinav' | 'yemek' | 'ozel_kayit';
  scheduled_time: string;
  days_of_week: string;
  voice_enabled: boolean;
  voice_script?: string | null;
  is_active: boolean;
}

const CATEGORIES = [
  { id: 'antrenman', label: 'Antrenman', icon: '🏋️‍♂️', color: '#4ECDC4' },
  { id: 'motivasyon', label: 'Motivasyon', icon: '🔥', color: '#F59E0B' },
  { id: 'dis_fircalama', label: 'Diş Fırçalama', icon: '🪥', color: '#60A5FA' },
  { id: 'yuruyus', label: 'Yürüyüş', icon: '🚶‍♂️', color: '#34D399' },
  { id: 'sinav', label: 'Sınav / Çalışma', icon: '📚', color: '#A78BFA' },
  { id: 'yemek', label: 'Beslenme / Su', icon: '🥗', color: '#F472B6' },
  { id: 'ozel_kayit', label: 'Özel Kayıt', icon: '📝', color: '#9CA3AF' },
];

const DAYS = [
  { id: '1', label: 'Pzt' },
  { id: '2', label: 'Sal' },
  { id: '3', label: 'Çar' },
  { id: '4', label: 'Per' },
  { id: '5', label: 'Cum' },
  { id: '6', label: 'Cmt' },
  { id: '0', label: 'Paz' },
];

export default function NotificationAdminPage() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<NotificationRule['category']>('antrenman');
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceScript, setVoiceScript] = useState('');
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/rules');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule?: NotificationRule) => {
    if (rule) {
      setEditingRule(rule);
      setTitle(rule.title);
      setSubtitle(rule.subtitle || '');
      setMessage(rule.message);
      setCategory(rule.category);
      setScheduledTime(rule.scheduled_time);
      setSelectedDays(rule.days_of_week ? rule.days_of_week.split(',') : ['1', '2', '3', '4', '5']);
      setVoiceEnabled(rule.voice_enabled);
      setVoiceScript(rule.voice_script || '');
    } else {
      setEditingRule(null);
      setTitle('');
      setSubtitle('');
      setMessage('');
      setCategory('antrenman');
      setScheduledTime('18:00');
      setSelectedDays(['1', '2', '3', '4', '5']);
      setVoiceEnabled(true);
      setVoiceScript('');
    }
    setShowModal(true);
  };

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !scheduledTime) return;

    const payload = {
      title,
      subtitle: subtitle || null,
      message,
      category,
      scheduled_time: scheduledTime,
      days_of_week: selectedDays.join(','),
      voice_enabled: voiceEnabled,
      voice_script: voiceEnabled ? (voiceScript || message) : null,
      is_active: editingRule ? editingRule.is_active : true,
    };

    try {
      if (editingRule) {
        await fetch('/api/notifications/rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingRule.id, ...payload }),
        });
      } else {
        await fetch('/api/notifications/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      loadRules();
    } catch (err) {
      alert('Kural kaydedilemedi!');
    }
  };

  const handleToggleActive = async (rule: NotificationRule) => {
    try {
      await fetch('/api/notifications/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      );
    } catch {}
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Bu bildirim kuralını silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/notifications/rules?id=${id}`, { method: 'DELETE' });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  };

  // Browser Speech Synthesis for Previewing Turkish Voice Coach
  const handlePlayVoice = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Tarayıcınız ses sentezini desteklemiyor.');
      return;
    }

    if (isPlayingVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak || message);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingVoice(false);
    utterance.onerror = () => setIsPlayingVoice(false);

    setIsPlayingVoice(true);
    window.speechSynthesis.speak(utterance);
  };

  // Test Notification Dispatch
  const handleSendTestNotification = async (ruleToTest?: NotificationRule) => {
    const payload = ruleToTest || {
      title: title || '⚡ Test Bildirimi',
      subtitle: subtitle || 'FitApp Bildirim Sistemi',
      message: message || 'Antrenman vakti geldi! Sınırlarını zorla.',
      category,
      voice_enabled: voiceEnabled,
      voice_script: voiceScript || message,
    };

    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestSuccess(`«${payload.title}» başarıyla gönderildi ve test edildi!`);

      // Also speak voice coach in browser if voice_enabled
      if (payload.voice_enabled && (payload.voice_script || payload.message)) {
        handlePlayVoice(payload.voice_script || payload.message);
      }

      setTimeout(() => setTestSuccess(null), 4000);
    } catch {
      alert('Test bildirimi gönderilemedi.');
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Bildirim & Sesli Koç Merkezi</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#4ECDC4]/15 text-[#4ECDC4] border border-[#4ECDC4]/30">
              Canlı Otomasyon
            </span>
          </h1>
          <p className="text-gray-400 mt-1">
            Zengin push bildirimleri, zamanlanmış hatırlatıcılar ve Türkçe sesli koç mesajlarını yönetin
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#4ECDC4] hover:bg-[#45B8B0] text-gray-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#4ECDC4]/20"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>Yeni Bildirim Kuralı</span>
        </button>
      </div>

      {testSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">{testSuccess}</span>
        </div>
      )}

      {/* Grid: Rules List + Live Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell size={18} className="text-[#4ECDC4]" />
              <span>Kayıtlı Bildirim Kuralları ({rules.length})</span>
            </h2>
            <span className="text-xs text-gray-500">Mobil uygulamaya otomatik senkronize edilir</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Yükleniyor...</div>
          ) : rules.length === 0 ? (
            <div className="bg-[#141414] border border-[#242424] rounded-2xl p-12 text-center text-gray-500">
              <Bell size={36} className="mx-auto mb-3 text-gray-600" />
              <p>Henüz tanımlanmış bir bildirim kuralı yok.</p>
            </div>
          ) : (
            rules.map((rule) => {
              const cat = CATEGORIES.find((c) => c.id === rule.category) || CATEGORIES[0];
              const daysList = rule.days_of_week ? rule.days_of_week.split(',') : [];

              return (
                <div
                  key={rule.id}
                  className={`bg-[#141414] border transition-all rounded-2xl p-5 shadow-sm ${
                    rule.is_active ? 'border-[#262626] hover:border-[#383838]' : 'border-[#1E1E1E] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                        style={{ backgroundColor: cat.color + '18', borderColor: cat.color + '40' }}
                      >
                        {cat.icon}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-base">{rule.title}</h3>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cat.color + '20', color: cat.color }}
                          >
                            {cat.label}
                          </span>
                          {rule.voice_enabled && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <Volume2 size={12} /> Sesli Koç
                            </span>
                          )}
                        </div>

                        {rule.subtitle && (
                          <p className="text-xs text-gray-400 font-medium mt-0.5">{rule.subtitle}</p>
                        )}

                        <p className="text-sm text-gray-300 mt-2 leading-relaxed">{rule.message}</p>

                        {/* Voice Script Preview */}
                        {rule.voice_enabled && rule.voice_script && (
                          <div className="mt-3 p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-gray-300 flex items-start gap-2.5">
                            <Volume2 size={14} className="text-[#4ECDC4] shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                                Türkçe Sesli Koç Metni:
                              </span>
                              <p className="italic text-gray-200">&quot;{rule.voice_script}&quot;</p>
                            </div>
                            <button
                              onClick={() => handlePlayVoice(rule.voice_script!)}
                              className="px-2 py-1 bg-[#262626] hover:bg-[#333] rounded-lg text-[11px] text-[#4ECDC4] font-medium flex items-center gap-1 transition-colors shrink-0"
                              title="Tarayıcıda Dinle"
                            >
                              <Play size={10} /> Dinle
                            </button>
                          </div>
                        )}

                        {/* Days & Time badges */}
                        <div className="mt-4 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1.5 font-bold text-white bg-[#1E1E1E] px-2.5 py-1 rounded-lg border border-[#2E2E2E]">
                            <Clock size={13} className="text-[#4ECDC4]" />
                            {rule.scheduled_time}
                          </span>

                          <div className="flex items-center gap-1">
                            {DAYS.map((d) => {
                              const isSelected = daysList.includes(d.id);
                              return (
                                <span
                                  key={d.id}
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                    isSelected
                                      ? 'bg-[#4ECDC4]/20 text-[#4ECDC4] border border-[#4ECDC4]/40'
                                      : 'bg-[#1E1E1E] text-gray-600'
                                  }`}
                                >
                                  {d.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSendTestNotification(rule)}
                        className="px-3 py-1.5 bg-[#1E1E1E] hover:bg-[#2A2A2A] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-[#2E2E2E] flex items-center gap-1.5"
                        title="Telefona / Ekrana Test Bildirimi Gönder"
                      >
                        <Send size={12} className="text-[#4ECDC4]" />
                        <span className="hidden sm:inline">Test Gönder</span>
                      </button>

                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          rule.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}
                      >
                        {rule.is_active ? 'Aktif' : 'Pasif'}
                      </button>

                      <button
                        onClick={() => handleOpenModal(rule)}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Col: Phone Heads-Up Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-[#4ECDC4]" />
            <h2 className="text-lg font-bold text-white">Canlı Telefon Önizlemesi</h2>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 shadow-xl sticky top-8">
            <div className="text-xs text-gray-500 mb-4 text-center">
              Kullanıcının telefonunda görünecek zengin bildirim kartı
            </div>

            {/* Android / iOS Mock Notification Banner */}
            <div className="bg-[#1E1E1E] border border-[#383838] rounded-2xl p-4 shadow-2xl relative overflow-hidden">
              {/* Turquoise accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#14b8a6]" />

              {/* App meta */}
              <div className="flex items-center justify-between mb-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#14b8a6] flex items-center justify-center text-[10px] font-black text-black">
                    FA
                  </div>
                  <span className="text-xs font-bold text-gray-300">FitApp • Şimdi</span>
                </div>
                <span className="text-[10px] font-semibold text-[#14b8a6] bg-[#14b8a6]/15 px-2 py-0.5 rounded-full">
                  Heads-Up Banner
                </span>
              </div>

              {/* Title & Body */}
              <h4 className="font-bold text-white text-sm">
                {title || '🏋️‍♂️ Antrenman Zamanı!'}
              </h4>
              {subtitle && (
                <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
              )}
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {message || 'Bugün üst vücut antrenmanın var. Ayakkabılarını bağla ve salona doğru yola çık!'}
              </p>

              {/* Expandable BigTextStyle Voice Indicator */}
              {voiceEnabled && (
                <div className="mt-3 p-2.5 rounded-xl bg-[#161616] border border-[#2A2A2A] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Volume2 size={14} />
                    <span>Sesli Koç Hazır</span>
                  </div>
                  <button
                    onClick={() => handlePlayVoice(voiceScript || message)}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold"
                  >
                    {isPlayingVoice ? 'Durdur' : 'Dinle'}
                  </button>
                </div>
              )}

              {/* Rich Push Action Buttons */}
              <div className="mt-3 pt-3 border-t border-[#2A2A2A] grid grid-cols-3 gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => alert('Tamamlandı bildirimi simüle edildi')}
                  className="py-1.5 px-2 rounded-lg bg-[#2A2A2A] hover:bg-[#333] text-[11px] font-bold text-white transition-colors"
                >
                  ✅ Tamamlandı
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayVoice(voiceScript || message)}
                  className="py-1.5 px-2 rounded-lg bg-[#14b8a6]/20 hover:bg-[#14b8a6]/30 text-[11px] font-bold text-[#4ECDC4] transition-colors flex items-center justify-center gap-1"
                >
                  <Volume2 size={11} /> Sesli Oku
                </button>
                <button
                  type="button"
                  onClick={() => alert('10 dakika sonraya ertelendi')}
                  className="py-1.5 px-2 rounded-lg bg-[#2A2A2A] hover:bg-[#333] text-[11px] font-bold text-gray-300 transition-colors"
                >
                  ⏰ 10 Dk Ertele
                </button>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => handleSendTestNotification()}
                className="w-full flex items-center justify-center gap-2 bg-[#14b8a6] hover:bg-[#0d9488] text-gray-950 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-[#14b8a6]/20"
              >
                <Send size={15} />
                <span>Önizlemeyi Test Olarak Gönder</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MODAL: YENİ BİLDİRİM KURALI EKLE/DÜZENLE ============ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4ECDC4]/20 flex items-center justify-center text-[#4ECDC4]">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {editingRule ? 'Bildirim Kuralını Düzenle' : 'Yeni Bildirim Kuralı Oluştur'}
                  </h3>
                  <p className="text-xs text-gray-400">Zamanlama, kategori ve sesli koç ayarlarını girin</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Kategori Seçimi</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id as any)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#4ECDC4]/20 border-[#4ECDC4] text-white shadow-sm'
                            : 'bg-[#222] border-[#333] text-gray-400 hover:border-[#444]'
                        }`}
                      >
                        <span className="text-base">{c.icon}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bildirim Başlığı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 🏋️‍♂️ Antrenman Vakti!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Alt Başlık (Opsiyonel)</label>
                  <input
                    type="text"
                    placeholder="Örn: Günün Hedefi"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bildirim Mesajı *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Kullanıcıya gösterilecek mesaj metni..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              {/* Time & Days */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Saat (HH:mm) *</label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tekrarlanacak Günler</label>
                  <div className="flex items-center gap-1.5">
                    {DAYS.map((d) => {
                      const isSelected = selectedDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDay(d.id)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#4ECDC4] text-gray-950 border-[#4ECDC4]'
                              : 'bg-[#222] text-gray-400 border-[#333] hover:border-[#444]'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sesli Koç (Voice Coach) Section */}
              <div className="pt-2 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-[#4ECDC4]" />
                    <span className="text-sm font-bold text-white">Sesli Koç (Türkçe Konuşma)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                      voiceEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#222] text-gray-500 border-[#333]'
                    }`}
                  >
                    {voiceEnabled ? 'Açık' : 'Kapalı'}
                  </button>
                </div>

                {voiceEnabled && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Sesli Okunacak Motivasyon / Koçluk Metni (Boş bırakılırsa bildirim mesajı okunur):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Örn: Günün en verimli anı geldi! Bugün antrenmanında sınırlarını zorla..."
                      value={voiceScript}
                      onChange={(e) => setVoiceScript(e.target.value)}
                      className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handlePlayVoice(voiceScript || message)}
                        className="px-3 py-1 bg-[#262626] hover:bg-[#333] rounded-lg text-xs text-[#4ECDC4] font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Play size={11} /> Önizleme Dinle (tr-TR)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!title || !message || !scheduledTime}
                  className="bg-[#4ECDC4] hover:bg-[#45B8B0] disabled:opacity-40 text-gray-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
                >
                  {editingRule ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
