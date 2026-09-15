import { useState } from 'react';
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
}

export default function ProgramItem({
    program,
    isCollapsed,
    onToggleCollapse,
    onDelete,
    onUpdate,
    onDeleteWorkout,
    onDeleteExercise
}: ProgramItemProps) {
    const [showAddWorkout, setShowAddWorkout] = useState(false);
    const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set());

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
            <div className="bg-dark-card rounded-2xl p-6 shadow-lg border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onToggleCollapse}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isCollapsed ? '' : 'rotate-90'}>
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                        <h3 className="text-xl font-bold text-white">{program.name}</h3>
                        {program.isPrimary && (
                            <span className="bg-primary-green/20 text-primary-green px-3 py-1 rounded-lg text-sm font-medium">
                                ⭐ Birincil
                            </span>
                        )}
                        <span className="bg-[#2A2A2A] text-gray-400 px-3 py-1 rounded-lg text-sm">
                            {workoutCount} antreman • {exerciseCount} hareket
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowAddWorkout(true)}
                            className="bg-[#6366F1] hover:bg-[#5558E3] text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            + Antreman
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