import React, { useState } from 'react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
    const [importData, setImportData] = useState('');
    const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
    const [importType, setImportType] = useState<'all' | 'programs' | 'exercises'>('all');

    const handleImport = async () => {
        if (!importData.trim()) {
            alert('Lütfen veri girin');
            return;
        }

        try {
            let parsedData;

            if (importFormat === 'json') {
                try {
                    parsedData = JSON.parse(importData);
                } catch (parseError: any) {
                    alert('JSON formatı hatalı!\n\nHata: ' + parseError.message + '\n\nLütfen JSON formatını kontrol edin.');
                    return;
                }
            } else {
                parsedData = importData;
            }

            const response = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: parsedData,
                    format: importFormat,
                    type: importType,
                }),
            });

            const result = await response.json();

            console.log('Import result:', result);

            if (result.success) {
                alert('✅ Başarılı!\n\n' + result.message);
                await onSuccess();
                onClose();
                setImportData('');
            } else {
                let errorMsg = '❌ İçe aktarma başarısız!\n\n';
                errorMsg += 'Hata: ' + (result.error || 'Bilinmeyen hata') + '\n';
                if (result.details) {
                    errorMsg += '\nDetay: ' + result.details;
                }
                alert(errorMsg);
            }
        } catch (error: any) {
            console.error('Import error:', error);
            alert('❌ İçe aktarma başarısız!\n\nHata: ' + (error.message || 'Bilinmeyen hata') + '\n\nKonsolu kontrol edin.');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setImportData(content);

            if (file.name.endsWith('.json')) {
                setImportFormat('json');
            } else if (file.name.endsWith('.csv')) {
                setImportFormat('csv');
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] max-w-2xl w-full mx-4">
                <h3 className="text-xl font-bold text-white mb-4">Veri İçe Aktar</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-2">Format</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setImportFormat('json')}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${importFormat === 'json'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                                    }`}
                            >
                                JSON
                            </button>
                            <button
                                onClick={() => setImportFormat('csv')}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${importFormat === 'csv'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                                    }`}
                            >
                                CSV
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 mb-2">İçe Aktarılacak Veri</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setImportType('all')}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${importType === 'all'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                                    }`}
                            >
                                Tümü
                            </button>
                            <button
                                onClick={() => setImportType('programs')}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${importType === 'programs'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                                    }`}
                            >
                                Programlar
                            </button>
                            <button
                                onClick={() => setImportType('exercises')}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${importType === 'exercises'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                                    }`}
                            >
                                Hareketler
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 mb-2">Dosya Seç</label>
                        <input
                            type="file"
                            accept=".json,.csv"
                            onChange={handleFileUpload}
                            className="w-full bg-[#0F0F0F] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:outline-none focus:border-[#6366F1]"
                        />
                    </div>

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

                    <div className="flex gap-3">
                        <button
                            onClick={handleImport}
                            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium transition-colors"
                        >
                            İçe Aktar
                        </button>
                        <button
                            onClick={() => {
                                onClose();
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
    );
}
