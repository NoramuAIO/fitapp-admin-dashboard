import React, { useState } from 'react';
import { GripVertical, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Exercise } from './ExerciseSelectorModal';

interface ExerciseItemProps {
    workoutId?: number;
    programId?: number;
    exercise: Exercise;
    index?: number;
    totalExercises?: number;
    onUpdate: () => Promise<void>;
    onDelete: () => Promise<void>;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDragStart?: (workoutId: number, exerciseId: number) => void;
    onDragOver?: (e: React.DragEvent, workoutId: number, exerciseId: number) => void;
    onDragEnd?: () => void;
    onDrop?: (e: React.DragEvent, workoutId: number, exerciseId: number) => void;
    isDragged?: boolean;
    isDragOver?: boolean;
}

export default function ExerciseItem({
    workoutId,
    exercise,
    index,
    totalExercises,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    isDragged,
    isDragOver
}: ExerciseItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDraggable, setIsDraggable] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editData, setEditData] = useState({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        duration: exercise.duration || '',
        description: exercise.description || '',
        muscleGroup: exercise.muscleGroup || ''
    });

    const handleSave = async () => {
        try {
            const response = await fetch(`/api/exercises/${exercise.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                await onUpdate();
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error updating exercise:', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#6366F1] shadow-lg mb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Hareket Adı</label>
                        <input
                            type="text"
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                            placeholder="Hareket adı"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Kas Grubu</label>
                        <input
                            type="text"
                            value={editData.muscleGroup}
                            onChange={(e) => setEditData({ ...editData, muscleGroup: e.target.value })}
                            className="w-full bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                            placeholder="Örn: Göğüs, Sırt"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Set</label>
                        <input
                            type="number"
                            value={editData.sets}
                            onChange={(e) => setEditData({ ...editData, sets: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                            placeholder="3"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Tekrar</label>
                        <input
                            type="number"
                            value={editData.reps}
                            onChange={(e) => setEditData({ ...editData, reps: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                            placeholder="10"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Süre</label>
                        <input
                            type="text"
                            value={editData.duration}
                            onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                            className="w-full bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                            placeholder="Örn: 60 saniye"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Açıklama</label>
                        <input
                            type="text"
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="w-full bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
                            placeholder="Notlar veya açıklama"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-[#2A2A2A] hover:bg-[#333]"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#6366F1] hover:bg-[#5558DD]"
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            draggable={isDraggable}
            onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(exercise.id));
                workoutId && onDragStart?.(workoutId, exercise.id);
            }}
            onDragOver={(e) => workoutId && onDragOver?.(e, workoutId, exercise.id)}
            onDragEnd={onDragEnd}
            onDrop={(e) => workoutId && onDrop?.(e, workoutId, exercise.id)}
            className={`flex items-center justify-between p-3 rounded-xl bg-[#222222] border transition-all ${
                isDragOver ? 'border-[#6366F1] bg-[#6366F1]/10 scale-[1.01]' : 'border-[#2E2E2E]'
            } hover:border-[#3E3E3E] ${isDragged ? 'opacity-40 border-dashed border-[#6366F1]' : ''}`}
        >
            <div className="flex items-center gap-3">
                {/* Drag Handle & Up/Down Arrows */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <div
                        className="text-gray-500 hover:text-gray-200 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/5 transition-colors"
                        onMouseEnter={() => setIsDraggable(true)}
                        onMouseLeave={() => setIsDraggable(false)}
                        title="Sürükleyip bırakarak sırayı değiştirin"
                    >
                        <GripVertical size={16} />
                    </div>

                    {/* Move Up / Down Buttons */}
                    <div className="flex flex-col">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveUp?.();
                            }}
                            disabled={index === undefined || index === 0}
                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 rounded transition-colors"
                            title="Yukarı taşı"
                        >
                            <ChevronUp size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveDown?.();
                            }}
                            disabled={index === undefined || totalExercises === undefined || index >= totalExercises - 1}
                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10 rounded transition-colors"
                            title="Aşağı taşı"
                        >
                            <ChevronDown size={13} />
                        </button>
                    </div>

                    {/* Order Index Badge */}
                    {index !== undefined && (
                        <span className="text-[11px] font-mono font-bold text-gray-400 bg-black/40 border border-white/5 px-1.5 py-0.5 rounded min-w-[20px] text-center">
                            {index + 1}
                        </span>
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{exercise.name}</span>
                        {exercise.muscleGroup && (
                            <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/5">
                                {exercise.muscleGroup}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
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

            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    title="Düzenle"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="Sil"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}
