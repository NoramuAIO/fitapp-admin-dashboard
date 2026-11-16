import { useState } from 'react';
import { apiFetch } from '@/lib/clientCache';

interface AddWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
    programId: number;
    programName: string;
}

export default function AddWorkoutModal({ isOpen, onClose, onSuccess, programId, programName }: AddWorkoutModalProps) {
    const [workout, setWorkout] = useState({
        name: '',
        dayNumber: '',
        orderIndex: 0
    });
    const [loading, setLoading] = useState(false);

    const handleAddWorkout = async () => {
        const trimmedName = workout.name.trim();
        if (!trimmedName) {
            alert('Antreman adı gerekli');
            return;
        }

        const rawDay = workout.dayNumber.trim();
        let parsedDay: number | null = null;
        if (rawDay !== '') {
            const n = parseInt(rawDay, 10);
            if (!Number.isInteger(n) || n < 1) {
                alert('Gün numarası 1 veya daha büyük bir tam sayı olmalıdır');
                return;
            }
            parsedDay = n;
        }

        setLoading(true);
        try {
            const response = await apiFetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programId,
                    name: trimmedName,
                    dayNumber: parsedDay,
                    orderIndex: workout.orderIndex
                }),
            });

            if (response.ok) {
                await onSuccess();
                setWorkout({ name: '', dayNumber: '', orderIndex: 0 });
                onClose();
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.error || 'Antrenman eklenemedi');
            }
        } catch (error) {
            console.error('Error adding workout:', error);
            alert('Antrenman eklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setWorkout({ name: '', dayNumber: '', orderIndex: 0 });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] w-full max-w-md mx-4">
                <h3 className="text-xl font-bold text-white mb-2">Yeni Antreman Ekle</h3>
                <p className="text-gray-400 text-sm mb-4">
                    "{programName}" programına antreman ekliyorsunuz
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-2">Antreman Adı</label>
                        <input
                            type="text"
                            value={workout.name}
                            onChange={(e) => setWorkout({ ...workout, name: e.target.value })}
                            className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Örn: Pazartesi - Göğüs"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 mb-2">Gün Numarası (Opsiyonel)</label>
                        <input
                            type="number"
                            value={workout.dayNumber}
                            onChange={(e) => setWorkout({ ...workout, dayNumber: e.target.value })}
                            className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Örn: 1"
                        />
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={handleAddWorkout}
                            disabled={loading}
                            className="flex-1 bg-[#6366F1] hover:bg-[#5558E3] disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
                        >
                            {loading ? 'Ekleniyor...' : '✓ Ekle'}
                        </button>
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className="px-6 bg-[#2A2A2A] hover:bg-[#3A3A3A] disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}