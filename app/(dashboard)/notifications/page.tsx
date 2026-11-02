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
  AlertCircle,
  Wifi,
  Battery,
  Smartphone,
  Lock,
  Camera,
  Flashlight,
  Eye,
  Flame,
  Activity
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live Smartphone Preview States
  const [previewRuleId, setPreviewRuleId] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'lockscreen' | 'heads_up'>('lockscreen');
  const [currentTime, setCurrentTime] = useState('14:30');
  const [currentDate, setCurrentDate] = useState('Pazartesi, 2 Kasım');

  useEffect(() => {
    loadRules();
  }, []);

  // Update live clock & Turkish date for smartphone mockup
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/rules');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRules(list);
      if (list.length > 0 && !previewRuleId) {
        setPreviewRuleId(list[0].id);
      }
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
    try {
      const numericId = Number(id);
      // Optimistic instant UI removal
      setRules((prev) => prev.filter((r) => Number(r.id) !== numericId));
      if (editingRule && Number(editingRule.id) === numericId) {
        setShowModal(false);
        setEditingRule(null);
      }

      let res = await fetch('/api/notifications/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: numericId }),
      });

      if (!res.ok) {
        res = await fetch(`/api/notifications/rules?id=${numericId}`, {
          method: 'DELETE',
        });
      }

      if (!res.ok) {
        throw new Error('Bildirim kuralı silinemedi');
      }

      setSuccessMsg('Bildirim kuralı başarıyla silindi!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      loadRules();
    }
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

  // Dynamic preview payload: prioritize form state when modal is open, or selected rule
  const activePreview = showModal
    ? {
        id: editingRule?.id ?? -1,
        title: title || '🏋️‍♂️ Antrenman Zamanı!',
        subtitle: subtitle || 'FitApp Motivasyon Koçu',
        message: message || 'Bugün antrenman günün. Ayakkabılarını bağla ve salona doğru yola çık!',
        category,
        scheduled_time: scheduledTime || '18:00',
        days_of_week: selectedDays.join(','),
        voice_enabled: voiceEnabled,
        voice_script: voiceScript || message,
        is_active: true,
        isEditing: true,
      }
    : (() => {
        const found =
          rules.find((r) => r.id === previewRuleId) ||
          rules.find((r) => r.is_active) ||
          rules[0];
        if (found) {
          return { ...found, isEditing: false };
        }
        return {
          id: 0,
          title: '🏋️‍♂️ Antrenman Zamanı!',
          subtitle: 'FitApp Motivasyon Koçu',
          message: 'Bugün üst vücut antrenmanın var. Ayakkabılarını bağla ve salona doğru yola çık!',
          category: 'antrenman' as const,
          scheduled_time: '18:00',
          days_of_week: '1,2,3,4,5',
          voice_enabled: true,
          voice_script: 'Bugün üst vücut antrenmanın var. Sınırlarını zorla!',
          is_active: true,
          isEditing: false,
        };
      })();

  const activePreviewCat =
    CATEGORIES.find((c) => c.id === activePreview.category) || CATEGORIES[0];

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

      {/* Top Floating Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#4ECDC4] text-gray-950 font-bold px-5 py-3 rounded-2xl shadow-2xl transition-all animate-bounce">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {testSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">{testSuccess}</span>
        </div>
      )}

      {/* Grid: Rules List + Live Phone Mockup Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col (7 of 12): Rules List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell size={18} className="text-[#4ECDC4]" />
              <span>Kayıtlı Bildirim Kuralları ({rules.length})</span>
            </h2>
            <span className="text-xs text-gray-500">Mobil uygulamaya anlık senkronizedir</span>
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
              const isSelectedForPhone = !showModal && activePreview.id === rule.id;

              return (
                <div
                  key={rule.id}
                  onClick={() => setPreviewRuleId(rule.id)}
                  className={`bg-[#141414] border transition-all rounded-2xl p-5 shadow-sm cursor-pointer ${
                    isSelectedForPhone
                      ? 'ring-2 ring-[#4ECDC4] border-[#4ECDC4] bg-[#161c24]'
                      : rule.is_active
                      ? 'border-[#262626] hover:border-[#383838]'
                      : 'border-[#1E1E1E] opacity-60'
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
                          {isSelectedForPhone && (
                            <span className="text-[10px] font-bold text-[#4ECDC4] bg-[#4ECDC4]/15 px-2 py-0.5 rounded-full border border-[#4ECDC4]/30 flex items-center gap-1">
                              <Smartphone size={10} /> Telefonda Gösteriliyor
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayVoice(rule.voice_script!);
                              }}
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewRuleId(rule.id);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1 ${
                          isSelectedForPhone
                            ? 'bg-[#4ECDC4] text-gray-950 border-[#4ECDC4] font-bold'
                            : 'bg-[#1E1E1E] hover:bg-[#2A2A2A] text-gray-300 border-[#2E2E2E]'
                        }`}
                        title="Bu bildirimi canlı telefonda önizle"
                      >
                        <Smartphone size={12} className={isSelectedForPhone ? 'text-gray-950' : 'text-[#4ECDC4]'} />
                        <span className="hidden sm:inline">Önizle</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendTestNotification(rule);
                        }}
                        className="px-3 py-1.5 bg-[#1E1E1E] hover:bg-[#2A2A2A] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-[#2E2E2E] flex items-center gap-1.5"
                        title="Telefona / Ekrana Test Bildirimi Gönder"
                      >
                        <Send size={12} className="text-[#4ECDC4]" />
                        <span className="hidden sm:inline">Test</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(rule);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          rule.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}
                      >
                        {rule.is_active ? 'Aktif' : 'Pasif'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(rule);
                        }}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteRule(rule.id);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                        <span>Sil</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Col (5 of 12): Hyper-Realistic Live Smartphone Preview */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          {/* Header Controls */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#4ECDC4]" />
                <h2 className="text-base font-bold text-white">Canlı Telefon Önizlemesi</h2>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-300">iPhone 16 Pro</span>
              </div>
            </div>

            {/* Mode Toggle & Rule Selector */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#222]">
              <span className="text-xs text-gray-400 font-medium">Görünüm Modu:</span>
              <div className="flex items-center gap-1 bg-[#1C1C22] p-1 rounded-xl border border-[#2E2E38]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('lockscreen')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewMode === 'lockscreen'
                      ? 'bg-[#4ECDC4] text-gray-950 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Lock size={12} />
                  <span>Kilit Ekranı</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('heads_up')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewMode === 'heads_up'
                      ? 'bg-[#4ECDC4] text-gray-950 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Bell size={12} />
                  <span>Heads-Up Banner</span>
                </button>
              </div>
            </div>

            {/* Rule Selector Chips */}
            <div className="mt-3 pt-3 border-t border-[#222]">
              <div className="text-[11px] text-gray-400 mb-1.5 flex items-center justify-between font-medium">
                <span>Önizlenen Kural:</span>
                <span className="text-gray-500">{rules.length} kural mevcut</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {showModal && (
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#4ECDC4] text-gray-950 border border-[#4ECDC4] flex items-center gap-1 shrink-0 animate-pulse"
                  >
                    <Sparkles size={11} />
                    <span>Canlı Form</span>
                  </button>
                )}
                {rules.map((r, idx) => {
                  const rCat = CATEGORIES.find((c) => c.id === r.category) || CATEGORIES[0];
                  const isSel = !showModal && activePreview.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setPreviewRuleId(r.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-all border ${
                        isSel
                          ? 'bg-[#4ECDC4]/20 border-[#4ECDC4] text-white shadow-sm'
                          : 'bg-[#1A1A20] hover:bg-[#24242E] border-[#2A2A38] text-gray-400'
                      }`}
                    >
                      <span>{rCat.icon}</span>
                      <span className="truncate max-w-[90px]">{r.title || `Kural #${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============ SMARTPHONE HARDWARE MOCKUP ============ */}
          <div className="relative mx-auto w-full max-w-[340px] rounded-[52px] p-3 bg-gradient-to-b from-[#2e313b] via-[#1a1b22] to-[#121318] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.12),0_0_40px_rgba(78,205,196,0.15)] border-2 border-[#383d4a]">
            {/* Hardware Side Buttons */}
            <div className="absolute -left-[6px] top-[95px] w-[4px] h-[24px] bg-[#3d4250] rounded-l-md" title="Action Button" />
            <div className="absolute -left-[6px] top-[135px] w-[4px] h-[45px] bg-[#3d4250] rounded-l-md" title="Volume Up" />
            <div className="absolute -left-[6px] top-[190px] w-[4px] h-[45px] bg-[#3d4250] rounded-l-md" title="Volume Down" />
            <div className="absolute -right-[6px] top-[150px] w-[4px] h-[65px] bg-[#3d4250] rounded-r-md" title="Power Button" />

            {/* Screen Glass */}
            <div className="relative rounded-[42px] overflow-hidden bg-gradient-to-b from-[#0a1020] via-[#05070e] to-[#010205] min-h-[580px] p-4 text-white flex flex-col justify-between border border-white/5 select-none">
              {/* Ambient Wallpaper Glows */}
              <div className="absolute -top-16 -left-16 w-52 h-52 bg-[#4ECDC4]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 -right-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Top Section: Dynamic Island & Status Bar */}
              <div className="relative z-30 pt-0.5">
                {/* Dynamic Island */}
                <div
                  className={`mx-auto transition-all duration-300 ease-out bg-black rounded-full border border-white/10 flex items-center justify-between px-3 shadow-lg ${
                    isPlayingVoice ? 'w-[205px] h-7' : 'w-[96px] h-6'
                  }`}
                >
                  {isPlayingVoice ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-[#4ECDC4] tracking-tight">Sesli Koç Aktif</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-0.5 h-3 bg-[#4ECDC4] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                        <span className="w-0.5 h-4 bg-[#4ECDC4] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-0.5 h-2 bg-[#4ECDC4] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        <span className="w-0.5 h-3.5 bg-[#4ECDC4] rounded-full animate-pulse" style={{ animationDelay: '80ms' }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-[#151515] ring-1 ring-white/10" />
                      <div className="w-2 h-2 rounded-full bg-[#0d1f2d] ring-1 ring-[#4ECDC4]/30" />
                    </>
                  )}
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs font-semibold px-2 -mt-5">
                  <span className="text-[12px] font-bold text-white/90">{currentTime}</span>
                  <div className="flex items-center gap-1.5 text-white/90">
                    {/* Signal bars */}
                    <div className="flex items-end gap-0.5 h-2.5">
                      <div className="w-0.5 h-1 bg-white/90 rounded-sm" />
                      <div className="w-0.5 h-1.5 bg-white/90 rounded-sm" />
                      <div className="w-0.5 h-2 bg-white/90 rounded-sm" />
                      <div className="w-0.5 h-2.5 bg-white/90 rounded-sm" />
                    </div>
                    <span className="text-[10px] font-extrabold tracking-tighter">5G</span>
                    <Wifi size={12} strokeWidth={2.5} />
                    <div className="flex items-center gap-0.5">
                      <div className="w-4 h-2 rounded-[3px] border border-white/80 p-0.5 flex items-center">
                        <div className="w-full h-full bg-white/90 rounded-[1px]" />
                      </div>
                      <div className="w-0.5 h-1 bg-white/80 rounded-r-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Screen Content */}
              {previewMode === 'lockscreen' ? (
                /* LOCK SCREEN LAYOUT */
                <div className="relative z-20 flex-1 flex flex-col justify-between pt-3 pb-1">
                  <div>
                    <div className="flex justify-center mb-1">
                      <Lock size={13} className="text-white/60" />
                    </div>
                    <div className="text-5xl font-extralight tracking-tight text-center text-white/95">
                      {currentTime}
                    </div>
                    <div className="text-xs font-medium text-center text-white/75 capitalize mt-1">
                      {currentDate}
                    </div>

                    {/* Push Notification Card on Lock Screen */}
                    <div className="mt-5 relative backdrop-blur-2xl bg-black/65 hover:bg-black/75 border border-white/15 rounded-2xl p-3.5 shadow-2xl transition-all">
                      {/* Accent line */}
                      <div
                        className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
                        style={{ backgroundColor: activePreviewCat.color }}
                      />

                      {/* App Meta Header */}
                      <div className="flex items-center justify-between mb-2 pt-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#4ECDC4] to-[#14b8a6] flex items-center justify-center text-[9px] font-black text-black shadow-sm">
                            FA
                          </div>
                          <span className="text-[11px] font-bold text-white tracking-wide">FITAPP</span>
                          <span className="text-[10px] text-gray-400 font-medium">• Şimdi</span>
                        </div>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: activePreviewCat.color + '25',
                            color: activePreviewCat.color,
                            border: `1px solid ${activePreviewCat.color}40`,
                          }}
                        >
                          {activePreviewCat.icon} {activePreviewCat.label}
                        </span>
                      </div>

                      {/* Title & Body */}
                      <h4 className="font-bold text-white text-xs leading-snug">
                        {activePreview.title || '🏋️‍♂️ Antrenman Zamanı!'}
                      </h4>
                      {activePreview.subtitle && (
                        <p className="text-[11px] text-gray-300 font-medium mt-0.5">{activePreview.subtitle}</p>
                      )}
                      <p className="text-[11px] text-gray-200 mt-1 leading-relaxed">
                        {activePreview.message || 'Bugün üst vücut antrenmanın var. Ayakkabılarını bağla ve salona doğru yola çık!'}
                      </p>

                      {/* In-Notification Voice Coach Bar */}
                      {activePreview.voice_enabled && (
                        <div className="mt-2.5 p-2 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                              isPlayingVoice ? 'bg-emerald-400 text-black animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              <Volume2 size={12} />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-white block">Sesli Koç</span>
                              <span className="text-[8px] text-emerald-400 font-medium">Türkçe seslendirme hazır</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(activePreview.voice_script || activePreview.message)}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-300 text-[10px] font-bold transition-colors flex items-center gap-1"
                          >
                            {isPlayingVoice ? (
                              <>
                                <Square size={9} className="fill-current" />
                                <span>Durdur</span>
                              </>
                            ) : (
                              <>
                                <Play size={9} className="fill-current" />
                                <span>Dinle</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-3 gap-1 text-center">
                        <button
                          type="button"
                          onClick={() => alert('Tamamlandı bildirimi simüle edildi')}
                          className="py-1 px-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition-colors"
                        >
                          ✅ Tamamla
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayVoice(activePreview.voice_script || activePreview.message)}
                          className="py-1 px-1 rounded-lg bg-[#4ECDC4]/20 hover:bg-[#4ECDC4]/30 text-[10px] font-bold text-[#4ECDC4] transition-colors flex items-center justify-center gap-1"
                        >
                          <Volume2 size={10} /> Oku
                        </button>
                        <button
                          type="button"
                          onClick={() => alert('10 dakika sonraya ertelendi')}
                          className="py-1 px-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-gray-300 transition-colors"
                        >
                          ⏰ Ertele
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lock Screen Bottom shortcuts */}
                  <div className="flex items-center justify-between px-3 pt-6">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 shadow-md">
                      <Flashlight size={16} />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 shadow-md">
                      <Camera size={16} />
                    </div>
                  </div>
                </div>
              ) : (
                /* HEADS-UP BANNER LAYOUT (App In-Use) */
                <div className="relative z-20 flex-1 flex flex-col justify-between pt-2">
                  {/* Dropping Banner */}
                  <div className="backdrop-blur-2xl bg-black/85 border border-[#4ECDC4]/40 rounded-2xl p-3.5 shadow-2xl transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#4ECDC4] to-[#14b8a6] flex items-center justify-center text-[9px] font-black text-black">
                          FA
                        </div>
                        <span className="text-[11px] font-bold text-white">FitApp</span>
                        <span className="text-[9px] text-[#4ECDC4] bg-[#4ECDC4]/15 px-1.5 py-0.5 rounded-full font-bold">Heads-Up</span>
                      </div>
                      <span className="text-[9px] text-gray-400">Şimdi</span>
                    </div>

                    <h4 className="font-bold text-white text-xs leading-snug">
                      {activePreview.title || '🏋️‍♂️ Antrenman Zamanı!'}
                    </h4>
                    {activePreview.subtitle && (
                      <p className="text-[11px] text-gray-300 font-medium mt-0.5">{activePreview.subtitle}</p>
                    )}
                    <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                      {activePreview.message}
                    </p>

                    {activePreview.voice_enabled && (
                      <div className="mt-2.5 p-2 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Volume2 size={12} className="text-[#4ECDC4]" />
                          <span className="text-[10px] font-bold text-white">Sesli Koç</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePlayVoice(activePreview.voice_script || activePreview.message)}
                          className="px-2 py-0.5 rounded bg-[#4ECDC4]/20 text-[#4ECDC4] text-[10px] font-bold"
                        >
                          {isPlayingVoice ? 'Durdur' : 'Dinle'}
                        </button>
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-3 gap-1 text-center">
                      <button
                        type="button"
                        onClick={() => alert('Tamamlandı')}
                        className="py-1 px-1 rounded-lg bg-white/10 text-[10px] font-bold text-white"
                      >
                        ✅ Tamamla
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePlayVoice(activePreview.voice_script || activePreview.message)}
                        className="py-1 px-1 rounded-lg bg-[#4ECDC4]/20 text-[10px] font-bold text-[#4ECDC4]"
                      >
                        <Volume2 size={10} className="inline mr-1" /> Oku
                      </button>
                      <button
                        type="button"
                        onClick={() => alert('Ertelendi')}
                        className="py-1 px-1 rounded-lg bg-white/10 text-[10px] font-bold text-gray-300"
                      >
                        ⏰ Ertele
                      </button>
                    </div>
                  </div>

                  {/* Simulated In-App Background Widgets */}
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-2 mt-4 opacity-50">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Günün Antrenmanı</span>
                      <span className="text-[#4ECDC4] font-bold">Giriş Yapıldı</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#4ECDC4] to-emerald-400 w-3/4 rounded-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>6,240 / 8,000 Adım</span>
                      <span>%78 Tamamlandı</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Home Indicator */}
              <div className="relative z-30 pt-2 pb-0.5">
                <div className="w-32 h-1 bg-white/40 rounded-full mx-auto" />
              </div>
            </div>
          </div>

          {/* Under-Phone Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => handleSendTestNotification(activePreview.isEditing ? undefined : activePreview)}
              className="w-full flex items-center justify-center gap-2 bg-[#4ECDC4] hover:bg-[#45B8B0] text-gray-950 font-bold py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-[#4ECDC4]/25"
            >
              <Send size={15} className="stroke-[2.5]" />
              <span>Bu Bildirimi Telefona Test Gönder</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlayVoice(activePreview.voice_script || activePreview.message)}
              className="w-full flex items-center justify-center gap-2 bg-[#18181C] hover:bg-[#222228] border border-[#2A2A38] text-gray-300 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              {isPlayingVoice ? (
                <>
                  <Square size={13} className="text-red-400 fill-current" />
                  <span className="text-red-300">Sesli Koç Konuşmasını Durdur</span>
                </>
              ) : (
                <>
                  <Volume2 size={13} className="text-[#4ECDC4]" />
                  <span>Türkçe Sesli Koç Sesini Dinle (tr-TR)</span>
                </>
              )}
            </button>

            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] text-[11px] text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-[#4ECDC4]" />
                <span>Saat: <strong className="text-white">{activePreview.scheduled_time}</strong></span>
              </span>
              <span>
                Sesli Koç: <strong className={activePreview.voice_enabled ? 'text-emerald-400' : 'text-gray-500'}>{activePreview.voice_enabled ? 'Aktif' : 'Kapalı'}</strong>
              </span>
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

                {/* Modal Live Notification Banner Preview */}
                <div className="p-3.5 rounded-xl bg-black/60 border border-[#4ECDC4]/30 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1.5 font-semibold text-white">
                      <Smartphone size={12} className="text-[#4ECDC4]" />
                      <span>Anlık Telefon Bildirim Önizlemesi</span>
                    </span>
                    <span className="text-[10px] text-[#4ECDC4] bg-[#4ECDC4]/10 px-2 py-0.5 rounded-full border border-[#4ECDC4]/20 font-bold">
                      Canlı
                    </span>
                  </div>
                  <div className="bg-[#1C1C22] border border-[#2D2D38] rounded-xl p-3 shadow-md">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-md bg-[#4ECDC4] flex items-center justify-center text-[8px] font-black text-black">
                          FA
                        </div>
                        <span className="text-xs font-bold text-white">FitApp • Şimdi</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{scheduledTime || '18:00'}</span>
                    </div>
                    <div className="font-bold text-white text-xs">{title || 'Başlık yazın...'}</div>
                    {subtitle && <div className="text-[11px] text-gray-400 font-medium">{subtitle}</div>}
                    <div className="text-[11px] text-gray-300 mt-1">{message || 'Mesaj metni yazın...'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3">
                {editingRule ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(editingRule.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Kuralı Sil</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
