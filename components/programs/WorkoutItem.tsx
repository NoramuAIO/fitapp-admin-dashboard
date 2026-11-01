import { useState } from 'react';
import { ChevronRight, Plus, Trash2, ListPlus } from 'lucide-react';
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
    showAddExercise?: boolean;
    onShowAddExercise?: () => void;
    onCloseAddExercise?: () => void;
    onOpenExerciseSelector?: () => void;
}

export default function WorkoutItem({
    workout,
    isCollapsed,
    onToggleCollapse,
    onDelete,
    onUpdate,
    onDeleteExercise,
    showAddExercise = false,
    onShowAddExercise,
    onCloseAddExercise,
    onOpenExerciseSelector
}: WorkoutItemProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [localShowAdd, setLocalShowAdd] = useState(false);

    const isAddFormVisible = showAddExercise || localShowAdd;

    const handleToggleAddForm = () => {
        if (isCollapsed) {
            onToggleCollapse();
        }
        if (isAddFormVisible) {
            onCloseAddExercise?.();
            setLocalShowAdd(false);
        } else {
            onShowAddExercise?.();
            setLocalShowAdd(true);
        }
    };

    const handleOpenSelector = () => {
        if (isCollapsed) {
            onToggleCollapse();
        }
        onOpenExerciseSelector?.();
    };

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
                            {workout.exercises?.length || 0} hareket
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Kütüphaneden Hareket Seç Butonu */}
                    {onOpenExerciseSelector && (
                        <button
                            onClick={handleOpenSelector}
                            className="flex items-center gap-1.5 bg-[#6366F1]/15 text-[#818CF8] hover:bg-[#6366F1]/25 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-[#6366F1]/30"
                            title="Kayıtlı hareketler arasından seçerek bu güne ekle"
                        >
                            <ListPlus size={14} /> Hareket Seç
                        </button>
                    )}

                    {/* Yeni Özel Hareket Ekle Butonu */}
                    <button
                        onClick={handleToggleAddForm}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                            isAddFormVisible
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                : 'bg-[#5DD97C]/15 text-[#5DD97C] border-[#5DD97C]/30 hover:bg-[#5DD97C]/25'
                        }`}
                        title="Bu antrenmana özel yeni bir hareket oluştur"
                    >
                        <Plus size={14} /> {isAddFormVisible ? 'Formu Kapat' : 'Yeni Hareket'}
                    </button>

                    {/* Sil Butonu */}
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-transparent hover:border-red-500/20"
                    >
                        <Trash2 size={14} /> Sil
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="space-y-2 pl-2 md:pl-8">
                    {/* Egzersiz Listesi */}
                    {workout.exercises && workout.exercises.length > 0 ? (
                        workout.exercises.map((exercise: Exercise) => (
                            <ExerciseItem
                                key={exercise.id}
                                workoutId={workout.id}
                                exercise={exercise}
                                onUpdate={onUpdate}
                                onDelete={async () => onDeleteExercise(exercise.id)}
                            />
                        ))
                    ) : (
                        !isAddFormVisible && (
                            <div className="py-5 text-center border border-dashed border-[#2A2A2A] rounded-xl text-gray-500 text-xs">
                                Bu antrenman gününde henüz hareket yok. Yukarıdaki{' '}
                                <button
                                    onClick={handleOpenSelector}
                                    className="text-[#818CF8] font-bold hover:underline"
                                >
                                    "Hareket Seç"
                                </button>{' '}
                                veya{' '}
                                <button
                                    onClick={handleToggleAddForm}
                                    className="text-[#5DD97C] font-bold hover:underline"
                                >
                                    "Yeni Hareket"
                                </button>{' '}
                                butonları ile hareket ekleyebilirsiniz.
                            </div>
                        )
                    )}

                    {/* Inline Yeni Hareket Ekle Formu */}
                    {isAddFormVisible && (
                        <AddExerciseForm
                            workoutId={workout.id}
                            programId={workout.programId}
                            onSuccess={async () => {
                                await onUpdate();
                                onCloseAddExercise?.();
                                setLocalShowAdd(false);
                            }}
                            onCancel={() => {
                                onCloseAddExercise?.();
                                setLocalShowAdd(false);
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
