import React from 'react';

export default function ActivityCards() {
    return (
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
    );
}
