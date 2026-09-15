'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Trash2, Plus, Upload, Activity, Dumbbell, Edit2 } from 'lucide-react';

interface Exercise {
  id: number;
  programId: number;
  name: string;
  sets: number;
  reps: number;
  duration?: string;
  description?: string;
  imageUrl?: string;
  orderIndex: number;
  program_name?: string;
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState<number | 'all'>('all');
  const [programs, setPrograms] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvData, setImportCsvData] = useState('');
  const [importProgramId, setImportProgramId] = useState<number | null>(null);
  const [importFormat, setImportFormat] = useState<'bodybuilding' | 'fitnessprogramer'>('bodybuilding');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    sets: 3,
    reps: 10,
    duration: '',
    description: '',
    imageUrl: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [exercisesRes, programsRes] = await Promise.all([
        fetch('/api/exercises'),
        fetch('/api/programs'),
      ]);
      
      const exercisesData = await exercisesRes.json();
      const programsData = await programsRes.json();
      
      setExercises(exercisesData);
      setPrograms(programsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Hareket adı gerekli');
      return;
    }

    try {
      const url = editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises';
      const method = editingExercise ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          sets: formData.sets,
          reps: formData.reps,
          duration: formData.duration,
          description: formData.description,
          imageUrl: formData.imageUrl,
          programId: editingExercise?.programId || null,
          orderIndex: editingExercise?.orderIndex || 0,
        }),
      });

      if (response.ok) {
        await loadData();
        setShowAddModal(false);
        setEditingExercise(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving exercise:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
      
      if (response.ok) {
        await loadData();
      } else {
        const errorData = await response.json();
        alert('Silme işlemi başarısız oldu');
      }
    } catch (error) {
      alert('Silme işlemi sırasında hata oluştu');
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      duration: exercise.duration || '',
      description: exercise.description || '',
      imageUrl: exercise.imageUrl || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sets: 3,
      reps: 10,
      duration: '',
      description: '',
      imageUrl: '',
    });
  };

  const handleImportBodybuilding = async () => {
    if (!importCsvData.trim()) {
      alert('Lütfen CSV verisi girin');
      return;
    }

    const apiEndpoint = importFormat === 'bodybuilding' 
      ? '/api/import-bodybuilding' 
      : '/api/import-fitnessprogramer';

    try {
      setLoading(true);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: importCsvData,
          programId: importProgramId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        let message = result.message;
        
        if (result.debugInfo) {
          console.log('Debug Info:', result.debugInfo);
          message += '\n\nDebug bilgisi konsola yazıldı.';
        }
        
        if (result.errors) {
          console.error('Import errors:', result.errors);
          message += '\n\nHatalar konsola yazıldı.';
        }
        
        alert(message);
        await loadData();
        setShowImportModal(false);
        setImportCsvData('');
        setImportProgramId(null);
      } else {
        alert('İçe aktarma başarısız: ' + (result.error || 'Bilinmeyen hata'));
        if (result.details) {
          console.error('Error details:', result.details);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('İçe aktarma başarısız oldu: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportCsvData(content);
    };
    reader.readAsText(file);
  };

  const toggleExerciseSelection = (exerciseId: number) => {
    setSelectedExerciseIds(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedExerciseIds.length === filteredExercises.length) {
      setSelectedExerciseIds([]);
    } else {
      setSelectedExerciseIds(filteredExercises.map(e => e.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedExerciseIds.length === 0) {
      alert('Lütfen silinecek hareketleri seçin');
      return;
    }

    setLoading(true);
    let deleted = 0;
    let failed = 0;

    for (const id of selectedExerciseIds) {
      try {
        const response = await fetch(`/api/exercises/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
          deleted++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    alert(`${deleted} hareket silindi${failed > 0 ? `, ${failed} başarısız` : ''}`);
    setSelectedExerciseIds([]);
    await loadData();
    setLoading(false);
  };

  const handleDeleteAll = async () => {
    if (filteredExercises.length === 0) {
      alert('Silinecek hareket yok');
      return;
    }

    setLoading(true);
    let deleted = 0;
    let failed = 0;

    for (const exercise of filteredExercises) {
      try {
        const response = await fetch(`/api/exercises/${exercise.id}`, { method: 'DELETE' });
        
        if (response.ok) {
          deleted++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    alert(`${deleted} hareket silindi${failed > 0 ? `, ${failed} başarısız` : ''}`);
    setSelectedExerciseIds([]);
    await loadData();
    setLoading(false);
  };

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgram = filterProgram === 'all' || exercise.programId === filterProgram;
    return matchesSearch && matchesProgram;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tüm Hareketler</h1>
          <p className="text-gray-400">Sistemdeki tüm hareketleri görüntüleyin, ekleyin ve düzenleyin</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedExerciseIds.length > 0 && (
            <>
              <button
                onClick={() => setSelectedExerciseIds([])}
                className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Seçimi Temizle
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/20 text-[#FF6B4A] border border-[#FF6B4A]/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Trash2 size={18} /> Seçilenleri Sil ({selectedExerciseIds.length})
              </button>
            </>
          )}
          {filteredExercises.length > 0 && selectedExerciseIds.length === 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={loading}
              className="flex items-center gap-2 bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/20 text-[#FF6B4A] border border-[#FF6B4A]/20 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} /> Tümünü Sil ({filteredExercises.length})
            </button>
          )}
          
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Upload size={18} /> İçe Aktar
          </button>
          
          <button
            onClick={() => {
              setEditingExercise(null);
              setFormData({
                name: '', sets: 3, reps: 10, duration: '', description: '', imageUrl: '',
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#5558DD] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={18} /> Yeni Hareket
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
        <div className="flex items-center gap-3 bg-[#141414] border border-[#2A2A2A] px-4 py-2.5 rounded-xl shrink-0">
          <input
            type="checkbox"
            checked={selectedExerciseIds.length === filteredExercises.length && filteredExercises.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0F0F0F] checked:bg-[#6366F1]"
          />
          <span className="text-gray-400 text-sm font-medium">
            Tümünü Seç
          </span>
        </div>
        <div className="flex-1 w-full relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Hareket ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#6366F1]"
          />
        </div>
        
        <div className="relative w-full md:w-64">
          <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            className="w-full bg-[#141414] border border-[#2A2A2A] text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-[#6366F1] appearance-none"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Tüm Programlar</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
            <Activity size={24} className="text-[#6366F1]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Toplam Hareket</p>
            <h3 className="text-2xl font-bold text-white">{exercises.length}</h3>
          </div>
        </div>
        
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5DD97C]/10 flex items-center justify-center shrink-0">
            <Dumbbell size={24} className="text-[#5DD97C]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Program Sayısı</p>
            <h3 className="text-2xl font-bold text-white">{programs.length}</h3>
          </div>
        </div>
        
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#2A2A2A] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FF6B4A]/10 flex items-center justify-center shrink-0">
            <Filter size={24} className="text-[#FF6B4A]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Filtrelenmiş Sonuç</p>
            <h3 className="text-2xl font-bold text-white">{filteredExercises.length}</h3>
          </div>
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            Hareket bulunamadı
          </div>
        ) : (
          filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              className={`bg-[#1A1A1A] rounded-2xl p-6 border transition-all ${
                selectedExerciseIds.includes(exercise.id)
                  ? 'border-[#6366F1] bg-[#6366F1]/10'
                  : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
              }`}
            >
              {/* Checkbox */}
              <div className="flex items-start gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={selectedExerciseIds.includes(exercise.id)}
                  onChange={() => toggleExerciseSelection(exercise.id)}
                  className="mt-1 w-5 h-5 rounded border-[#2A2A2A] bg-[#0F0F0F] checked:bg-[#6366F1]"
                />
                <div className="flex-1">
                  {/* Exercise Image */}
                  {exercise.imageUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden bg-[#0F0F0F]">
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.name}
                        className="w-full h-48 object-contain"
                      />
                    </div>
                  )}

                  {/* Exercise Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white mb-2">{exercise.name}</h3>
                    {exercise.description && (
                      <p className="text-sm text-gray-400 mb-3">{exercise.description}</p>
                    )}
                    
                    {/* Program Badge */}
                    {exercise.program_name && (
                      <span className="inline-block bg-purple-500/20 text-purple-400 px-3 py-1 rounded-lg text-xs font-medium mb-3">
                        {exercise.program_name}
                      </span>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Set:</span>
                        <span className="text-white font-semibold ml-1">{exercise.sets}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tekrar:</span>
                        <span className="text-white font-semibold ml-1">{exercise.reps}</span>
                      </div>
                      {exercise.duration && (
                        <div>
                          <span className="text-gray-400">Süre:</span>
                          <span className="text-white font-semibold ml-1">{exercise.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(exercise)}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#6366F1]/10 text-[#6366F1] py-2.5 rounded-xl hover:bg-[#6366F1]/20 transition-colors text-sm font-semibold"
                    >
                      <Edit2 size={16} /> Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(exercise.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B4A]/10 text-[#FF6B4A] py-2.5 rounded-xl hover:bg-[#FF6B4A]/20 transition-colors text-sm font-semibold"
                    >
                      <Trash2 size={16} /> Sil
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">CSV İçe Aktar</h3>
            
            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">CSV Formatı</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImportFormat('bodybuilding')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                      importFormat === 'bodybuilding' 
                        ? 'bg-[#6366F1] text-white' 
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    Bodybuilding.com
                  </button>
                  <button
                    onClick={() => setImportFormat('fitnessprogramer')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                      importFormat === 'fitnessprogramer' 
                        ? 'bg-[#6366F1] text-white' 
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    FitnessProgramer.com
                  </button>
                </div>
              </div>

              <div className="bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-xl p-4">
                <h4 className="flex items-center gap-2 text-[#6366F1] font-semibold mb-2">
                  <Activity size={16} /> Format Bilgisi
                </h4>
                {importFormat === 'bodybuilding' ? (
                  <>
                    <p className="text-sm text-gray-400 mb-2">Bodybuilding.com formatı:</p>
                    <code className="text-xs text-gray-300 block bg-[#0F0F0F] p-2 rounded">
                      Exercise_Name,Description_URL,Exercise_Image,Exercise_Image1,muscle_gp_details,muscle_gp,equipment_details,Equipment,Rating,Description
                    </code>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 mb-2">FitnessProgramer.com formatı:</p>
                    <code className="text-xs text-gray-300 block bg-[#0F0F0F] p-2 rounded">
                      name,gif_url,overview,muscle_group,source_url
                    </code>
                  </>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  • Duplicate hareketler otomatik atlanır<br/>
                  • Resim/GIF URL'leri otomatik alınır
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Programa Ekle (Opsiyonel)
                </label>
                <select
                  value={importProgramId || ''}
                  onChange={(e) => setImportProgramId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                >
                  <option value="">Programa eklemeden sadece hareket havuzuna ekle</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  CSV Dosyası Seç
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Veya CSV Verisini Yapıştır
                </label>
                <textarea
                  value={importCsvData}
                  onChange={(e) => setImportCsvData(e.target.value)}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1] font-mono text-xs"
                  rows={12}
                  placeholder={importFormat === 'bodybuilding' 
                    ? 'Exercise_Name,Description_URL,Exercise_Image,...'
                    : 'name,gif_url,overview,muscle_group,source_url'
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleImportBodybuilding}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  {loading ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportCsvData('');
                    setImportProgramId(null);
                  }}
                  className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingExercise ? 'Hareket Düzenle' : 'Yeni Hareket Ekle'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Hareket Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Set Sayısı</label>
                  <input
                    type="number"
                    value={formData.sets}
                    onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) })}
                    className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Tekrar Sayısı</label>
                  <input
                    type="number"
                    value={formData.reps}
                    onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) })}
                    className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Süre (Opsiyonel)</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  placeholder="Örn: 30 saniye"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Açıklama (Opsiyonel)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Resim URL (Opsiyonel)</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  placeholder="https://example.com/image.gif"
                />
                {formData.imageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden bg-[#0F0F0F] p-2">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-contain" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  {editingExercise ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingExercise(null);
                    resetForm();
                  }}
                  className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
