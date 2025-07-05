// app/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import NavigationHeader from '../components/NavigationHeader'

interface CoordinateOffset {
    latitude: number
    longitude: number
    enabled: boolean
}

const CadastralMap = dynamic(() => import('../components/CadastralMap'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="flex flex-col items-center gap-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-blue-600">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">Loading Cadastral Map</div>
                    <div className="text-sm text-gray-600">Initializing spatial data viewer...</div>
                </div>
            </div>
        </div>
    )
})

export default function Home() {
    const [coordinateOffset, setCoordinateOffset] = useState<CoordinateOffset>({
        latitude: 0,
        longitude: 0,
        enabled: false
    })

    const handleCoordinateOffsetChange = (newOffset: CoordinateOffset) => {
        setCoordinateOffset(newOffset)
    }

    return (
        <main className="h-screen w-screen overflow-hidden flex flex-col">
            {/* Navigation Header with coordinate fix functionality */}
            <NavigationHeader
                onCoordinateOffsetChange={handleCoordinateOffsetChange}
                currentOffset={coordinateOffset}
            />

            {/* Map Container */}
            <div className="flex-1 relative">
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full bg-gray-100">
                        <div className="flex flex-col items-center gap-4">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-blue-600">
                                <path d="M21 12a9 9 0 11-6.219-8.56" />
                            </svg>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">Initializing Map</div>
                                <div className="text-sm text-gray-600">Loading spatial components...</div>
                            </div>
                        </div>
                    </div>
                }>
                    <CadastralMap coordinateOffset={coordinateOffset} />
                </Suspense>
            </div>
        </main>
    )
}