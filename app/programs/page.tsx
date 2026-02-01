'use client';

import Header from '@/components/Header';
import ProgramsPage from '@/components/ProgramsPage';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

export default function Programs() {
  const [activeTab, setActiveTab] = useState('programs');

  return (
    <div className="flex h-screen bg-[#0F0F0F]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <ProgramsPage />
        </main>
      </div>
    </div>
  );
}
