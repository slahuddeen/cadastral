'use client'

import React, { useState, useCallback, useRef } from 'react'
import Map, { 
  Source, 
  Layer, 
  Popup, 
  MapRef,
  ViewState,
  MapLayerMouseEvent
} from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Sample cadastral data - replace this with your actual data source
const sampleCadastralData = {
  "type": "FeatureCollection" as const,
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "1",
        "parcel_id": "PARCEL_001",
        "owner_name": "John Doe",
        "land_use": "Residential",
        "area_sqm": 1500,
        "status": "active"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [98.61325979232788, 3.6191095821497044],
          [98.61319541931152, 3.618317231252732],
          [98.60620021820068, 3.6186812844536007],
          [98.60624313354492, 3.61930231604687],
          [98.61325979232788, 3.6191095821497044]
        ]]
      }
    },
    // Add the sample data from your documents
    {
      "type": "Feature",
      "properties": {
        "id": "2",
        "parcel_id": "PARCEL_002", 
        "owner_name": "Sample Owner",
        "land_use": "Agricultural",
        "area_sqm": 2500,
        "status": "active"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [[
            [98.61325979232788, 3.6191095821497044],
            [98.61319541931152, 3.618317231252732],
            [98.60620021820068, 3.6186812844536007],
            [98.60624313354492, 3.61930231604687],
            [98.61325979232788, 3.6191095821497044]
          ]],
          [[
            [98.60130786895752, 3.6192594862954905],
            [98.60158681869507, 3.6194308052888715],
            [98.6056637763977, 3.6193237309218063],
            [98.60562086105347, 3.6190667523891875],
            [98.60502004623413, 3.6190025077446535],
            [98.60502004623413, 3.6187669440090247],
            [98.60152244567871, 3.618895433326955],
            [98.60130786895752, 3.6192594862954905]
          ]]
        ]
      }
    }
  ]
}

interface PopupInfo {
  longitude: number
  latitude: number
  properties: any
}

const CadastralMap = () => {
  const mapRef = useRef<MapRef>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 98.6,
    latitude: 3.62,
    zoom: 14,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  })

  // Get Mapbox token from environment variables
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

  // Helper function to extract coordinates from geometry
  const extractCoordinates = (geometry: any): number[][] => {
    if (geometry.type === 'Polygon') {
      return geometry.coordinates[0] as number[][]
    } else if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates[0][0] as number[][]
    }
    return []
  }

  // Layer styles for cadastral parcels
  const parcelLayerStyle = {
    id: 'cadastral-parcels-fill',
    type: 'fill' as const,
    paint: {
      'fill-color': [
        'case',
        ['==', ['get', 'status'], 'active'], '#10b981',
        ['==', ['get', 'status'], 'pending'], '#f59e0b', 
        '#ef4444'
      ],
      'fill-opacity': 0.6
    }
  }

  const parcelBorderLayerStyle = {
    id: 'cadastral-parcels-border',
    type: 'line' as const,
    paint: {
      'line-color': '#374151',
      'line-width': 2
    }
  }

  // Handle map click to show parcel details
  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0]
    if (feature && feature.geometry?.type !== 'Point' && feature.properties) {
      setPopupInfo({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        properties: feature.properties
      })
    }
  }, [])

  // Search functionality
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      // Find parcels matching the search query
      const matchingFeatures = sampleCadastralData.features.filter(feature => 
        feature.properties?.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.properties?.parcel_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )

      if (matchingFeatures.length > 0) {
        const firstMatch = matchingFeatures[0]
        
        // Calculate bounds for the matched parcel using helper function
        const coords = extractCoordinates(firstMatch.geometry)
        if (coords.length > 0) {
          const lngs = coords.map(coord => coord[0]).filter((lng): lng is number => typeof lng === 'number')
          const lats = coords.map(coord => coord[1]).filter((lat): lat is number => typeof lat === 'number')
          
          if (lngs.length > 0 && lats.length > 0) {
            const bounds: [[number, number], [number, number]] = [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)]
            ]
            
            mapRef.current?.fitBounds(bounds, { 
              padding: 50, 
              duration: 1000,
              maxZoom: 16
            })
            
            // Show popup for the found parcel
            setPopupInfo({
              longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
              latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
              properties: firstMatch.properties
            })
          }
        }
      } else {
        alert('No parcels found matching your search')
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  // Check if Mapbox token is available
  if (!mapboxToken) {
    return (
      <div className="relative h-full w-full bg-red-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">🔑 Mapbox Token Missing</h2>
          <p className="text-gray-700 mb-4">
            Your Mapbox access token is not configured properly.
          </p>
          <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded">
            <p><strong>Check your environment variables:</strong></p>
            <code className="block mt-2">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here</code>
          </div>
        </div>
      </div>
    )
  }

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
            placeholder="Search by owner name or parcel ID..."
            className="outline-none text-sm w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Map Statistics */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3">
        <div className="text-sm text-gray-600">
          <div className="font-semibold mb-1">📊 Map Statistics</div>
          <div>Total Parcels: {sampleCadastralData.features.length}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-xs">Active</span>
            <div className="w-3 h-3 bg-yellow-500 rounded ml-2"></div>
            <span className="text-xs">Pending</span>
          </div>
        </div>
      </div>

      {/* Mapbox Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        interactiveLayerIds={['cadastral-parcels-fill']}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Cadastral Data Source and Layers */}
        <Source id="cadastral-data" type="geojson" data={sampleCadastralData}>
          <Layer {...parcelLayerStyle} />
          <Layer {...parcelBorderLayerStyle} />
        </Source>

        {/* Popup for parcel details */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            maxWidth="300px"
          >
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-2">
                📍 {popupInfo.properties.parcel_id}
              </h3>
              <div className="text-xs space-y-1">
                <div><strong>Owner:</strong> {popupInfo.properties.owner_name}</div>
                <div><strong>Land Use:</strong> {popupInfo.properties.land_use}</div>
                <div><strong>Area:</strong> {popupInfo.properties.area_sqm} m²</div>
                <div><strong>Status:</strong> 
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                    popupInfo.properties.status === 'active' ? 'bg-green-100 text-green-800' : 
                    popupInfo.properties.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {popupInfo.properties.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                  📝 Edit
                </button>
                <button className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600">
                  📄 Details
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-4 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CadastralMap
