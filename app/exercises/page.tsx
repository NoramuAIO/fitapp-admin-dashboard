'use client';

import ExercisesPage from '@/components/ExercisesPage';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

export default function Exercises() {
  const [activeTab, setActiveTab] = useState('exercises');

  return (
    <div className="flex h-screen bg-[#0F0F0F]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <ExercisesPage />
        </main>
      </div>
    </div>
  );
}
