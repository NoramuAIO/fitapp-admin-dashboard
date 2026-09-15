import React, { useState } from 'react';
import { GripVertical, Edit2, Trash2 } from 'lucide-react';
import { Exercise } from './ExerciseSelectorModal';

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
    const [isDraggable, setIsDraggable] = useState(false);
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
                            placeholder="12"
                        />
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button onClick={handleSave} className="flex-1 bg-[#6366F1] hover:bg-[#5558DD] text-white py-2 rounded-lg text-sm font-medium transition-colors">Kaydet</button>
                    <button onClick={() => setIsEditing(false)} className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg text-sm font-medium transition-colors">İptal</button>
                </div>
            </div>
        );
    }

    return (
        <div
            draggable={isDraggable && !!onDragStart}
            onDragStart={onDragStart ? () => onDragStart(workoutId || exercise.programId || 0, exercise.id) : undefined}
            onDragOver={onDragOver ? (e) => onDragOver(e, workoutId || exercise.programId || 0, exercise.id) : undefined}
            onDragEnd={onDragEnd}
            onDrop={onDrop ? (e) => onDrop(e, workoutId || exercise.programId || 0, exercise.id) : undefined}
            className={`bg-[#0F0F0F] rounded-xl p-3 mb-2 flex items-center justify-between transition-all hover:bg-white/[0.02] ${isDragOver ? 'border-2 border-[#6366F1] border-dashed' : 'border border-[#2A2A2A]'} ${isDragged ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center space-x-3">
                <div 
                    className="text-gray-500 cursor-grab active:cursor-grabbing hover:text-white transition-colors p-1"
                    onMouseEnter={() => setIsDraggable(true)}
                    onMouseLeave={() => setIsDraggable(false)}
                    onMouseUp={() => setIsDraggable(false)}
                >
                    <GripVertical size={18} />
                </div>
                <div>
                    <div className="text-white text-sm font-bold mb-0.5">{exercise.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold bg-[#6366F1]/10 text-[#6366F1] px-2 py-0.5 rounded-md">{exercise.sets} set × {exercise.reps} tekrar</span>
                        {exercise.duration && <span className="text-xs text-gray-500">{exercise.duration}</span>}
                        {exercise.muscleGroup && <span className="text-xs font-medium text-gray-400 bg-[#2A2A2A] px-2 py-0.5 rounded-md">{exercise.muscleGroup}</span>}
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-1">
                <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-white hover:bg-[#2A2A2A] p-2 rounded-lg transition-colors">
                    <Edit2 size={16} />
                </button>
                <button onClick={handleDelete} className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}