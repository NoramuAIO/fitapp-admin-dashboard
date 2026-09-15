import { useState } from 'react';
import { ChevronRight, Star, Plus, Trash2, GripVertical, User } from 'lucide-react';
import AddWorkoutModal from './AddWorkoutModal';
import { Program, Workout } from './ExerciseSelectorModal';
import WorkoutItem from './WorkoutItem';

interface ProgramItemProps {
    program: Program;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onDelete: () => Promise<void>;
    onUpdate: () => Promise<void>;
    onDeleteWorkout: (workoutId: number) => Promise<void>;
    onDeleteExercise: (workoutId: number, exerciseId: number) => Promise<void>;
    onDragStart?: () => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragEnd?: () => void;
    onDrop?: (e: React.DragEvent) => void;
    isDragged?: boolean;
    isDragOverTarget?: boolean;
}

export default function ProgramItem({
    program,
    isCollapsed,
    onToggleCollapse,
    onDelete,
    onUpdate,
    onDeleteWorkout,
    onDeleteExercise,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    isDragged,
    isDragOverTarget
}: ProgramItemProps) {
    const [showAddWorkout, setShowAddWorkout] = useState(false);
    const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set());
    const [isDraggable, setIsDraggable] = useState(false);

    const toggleWorkout = (workoutId: number) => {
        const newExpanded = new Set(expandedWorkouts);
        if (newExpanded.has(workoutId)) {
            newExpanded.delete(workoutId);
        } else {
            newExpanded.add(workoutId);
        }
        setExpandedWorkouts(newExpanded);
    };

    const workoutCount = program.workouts?.length || 0;
    const exerciseCount = program.workouts?.reduce((acc: number, w: Workout) => acc + (w.exercises?.length || 0), 0) || 0;

    return (
        <>
            <div 
                draggable={isDraggable}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
                className={`bg-[#141414] rounded-2xl p-6 shadow-lg border transition-all duration-300 ${isDragOverTarget ? 'border-t-2 border-t-[#6366F1] border-x-[#2A2A2A] border-b-[#2A2A2A] mt-[-2px] pt-[26px]' : 'border-[#2A2A2A]'} hover:border-[#3A3A3A] ${isDragged ? 'opacity-50' : ''}`}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <div 
                            className="text-gray-500 cursor-grab active:cursor-grabbing hover:text-white transition-colors p-1"
                            onMouseEnter={() => setIsDraggable(true)}
                            onMouseLeave={() => setIsDraggable(false)}
                            onMouseUp={() => setIsDraggable(false)}
                        >
                            <GripVertical size={20} />
                        </div>
                        <button
                            onClick={onToggleCollapse}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A1A1A] text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors shrink-0"
                        >
                            <ChevronRight size={18} className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-bold text-white">{program.name}</h3>
                                {program.isPrimary && (
                                    <span className="flex items-center gap-1 bg-[#5DD97C]/10 text-[#5DD97C] px-2.5 py-1 rounded-lg text-xs font-bold">
                                        <Star size={12} className="fill-[#5DD97C]" /> Birincil
                                    </span>
                                )}
                                {program.userId && (
                                    <span className="flex items-center gap-1 bg-[#6366F1]/10 text-[#6366F1] px-2.5 py-1 rounded-lg text-xs font-bold">
                                        <User size={12} /> Kişiye Özel
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 text-sm text-gray-400 font-medium">
                                <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 px-2.5 py-1 rounded-lg text-xs font-medium">
                                    {workoutCount} Antrenman
                                </span>
                                <span className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 px-2.5 py-1 rounded-lg text-xs font-medium">
                                    {exerciseCount} Hareket
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setShowAddWorkout(true)}
                            className="flex items-center gap-2 bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[#6366F1] px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                        >
                            <Plus size={16} /> Antrenman Ekle
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-2 bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/20 text-[#FF6B4A] px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                        >
                            <Trash2 size={16} /> Sil
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="space-y-3">
                        {program.workouts?.map((workout: Workout) => (
                            <WorkoutItem
                                key={workout.id}
                                workout={workout}
                                isCollapsed={!expandedWorkouts.has(workout.id)}
                                onToggleCollapse={() => toggleWorkout(workout.id)}
                                onDelete={() => onDeleteWorkout(workout.id)}
                                onUpdate={onUpdate}
                                onDeleteExercise={(exerciseId) => onDeleteExercise(workout.id, exerciseId)}
                                showAddExercise={false}
                                onShowAddExercise={() => {}}
                                onCloseAddExercise={() => {}}
                            />
                        ))}

                        {(!program.workouts || program.workouts.length === 0) && (
                            <div className="text-center py-8 text-gray-500">
                                <p>Bu programda henüz antreman yok.</p>
                                <p className="text-sm mt-1">Yukarıdaki "Antreman Ekle" butonuna tıklayarak başlayabilirsiniz.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showAddWorkout && (
                <AddWorkoutModal
                    isOpen={showAddWorkout}
                    onClose={() => setShowAddWorkout(false)}
                    onSuccess={async () => {
                        await onUpdate();
                        setShowAddWorkout(false);
                    }}
                    programId={program.id}
                    programName={program.name}
                />
            )}
        </>
    );
}