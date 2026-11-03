'use client';

import { Suspense } from 'react';
import AnalyticsPage from '@/components/AnalyticsPage';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Analiz verileri yükleniyor...</p>
      </div>
    }>
      <AnalyticsPage />
    </Suspense>
  );
}
