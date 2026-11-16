'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Trash2, Plus, Upload, Activity, Dumbbell, Edit2, History, X, Calendar, TrendingUp, User } from 'lucide-react';
import { useConfirm } from '@/components/ConfirmModal';
import { apiFetch, invalidateApiCache } from '@/lib/clientCache';
import { ISTANBUL_TZ } from '@/lib/fitnessCalculations';

interface Exercise {
  id: number;
  programId?: number | null;
  program_id?: number | null;
  name: string;
  sets: number;
  reps: number;
  duration?: string;
  description?: string;
  imageUrl?: string;
  muscleGroup?: string | null;
  muscle_group?: string | null;
  orderIndex?: number;
  program_name?: string;
}

interface ExerciseHistoryItem {
  id: number;
  userId: number;
  exerciseId: number;
  sessionId?: number | null;
  completedAt: string;
  sets: number;
  reps: number;
  weight?: number | null;
  notes?: string | null;
  users?: {
    id: number;
    name: string;
  } | null;
}

export default function ExercisesPage() {
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterProgram, setFilterProgram] = useState<number | 'all'>('all');
  const [programs, setPrograms] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvData, setImportCsvData] = useState('');
  const [importProgramId, setImportProgramId] = useState<number | null>(null);
  const [importFormat, setImportFormat] = useState<'bodybuilding' | 'fitnessprogramer'>('bodybuilding');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sets: '3',
    reps: '10',
    duration: '',
    description: '',
    imageUrl: '',
    muscleGroup: '',
  });

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setLoadError(null);
      const [exercisesRes, programsRes] = await Promise.all([
        apiFetch('/api/exercises', { forceRefresh }),
        apiFetch('/api/programs', { forceRefresh }),
      ]);

      if (!exercisesRes.ok || !programsRes.ok) {
        setLoadError('Hareket veya program verileri yüklenemedi.');
      }

      const [exercisesData, programsData] = await Promise.all([
        exercisesRes.ok ? exercisesRes.json() : [],
        programsRes.ok ? programsRes.json() : [],
      ]);

      setExercises(Array.isArray(exercisesData) ? exercisesData : []);
      setPrograms(Array.isArray(programsData) ? programsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadError('Veriler yüklenirken bir ağ hatası oluştu.');
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

    const parsedSets = Math.max(1, parseInt(formData.sets, 10) || 3);
    const parsedReps = Math.max(1, parseInt(formData.reps, 10) || 10);

    try {
      const url = editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises';
      const method = editingExercise ? 'PUT' : 'POST';
      const existingProgramId =
        editingExercise?.programId ?? editingExercise?.program_id ?? null;

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          sets: parsedSets,
          reps: parsedReps,
          duration: formData.duration.trim() || null,
          description: formData.description.trim() || null,
          imageUrl: formData.imageUrl.trim() || null,
          muscleGroup: formData.muscleGroup.trim() || null,
          programId: existingProgramId,
          orderIndex: editingExercise?.orderIndex || 0,
        }),
      });

      if (response.ok) {
        invalidateApiCache();
        await loadData(true);
        setShowAddModal(false);
        setEditingExercise(null);
        resetForm();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Hareket kaydedilemedi.');
      }
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert('Hareket kaydedilirken bir hata oluştu.');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Hareketi Sil',
      message: 'Bu egzersiz hareketini silmek istediğinizden emin misiniz?',
      confirmText: 'Evet, Sil',
    });
    if (!ok) return;

    const numericId = Number(id);
    // Optimistic instant UI removal
    setExercises((prev) => prev.filter((e) => Number(e.id) !== numericId));

    try {
      let response = await apiFetch(`/api/exercises/${numericId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      if (!response.ok) {
        response = await apiFetch(`/api/exercises/${numericId}`, { method: 'DELETE' });
      }
      if (!response.ok) {
        alert('Hareket silinemedi.');
        await loadData(true);
      } else {
        invalidateApiCache();
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      await loadData(true);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      sets: String(exercise.sets ?? 3),
      reps: String(exercise.reps ?? 10),
      duration: exercise.duration || '',
      description: exercise.description || '',
      imageUrl: exercise.imageUrl || '',
      muscleGroup: exercise.muscleGroup ?? exercise.muscle_group ?? '',
    });
    setShowAddModal(true);
  };

  const handleShowHistory = async (exercise: Exercise) => {
    setHistoryExercise(exercise);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await apiFetch(`/api/exercise-completions?exerciseId=${exercise.id}`);
      if (res.ok) {
        const data = await res.json();
        setExerciseHistory(Array.isArray(data) ? data : []);
      } else {
        setExerciseHistory([]);
      }
    } catch (err) {
      console.error('Error fetching exercise history:', err);
      setExerciseHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sets: '3',
      reps: '10',
      duration: '',
      description: '',
      imageUrl: '',
      muscleGroup: '',
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
      setImporting(true);
      const response = await apiFetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: importCsvData,
          programId: importProgramId,
        }),
      });

      const result = await response.json().catch(() => ({}));
      
      if (response.ok && result.success) {
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
        invalidateApiCache();
        await loadData(true);
        setShowImportModal(false);
        setImportCsvData('');
        setImportProgramId(null);
      } else {
        alert('İçe aktarma başarısız: ' + (result.error || `Sunucu hatası (${response.status})`));
        if (result.details) {
          console.error('Error details:', result.details);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('İçe aktarma başarısız oldu: ' + error);
    } finally {
      setImporting(false);
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

  const programNameMap = useMemo(
    () => new Map<number, string>(programs.map((p) => [Number(p.id), p.name])),
    [programs]
  );

  const filteredExercises = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesSearch = !query || exercise.name.toLowerCase().includes(query);
      const progId = exercise.programId ?? exercise.program_id;
      const matchesProgram =
        filterProgram === 'all' || Number(progId) === Number(filterProgram);
      return matchesSearch && matchesProgram;
    });
  }, [exercises, searchTerm, filterProgram]);

  const allFilteredSelected =
    filteredExercises.length > 0 &&
    filteredExercises.every((e) => selectedExerciseIds.includes(e.id));

  const toggleSelectAll = () => {
    const filteredSet = new Set(filteredExercises.map((e) => e.id));
    if (allFilteredSelected) {
      setSelectedExerciseIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedExerciseIds((prev) => Array.from(new Set([...prev, ...filteredExercises.map((e) => e.id)])));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedExerciseIds.length === 0) return;

    const ok = await confirm({
      title: 'Seçili Hareketleri Sil',
      message: `Seçtiğiniz ${selectedExerciseIds.length} egzersiz hareketini silmek istediğinizden emin misiniz?`,
      confirmText: `Evet, ${selectedExerciseIds.length} Hareketi Sil`,
    });
    if (!ok) return;

    const idsToDelete = [...selectedExerciseIds];
    // Optimistic removal
    setExercises((prev) => prev.filter((e) => !idsToDelete.includes(e.id)));
    setSelectedExerciseIds([]);

    const results = await Promise.all(
      idsToDelete.map(async (id) => {
        try {
          let res = await apiFetch(`/api/exercises/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete' }),
          });
          if (!res.ok) {
            res = await apiFetch(`/api/exercises/${id}`, { method: 'DELETE' });
          }
          return res.ok;
        } catch (e) {
          console.error(e);
          return false;
        }
      })
    );
    if (results.some((okRes) => !okRes)) {
      alert('Bazı seçili hareketler silinemedi. Liste yenileniyor.');
      await loadData(true);
    } else {
      invalidateApiCache();
    }
  };

  const handleDeleteAll = async () => {
    if (filteredExercises.length === 0) return;

    const ok = await confirm({
      title: 'Tüm Hareketleri Sil',
      message: `Filtrelenen ${filteredExercises.length} egzersiz hareketinin tamamını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`,
      confirmText: 'Evet, Hepsini Sil',
    });
    if (!ok) return;

    const idsToDelete = filteredExercises.map((e) => e.id);
    // Optimistic removal
    setExercises((prev) => prev.filter((e) => !idsToDelete.includes(e.id)));
    setSelectedExerciseIds([]);

    const results = await Promise.all(
      idsToDelete.map(async (id) => {
        try {
          let res = await apiFetch(`/api/exercises/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete' }),
          });
          if (!res.ok) {
            res = await apiFetch(`/api/exercises/${id}`, { method: 'DELETE' });
          }
          return res.ok;
        } catch (e) {
          console.error(e);
          return false;
        }
      })
    );
    if (results.some((okRes) => !okRes)) {
      alert('Bazı hareketler silinemedi. Liste yenileniyor.');
      await loadData(true);
    } else {
      invalidateApiCache();
    }
  };

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
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#5558DD] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={18} /> Yeni Hareket
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span>{loadError}</span>
          <button
            onClick={() => loadData(true)}
            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold"
          >
            Yeniden Dene
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
        <div className="flex items-center gap-3 bg-[#141414] border border-[#2A2A2A] px-4 py-2.5 rounded-xl shrink-0">
          <input
            type="checkbox"
            checked={allFilteredSelected}
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
                    {(() => {
                      const pid = exercise.programId ?? exercise.program_id;
                      const progName =
                        exercise.program_name || (pid ? programNameMap.get(Number(pid)) : undefined);
                      return progName ? (
                        <span className="inline-block bg-purple-500/20 text-purple-400 px-3 py-1 rounded-lg text-xs font-medium mb-3">
                          {progName}
                        </span>
                      ) : null;
                    })()}

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
                      onClick={() => handleShowHistory(exercise)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#4ECDC4]/10 text-[#4ECDC4] py-2.5 rounded-xl hover:bg-[#4ECDC4]/20 transition-colors text-xs font-semibold"
                      title="Ağırlık ve Tekrar Geçmişi"
                    >
                      <History size={15} /> Geçmiş
                    </button>
                    <button
                      onClick={() => handleEdit(exercise)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#6366F1]/10 text-[#6366F1] py-2.5 rounded-xl hover:bg-[#6366F1]/20 transition-colors text-xs font-semibold"
                    >
                      <Edit2 size={15} /> Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(exercise.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#FF6B4A]/10 text-[#FF6B4A] py-2.5 rounded-xl hover:bg-[#FF6B4A]/20 transition-colors text-xs font-semibold"
                    >
                      <Trash2 size={15} /> Sil
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
                  disabled={importing}
                  className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  {importing ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
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
                    onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                    className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Tekrar Sayısı</label>
                  <input
                    type="number"
                    value={formData.reps}
                    onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                    className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Kas Grubu (Opsiyonel)</label>
                <input
                  type="text"
                  value={formData.muscleGroup}
                  onChange={(e) => setFormData({ ...formData, muscleGroup: e.target.value })}
                  className="w-full bg-[#0F0F0F] text-white rounded-lg px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  placeholder="Örn: Göğüs, Sırt, Bacak"
                />
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
      {/* Exercise Weight & Rep History Modal */}
      {showHistoryModal && historyExercise && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A] bg-[#141414]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4ECDC4]/10 flex items-center justify-center shrink-0 border border-[#4ECDC4]/20">
                  <History size={20} className="text-[#4ECDC4]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {historyExercise.name}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/20 font-medium">
                      Geçmiş Takibi
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {historyExercise.program_name ||
                      ((historyExercise.programId ?? historyExercise.program_id)
                        ? programNameMap.get(Number(historyExercise.programId ?? historyExercise.program_id))
                        : null) ||
                      'Antrenman Programı'}{' '}
                    · Kullanıcı ağırlık, tekrar ve ekipman notları
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryExercise(null);
                  setExerciseHistory([]);
                }}
                className="w-9 h-9 rounded-xl bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {historyLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#4ECDC4] border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Geçmiş verileri yükleniyor...</p>
                </div>
              ) : exerciseHistory.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#2A2A2A]/50 flex items-center justify-center mx-auto mb-4 text-gray-500">
                    <History size={28} />
                  </div>
                  <h4 className="text-white font-bold text-base mb-1">Henüz Antrenman Kaydı Yok</h4>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    Kullanıcılar mobil uygulamada bu egzersizi tamamladığında ağırlık (kg), tekrar ve makine ayar notları bu tabloda listelenecektir.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Max Weight */}
                    <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 font-medium">En Yüksek Ağırlık</span>
                        <TrendingUp size={16} className="text-[#4ECDC4]" />
                      </div>
                      <div className="text-2xl font-bold text-[#4ECDC4]">
                        {(() => {
                          const weights = exerciseHistory.map(h => Number(h.weight) || 0).filter(w => w > 0);
                          return weights.length > 0 ? `${Math.max(...weights)} kg` : 'Vücut Ağırlığı';
                        })()}
                      </div>
                    </div>

                    {/* Latest Weight */}
                    <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 font-medium">Son Antrenman</span>
                        <Calendar size={16} className="text-[#5DD97C]" />
                      </div>
                      <div className="text-2xl font-bold text-[#5DD97C]">
                        {exerciseHistory[0]?.weight ? `${exerciseHistory[0].weight} kg` : 'Vücut Ağırlığı'}
                      </div>
                    </div>

                    {/* Total Logs */}
                    <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 font-medium">Toplam Kayıt</span>
                        <Activity size={16} className="text-[#9B6FFF]" />
                      </div>
                      <div className="text-2xl font-bold text-[#9B6FFF]">
                        {exerciseHistory.length} Set/Kayıt
                      </div>
                    </div>
                  </div>

                  {/* History Table */}
                  <div className="border border-[#2A2A2A] rounded-xl overflow-hidden bg-[#141414]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#0F0F0F] text-gray-400 text-xs uppercase font-semibold border-b border-[#2A2A2A]">
                          <tr>
                            <th className="py-3 px-4">Tarih & Saat</th>
                            <th className="py-3 px-4">Kullanıcı</th>
                            <th className="py-3 px-4">Ağırlık</th>
                            <th className="py-3 px-4">Tekrar</th>
                            <th className="py-3 px-4">Set</th>
                            <th className="py-3 px-4">Ekipman / Makine Notu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2A]">
                          {exerciseHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-[#1E1E1E]/50 transition-colors">
                              <td className="py-3 px-4 text-gray-300 font-medium whitespace-nowrap">
                                {item.completedAt
                                  ? new Date(item.completedAt).toLocaleString('tr-TR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      timeZone: ISTANBUL_TZ,
                                    })
                                  : '-'}
                              </td>
                              <td className="py-3 px-4 text-white font-medium whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <User size={13} className="text-gray-400" />
                                  <span>{item.users?.name || `Kullanıcı #${item.userId}`}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/20">
                                  {item.weight !== null && item.weight !== undefined && Number(item.weight) > 0
                                    ? `${item.weight} kg`
                                    : 'Vücut Ağırlığı'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white font-bold whitespace-nowrap">
                                {item.reps} tekrar
                              </td>
                              <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                                {item.sets || 1} set
                              </td>
                              <td className="py-3 px-4">
                                {item.notes ? (
                                  <span className="inline-block text-xs text-gray-200 bg-[#1F1F1F] px-2.5 py-1 rounded-md border border-[#333] font-mono">
                                    {item.notes}
                                  </span>
                                ) : (
                                  <span className="text-gray-600 text-xs italic">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2A2A2A] bg-[#141414] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryExercise(null);
                  setExerciseHistory([]);
                }}
                className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
