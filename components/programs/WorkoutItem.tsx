import { useState, useEffect } from 'react';
import { ChevronRight, Plus, Trash2, ListPlus, Edit2, Check, X } from 'lucide-react';
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [localExercises, setLocalExercises] = useState<Exercise[]>(workout.exercises || []);
    const [draggedExerciseId, setDraggedExerciseId] = useState<number | null>(null);
    const [dragOverExerciseId, setDragOverExerciseId] = useState<number | null>(null);
    const [isReordering, setIsReordering] = useState(false);

    // Workout Name Editing state
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(workout.name || '');
    const [dayNumberInput, setDayNumberInput] = useState(workout.dayNumber ? String(workout.dayNumber) : '');
    const [isSavingName, setIsSavingName] = useState(false);

    useEffect(() => {
        setLocalExercises(workout.exercises || []);
    }, [workout.exercises]);

    useEffect(() => {
        setNameInput(workout.name || '');
        setDayNumberInput(workout.dayNumber ? String(workout.dayNumber) : '');
    }, [workout.name, workout.dayNumber]);

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

    const handleSaveWorkoutName = async () => {
        const trimmed = nameInput.trim();
        if (!trimmed) return;
        setIsSavingName(true);
        try {
            const response = await fetch('/api/workouts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: workout.id,
                    name: trimmed,
                    dayNumber: dayNumberInput.trim() ? parseInt(dayNumberInput.trim(), 10) : null,
                }),
            });

            if (response.ok) {
                setIsEditingName(false);
                await onUpdate();
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.error || 'Antreman adı güncellenemedi');
            }
        } catch (error) {
            console.error('Error updating workout name:', error);
            alert('Antreman adı güncellenirken bir hata oluştu');
        } finally {
            setIsSavingName(false);
        }
    };

    const handleCancelEditName = () => {
        setNameInput(workout.name || '');
        setDayNumberInput(workout.dayNumber ? String(workout.dayNumber) : '');
        setIsEditingName(false);
    };

    const handleReorder = async (newExercises: Exercise[]) => {
        setLocalExercises(newExercises);
        setIsReordering(true);
        try {
            const reorderPayload = newExercises.map((ex, index) => ({
                id: ex.id,
                orderIndex: index,
                workoutId: workout.id,
            }));

            const response = await fetch('/api/exercises/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exercises: reorderPayload }),
            });

            if (!response.ok) {
                // Fallback to individual updates
                await Promise.all(
                    newExercises.map((ex, index) =>
                        fetch(`/api/exercises/${ex.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderIndex: index }),
                        })
                    )
                );
            }
            await onUpdate();
        } catch (error) {
            console.error('Error reordering exercises:', error);
            await onUpdate();
        } finally {
            setIsReordering(false);
            setDraggedExerciseId(null);
            setDragOverExerciseId(null);
        }
    };

    const handleMoveExercise = async (currentIndex: number, direction: 'up' | 'down') => {
        if (isReordering) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= localExercises.length) return;

        const newExercises = [...localExercises];
        const [moved] = newExercises.splice(currentIndex, 1);
        newExercises.splice(targetIndex, 0, moved);

        await handleReorder(newExercises);
    };

    const handleDragStart = (workoutId: number, exerciseId: number) => {
        setDraggedExerciseId(exerciseId);
    };

    const handleDragOver = (e: React.DragEvent, workoutId: number, exerciseId: number) => {
        e.preventDefault();
        if (draggedExerciseId !== exerciseId) {
            setDragOverExerciseId(exerciseId);
        }
    };

    const handleDragEnd = () => {
        setDraggedExerciseId(null);
        setDragOverExerciseId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetWorkoutId: number, targetExerciseId: number) => {
        e.preventDefault();
        e.stopPropagation();

        const rawExerciseId = draggedExerciseId || (e.dataTransfer ? parseInt(e.dataTransfer.getData('text/plain'), 10) : null);

        if (!rawExerciseId || rawExerciseId === targetExerciseId) {
            setDraggedExerciseId(null);
            setDragOverExerciseId(null);
            return;
        }

        const draggedIndex = localExercises.findIndex((ex) => ex.id === rawExerciseId);
        const targetIndex = localExercises.findIndex((ex) => ex.id === targetExerciseId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedExerciseId(null);
            setDragOverExerciseId(null);
            return;
        }

        const newExercises = [...localExercises];
        const [removed] = newExercises.splice(draggedIndex, 1);
        newExercises.splice(targetIndex, 0, removed);

        await handleReorder(newExercises);
    };

    return (
        <div
            className={`bg-[#1A1A1A] rounded-2xl p-5 border transition-all ${isDragOver ? 'border-[#6366F1] border-dashed' : 'border-[#2A2A2A]'}`}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={async (e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (draggedExerciseId) {
                    const draggedIndex = localExercises.findIndex((ex) => ex.id === draggedExerciseId);
                    if (draggedIndex !== -1 && draggedIndex !== localExercises.length - 1) {
                        const newExercises = [...localExercises];
                        const [removed] = newExercises.splice(draggedIndex, 1);
                        newExercises.push(removed);
                        await handleReorder(newExercises);
                    }
                }
            }}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onToggleCollapse}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#3A3A3A] transition-colors shrink-0"
                    >
                        <ChevronRight size={16} className={`transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} />
                    </button>

                    {isEditingName ? (
                        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                className="bg-[#0F0F0F] border border-[#6366F1] text-white rounded-lg px-2.5 py-1 text-sm font-semibold focus:outline-none min-w-[170px]"
                                placeholder="Antreman adı"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveWorkoutName();
                                    if (e.key === 'Escape') handleCancelEditName();
                                }}
                            />
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">Gün:</span>
                                <input
                                    type="number"
                                    value={dayNumberInput}
                                    onChange={(e) => setDayNumberInput(e.target.value)}
                                    className="bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg px-2 py-1 text-xs w-14 text-center focus:border-[#6366F1] focus:outline-none"
                                    placeholder="1"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveWorkoutName();
                                        if (e.key === 'Escape') handleCancelEditName();
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSaveWorkoutName}
                                disabled={isSavingName || !nameInput.trim()}
                                className="flex items-center gap-1 bg-[#6366F1] hover:bg-[#5558DD] text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                title="Kaydet (Enter)"
                            >
                                <Check size={13} /> {isSavingName ? '...' : 'Kaydet'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelEditName}
                                disabled={isSavingName}
                                className="flex items-center gap-1 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 hover:text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                title="İptal (Esc)"
                            >
                                <X size={13} /> İptal
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold">{workout.name}</h4>
                                {workout.dayNumber && (
                                    <span className="text-xs font-semibold bg-white/5 text-gray-400 px-2 py-0.5 rounded-md border border-white/10">Gün {workout.dayNumber}</span>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditingName(true);
                                    }}
                                    className="p-1 text-gray-500 hover:text-white rounded hover:bg-white/10 transition-colors"
                                    title="Antreman Adını Değiştir"
                                >
                                    <Edit2 size={13} />
                                </button>
                            </div>
                            <span className="text-xs text-gray-500 mt-0.5 block">
                                {localExercises.length} hareket
                            </span>
                        </div>
                    )}
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
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-transparent hover:border-red-500/20 disabled:opacity-50"
                    >
                        <Trash2 size={14} /> Sil
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="space-y-2 pl-2 md:pl-8">
                    {/* Egzersiz Listesi */}
                    {localExercises.length > 0 ? (
                        localExercises.map((exercise: Exercise, idx: number) => (
                            <ExerciseItem
                                key={exercise.id}
                                index={idx}
                                totalExercises={localExercises.length}
                                workoutId={workout.id}
                                exercise={exercise}
                                onUpdate={onUpdate}
                                onDelete={async () => onDeleteExercise(exercise.id)}
                                onMoveUp={() => handleMoveExercise(idx, 'up')}
                                onMoveDown={() => handleMoveExercise(idx, 'down')}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                                onDrop={handleDrop}
                                isDragged={draggedExerciseId === exercise.id}
                                isDragOver={dragOverExerciseId === exercise.id}
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
