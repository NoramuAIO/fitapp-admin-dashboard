import React, { useState } from 'react';

interface Exercise {
    id: number;
    name: string;
    sets: number;
    reps: number;
    duration?: string;
    description?: string;
    imageUrl?: string;
}

interface Program {
    id: number;
    name: string;
    isPrimary: boolean;
    exercises: Exercise[];
}

interface ExerciseSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    programId: number | null;
    programs: Program[];
    allExercises: Exercise[];
    onSuccess: () => Promise<void>;
}

export default function ExerciseSelectorModal({
    isOpen,
    onClose,
    programId,
    programs,
    allExercises,
    onSuccess
}: ExerciseSelectorModalProps) {
    const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);

    if (!isOpen || !programId) return null;

    const program = programs.find(p => p.id === programId);
    const availableExercises = allExercises.filter(exercise =>
        !program?.exercises.some(e => e.name === exercise.name)
    );

    const filteredExercises = availableExercises.filter(exercise =>
        exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
    );

    const toggleSelectAll = (exercises: Exercise[]) => {
        if (selectedExerciseIds.length === exercises.length) {
            setSelectedExerciseIds([]);
        } else {
            setSelectedExerciseIds(exercises.map(e => e.id));
        }
    };

    const toggleExerciseSelection = (exerciseId: number) => {
        setSelectedExerciseIds(prev =>
            prev.includes(exerciseId)
                ? prev.filter(id => id !== exerciseId)
                : [...prev, exerciseId]
        );
    };

    const handleAddSelectedExercises = async () => {
        if (selectedExerciseIds.length === 0) {
            alert('Lütfen en az bir hareket seçin');
            return;
        }

        let added = 0;
        let skipped = 0;

        for (const exerciseId of selectedExerciseIds) {
            const exercise = allExercises.find(e => e.id === exerciseId);
            if (!exercise) continue;

            if (program?.exercises.some(e => e.name === exercise.name)) {
                skipped++;
                continue;
            }

            try {
                const response = await fetch('/api/exercises', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        programId,
                        name: exercise.name,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        duration: exercise.duration,
                        description: exercise.description,
                        imageUrl: exercise.imageUrl,
                        orderIndex: 0,
                    }),
                });

                if (response.ok) {
                    added++;
                }
            } catch (error) {
                console.error('Error adding exercise:', error);
                skipped++;
            }
        }

        alert(`${added} hareket eklendi${skipped > 0 ? `, ${skipped} atlandı (zaten mevcut)` : ''}`);
        await onSuccess();
        handleClose();
    };

    const handleClose = () => {
        setSelectedExerciseIds([]);
        setExerciseSearchQuery('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
                <h3 className="text-xl font-bold text-white mb-4">Mevcut Hareketlerden Seç</h3>

                <div className="mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={exerciseSearchQuery}
                            onChange={(e) => setExerciseSearchQuery(e.target.value)}
                            placeholder="Hareket ara... (isim veya açıklama)"
                            className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 pl-11 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1] transition-colors"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            🔍
                        </span>
                        {exerciseSearchQuery && (
                            <button
                                onClick={() => setExerciseSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {exerciseSearchQuery && (
                        <p className="text-sm text-gray-400 mt-2">
                            {filteredExercises.length} hareket bulundu
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selectedExerciseIds.length === filteredExercises.length && filteredExercises.length > 0}
                            onChange={() => toggleSelectAll(filteredExercises)}
                            className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0F0F0F] checked:bg-[#6366F1]"
                        />
                        <span className="text-white font-medium">
                            Tümünü Seç ({selectedExerciseIds.length} / {filteredExercises.length})
                        </span>
                    </div>
                    <button
                        onClick={handleAddSelectedExercises}
                        disabled={selectedExerciseIds.length === 0}
                        className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-xl font-semibold transition-all"
                    >
                        Seçilenleri Ekle ({selectedExerciseIds.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredExercises.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            {exerciseSearchQuery
                                ? `"${exerciseSearchQuery}" için sonuç bulunamadı`
                                : 'Tüm hareketler bu programda zaten mevcut'
                            }
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {filteredExercises.map((exercise) => (
                                <div
                                    key={exercise.id}
                                    className={`bg-[#0F0F0F] rounded-xl p-4 border transition-all cursor-pointer ${selectedExerciseIds.includes(exercise.id)
                                            ? 'border-[#6366F1] bg-[#6366F1]/10'
                                            : 'border-[#2A2A2A] hover:border-[#6366F1]/50'
                                        }`}
                                    onClick={() => toggleExerciseSelection(exercise.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedExerciseIds.includes(exercise.id)}
                                            onChange={() => toggleExerciseSelection(exercise.id)}
                                            className="mt-1 w-5 h-5 rounded border-[#2A2A2A] bg-[#0F0F0F] checked:bg-[#6366F1]"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1">
                                            {exercise.imageUrl && (
                                                <div className="mb-3 rounded-lg overflow-hidden bg-[#1A1A1A]">
                                                    <img
                                                        src={exercise.imageUrl}
                                                        alt={exercise.name}
                                                        className="w-full h-32 object-contain"
                                                    />
                                                </div>
                                            )}
                                            <h4 className="text-white font-semibold mb-2">{exercise.name}</h4>
                                            {exercise.description && (
                                                <p className="text-sm text-gray-400 mb-2 line-clamp-2">{exercise.description}</p>
                                            )}
                                            <div className="flex gap-3 text-sm text-gray-400">
                                                <span>{exercise.sets} set</span>
                                                <span>•</span>
                                                <span>{exercise.reps} tekrar</span>
                                                {exercise.duration && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{exercise.duration}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                    <button
                        onClick={handleAddSelectedExercises}
                        disabled={selectedExerciseIds.length === 0}
                        className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-semibold transition-all"
                    >
                        Seçilenleri Ekle ({selectedExerciseIds.length})
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl font-semibold transition-all"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
