'use client';

import { useState } from 'react';
import FloatingSidebar from '@/components/FloatingSidebar';
import Header from '@/components/Header';
import { ConfirmProvider } from '@/components/ConfirmModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <ConfirmProvider>
      <div className="flex h-screen overflow-hidden">
        <FloatingSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((prev) => !prev)}
        />
        <div
          className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ${
            sidebarExpanded ? 'ml-[104px] md:ml-[288px]' : 'ml-[104px]'
          }`}
        >
          <Header />
          <main className="flex-1 overflow-y-auto bg-[#0A0A0A]">
            {children}
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
