'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the map component to avoid SSR issues
const CadastralMap = dynamic(() => import('@/components/CadastralMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex items-center gap-2">
        <span>Loading map...</span>
      </div>
    </div>
  )
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="h-full w-full relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-3">
            <h1 className="text-xl font-bold text-gray-900">
              Cadastral Mapping System
            </h1>
            <div className="text-sm text-gray-600">
              Interactive Parcel Viewer
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-full w-full pt-16">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="flex items-center gap-2">
                <span>Initializing map...</span>
              </div>
            </div>
          }>
            <CadastralMap />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
