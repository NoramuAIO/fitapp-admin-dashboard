'use client';
import { Suspense } from 'react';
import ExercisesPage from '@/components/ExercisesPage';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-white text-xl">Yükleniyor...</div>
        </div>
      }
    >
      <ExercisesPage />
    </Suspense>
  );
}
