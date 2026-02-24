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

interface ExerciseItemProps {
    programId: number;
    exercise: Exercise;
    onUpdate: () => Promise<void>;
    onDelete: () => Promise<void>;
    onDragStart: (programId: number, exerciseId: number) => void;
    onDragOver: (e: React.DragEvent, programId: number, exerciseId: number) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, programId: number, exerciseId: number) => void;
    isDragged: boolean;
    isDragOver: boolean;
}

export default function ExerciseItem({
    programId,
    exercise,
    onUpdate,
    onDelete,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    isDragged,
    isDragOver
}: ExerciseItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Exercise>({ ...exercise });

    const handleSave = async () => {
        try {
            const response = await fetch(`/api/exercises/${exercise.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    sets: editForm.sets,
                    reps: editForm.reps,
                    duration: editForm.duration,
                    description: editForm.description,
                    imageUrl: editForm.imageUrl,
                }),
            });

            if (response.ok) {
                await onUpdate();
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error updating exercise:', error);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                <h4 className="text-white font-medium mb-3">Hareketi Düzenle</h4>
                <div className="space-y-3">
                    <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Hareket adı"
                    />
                    <div className="grid grid-cols-3 gap-3">
                        <input
                            type="number"
                            value={editForm.sets}
                            onChange={(e) => setEditForm({ ...editForm, sets: parseInt(e.target.value) || 0 })}
                            className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Set"
                        />
                        <input
                            type="number"
                            value={editForm.reps}
                            onChange={(e) => setEditForm({ ...editForm, reps: parseInt(e.target.value) || 0 })}
                            className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Tekrar"
                        />
                        <input
                            type="text"
                            value={editForm.duration || ''}
                            onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                            className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Süre"
                        />
                    </div>
                    <input
                        type="text"
                        value={editForm.imageUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                        className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Görsel URL (GIF veya resim linki)"
                    />
                    {editForm.imageUrl && (
                        <div className="relative w-full h-48 bg-[#1A1A1A] rounded-lg overflow-hidden">
                            <img
                                src={editForm.imageUrl}
                                alt="Preview"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Görsel+Yüklenemedi';
                                }}
                            />
                        </div>
                    )}
                    <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        placeholder="Açıklama (opsiyonel)"
                        rows={2}
                    />
                    <div className="flex space-x-2">
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-[#5DD97C] hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
                        >
                            Kaydet
                        </button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setEditForm({ ...exercise }); // reset back
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

    return (
        <div
            draggable
            onDragStart={() => onDragStart(programId, exercise.id)}
            onDragOver={(e) => onDragOver(e, programId, exercise.id)}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, programId, exercise.id)}
            className={`bg-[#0F0F0F] rounded-xl p-4 hover:bg-[#1A1A1A] transition-all cursor-move ${isDragOver ? 'border-2 border-[#6366F1] border-dashed' : ''
                } ${isDragged ? 'opacity-50' : ''
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="text-gray-500 cursor-grab active:cursor-grabbing">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <circle cx="7" cy="5" r="1.5" />
                            <circle cx="13" cy="5" r="1.5" />
                            <circle cx="7" cy="10" r="1.5" />
                            <circle cx="13" cy="10" r="1.5" />
                            <circle cx="7" cy="15" r="1.5" />
                            <circle cx="13" cy="15" r="1.5" />
                        </svg>
                    </div>

                    {exercise.imageUrl && (
                        <div className="w-24 h-24 bg-[#1A1A1A] rounded-lg overflow-hidden flex-shrink-0">
                            <img
                                src={exercise.imageUrl}
                                alt={exercise.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                    <div className="flex-1">
                        <h4 className="text-white font-medium mb-2">{exercise.name}</h4>
                        <div className="flex items-center flex-wrap gap-2 text-sm">
                            <span className="bg-[#5DD97C]/20 text-[#5DD97C] px-3 py-1 rounded-lg">
                                {exercise.sets} Set
                            </span>
                            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg">
                                {exercise.reps} Tekrar
                            </span>
                            {exercise.duration && (
                                <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-lg">
                                    {exercise.duration}
                                </span>
                            )}
                        </div>
                        {exercise.description && (
                            <p className="text-gray-500 text-sm mt-2">{exercise.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}
