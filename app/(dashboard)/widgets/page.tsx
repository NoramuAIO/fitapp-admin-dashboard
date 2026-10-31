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
  Target
} from 'lucide-react';

interface CustomWidget {
  id: number;
  title: string;
  widget_type: 'countdown' | 'custom_text' | 'weight_goal';
  target_time?: string | null;
  custom_content?: string | null;
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

export default function WidgetsAdminPage() {
  const [widgets, setWidgets] = useState<CustomWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState<CustomWidget | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [widgetType, setWidgetType] = useState<CustomWidget['widget_type']>('countdown');
  const [targetTime, setTargetTime] = useState('18:00:00');
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
      const res = await fetch('/api/widgets');
      const data = await res.json();
      setWidgets(Array.isArray(data) ? data : []);
    } catch {
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (widget?: CustomWidget) => {
    if (widget) {
      setEditingWidget(widget);
      setTitle(widget.title);
      setWidgetType(widget.widget_type);
      setTargetTime(widget.target_time || '18:00:00');
      setCustomContent(widget.custom_content || '');
      setDisplayOrder(widget.display_order);
      setIsActive(widget.is_active);
    } else {
      setEditingWidget(null);
      setTitle('');
      setWidgetType('countdown');
      setTargetTime('18:00:00');
      setCustomContent('');
      setDisplayOrder(widgets.length + 1);
      setIsActive(true);
    }
    setShowModal(true);
  };

  const handleSaveWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !widgetType) return;

    const payload = {
      title,
      widget_type: widgetType,
      target_time: widgetType === 'countdown' ? targetTime : null,
      custom_content: customContent || null,
      display_order: displayOrder,
      is_active: isActive,
    };

    try {
      if (editingWidget) {
        await fetch('/api/widgets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingWidget.id, ...payload }),
        });
      } else {
        await fetch('/api/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      loadWidgets();
    } catch {
      alert('Widget kaydedilemedi!');
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
    if (!confirm('Bu widget kartını silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/widgets?id=${id}`, { method: 'DELETE' });
      setWidgets((prev) => prev.filter((w) => w.id !== id));
    } catch {}
  };

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LayoutGrid size={18} className="text-[#4ECDC4]" />
              <span>Yayınlanan Widget Kartları ({widgets.length})</span>
            </h2>
            <span className="text-xs text-gray-500">Sıralamaya göre mobil ana ekranda dizilir</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Yükleniyor...</div>
          ) : widgets.length === 0 ? (
            <div className="bg-[#141414] border border-[#242424] rounded-2xl p-12 text-center text-gray-500">
              <LayoutGrid size={36} className="mx-auto mb-3 text-gray-600" />
              <p>Henüz tanımlanmış bir widget kartı yok.</p>
            </div>
          ) : (
            widgets.map((widget) => {
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

                        {widget.widget_type === 'weight_goal' && (
                          <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                            <Scale size={14} />
                            <span>Mobil Kilo Hedefi Barı & İlerleme Kartı</span>
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
                        onClick={() => handleOpenModal(widget)}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteWidget(widget.id)}
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

        {/* Right Col: Live Interactive Mobile Widget Card Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-[#4ECDC4]" />
            <h2 className="text-lg font-bold text-white">Canlı Widget Önizlemesi</h2>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 shadow-xl sticky top-8">
            <div className="text-xs text-gray-500 mb-4 text-center">
              Telefon ana ekranında çalışan canlı widget kartı
            </div>

            {/* Countdown Widget Live Card */}
            <div className="bg-gradient-to-br from-[#18232C] via-[#141A20] to-[#12161A] border border-[#233544] rounded-2xl p-5 shadow-2xl relative overflow-hidden mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#4ECDC4]/20 flex items-center justify-center text-[#4ECDC4]">
                    <Clock size={16} />
                  </div>
                  <span className="text-xs font-bold text-white tracking-wide">
                    {title || '⏱️ Antrenmana Ne Kadar Kaldı?'}
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
                {customContent || 'Hedef Saat: ' + targetTime + ' • Günün antrenmanı seni bekliyor!'}
              </p>
            </div>

            {/* Motivation Quote Widget Card */}
            <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-1.5">
                <MessageSquare size={14} className="text-[#F59E0B]" />
                <span className="text-xs font-bold text-white">Günün Motivasyon Sözü</span>
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed">
                «Disiplin; ne istediğin ile şu an ne istediğin arasındaki bilinçli tercihtir.»
              </p>
            </div>
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

            <form onSubmit={handleSaveWidget} className="space-y-4">
              {/* Widget Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Widget Tipi *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  placeholder="Örn: ⏱️ Antrenmana Ne Kadar Kaldı?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                />
              </div>

              {/* Target Time (if countdown) */}
              {widgetType === 'countdown' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Geri Sayım Hedef Saati (HH:mm:ss) *
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full bg-[#222] border border-[#333] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#4ECDC4]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Sayaç her gün bu saate kadar saniyesi saniyesine canlı geri sayacaktır.
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
                  disabled={!title}
                  className="bg-[#4ECDC4] hover:bg-[#45B8B0] disabled:opacity-40 text-gray-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
                >
                  {editingWidget ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
