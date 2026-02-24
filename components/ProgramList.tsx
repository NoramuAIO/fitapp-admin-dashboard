'use client'

import { useEffect, useState } from 'react'
import ImportModal from './programs/ImportModal'
import AddProgramModal from './programs/AddProgramModal'
import ExerciseSelectorModal from './programs/ExerciseSelectorModal'
import ProgramItem from './programs/ProgramItem'
import ActivityCards from './programs/ActivityCards'

interface Exercise {
  id: number
  name: string
  sets: number
  reps: number
  duration?: string
  description?: string
  imageUrl?: string
}

interface Program {
  id: number
  name: string
  isPrimary: boolean
  exercises: Exercise[]
}

export default function ProgramList() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [collapsedPrograms, setCollapsedPrograms] = useState<Set<number>>(new Set())

  // Modals state
  const [showAddProgram, setShowAddProgram] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)

  // Selection state
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null)
  const [showAddExercise, setShowAddExercise] = useState<number | null>(null)

  // Drag state - Programs
  const [draggedProgram, setDraggedProgram] = useState<number | null>(null)
  const [dragOverProgram, setDragOverProgram] = useState<number | null>(null)

  // Drag state - Exercises
  const [draggedExercise, setDraggedExercise] = useState<{ programId: number; exerciseId: number } | null>(null)
  const [dragOverExercise, setDragOverExercise] = useState<{ programId: number; exerciseId: number } | null>(null)

  useEffect(() => {
    fetchPrograms()
    fetchAllExercises()
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/programs')
      const data = await response.json()
      setPrograms(data)
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllExercises = async () => {
    try {
      const response = await fetch('/api/exercises')
      const data = await response.json()
      setAllExercises(data)
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

  const handleDeleteProgram = async (id: number) => {
    if (!confirm('Bu programı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/programs/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setPrograms(programs.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting program:', error)
    }
  }

  const handleDeleteExercise = async (programId: number, exerciseId: number) => {
    if (!confirm('Bu hareketi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchPrograms(); // Re-fetch to get correct ordering and state from backend
      }
    } catch (error) {
      console.error('Error deleting exercise:', error)
    }
  }

  const handleExport = async (format: 'json' | 'csv', type: 'all' | 'programs' | 'exercises') => {
    try {
      const response = await fetch(`/api/export?format=${format}&type=${type}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitness-data-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Dışa aktarma başarısız oldu');
    }
  }

  // --- Program Drag & Drop ---
  const handleProgramDragStart = (programId: number) => {
    setDraggedProgram(programId);
  }

  const handleProgramDragOver = (e: React.DragEvent, programId: number) => {
    e.preventDefault();
    setDragOverProgram(programId);
  }

  const handleProgramDragEnd = () => {
    setDraggedProgram(null);
    setDragOverProgram(null);
  }

  const handleProgramDrop = async (e: React.DragEvent, targetProgramId: number) => {
    e.preventDefault();

    if (!draggedProgram) return;
    if (draggedProgram === targetProgramId) return;

    const draggedIndex = programs.findIndex(p => p.id === draggedProgram);
    const targetIndex = programs.findIndex(p => p.id === targetProgramId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newPrograms = [...programs];
    const [removed] = newPrograms.splice(draggedIndex, 1);
    newPrograms.splice(targetIndex, 0, removed);

    setPrograms(newPrograms);

    try {
      for (let i = 0; i < newPrograms.length; i++) {
        await fetch(`/api/programs/${newPrograms[i].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newPrograms[i],
            orderIndex: i,
          }),
        });
      }
    } catch (error) {
      console.error('Error updating program order:', error);
      await fetchPrograms();
    }

    setDraggedProgram(null);
    setDragOverProgram(null);
  }

  // --- Exercise Drag & Drop ---
  const handleDragStart = (programId: number, exerciseId: number) => {
    setDraggedExercise({ programId, exerciseId });
  }

  const handleDragOver = (e: React.DragEvent, programId: number, exerciseId: number) => {
    e.preventDefault();
    setDragOverExercise({ programId, exerciseId });
  }

  const handleDragEnd = () => {
    setDraggedExercise(null);
    setDragOverExercise(null);
  }

  const handleDrop = async (e: React.DragEvent, targetProgramId: number, targetExerciseId: number) => {
    e.preventDefault();

    if (!draggedExercise) return;
    if (draggedExercise.programId !== targetProgramId) return;
    if (draggedExercise.exerciseId === targetExerciseId) return;

    const program = programs.find(p => p.id === targetProgramId);
    if (!program) return;

    const exercises = [...program.exercises];
    const draggedIndex = exercises.findIndex(e => e.id === draggedExercise.exerciseId);
    const targetIndex = exercises.findIndex(e => e.id === targetExerciseId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = exercises.splice(draggedIndex, 1);
    exercises.splice(targetIndex, 0, removed);

    setPrograms(programs.map(p =>
      p.id === targetProgramId
        ? { ...p, exercises }
        : p
    ));

    try {
      for (let i = 0; i < exercises.length; i++) {
        await fetch(`/api/exercises/${exercises[i].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...exercises[i],
            orderIndex: i,
          }),
        });
      }
    } catch (error) {
      console.error('Error updating exercise order:', error);
      await fetchPrograms();
    }

    setDraggedExercise(null);
    setDragOverExercise(null);
  }

  const toggleProgramCollapse = (programId: number) => {
    setCollapsedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-lg">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Antreman Programları</h2>
        <div className="flex gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
              📥 Dışa Aktar
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="p-2">
                <div className="text-xs text-gray-400 px-3 py-2 font-semibold">JSON</div>
                <button onClick={() => handleExport('json', 'all')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Tümü</button>
                <button onClick={() => handleExport('json', 'programs')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Programlar</button>
                <button onClick={() => handleExport('json', 'exercises')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Hareketler</button>
                <div className="border-t border-[#2A2A2A] my-2"></div>
                <div className="text-xs text-gray-400 px-3 py-2 font-semibold">CSV</div>
                <button onClick={() => handleExport('csv', 'all')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Tümü</button>
                <button onClick={() => handleExport('csv', 'programs')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Programlar</button>
                <button onClick={() => handleExport('csv', 'exercises')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Hareketler</button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            📤 İçe Aktar
          </button>

          <button
            onClick={() => setShowAddProgram(true)}
            className="bg-[#5DD97C] hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            + Yeni Program Ekle
          </button>
        </div>
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchPrograms}
      />

      <AddProgramModal
        isOpen={showAddProgram}
        onClose={() => setShowAddProgram(false)}
        onSuccess={fetchPrograms}
        users={users}
      />

      {/* Programs Grid */}
      <div className="grid grid-cols-1 gap-6">
        {programs.map((program) => (
          <ProgramItem
            key={program.id}
            program={program}
            isCollapsed={collapsedPrograms.has(program.id)}
            onToggleCollapse={() => toggleProgramCollapse(program.id)}
            onDelete={() => handleDeleteProgram(program.id)}
            onDragStart={handleProgramDragStart}
            onDragOver={handleProgramDragOver}
            onDragEnd={handleProgramDragEnd}
            onDrop={handleProgramDrop}
            isDragged={draggedProgram === program.id}
            isDragOver={dragOverProgram === program.id}
            onUpdate={fetchPrograms}
            onDeleteExercise={handleDeleteExercise}
            showAddExercise={showAddExercise === program.id}
            onShowAddExercise={() => setShowAddExercise(program.id)}
            onCloseAddExercise={() => setShowAddExercise(null)}
            onOpenExerciseSelector={() => {
              setSelectedProgramId(program.id);
              setShowExerciseSelector(true);
            }}
            exerciseDragStart={handleDragStart}
            exerciseDragOver={handleDragOver}
            exerciseDragEnd={handleDragEnd}
            exerciseDrop={handleDrop}
            draggedExercise={draggedExercise}
            dragOverExercise={dragOverExercise}
          />
        ))}
      </div>

      <ActivityCards />

      <ExerciseSelectorModal
        isOpen={showExerciseSelector}
        onClose={() => {
          setShowExerciseSelector(false);
          setSelectedProgramId(null);
        }}
        programId={selectedProgramId}
        programs={programs}
        allExercises={allExercises}
        onSuccess={fetchPrograms}
      />
    </div>
  )
}
