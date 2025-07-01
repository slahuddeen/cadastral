'use client'

import React, { useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

const CadastralMap = () => {
  const [loading, setLoading] = useState(false)

  return (
    <div className="relative h-full w-full">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by owner name..."
            className="outline-none text-sm w-64"
          />
          <button 
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="h-full w-full bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-2">🗺️ Map Loading...</h2>
          <p className="text-gray-600">Add your Mapbox token to see the interactive map</p>
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-500">
              Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment variables
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CadastralMap