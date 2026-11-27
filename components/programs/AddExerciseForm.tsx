import { useState } from 'react';
import { apiFetch } from '@/lib/clientCache';
import {
    classifyExerciseByName,
    ExerciseTrackingType,
    formatDurationSeconds,
    parseDurationToSeconds,
    TRACKING_TYPE_LABELS,
} from '@/lib/exerciseTracking';

interface AddExerciseFormProps {
    workoutId?: number;
    programId?: number;
    onSuccess: () => Promise<void>;
    onCancel: () => void;
}

export default function AddExerciseForm({ workoutId, programId, onSuccess, onCancel }: AddExerciseFormProps) {
    const [newExercise, setNewExercise] = useState({
        name: '',
        sets: 3,
        reps: 10,
        duration: '',
        trackingType: 'weight_reps' as ExerciseTrackingType,
        durationSeconds: 45,
        description: '',
        imageUrl: '',
        muscleGroup: ''
    });
    const [manualMode, setManualMode] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleNameChange = (value: string) => {
        if (manualMode) {
            setNewExercise((prev) => ({ ...prev, name: value }));
            return;
        }
        const suggested = classifyExerciseByName(value, newExercise.duration);
        setNewExercise((prev) => ({
            ...prev,
            name: value,
            trackingType: suggested.trackingType,
            sets: suggested.defaultSets ?? (suggested.trackingType === 'duration_only' ? 1 : prev.sets || 3),
            reps: suggested.trackingType === 'weight_reps' ? (prev.reps > 0 ? prev.reps : 10) : 0,
            durationSeconds:
                suggested.defaultDurationSeconds ??
                (suggested.trackingType === 'duration_only' ? 600 : 45),
            duration:
                prev.duration ||
                suggested.defaultDuration ||
                (suggested.trackingType === 'weight_reps' ? '' : formatDurationSeconds(suggested.defaultDurationSeconds ?? 45, false)),
        }));
    };

    const handleTrackingChange = (nextType: ExerciseTrackingType) => {
        setManualMode(true);
        const defaultSec = nextType === 'duration_only' ? 600 : 45;
        setNewExercise((prev) => ({
            ...prev,
            trackingType: nextType,
            sets: nextType === 'duration_only' ? 1 : prev.sets > 0 ? prev.sets : 3,
            reps: nextType === 'weight_reps' ? (prev.reps > 0 ? prev.reps : 10) : 0,
            durationSeconds: prev.durationSeconds > 0 ? prev.durationSeconds : defaultSec,
            duration:
                nextType === 'weight_reps'
                    ? prev.duration
                    : prev.duration || formatDurationSeconds(defaultSec, false),
        }));
    };

    const handleAddExercise = async () => {
        if (!newExercise.name.trim()) {
            alert('Hareket adı gerekli');
            return;
        }

        setLoading(true);
        try {
            const parsedSec =
                parseDurationToSeconds(newExercise.duration) ??
                (newExercise.trackingType === 'weight_reps' ? null : newExercise.durationSeconds);

            const response = await apiFetch('/api/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workoutId,
                    programId,
                    name: newExercise.name.trim(),
                    sets: newExercise.trackingType === 'duration_only' ? 1 : newExercise.sets || 3,
                    reps: newExercise.trackingType === 'weight_reps' ? newExercise.reps || 10 : 0,
                    duration: newExercise.duration.trim() || null,
                    trackingType: newExercise.trackingType,
                    durationSeconds: parsedSec,
                    description: newExercise.description || null,
                    imageUrl: newExercise.imageUrl || null,
                    muscleGroup: newExercise.muscleGroup || null,
                }),
            });

            if (response.ok) {
                await onSuccess();
            } else {
                const errData = await response.json().catch(() => ({}));
                alert(errData.error || 'Hareket eklenemedi');
            }
        } catch (error) {
            console.error('Error adding exercise:', error);
            alert('Hareket eklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-3 bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
            <h5 className="text-white text-sm font-medium mb-3">Yeni Hareket Ekle</h5>
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Hareket adı"
                />
                <select
                    value={newExercise.trackingType}
                    onChange={(e) => handleTrackingChange(e.target.value as ExerciseTrackingType)}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    title="Takip Modu"
                >
                    {(Object.keys(TRACKING_TYPE_LABELS) as ExerciseTrackingType[]).map((mode) => (
                        <option key={mode} value={mode}>
                            {TRACKING_TYPE_LABELS[mode]}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    value={newExercise.muscleGroup}
                    onChange={(e) => setNewExercise({ ...newExercise, muscleGroup: e.target.value })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Kas grubu"
                />
                {newExercise.trackingType !== 'duration_only' && (
                    <input
                        type="number"
                        min={1}
                        value={newExercise.sets}
                        onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value, 10) || 1 })}
                        className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Set"
                    />
                )}
                {newExercise.trackingType === 'weight_reps' ? (
                    <input
                        type="number"
                        min={1}
                        value={newExercise.reps}
                        onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value, 10) || 0 })}
                        className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Tekrar"
                    />
                ) : null}
                <input
                    type="text"
                    value={newExercise.duration}
                    onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder={
                        newExercise.trackingType === 'duration_only'
                            ? 'Hedef Süre (ör: 15 dk)'
                            : newExercise.trackingType === 'sets_duration'
                                ? 'Set Süresi (ör: 45 sn)'
                                : 'Süre (opsiyonel)'
                    }
                />
                <input
                    type="text"
                    value={newExercise.imageUrl}
                    onChange={(e) => setNewExercise({ ...newExercise, imageUrl: e.target.value })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="GIF/Resim URL"
                />
            </div>
            <textarea
                value={newExercise.description}
                onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                className="w-full mt-3 bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                placeholder="Açıklama (opsiyonel)"
                rows={2}
            />
            <div className="flex space-x-2 mt-3">
                <button
                    onClick={handleAddExercise}
                    disabled={loading}
                    className="flex-1 bg-[#6366F1] hover:bg-[#5558E3] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    {loading ? 'Ekleniyor...' : '✓ Ekle'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 bg-[#2A2A2A] hover:bg-[#3A3A3A] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    İptal
                </button>
            </div>
        </div>
    );
}