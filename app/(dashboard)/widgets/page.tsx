'use client';

import { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Clock,
  MessageSquare,
  Scale,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpDown,
  Flame,
  Target,
  Calendar,
} from 'lucide-react';
import { useConfirm } from '@/components/ConfirmModal';

interface CustomWidget {
  id: number;
  title: string;
  widget_type: 'countdown' | 'custom_text' | 'weight_goal' | 'special_day';
  target_time?: string | null;
  custom_content?: string | null;
  userId?: number | null;
  is_active: boolean;
  display_order: number;
}

const WIDGET_TYPES = [
  {
    id: 'countdown',
    label: 'Geri Sayım (Saat/Gün)',
    icon: Clock,
    color: '#4ECDC4',
    desc: 'Belirli bir saate veya güne canlı geri sayım sayacı',
  },
  {
    id: 'special_day',
    label: 'Özel Gün (Haftalık)',
    icon: Calendar,
    color: '#EC4899',
    desc: 'Haftanın belirli bir gününe özel etkinlik, motivasyon veya antrenman',
  },
  {
    id: 'custom_text',
    label: 'Özel Metin / Motivasyon',
    icon: MessageSquare,
    color: '#F59E0B',
    desc: 'Günün sözü, hatırlatma veya özel motivasyon cümlesi',
  },
  {
    id: 'weight_goal',
    label: 'Kilo Hedefi Rozeti',
    icon: Scale,
    color: '#10B981',
    desc: 'Kullanıcının hedef kilosu ve kalan fark ilerlemesi',
  },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Pazartesi', short: 'Pzt' },
  { value: 2, label: 'Salı', short: 'Sal' },
  { value: 3, label: 'Çarşamba', short: 'Çar' },
  { value: 4, label: 'Perşembe', short: 'Per' },
  { value: 5, label: 'Cuma', short: 'Cum' },
  { value: 6, label: 'Cumartesi', short: 'Cmt' },
  { value: 0, label: 'Pazar', short: 'Paz' },
];

function getSpecialDayInfo(targetTimeStr?: string | null) {
  if (!targetTimeStr) return { dayIndex: 1, dayName: 'Pazartesi', time: '', isToday: false, daysLeft: 0 };
  const parts = targetTimeStr.split('|');
  const dayIndex = parseInt(parts[0], 10);
  const time = parts[1] || '';
  const dayObj = DAYS_OF_WEEK.find((d) => d.value === dayIndex) || DAYS_OF_WEEK[0];
  const todayIndex = new Date().getDay(); // 0 is Sunday
  const isToday = todayIndex === dayObj.value;
  const daysLeft = (dayObj.value - todayIndex + 7) % 7;
  return { dayIndex: dayObj.value, dayName: dayObj.label, time, isToday, daysLeft };
}

export default function WidgetsAdminPage() {
  const { confirm } = useConfirm();
  const [widgets, setWidgets] = useState<CustomWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState<CustomWidget | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [widgetType, setWidgetType] = useState<CustomWidget['widget_type']>('countdown');
  const [targetTime, setTargetTime] = useState('18:00:00');
  const [targetWeight, setTargetWeight] = useState('70');
  const [specialDay, setSpecialDay] = useState(1);
  const [specialDayTime, setSpecialDayTime] = useState('18:00');
  const [customContent, setCustomContent] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Real-time ticking countdown for live preview
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    loadWidgets();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      calculateTimeRemaining();
    }, 1000);
    calculateTimeRemaining();
    return () => clearInterval(timer);
  }, [targetTime]);

  const calculateTimeRemaining = () => {
    try {
      const now = new Date();
      let target = new Date();

      if (targetTime.includes(':')) {
        const parts = targetTime.split(':').map((p) => parseInt(p, 10));
        target.setHours(parts[0] || 18, parts[1] || 0, parts[2] || 0, 0);
        if (target.getTime() < now.getTime()) {
          target.setDate(target.getDate() + 1);
        }
      } else if (!isNaN(Date.parse(targetTime))) {
        target = new Date(targetTime);
      }

      const diff = Math.max(0, target.getTime() - now.getTime());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });
    } catch {
      setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
    }
  };

  const loadWidgets = async () => {
    setLoading(true);
    try {
      const [resWidgets, resUsers] = await Promise.all([
        fetch(`/api/widgets?t=${Date.now()}`, { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ]);
      const data = await resWidgets.json();
      setWidgets(Array.isArray(data) ? data : []);
      const usersData = await resUsers.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch {
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (widget?: CustomWidget) => {
    setErrorMsg(null);
    if (widget) {
      setEditingWidget(widget);
      setTitle(widget.title);
      setWidgetType(widget.widget_type);
      setTargetTime(widget.target_time || '18:00:00');
      if (widget.widget_type === 'weight_goal') {
        setTargetWeight(widget.target_time || '70');
      } else {
        setTargetWeight('70');
      }
      if (widget.widget_type === 'special_day' && widget.target_time) {
        const parts = widget.target_time.split('|');
        setSpecialDay(parseInt(parts[0], 10) || 1);
        setSpecialDayTime(parts[1] || '18:00');
      } else {
        setSpecialDay(1);
        setSpecialDayTime('18:00');
      }
      setCustomContent(widget.custom_content || '');
      setTargetUserId(widget.userId !== undefined && widget.userId !== null ? Number(widget.userId) : null);
      setDisplayOrder(widget.display_order);
      setIsActive(widget.is_active);
    } else {
      setEditingWidget(null);
      setTitle('');
      setWidgetType('countdown');
      setTargetTime('18:00:00');
      setTargetWeight('70');
      setSpecialDay(1);
      setSpecialDayTime('18:00');
      setCustomContent('');
      setTargetUserId(null);
      setDisplayOrder(widgets.length + 1);
      setIsActive(true);
    }
    setShowModal(true);
  };

  const handleSaveWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !widgetType) {
      setErrorMsg('Lütfen widget başlığını eksiksiz girin.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    let formattedTargetTime: string | null = null;
    if (widgetType === 'countdown') {
      formattedTargetTime = targetTime ? (targetTime.length === 5 ? targetTime + ':00' : targetTime) : '18:00:00';
    } else if (widgetType === 'special_day') {
      formattedTargetTime = `${specialDay}|${specialDayTime || ''}`;
    } else if (widgetType === 'weight_goal') {
      formattedTargetTime = targetWeight ? targetWeight.trim() : '70';
    }

    const payload = {
      title: title.trim(),
      widget_type: widgetType,
      target_time: formattedTargetTime,
      custom_content: customContent ? customContent.trim() : null,
      userId: targetUserId,
      display_order: displayOrder,
      is_active: isActive,
    };

    try {
      let res;
      if (editingWidget) {
        res = await fetch('/api/widgets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingWidget.id, ...payload }),
        });
      } else {
        res = await fetch('/api/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Widget kaydedilemedi.');
      }

      const savedData = await res.json();

      // Instantly update local state so UI updates without waiting for network
      if (editingWidget) {
        setWidgets((prev) =>
          prev.map((w) => (w.id === savedData.id ? { ...w, ...savedData } : w))
        );
      } else {
        setWidgets((prev) => [...prev, savedData]);
      }

      setShowModal(false);
      setSuccessMsg(editingWidget ? 'Widget başarıyla güncellendi!' : 'Yeni widget eklendi!');
      setTimeout(() => setSuccessMsg(null), 3000);

      // Background reload
      loadWidgets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Widget kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (widget: CustomWidget) => {
    try {
      await fetch('/api/widgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: widget.id, is_active: !widget.is_active }),
      });
      setWidgets((prev) =>
        prev.map((w) => (w.id === widget.id ? { ...w, is_active: !w.is_active } : w))
      );
    } catch {}
  };

  const handleDeleteWidget = async (id: number) => {
    const ok = await confirm({
      title: 'Widgetı Sil',
      message: 'Bu ana sayfa widgetını silmek istediğinizden emin misiniz?',
      confirmText: 'Evet, Widgetı Sil',
    });
    if (!ok) return;

    try {
      const numericId = Number(id);
      // Optimistic instant UI removal with guaranteed type comparison
      setWidgets((prev) => prev.filter((w) => Number(w.id) !== numericId));
      if (editingWidget && Number(editingWidget.id) === numericId) {
        setShowModal(false);
        setEditingWidget(null);
      }

      // Use POST with action: 'delete' (and fallback to DELETE) so no browser/proxy blocks DELETE
      let res = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: numericId }),
      });

      if (!res.ok) {
        res = await fetch(`/api/widgets?id=${numericId}`, {
          method: 'DELETE',
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Widget silinemedi');
      }

      setSuccessMsg('Widget kartı başarıyla silindi!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Widget silinirken bir hata oluştu.');
      loadWidgets();
    }
  };

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  const displayedWidgets = widgets.filter((w) => {
    if (filterUserId === 'all') return true;
    if (filterUserId === 'global') return !w.userId;
    return w.userId === Number(filterUserId);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Floating Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#4ECDC4] text-gray-950 font-bold px-5 py-3 rounded-2xl shadow-2xl transition-all animate-bounce">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Custom Widget Yönetimi</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#4ECDC4]/15 text-[#4ECDC4] border border-[#4ECDC4]/30">
              Canlı Modüller
            </span>
          </h1>
          <p className="text-gray-400 mt-1">
            Kullanıcının ana ekranında ve widget alanında belirecek dinamik sayaçları ve özel kartları düzenleyin
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#4ECDC4] hover:bg-[#45B8B0] text-gray-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-[#4ECDC4]/20"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>Yeni Widget Ekle</span>
        </button>
      </div>

      {/* Grid: Widgets List & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Widget Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LayoutGrid size={18} className="text-[#4ECDC4]" />
              <span>Yayınlanan Widget Kartları ({displayedWidgets.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Hedef:</span>
              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="bg-[#1C1C1E] border border-[#2E2E2E] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#4ECDC4] cursor-pointer"
              >
                <option value="all">Tüm Widgetlar ({widgets.length})</option>
                <option value="global">🌍 Sadece Genel ({widgets.filter(w => !w.userId).length})</option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    👤 {u.name} ({widgets.filter(w => w.userId === u.id).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Yükleniyor...</div>
          ) : displayedWidgets.length === 0 ? (
            <div className="bg-[#141414] border border-[#242424] rounded-2xl p-12 text-center text-gray-500">
              <LayoutGrid size={36} className="mx-auto mb-3 text-gray-600" />
              <p>Seçilen filtreye uygun widget kartı bulunamadı.</p>
            </div>
          ) : (
            displayedWidgets.map((widget) => {
              const typeMeta = WIDGET_TYPES.find((t) => t.id === widget.widget_type) || WIDGET_TYPES[0];
              const Icon = typeMeta.icon;

              return (
                <div
                  key={widget.id}
                  className={`bg-[#141414] border transition-all rounded-2xl p-5 shadow-sm ${
                    widget.is_active ? 'border-[#262626] hover:border-[#383838]' : 'border-[#1E1E1E] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ backgroundColor: typeMeta.color + '18', borderColor: typeMeta.color + '40' }}
                      >
                        <Icon size={20} style={{ color: typeMeta.color }} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-base">{widget.title}</h3>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: typeMeta.color + '20', color: typeMeta.color }}
                          >
                            {typeMeta.label}
                          </span>
                          {widget.userId ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              👤 {users.find(u => u.id === widget.userId)?.name || `Kullanıcı #${widget.userId}`}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              🌍 Genel (Herkes)
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 font-semibold px-2 py-0.5 rounded-full bg-[#1F1F1F]">
                            Sıra: #{widget.display_order}
                          </span>
                        </div>

                        {/* Widget Type Specific Display */}
                        {widget.widget_type === 'countdown' && (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-[#1B1B1B] border border-[#2E2E2E] px-3.5 py-1.5 rounded-xl font-mono text-sm text-[#4ECDC4] font-bold">
                              <Clock size={14} />
                              <span>Hedef Saat: {widget.target_time}</span>
                            </div>
                            {widget.custom_content && (
                              <p className="text-xs text-gray-400 italic">&quot;{widget.custom_content}&quot;</p>
                            )}
                          </div>
                        )}

                        {widget.widget_type === 'custom_text' && widget.custom_content && (
                          <div className="mt-2.5 p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-gray-300 italic">
                            {widget.custom_content}
                          </div>
                        )}

                        {widget.widget_type === 'special_day' && (
                          <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center gap-2 bg-[#1B1B1B] border border-[#2E2E2E] px-3.5 py-1.5 rounded-xl text-sm text-[#EC4899] font-bold">
                              <Calendar size={14} />
                              <span>{getSpecialDayInfo(widget.target_time).dayName}</span>
                              {getSpecialDayInfo(widget.target_time).time && (
                                <span className="text-gray-400 font-mono text-xs">({getSpecialDayInfo(widget.target_time).time})</span>
                              )}
                            </div>
                            {getSpecialDayInfo(widget.target_time).isToday ? (
                              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40 animate-pulse">
                                🔥 BUGÜN ÖZEL GÜN!
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                {getSpecialDayInfo(widget.target_time).daysLeft} gün kaldı
                              </span>
                            )}
                            {widget.custom_content && (
                              <p className="text-xs text-gray-400 italic truncate max-w-xs">&quot;{widget.custom_content}&quot;</p>
                            )}
                          </div>
                        )}

                        {widget.widget_type === 'weight_goal' && (
                          <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                            <Scale size={14} />
                            <span>Hedef Kilo: <strong>{widget.target_time ? `${widget.target_time} kg` : 'Kullanıcı Hedefi'}</strong></span>
                            {widget.custom_content && (
                              <span className="text-gray-400 text-[11px] font-normal">• &quot;{widget.custom_content}&quot;</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(widget)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          widget.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}
                      >
                        {widget.is_active ? 'Aktif' : 'Pasif'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenModal(widget);
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
                          handleDeleteWidget(widget.id);
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

        {/* Right Col: Live Interactive Mobile Widget Card Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-[#4ECDC4]" />
            <h2 className="text-lg font-bold text-white">Canlı Widget Önizlemesi</h2>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 shadow-xl sticky top-8">
            <div className="text-xs text-gray-500 mb-4 text-center">
              Telefon ana ekranında çalışan canlı widget kartları
            </div>

            {(() => {
              const previewWidgets: CustomWidget[] = showModal
                ? [
                    {
                      id: editingWidget?.id || -1,
                      title: title.trim() || 'Yeni Widget',
                      widget_type: widgetType,
                      target_time: targetTime,
                      custom_content: customContent,
                      is_active: isActive,
                      display_order: 1,
                      userId: targetUserId,
                    },
                  ]
                : displayedWidgets.filter((w) => w.is_active);

              if (previewWidgets.length === 0) {
                return (
                  <div className="py-12 px-4 text-center text-gray-500 rounded-2xl border border-dashed border-[#262626]">
                    <LayoutGrid size={32} className="mx-auto mb-2.5 text-gray-600" />
                    <p className="text-sm font-semibold text-gray-300">Canlıda Aktif Widget Yok</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[240px] mx-auto">
                      Eklediğiniz veya aktif ettiğiniz widget kartları burada telefon ekranı formatında canlı olarak önizlenecektir.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {previewWidgets.map((pw, idx) => {
                    if (pw.widget_type === 'countdown') {
                      return (
                        <div
                          key={pw.id || idx}
                          className="bg-gradient-to-br from-[#18232C] via-[#141A20] to-[#12161A] border border-[#233544] rounded-2xl p-5 shadow-2xl relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#4ECDC4]/20 flex items-center justify-center text-[#4ECDC4]">
                                <Clock size={16} />
                              </div>
                              <span className="text-xs font-bold text-white tracking-wide">
                                {pw.title}
                              </span>
                            </div>
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#4ECDC4]/15 text-[#4ECDC4] border border-[#4ECDC4]/30 animate-pulse">
                              CANLI SAYAÇ
                            </span>
                          </div>

                          {/* Ticking Numbers */}
                          <div className="grid grid-cols-3 gap-2 my-2 text-center">
                            <div className="bg-[#0C1217] border border-[#1E2C37] rounded-xl p-2">
                              <span className="text-2xl font-black font-mono text-white">
                                {formatTwoDigits(timeRemaining.hours)}
                              </span>
                              <span className="text-[10px] text-gray-400 block font-medium">SAAT</span>
                            </div>
                            <div className="bg-[#0C1217] border border-[#1E2C37] rounded-xl p-2">
                              <span className="text-2xl font-black font-mono text-[#4ECDC4]">
                                {formatTwoDigits(timeRemaining.minutes)}
                              </span>
                              <span className="text-[10px] text-gray-400 block font-medium">DAKİKA</span>
                            </div>
                            <div className="bg-[#0C1217] border border-[#1E2C37] rounded-xl p-2">
                              <span className="text-2xl font-black font-mono text-emerald-400">
                                {formatTwoDigits(timeRemaining.seconds)}
                              </span>
                              <span className="text-[10px] text-gray-400 block font-medium">SANİYE</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-400 mt-3 text-center">
                            {pw.custom_content || (pw.target_time ? 'Hedef Saat: ' + pw.target_time : 'Günün antrenmanı seni bekliyor!')}
                          </p>
                        </div>
                      );
                    }

                    if (pw.widget_type === 'custom_text') {
                      return (
                        <div
                          key={pw.id || idx}
                          className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-4 shadow-md"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={15} className="text-[#F59E0B]" />
                            <span className="text-xs font-bold text-white">{pw.title}</span>
                          </div>
                          <p className="text-xs text-gray-300 italic leading-relaxed">
                            {pw.custom_content ? `«${pw.custom_content}»` : 'Özel metin veya motivasyon sözü'}
                          </p>
                        </div>
                      );
                    }

                    if (pw.widget_type === 'special_day') {
                      const dayInfo = getSpecialDayInfo(pw.target_time);
                      return (
                        <div
                          key={pw.id || idx}
                          className={`rounded-2xl p-5 shadow-2xl relative overflow-hidden border transition-all ${
                            dayInfo.isToday
                              ? 'bg-gradient-to-br from-[#2D1222] via-[#1F0D17] to-[#14080F] border-[#EC4899]/50 shadow-[#EC4899]/10'
                              : 'bg-[#181818] border-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#EC4899]/20 flex items-center justify-center text-[#EC4899]">
                                <Calendar size={16} />
                              </div>
                              <span className="text-xs font-bold text-white tracking-wide">{pw.title}</span>
                            </div>
                            {dayInfo.isToday ? (
                              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40 animate-pulse">
                                🔥 BUGÜN ÖZEL GÜN!
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10">
                                {dayInfo.daysLeft} GÜN KALDI
                              </span>
                            )}
                          </div>

                          <div className="my-2.5 p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] text-gray-400 block font-medium">Haftanın Günü</span>
                              <span className="text-base font-black text-[#EC4899]">{dayInfo.dayName}</span>
                            </div>
                            {dayInfo.time && (
                              <div className="text-right">
                                <span className="text-[11px] text-gray-400 block font-medium">Saat</span>
                                <span className="text-sm font-bold font-mono text-white">{dayInfo.time}</span>
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-gray-300 mt-2 text-center italic">
                            {pw.custom_content || 'Haftalık özel gün motivasyonu veya antrenmanı'}
                          </p>
                        </div>
                      );
                    }

                    if (pw.widget_type === 'weight_goal') {
                      return (
                        <div
                          key={pw.id || idx}
                          className="bg-[#141E18] border border-[#234030] rounded-2xl p-4 shadow-md"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Scale size={15} className="text-emerald-400" />
                              <span className="text-xs font-bold text-white">{pw.title}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                              Hedef: {pw.target_time || targetWeight || '70'} kg
                            </span>
                          </div>
                          <div className="w-full bg-[#0D1610] rounded-full h-2.5 my-2.5 border border-emerald-900/40 overflow-hidden">
                            <div className="bg-emerald-400 h-full rounded-full w-2/3" />
                          </div>
                          <p className="text-xs text-emerald-400/90 mt-1">
                            {pw.custom_content || 'Kullanıcının güncel kilosu ile hedef kilo farkı'}
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ============ MODAL: YENİ WIDGET EKLE/DÜZENLE ============ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#4ECDC4]/20 flex items-center justify-center text-[#4ECDC4]">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {editingWidget ? 'Widget Kartını Düzenle' : 'Yeni Widget Kartı Ekle'}
                  </h3>
                  <p className="text-xs text-gray-400">Başlık, tip ve geri sayım hedefini belirleyin</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveWidget} noValidate className="space-y-4">
              {/* Widget Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Widget Tipi *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WIDGET_TYPES.map((t) => {
                    const isSelected = widgetType === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setWidgetType(t.id as any)}
                        className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#4ECDC4]/20 border-[#4ECDC4] text-white shadow-sm'
                            : 'bg-[#222] border-[#333] text-gray-400 hover:border-[#444]'
                        }`}
                      >
                        <Icon size={18} style={{ color: t.color }} className="mb-1" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Widget Başlığı *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    widgetType === 'special_day'
                      ? 'Örn: 🏆 Leg Day (Bacak Günü)'
                      : widgetType === 'countdown'
                      ? 'Örn: ⏱️ Antrenmana Ne Kadar Kaldı?'
                      : widgetType === 'weight_goal'
                      ? 'Örn: 🎯 75 kg Hedefi'
                      : 'Örn: 💬 Günün Motivasyon Sözü'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              {/* Special Day Selector (if special_day) */}
              {widgetType === 'special_day' && (
                <div className="space-y-3 p-3.5 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#EC4899] mb-1.5 flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>Haftanın Özel Günü *</span>
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {DAYS_OF_WEEK.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setSpecialDay(d.value)}
                          className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all border ${
                            specialDay === d.value
                              ? 'bg-[#EC4899] text-white border-[#EC4899] shadow-md shadow-[#EC4899]/30'
                              : 'bg-[#262626] text-gray-400 border-[#333] hover:text-white'
                          }`}
                        >
                          <span className="block">{d.short}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Özel Gün Saati (Opsiyonel)
                    </label>
                    <input
                      type="time"
                      value={specialDayTime}
                      onChange={(e) => setSpecialDayTime(e.target.value)}
                      className="w-full bg-[#262626] border border-[#333] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#EC4899]"
                    />
                  </div>
                </div>
              )}

              {/* Target Time (if countdown) */}
              {widgetType === 'countdown' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Geri Sayım Hedef Saati (HH:mm) *
                  </label>
                  <input
                    type="time"
                    required
                    value={targetTime ? targetTime.slice(0, 5) : '18:00'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetTime(val ? (val.length === 5 ? val + ':00' : val) : '18:00:00');
                    }}
                    className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Sayaç her gün bu saate kadar saniyesi saniyesine canlı geri sayacaktır.
                  </p>
                </div>
              )}

              {/* Target Weight (if weight_goal) */}
              {widgetType === 'weight_goal' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center justify-between">
                    <span>Hedef Kilo (kg) *</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Kullanıcı Kilo Hedefi
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="Örn: 72.5"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-400 font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                      kg
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {targetUserId
                      ? `Seçilen kullanıcının (${users.find(u => u.id === targetUserId)?.name || `ID #${targetUserId}`}) hedeflenen kilosu olarak mobil arayüze ve ilerleme barına yansıtılır.`
                      : 'Tüm kullanıcıların mobil ana ekranındaki hedef kilo rozetinde varsayılan hedef olarak gösterilir.'}
                  </p>
                </div>
              )}

              {/* Custom Content */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Özel Metin / Açıklama (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Widget üzerinde gösterilecek metin veya motivasyon notu..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              {/* Target User (Kişiye Özel Widget Seçimi) */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center justify-between">
                  <span>Kullanıcı Hedefi (Kim İçin Geçerli?)</span>
                  <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-mono font-semibold">
                    Kişiye Özel
                  </span>
                </label>
                <select
                  value={targetUserId === null ? '' : String(targetUserId)}
                  onChange={(e) => setTargetUserId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4] cursor-pointer"
                >
                  <option value="">🌍 Tüm Kullanıcılar (Genel Widget)</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      👤 {u.name} (ID: #{u.id} {u.email ? `· ${u.email}` : ''})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  {targetUserId
                    ? `Bu widget sadece seçilen kullanıcının (${users.find(u => u.id === targetUserId)?.name || `ID #${targetUserId}`}) mobil ana ekranında ve widgetında görünür.`
                    : 'Bu widget istisnasız tüm kullanıcıların mobil ana ekranında ve widgetında ortak görünür.'}
                </p>
              </div>

              {/* Display Order & Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Sıralama Sırası</label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Yayın Durumu</label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#222] text-gray-500 border-[#333]'
                    }`}
                  >
                    {isActive ? 'Aktif (Yayında)' : 'Pasif (Gizli)'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3">
                {editingWidget ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteWidget(editingWidget.id)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Widget'ı Sil</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSaving}
                    className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !title.trim()}
                    className="flex items-center gap-2 bg-[#4ECDC4] hover:bg-[#45B8B0] disabled:opacity-40 text-gray-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-[#4ECDC4]/20"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                        <span>{editingWidget ? 'Güncelleniyor...' : 'Kaydediliyor...'}</span>
                      </>
                    ) : (
                      <span>{editingWidget ? 'Güncelle' : 'Kaydet'}</span>
                    )}
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
