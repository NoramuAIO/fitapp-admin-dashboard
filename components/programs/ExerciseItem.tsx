import React, { useState } from 'react';

interface Exercise {
    id: number;
    name: string;
    sets: number;
    reps: number;
    duration?: string;
    description?: string;
    imageUrl?: string;
    muscleGroup?: string;
    orderIndex: number;
}

interface ExerciseItemProps {
    workoutId?: number;
    programId?: number;
    exercise: Exercise;
    onUpdate: () => Promise<void>;
    onDelete: () => Promise<void>;
    onDragStart?: (programId: number, exerciseId: number) => void;
    onDragOver?: (e: React.DragEvent, programId: number, exerciseId: number) => void;
    onDragEnd?: () => void;
    onDrop?: (e: React.DragEvent, targetProgramId: number, targetExerciseId: number) => void;
    isDragged?: boolean;
    isDragOver?: boolean;
}

export default function ExerciseItem({
    workoutId,
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

    const handleDelete = async () => {
        if (!confirm(`"${exercise.name}" hareketini silmek istediğinizden emin misiniz?`)) {
            return;
        }
        await onDelete();
    };

    if (isEditing) {
        return (
            <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#6366F1]">
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="bg-[#1A1A1A] text-white rounded px-2 py-1 text-sm"
                        placeholder="Hareket adı"
                    />
                    <input
                        type="text"
                        value={editData.muscleGroup}
                        onChange={(e) => setEditData({ ...editData, muscleGroup: e.target.value })}
                        className="bg-[#1A1A1A] text-white rounded px-2 py-1 text-sm"
                        placeholder="Kas grubu"
                    />
                    <input
                        type="number"
                        value={editData.sets}
                        onChange={(e) => setEditData({ ...editData, sets: parseInt(e.target.value) || 0 })}
                        className="bg-[#1A1A1A] text-white rounded px-2 py-1 text-sm"
                        placeholder="Set"
                    />
                    <input
                        type="number"
                        value={editData.reps}
                        onChange={(e) => setEditData({ ...editData, reps: parseInt(e.target.value) || 0 })}
                        className="bg-[#1A1A1A] text-white rounded px-2 py-1 text-sm"
                        placeholder="Tekrar"
                    />
                </div>
                <div className="flex space-x-2">
                    <button onClick={handleSave} className="flex-1 bg-[#6366F1] text-white py-1 rounded text-sm">Kaydet</button>
                    <button onClick={() => setIsEditing(false)} className="px-3 bg-[#2A2A2A] text-white py-1 rounded text-sm">İptal</button>
                </div>
            </div>
        );
    }

    return (
        <div
            draggable={!!onDragStart}
            onDragStart={onDragStart ? () => onDragStart(workoutId || exercise.programId || 0, exercise.id) : undefined}
            onDragOver={onDragOver ? (e) => onDragOver(e, workoutId || exercise.programId || 0, exercise.id) : undefined}
            onDragEnd={onDragEnd}
            onDrop={onDrop ? (e) => onDrop(e, workoutId || exercise.programId || 0, exercise.id) : undefined}
            className={`bg-[#0F0F0F] rounded-lg p-3 flex items-center justify-between transition-all ${isDragOver ? 'border-2 border-[#6366F1] border-dashed' : ''} ${isDragged ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center space-x-3">
                <div className="text-gray-500 cursor-grab active:cursor-grabbing">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="8" cy="6" r="2" />
                        <circle cx="16" cy="6" r="2" />
                        <circle cx="8" cy="12" r="2" />
                        <circle cx="16" cy="12" r="2" />
                        <circle cx="8" cy="18" r="2" />
                        <circle cx="16" cy="18" r="2" />
                    </svg>
                </div>
                <div>
                    <div className="text-white text-sm font-medium">{exercise.name}</div>
                    <div className="text-gray-500 text-xs">
                        {exercise.sets} set × {exercise.reps} tekrar
                        {exercise.duration && ` • ${exercise.duration}`}
                        {exercise.muscleGroup && ` • ${exercise.muscleGroup}`}
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
                <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}