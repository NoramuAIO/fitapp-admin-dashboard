import React, { useState } from 'react';

interface AddExerciseFormProps {
    programId: number;
    onSuccess: () => Promise<void>;
    onCancel: () => void;
}

export default function AddExerciseForm({ programId, onSuccess, onCancel }: AddExerciseFormProps) {
    const [newExercise, setNewExercise] = useState({
        name: '',
        sets: 3,
        reps: 10,
        duration: '',
        description: '',
        imageUrl: ''
    });

    const handleAddExercise = async () => {
        if (!newExercise.name.trim()) {
            alert('Hareket adı gerekli');
            return;
        }

        try {
            const response = await fetch('/api/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programId,
                    ...newExercise,
                    orderIndex: 0,
                }),
            });

            if (response.ok) {
                await onSuccess();
                setNewExercise({ name: '', sets: 3, reps: 10, duration: '', description: '', imageUrl: '' });
            }
        } catch (error) {
            console.error('Error adding exercise:', error);
        }
    };

    return (
        <div className="mt-4 bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
            <h4 className="text-white font-medium mb-3">Yeni Hareket Ekle</h4>
            <div className="space-y-3">
                <input
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Hareket adı"
                />
                <div className="grid grid-cols-3 gap-3">
                    <input
                        type="number"
                        value={newExercise.sets}
                        onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) || 0 })}
                        className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Set"
                    />
                    <input
                        type="number"
                        value={newExercise.reps}
                        onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) || 0 })}
                        className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Tekrar"
                    />
                    <input
                        type="text"
                        value={newExercise.duration}
                        onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                        className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Süre"
                    />
                </div>
                <textarea
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                    className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Açıklama (opsiyonel)"
                    rows={2}
                />
                <input
                    type="text"
                    value={newExercise.imageUrl}
                    onChange={(e) => setNewExercise({ ...newExercise, imageUrl: e.target.value })}
                    className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Görsel URL (GIF veya resim linki)"
                />
                {newExercise.imageUrl && (
                    <div className="relative w-full h-48 bg-[#1A1A1A] rounded-lg overflow-hidden">
                        <img
                            src={newExercise.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Görsel+Yüklenemedi';
                            }}
                        />
                    </div>
                )}
                <div className="flex space-x-2">
                    <button
                        onClick={handleAddExercise}
                        className="flex-1 bg-[#5DD97C] hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                        Ekle
                    </button>
                    <button
                        onClick={() => {
                            setNewExercise({ name: '', sets: 3, reps: 10, duration: '', description: '', imageUrl: '' });
                            onCancel();
                        }}
                        className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg font-medium transition-colors"
                    >
                        İptal
                    </button>
                </div>
            </div>
        </div>
    );
}
