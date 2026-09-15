import React, { useState } from 'react';
import { Globe, User } from 'lucide-react';

interface AddProgramModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
    users: any[];
}

export default function AddProgramModal({ isOpen, onClose, onSuccess, users }: AddProgramModalProps) {
    const [programType, setProgramType] = useState<'general' | 'user-specific' | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [newProgram, setNewProgram] = useState({ name: '', isPrimary: false });

    const handleAddProgram = async () => {
        if (!newProgram.name.trim()) {
            alert('Program adı gerekli');
            return;
        }

        if (programType === 'user-specific' && !selectedUserId) {
            alert('Lütfen bir kullanıcı seçin');
            return;
        }

        try {
            const payload = {
                ...newProgram,
                userId: programType === 'user-specific' ? selectedUserId : null
            };

            const response = await fetch('/api/programs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                await onSuccess();

                // Reset state
                setProgramType(null);
                setSelectedUserId(null);
                setNewProgram({ name: '', isPrimary: false });
                onClose();
            }
        } catch (error) {
            console.error('Error adding program:', error);
        }
    };

    const handleCancel = () => {
        setProgramType(null);
        setSelectedUserId(null);
        setNewProgram({ name: '', isPrimary: false });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
            <h3 className="text-xl font-bold text-white mb-4">Yeni Program Ekle</h3>

            {!programType ? (
                <div className="space-y-3">
                    <p className="text-gray-400 mb-4">Program türünü seçin:</p>
                    <button
                        onClick={() => setProgramType('general')}
                        className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E3] hover:to-[#7C3AED] text-white p-6 rounded-xl font-semibold transition-all text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-xl"><Globe size={24} /></div>
                            <div>
                                <div className="text-lg font-bold">Genel Program</div>
                                <div className="text-sm text-white/80">Tüm kullanıcılar için görünür</div>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => setProgramType('user-specific')}
                        className="w-full bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#0EA472] hover:to-[#047857] text-white p-6 rounded-xl font-semibold transition-all text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-xl"><User size={24} /></div>
                            <div>
                                <div className="text-lg font-bold">Kullanıcıya Özel</div>
                                <div className="text-sm text-white/80">Belirli bir kullanıcıya atanır</div>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={handleCancel}
                        className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl font-medium transition-colors"
                    >
                        İptal
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {programType === 'user-specific' && (
                        <div>
                            <label className="block text-gray-400 mb-2">Kullanıcı Seçin</label>
                            <select
                                value={selectedUserId || ''}
                                onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                            >
                                <option value="">Kullanıcı Seçin</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

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
                            className="w-5 h-5 accent-[#6366F1] bg-[#0F0F0F] border-[#2A2A2A]"
                        />
                        <label className="text-gray-400">Birincil program olarak ayarla</label>
                    </div>

                    <div className={`p-4 rounded-xl ${programType === 'general'
                            ? 'bg-[#6366F1]/10 border border-[#6366F1]/30'
                            : 'bg-[#10B981]/10 border border-[#10B981]/30'
                        }`}>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${programType === 'general' ? 'bg-[#6366F1]/20 text-[#6366F1]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
                                {programType === 'general' ? <Globe size={20} /> : <User size={20} />}
                            </div>
                            <div>
                                <div className={`font-semibold mb-1 ${programType === 'general' ? 'text-[#6366F1]' : 'text-[#10B981]'
                                    }`}>
                                    {programType === 'general' ? 'Genel Program' : 'Kullanıcıya Özel Program'}
                                </div>
                                <div className="text-sm text-gray-400">
                                    {programType === 'general'
                                        ? 'Bu program tüm kullanıcılar tarafından görülebilir ve kullanılabilir.'
                                        : 'Bu program sadece seçilen kullanıcıya atanacak ve ona özel olacak.'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={handleAddProgram}
                            className="flex-1 bg-[#5DD97C] hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
                        >
                            ✓ Programı Oluştur
                        </button>
                        <button
                            onClick={() => {
                                setProgramType(null);
                                setSelectedUserId(null);
                            }}
                            className="px-6 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl font-medium transition-colors"
                        >
                            ← Geri
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-6 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-xl font-medium transition-colors"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
