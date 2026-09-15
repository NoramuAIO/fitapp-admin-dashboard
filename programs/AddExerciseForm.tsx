import { useState } from 'react';

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
        description: '',
        imageUrl: '',
        muscleGroup: ''
    });
    const [loading, setLoading] = useState(false);

    const handleAddExercise = async () => {
        if (!newExercise.name.trim()) {
            alert('Hareket adı gerekli');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workoutId,
                    programId,
                    ...newExercise,
                    orderIndex: 0,
                }),
            });

            if (response.ok) {
                await onSuccess();
            }
        } catch (error) {
            console.error('Error adding exercise:', error);
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
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Hareket adı"
                />
                <input
                    type="text"
                    value={newExercise.muscleGroup}
                    onChange={(e) => setNewExercise({ ...newExercise, muscleGroup: e.target.value })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Kas grubu"
                />
                <input
                    type="number"
                    value={newExercise.sets}
                    onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) || 0 })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Set"
                />
                <input
                    type="number"
                    value={newExercise.reps}
                    onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) || 0 })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Tekrar"
                />
                <input
                    type="text"
                    value={newExercise.duration}
                    onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                    className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Süre (dk)"
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