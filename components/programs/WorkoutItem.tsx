import { useState } from 'react';
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
            className={`bg-[#1A1A1A] rounded-xl p-4 border transition-all ${isDragOver ? 'border-[#6366F1] border-dashed' : 'border-[#2A2A2A]'
                }`}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={() => setIsDragOver(false)}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onToggleCollapse}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isCollapsed ? 'rotate-0' : 'rotate-90'}>
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    <div>
                        <h4 className="text-white font-medium">{workout.name}</h4>
                        {workout.dayNumber && (
                            <span className="text-xs text-gray-500">Gün {workout.dayNumber}</span>
                        )}
                    </div>
                    <span className="bg-[#2A2A2A] text-gray-400 px-2 py-1 rounded-lg text-xs">
                        {workout.exercises.length} hareket
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onShowAddExercise}
                        className="text-[#6366F1] hover:text-[#818CF8] text-sm px-2 py-1"
                    >
                        + Hareket
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-red-500 hover:text-red-400 text-sm px-2 py-1"
                    >
                        Sil
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