import { useState } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import AddExerciseForm from './AddExerciseForm';
import ExerciseItem from './ExerciseItem';
import { Exercise, Workout } from './ExerciseSelectorModal';

interface WorkoutItemProps {
    workout: Workout;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onDelete: () => Promise<void>;
    onUpdate: () => Promise<void>;
    onDeleteExercise: (exerciseId: number) => Promise<void>;
    showAddExercise: boolean;
    onShowAddExercise: () => void;
    onCloseAddExercise: () => void;
}

export default function WorkoutItem({
    workout,
    isCollapsed,
    onToggleCollapse,
    onDelete,
    onUpdate,
    onDeleteExercise,
    showAddExercise,
    onShowAddExercise,
    onCloseAddExercise
}: WorkoutItemProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className={`bg-[#1A1A1A] rounded-2xl p-5 border transition-all ${isDragOver ? 'border-[#6366F1] border-dashed' : 'border-[#2A2A2A]'}`}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={() => setIsDragOver(false)}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onToggleCollapse}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#3A3A3A] transition-colors shrink-0"
                    >
                        <ChevronRight size={16} className={`transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-white font-bold">{workout.name}</h4>
                            {workout.dayNumber && (
                                <span className="text-xs font-semibold bg-white/5 text-gray-400 px-2 py-0.5 rounded-md border border-white/10">Gün {workout.dayNumber}</span>
                            )}
                        </div>
                        <span className="text-xs text-gray-500 mt-0.5 block">
                            {workout.exercises.length} hareket
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onShowAddExercise}
                        className="flex items-center gap-1.5 text-[#6366F1] hover:text-[#818CF8] hover:bg-[#6366F1]/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={14} /> Hareket
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Trash2 size={14} /> Sil
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="space-y-2 pl-8">
                    {workout.exercises.map((exercise: Exercise) => (
                        <ExerciseItem
                            key={exercise.id}
                            workoutId={workout.id}
                            exercise={exercise}
                            onUpdate={onUpdate}
                            onDelete={async () => onDeleteExercise(exercise.id)}
                        />
                    ))}

                    {showAddExercise && (
                        <AddExerciseForm
                            workoutId={workout.id}
                            programId={workout.programId}
                            onSuccess={async () => {
                                await onUpdate();
                                onCloseAddExercise();
                            }}
                            onCancel={onCloseAddExercise}
                        />
                    )}
                </div>
            )}
        </div>
    );
}