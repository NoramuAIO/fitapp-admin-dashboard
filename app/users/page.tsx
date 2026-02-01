'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import UsersPage from '@/components/UsersPage';
import { useState } from 'react';

export default function Users() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="flex h-screen bg-[#0F0F0F]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <UsersPage />
        </main>
      </div>
    </div>
  );
}
