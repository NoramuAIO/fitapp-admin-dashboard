import React from 'react';
import ExerciseItem from './ExerciseItem';
import AddExerciseForm from './AddExerciseForm';

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

interface ProgramItemProps {
    program: Program;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onDelete: () => void;
    onDragStart: (programId: number) => void;
    onDragOver: (e: React.DragEvent, programId: number) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, programId: number) => void;
    isDragged: boolean;
    isDragOver: boolean;

    // Exercise related
    onUpdate: () => Promise<void>;
    onDeleteExercise: (programId: number, exerciseId: number) => Promise<void>;

    showAddExercise: boolean;
    onShowAddExercise: () => void;
    onCloseAddExercise: () => void;
    onOpenExerciseSelector: () => void;

    // Exercise drag and drop
    exerciseDragStart: (programId: number, exerciseId: number) => void;
    exerciseDragOver: (e: React.DragEvent, programId: number, exerciseId: number) => void;
    exerciseDragEnd: () => void;
    exerciseDrop: (e: React.DragEvent, targetProgramId: number, targetExerciseId: number) => void;
    draggedExercise: { programId: number; exerciseId: number } | null;
    dragOverExercise: { programId: number; exerciseId: number } | null;
}

export default function ProgramItem({
    program,
    isCollapsed,
    onToggleCollapse,
    onDelete,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    isDragged,
    isDragOver,
    onUpdate,
    onDeleteExercise,
    showAddExercise,
    onShowAddExercise,
    onCloseAddExercise,
    onOpenExerciseSelector,
    exerciseDragStart,
    exerciseDragOver,
    exerciseDragEnd,
    exerciseDrop,
    draggedExercise,
    dragOverExercise
}: ProgramItemProps) {

    return (
        <div
            draggable
            onDragStart={() => onDragStart(program.id)}
            onDragOver={(e) => onDragOver(e, program.id)}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, program.id)}
            className={`bg-dark-card rounded-2xl p-6 shadow-lg transition-all ${isDragOver ? 'border-2 border-[#6366F1] border-dashed' : ''
                } ${isDragged ? 'opacity-50' : ''
                }`}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <div className="text-gray-500 cursor-grab active:cursor-grabbing">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="8" cy="6" r="2" />
                            <circle cx="16" cy="6" r="2" />
                            <circle cx="8" cy="12" r="2" />
                            <circle cx="16" cy="12" r="2" />
                            <circle cx="8" cy="18" r="2" />
                            <circle cx="16" cy="18" r="2" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold text-white">{program.name}</h3>
                    {program.isPrimary && (
                        <span className="bg-primary-green/20 text-primary-green px-3 py-1 rounded-lg text-sm font-medium">
                            ⭐ Birincil
                        </span>
                    )}

                    <span className="bg-[#2A2A2A] text-gray-400 px-3 py-1 rounded-lg text-sm">
                        {program.exercises.length} Hareket
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onToggleCollapse}
                        className="bg-dark-hover hover:bg-dark-border text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        {isCollapsed ? '👁️ Göster' : '🙈 Gizle'}
                    </button>

                    <button className="bg-dark-hover hover:bg-dark-border text-white px-4 py-2 rounded-lg transition-colors">
                        ✏️ Düzenle
                    </button>
                    <button
                        onClick={onDelete}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-500 px-4 py-2 rounded-lg transition-colors"
                    >
                        🗑️ Sil
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="space-y-3">
                    {program.exercises.map((exercise) => (
                        <ExerciseItem
                            key={exercise.id}
                            programId={program.id}
                            exercise={exercise}
                            onUpdate={onUpdate}
                            onDelete={async () => onDeleteExercise(program.id, exercise.id)}
                            onDragStart={exerciseDragStart}
                            onDragOver={exerciseDragOver}
                            onDragEnd={exerciseDragEnd}
                            onDrop={exerciseDrop}
                            isDragged={draggedExercise?.exerciseId === exercise.id && draggedExercise?.programId === program.id}
                            isDragOver={dragOverExercise?.exerciseId === exercise.id && dragOverExercise?.programId === program.id}
                        />
                    ))}
                </div>
            )}

            {!isCollapsed && (
                <>
                    {showAddExercise ? (
                        <AddExerciseForm
                            programId={program.id}
                            onSuccess={async () => {
                                await onUpdate();
                                onCloseAddExercise();
                            }}
                            onCancel={onCloseAddExercise}
                        />
                    ) : (
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={onShowAddExercise}
                                className="flex-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-400 hover:text-white py-3 rounded-xl transition-colors border-2 border-dashed border-[#2A2A2A]"
                            >
                                + Yeni Hareket Ekle
                            </button>
                            <button
                                onClick={onOpenExerciseSelector}
                                className="flex-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-400 hover:text-white py-3 rounded-xl transition-colors border border-[#2A2A2A]"
                            >
                                📋 Mevcut Hareketlerden Seç
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
