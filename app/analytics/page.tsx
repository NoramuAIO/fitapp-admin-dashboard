'use client';

import AnalyticsPage from '@/components/AnalyticsPage';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <AnalyticsPage />
        </main>
      </div>
    </div>
  );
}
