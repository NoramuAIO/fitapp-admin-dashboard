'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TimePage from '@/components/TimePage';
import { useState } from 'react';

export default function Time() {
  const [activeTab, setActiveTab] = useState('time');

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <TimePage />
        </main>
      </div>
    </div>
  );
}
