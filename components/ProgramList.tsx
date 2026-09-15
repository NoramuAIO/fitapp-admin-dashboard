'use client'

import { useEffect, useState } from 'react'
import { Download, Upload, Plus } from 'lucide-react'
import AddProgramModal from './programs/AddProgramModal'
import ExerciseSelectorModal, { Exercise, Program } from './programs/ExerciseSelectorModal'
import ImportModal from './programs/ImportModal'
import ProgramItem from './programs/ProgramItem'

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
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null)

  // Drag state - Programs
  const [draggedProgram, setDraggedProgram] = useState<number | null>(null)
  const [dragOverProgram, setDragOverProgram] = useState<number | null>(null)

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
      // Get selected user ID from local storage
      const selectedUserId = localStorage.getItem('selectedUserId')
      const queryParams = selectedUserId ? `?userId=${selectedUserId}` : ''
      
      // First fetch programs for this user (or global if null)
      const programsResponse = await fetch(`/api/programs${queryParams}`)
      const programsData = await programsResponse.json()

      // Then fetch workouts for each program
      const programsWithWorkouts = await Promise.all(
        programsData.map(async (program: Program) => {
          try {
            const workoutsResponse = await fetch(`/api/workouts?programId=${program.id}`)
            const workouts = await workoutsResponse.json()
            return { ...program, workouts: workouts || [] }
          } catch (error) {
            console.error('Error fetching workouts for program:', program.id, error)
            return { ...program, workouts: [] }
          }
        })
      )

      setPrograms(programsWithWorkouts)
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

  const handleDeleteWorkout = async (workoutId: number) => {
    if (!confirm('Bu antremanı ve içindeki tüm hareketleri silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/workouts?id=${workoutId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchPrograms()
      }
    } catch (error) {
      console.error('Error deleting workout:', error)
    }
  }

  const handleDeleteExercise = async (workoutId: number, exerciseId: number) => {
    if (!confirm('Bu hareketi silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchPrograms()
      }
    } catch (error) {
      console.error('Error deleting exercise:', error)
    }
  }

  const handleExport = async (format: 'json' | 'csv', type: 'all' | 'programs' | 'exercises' | 'workouts') => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Antrenman Programları</h2>
          <p className="text-gray-400">Tüm antrenman programlarını, günleri ve hareketleri yönetin</p>
        </div>
        <div className="flex gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm">
              <Download size={18} /> Dışa Aktar
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="p-2">
                <div className="text-xs text-gray-400 px-3 py-2 font-semibold">JSON</div>
                <button onClick={() => handleExport('json', 'all')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Tümü</button>
                <button onClick={() => handleExport('json', 'programs')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Programlar</button>
                <button onClick={() => handleExport('json', 'workouts')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Antrenmanlar</button>
                <button onClick={() => handleExport('json', 'exercises')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Hareketler</button>
                <div className="border-t border-[#2A2A2A] my-2"></div>
                <div className="text-xs text-gray-400 px-3 py-2 font-semibold">CSV</div>
                <button onClick={() => handleExport('csv', 'all')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Tümü</button>
                <button onClick={() => handleExport('csv', 'programs')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Programlar</button>
                <button onClick={() => handleExport('csv', 'workouts')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Antrenmanlar</button>
                <button onClick={() => handleExport('csv', 'exercises')} className="w-full text-left px-3 py-2 text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">Sadece Hareketler</button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <Upload size={18} /> İçe Aktar
          </button>

          <button
            onClick={() => setShowAddProgram(true)}
            className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#5558DD] text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <Plus size={18} /> Yeni Program
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
            onUpdate={fetchPrograms}
            onDeleteWorkout={handleDeleteWorkout}
            onDeleteExercise={handleDeleteExercise}
            onDragStart={() => handleProgramDragStart(program.id)}
            onDragOver={(e) => handleProgramDragOver(e, program.id)}
            onDragEnd={handleProgramDragEnd}
            onDrop={(e) => handleProgramDrop(e, program.id)}
            isDragged={draggedProgram === program.id}
            isDragOverTarget={dragOverProgram === program.id}
          />
        ))}
      </div>

      <ExerciseSelectorModal
        isOpen={showExerciseSelector}
        onClose={() => {
          setShowExerciseSelector(false);
          setSelectedProgramId(null);
          setSelectedWorkoutId(null);
        }}
        programId={selectedProgramId}
        workoutId={selectedWorkoutId}
        programs={programs}
        allExercises={allExercises}
        onSuccess={fetchPrograms}
      />
    </div>
  )
}