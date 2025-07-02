// app/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const CadastralMap = dynamic(() => import('../components/CadastralMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <span>Loading map...</span>
      </div>
    </div>
  )
})

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="h-full w-full relative">
        {/* App title header */}
        <div className="absolute top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-3">
            <h1 className="text-xl font-bold text-gray-900">
              📍 Cadastral Mapping System
            </h1>
            <div className="text-sm text-gray-600">
              Interactive Parcel Viewer
            </div>
          </div>
        </div>

        {/* Map container */}
        <div className="h-full w-full pt-16">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                <span>Initializing map...</span>
              </div>
            </div>
          }>
            <CadastralMap />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
