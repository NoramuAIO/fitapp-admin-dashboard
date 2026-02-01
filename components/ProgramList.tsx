'use client'

import { useEffect, useState } from 'react'

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
  const [showAddProgram, setShowAddProgram] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState<number | null>(null)
  const [editingExercise, setEditingExercise] = useState<{ programId: number; exercise: Exercise } | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState('')
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json')
  const [importType, setImportType] = useState<'all' | 'programs' | 'exercises'>('all')
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null)
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([])
  const [newProgram, setNewProgram] = useState({ name: '', isPrimary: false })
  const [newExercise, setNewExercise] = useState({
    name: '',
    sets: 3,
    reps: 10,
    duration: '',
    description: '',
    imageUrl: ''
  })

  useEffect(() => {
    fetchPrograms()
    fetchAllExercises()
  }, [])

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

  const handleAddProgram = async () => {
    if (!newProgram.name.trim()) {
      alert('Program adı gerekli');
      return;
    }

    try {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProgram),
      });

      if (response.ok) {
        await fetchPrograms();
        setShowAddProgram(false);
        setNewProgram({ name: '', isPrimary: false });
      }
    } catch (error) {
      console.error('Error adding program:', error);
    }
  };

  const handleAddExercise = async (programId: number) => {
    if (!newExercise.name.trim()) {
      alert('Hareket adı gerekli');
      return;
    }

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          ...newExercise,
          orderIndex: 0,
        }),
      });

      if (response.ok) {
        await fetchPrograms();
        setShowAddExercise(null);
        setNewExercise({ name: '', sets: 3, reps: 10, duration: '', description: '', imageUrl: '' });
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const handleEditExercise = async () => {
    if (!editingExercise) return;

    try {
      const response = await fetch(`/api/exercises/${editingExercise.exercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingExercise.exercise.name,
          sets: editingExercise.exercise.sets,
          reps: editingExercise.exercise.reps,
          duration: editingExercise.exercise.duration,
          description: editingExercise.exercise.description,
          imageUrl: editingExercise.exercise.imageUrl,
        }),
      });

      if (response.ok) {
        await fetchPrograms();
        setEditingExercise(null);
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
    }
  };

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
        setPrograms(programs.map(p => 
          p.id === programId 
            ? { ...p, exercises: p.exercises.filter(e => e.id !== exerciseId) }
            : p
        ))
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
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      alert('Lütfen veri girin');
      return;
    }

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: importFormat === 'json' ? JSON.parse(importData) : importData,
          format: importFormat,
          type: importType,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        await fetchPrograms();
        setShowImportModal(false);
        setImportData('');
      } else {
        alert('İçe aktarma başarısız: ' + (result.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('İçe aktarma başarısız oldu');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
      
      // Detect format from file extension
      if (file.name.endsWith('.json')) {
        setImportFormat('json');
      } else if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      }
    };
    reader.readAsText(file);
  };

  const handleAddExistingExercise = async (programId: number, exerciseId: number) => {
    const exercise = allExercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    // Duplicate kontrolü - bu hareket zaten programda var mı?
    const program = programs.find(p => p.id === programId);
    if (program?.exercises.some(e => e.name === exercise.name)) {
      alert('Bu hareket zaten programda mevcut!');
      return;
    }

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          duration: exercise.duration,
          description: exercise.description,
          imageUrl: exercise.imageUrl,
          orderIndex: 0,
        }),
      });

      if (response.ok) {
        await fetchPrograms();
        setShowExerciseSelector(false);
        setSelectedProgramId(null);
        setSelectedExerciseIds([]);
      }
    } catch (error) {
      console.error('Error adding existing exercise:', error);
    }
  };

  const handleAddSelectedExercises = async () => {
    if (!selectedProgramId || selectedExerciseIds.length === 0) {
      alert('Lütfen en az bir hareket seçin');
      return;
    }

    const program = programs.find(p => p.id === selectedProgramId);
    let added = 0;
    let skipped = 0;

    for (const exerciseId of selectedExerciseIds) {
      const exercise = allExercises.find(e => e.id === exerciseId);
      if (!exercise) continue;

      // Duplicate kontrolü
      if (program?.exercises.some(e => e.name === exercise.name)) {
        skipped++;
        continue;
      }

      try {
        const response = await fetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: selectedProgramId,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            duration: exercise.duration,
            description: exercise.description,
            imageUrl: exercise.imageUrl,
            orderIndex: 0,
          }),
        });

        if (response.ok) {
          added++;
        }
      } catch (error) {
        console.error('Error adding exercise:', error);
        skipped++;
      }
    }

    alert(`${added} hareket eklendi${skipped > 0 ? `, ${skipped} atlandı (zaten mevcut)` : ''}`);
    await fetchPrograms();
    setShowExerciseSelector(false);
    setSelectedProgramId(null);
    setSelectedExerciseIds([]);
  };

  const toggleExerciseSelection = (exerciseId: number) => {
    setSelectedExerciseIds(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const toggleSelectAll = (availableExercises: Exercise[]) => {
    if (selectedExerciseIds.length === availableExercises.length) {
      setSelectedExerciseIds([]);
    } else {
      setSelectedExerciseIds(availableExercises.map(e => e.id));
    }
  };

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

          {/* Import Button */}
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            📤 İçe Aktar
          </button>

          {/* Add Program Button */}
          <button 
            onClick={() => setShowAddProgram(true)}
            className="bg-[#5DD97C] hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            + Yeni Program Ekle
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Veri İçe Aktar</h3>
            
            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <label className="block text-gray-400 mb-2">Format</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImportFormat('json')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      importFormat === 'json' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setImportFormat('csv')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      importFormat === 'csv' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    CSV
                  </button>
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-gray-400 mb-2">İçe Aktarılacak Veri</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImportType('all')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      importType === 'all' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setImportType('programs')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      importType === 'programs' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    Programlar
                  </button>
                  <button
                    onClick={() => setImportType('exercises')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      importType === 'exercises' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    Hareketler
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-gray-400 mb-2">Dosya Seç</label>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              {/* Data Input */}
              <div>
                <label className="block text-gray-400 mb-2">Veya Veriyi Yapıştır</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1] font-mono text-sm"
                  rows={10}
                  placeholder={importFormat === 'json' ? '{"programs": [...], "exercises": [...]}' : 'PROGRAMS\nid,name,is_primary\n...'}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  İçe Aktar
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                  }}
                  className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl font-medium transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Program Modal */}
      {showAddProgram && (
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <h3 className="text-xl font-bold text-white mb-4">Yeni Program Ekle</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2">Program Adı</label>
              <input
                type="text"
                value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                placeholder="Örn: Başlangıç Programı"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newProgram.isPrimary}
                onChange={(e) => setNewProgram({ ...newProgram, isPrimary: e.target.checked })}
                className="w-5 h-5"
              />
              <label className="text-gray-400">Birincil program olarak ayarla</label>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAddProgram}
                className="flex-1 bg-[#5DD97C] hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setShowAddProgram(false);
                  setNewProgram({ name: '', isPrimary: false });
                }}
                className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl font-medium transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Programs Grid */}
      <div className="grid grid-cols-1 gap-6">
        {programs.map((program) => (
          <div key={program.id} className="bg-dark-card rounded-2xl p-6 shadow-lg">
            {/* Program Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-bold text-white">{program.name}</h3>
                {program.isPrimary && (
                  <span className="bg-primary-green/20 text-primary-green px-3 py-1 rounded-lg text-sm font-medium">
                    ⭐ Birincil
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button className="bg-dark-hover hover:bg-dark-border text-white px-4 py-2 rounded-lg transition-colors">
                  ✏️ Düzenle
                </button>
                <button 
                  onClick={() => handleDeleteProgram(program.id)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-500 px-4 py-2 rounded-lg transition-colors"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-3">
              {program.exercises.map((exercise) => (
                <div key={exercise.id}>
                  {editingExercise?.exercise.id === exercise.id ? (
                    // Edit Mode
                    <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                      <h4 className="text-white font-medium mb-3">Hareketi Düzenle</h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingExercise.exercise.name}
                          onChange={(e) => setEditingExercise({
                            ...editingExercise,
                            exercise: { ...editingExercise.exercise, name: e.target.value }
                          })}
                          className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                          placeholder="Hareket adı"
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <input
                            type="number"
                            value={editingExercise.exercise.sets}
                            onChange={(e) => setEditingExercise({
                              ...editingExercise,
                              exercise: { ...editingExercise.exercise, sets: parseInt(e.target.value) }
                            })}
                            className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Set"
                          />
                          <input
                            type="number"
                            value={editingExercise.exercise.reps}
                            onChange={(e) => setEditingExercise({
                              ...editingExercise,
                              exercise: { ...editingExercise.exercise, reps: parseInt(e.target.value) }
                            })}
                            className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Tekrar"
                          />
                          <input
                            type="text"
                            value={editingExercise.exercise.duration || ''}
                            onChange={(e) => setEditingExercise({
                              ...editingExercise,
                              exercise: { ...editingExercise.exercise, duration: e.target.value }
                            })}
                            className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                            placeholder="Süre"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingExercise.exercise.imageUrl || ''}
                          onChange={(e) => setEditingExercise({
                            ...editingExercise,
                            exercise: { ...editingExercise.exercise, imageUrl: e.target.value }
                          })}
                          className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                          placeholder="Görsel URL (GIF veya resim linki)"
                        />
                        {editingExercise.exercise.imageUrl && (
                          <div className="relative w-full h-48 bg-[#1A1A1A] rounded-lg overflow-hidden">
                            <img
                              src={editingExercise.exercise.imageUrl}
                              alt="Preview"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Görsel+Yüklenemedi';
                              }}
                            />
                          </div>
                        )}
                        <textarea
                          value={editingExercise.exercise.description || ''}
                          onChange={(e) => setEditingExercise({
                            ...editingExercise,
                            exercise: { ...editingExercise.exercise, description: e.target.value }
                          })}
                          className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                          placeholder="Açıklama (opsiyonel)"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleEditExercise}
                            className="flex-1 bg-[#5DD97C] hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
                          >
                            Kaydet
                          </button>
                          <button
                            onClick={() => setEditingExercise(null)}
                            className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg font-medium transition-colors"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="bg-[#0F0F0F] rounded-xl p-4 hover:bg-[#1A1A1A] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        {exercise.imageUrl && (
                          <div className="w-24 h-24 bg-[#1A1A1A] rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={exercise.imageUrl}
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-2">{exercise.name}</h4>
                          <div className="flex items-center flex-wrap gap-2 text-sm">
                            <span className="bg-[#5DD97C]/20 text-[#5DD97C] px-3 py-1 rounded-lg">
                              {exercise.sets} Set
                            </span>
                            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg">
                              {exercise.reps} Tekrar
                            </span>
                            {exercise.duration && (
                              <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-lg">
                                {exercise.duration}
                              </span>
                            )}
                          </div>
                          {exercise.description && (
                            <p className="text-gray-500 text-sm mt-2">{exercise.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => setEditingExercise({ programId: program.id, exercise })}
                            className="text-gray-400 hover:text-white transition-colors p-2"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteExercise(program.id, exercise.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Exercise Button */}
            {showAddExercise === program.id ? (
              <div className="mt-4 bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                <h4 className="text-white font-medium mb-3">Yeni Hareket Ekle</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Hareket adı"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      value={newExercise.sets}
                      onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) })}
                      className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                      placeholder="Set"
                    />
                    <input
                      type="number"
                      value={newExercise.reps}
                      onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) })}
                      className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                      placeholder="Tekrar"
                    />
                    <input
                      type="text"
                      value={newExercise.duration}
                      onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                      className="bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                      placeholder="Süre"
                    />
                  </div>
                  <textarea
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                    className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Açıklama (opsiyonel)"
                    rows={2}
                  />
                  <input
                    type="text"
                    value={newExercise.imageUrl}
                    onChange={(e) => setNewExercise({ ...newExercise, imageUrl: e.target.value })}
                    className="w-full bg-[#1A1A1A] text-white rounded-lg px-3 py-2 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                    placeholder="Görsel URL (GIF veya resim linki)"
                  />
                  {newExercise.imageUrl && (
                    <div className="relative w-full h-48 bg-[#1A1A1A] rounded-lg overflow-hidden">
                      <img
                        src={newExercise.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Görsel+Yüklenemedi';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddExercise(program.id)}
                      className="flex-1 bg-[#5DD97C] hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      Ekle
                    </button>
                    <button
                      onClick={() => {
                        setShowAddExercise(null);
                        setNewExercise({ name: '', sets: 3, reps: 10, duration: '', description: '', imageUrl: '' });
                      }}
                      className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => setShowAddExercise(program.id)}
                  className="flex-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-400 hover:text-white py-3 rounded-xl transition-colors border-2 border-dashed border-[#2A2A2A]"
                >
                  + Yeni Hareket Ekle
                </button>
                <button 
                  onClick={() => {
                    console.log('Opening exercise selector for program:', program.id);
                    setSelectedProgramId(program.id);
                    setShowExerciseSelector(true);
                    setSelectedExerciseIds([]);
                  }}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 py-3 rounded-xl transition-colors border-2 border-blue-500/30"
                >
                  📋 Mevcut Hareketlerden Seç
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Activity Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-dark-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#6366F1] rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚴</span>
              </div>
              <div>
                <h3 className="text-white font-bold">Bisiklet Kahramanı</h3>
                <p className="text-gray-500 text-sm">10 km / hafta</p>
              </div>
            </div>
            <button className="text-gray-500 hover:text-white">⋮</button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">İlerleme</span>
              <span className="text-white font-bold">55%</span>
            </div>
            <div className="w-full bg-dark-bg rounded-full h-2">
              <div className="bg-[#6366F1] h-2 rounded-full" style={{ width: '55%' }} />
            </div>
            <p className="text-gray-500 text-xs">Hedef: 50km</p>
          </div>
        </div>

        <div className="bg-dark-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#6366F1] rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏃</span>
              </div>
              <div>
                <h3 className="text-white font-bold">Günlük Koşu</h3>
                <p className="text-gray-500 text-sm">5 km / hafta</p>
              </div>
            </div>
            <button className="text-gray-500 hover:text-white">⋮</button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">İlerleme</span>
              <span className="text-white font-bold">75%</span>
            </div>
            <div className="w-full bg-dark-bg rounded-full h-2">
              <div className="bg-[#6366F1] h-2 rounded-full" style={{ width: '75%' }} />
            </div>
            <p className="text-gray-500 text-xs">Hedef: 7km/ hafta</p>
          </div>
        </div>

        <div className="bg-dark-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#6366F1] rounded-xl flex items-center justify-center">
                <span className="text-2xl">👟</span>
              </div>
              <div>
                <h3 className="text-white font-bold">Günlük Adımlar</h3>
                <p className="text-gray-500 text-sm">10000 adım / hafta</p>
              </div>
            </div>
            <button className="text-gray-500 hover:text-white">⋮</button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">İlerleme</span>
              <span className="text-white font-bold">95%</span>
            </div>
            <div className="w-full bg-dark-bg rounded-full h-2">
              <div className="bg-[#6366F1] h-2 rounded-full" style={{ width: '95%' }} />
            </div>
            <p className="text-gray-500 text-xs">Hedef: 12000/hafta</p>
          </div>
        </div>
      </div>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && selectedProgramId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4">Mevcut Hareketlerden Seç</h3>
            
            {(() => {
              const program = programs.find(p => p.id === selectedProgramId);
              const availableExercises = allExercises.filter(exercise => 
                !program?.exercises.some(e => e.name === exercise.name)
              );
              
              return (
                <>
                  {/* Header with Select All */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedExerciseIds.length === availableExercises.length && availableExercises.length > 0}
                        onChange={() => toggleSelectAll(availableExercises)}
                        className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0F0F0F] checked:bg-[#6366F1]"
                      />
                      <span className="text-white font-medium">
                        Tümünü Seç ({selectedExerciseIds.length} / {availableExercises.length})
                      </span>
                    </div>
                    <button
                      onClick={handleAddSelectedExercises}
                      disabled={selectedExerciseIds.length === 0}
                      className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-2 rounded-xl font-semibold transition-all"
                    >
                      Seçilenleri Ekle ({selectedExerciseIds.length})
                    </button>
                  </div>

                  {/* Exercises Grid */}
                  <div className="flex-1 overflow-y-auto">
                    {availableExercises.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        Tüm hareketler bu programda zaten mevcut
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {availableExercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            className={`bg-[#0F0F0F] rounded-xl p-4 border transition-all cursor-pointer ${
                              selectedExerciseIds.includes(exercise.id)
                                ? 'border-[#6366F1] bg-[#6366F1]/10'
                                : 'border-[#2A2A2A] hover:border-[#6366F1]/50'
                            }`}
                            onClick={() => toggleExerciseSelection(exercise.id)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedExerciseIds.includes(exercise.id)}
                                onChange={() => toggleExerciseSelection(exercise.id)}
                                className="mt-1 w-5 h-5 rounded border-[#2A2A2A] bg-[#0F0F0F] checked:bg-[#6366F1]"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                {exercise.imageUrl && (
                                  <div className="mb-3 rounded-lg overflow-hidden bg-[#1A1A1A]">
                                    <img
                                      src={exercise.imageUrl}
                                      alt={exercise.name}
                                      className="w-full h-32 object-contain"
                                    />
                                  </div>
                                )}
                                <h4 className="text-white font-semibold mb-2">{exercise.name}</h4>
                                {exercise.description && (
                                  <p className="text-sm text-gray-400 mb-2 line-clamp-2">{exercise.description}</p>
                                )}
                                <div className="flex gap-3 text-sm text-gray-400">
                                  <span>{exercise.sets} set</span>
                                  <span>•</span>
                                  <span>{exercise.reps} tekrar</span>
                                  {exercise.duration && (
                                    <>
                                      <span>•</span>
                                      <span>{exercise.duration}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                    <button
                      onClick={handleAddSelectedExercises}
                      disabled={selectedExerciseIds.length === 0}
                      className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-semibold transition-all"
                    >
                      Seçilenleri Ekle ({selectedExerciseIds.length})
                    </button>
                    <button
                      onClick={() => {
                        setShowExerciseSelector(false);
                        setSelectedProgramId(null);
                        setSelectedExerciseIds([]);
                      }}
                      className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl font-semibold transition-all"
                    >
                      Kapat
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
