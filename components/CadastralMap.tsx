// components/CadastralMap.tsx
'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Map, {
    Source,
    Layer,
    Popup,
    MapRef,
    ViewState,
    MapLayerMouseEvent
} from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface PopupInfo {
    longitude: number
    latitude: number
    properties: any
    geometry: any
}

interface CadastralData {
    type: 'FeatureCollection'
    features: any[]
}

interface CoordinateOffset {
    latitude: number
    longitude: number
    enabled: boolean
}

interface CadastralMapProps {
    coordinateOffset?: CoordinateOffset
}

// Function to apply coordinate offset to GeoJSON data
const applyCoordinateOffset = (geoJsonData: any, offset: CoordinateOffset) => {
    if (!offset.enabled || (!offset.latitude && !offset.longitude)) {
        return geoJsonData
    }

    const offsetCoordinate = (coord: [number, number]): [number, number] => {
        return [
            coord[0] + offset.longitude,  // longitude
            coord[1] + offset.latitude    // latitude
        ]
    }

    const offsetCoordinateArray = (coords: any): any => {
        if (typeof coords[0] === 'number') {
            // This is a coordinate pair
            return offsetCoordinate(coords as [number, number])
        } else if (Array.isArray(coords[0])) {
            // This is an array of coordinates or nested arrays
            return coords.map((item: any) => offsetCoordinateArray(item))
        }
        return coords
    }

    return {
        ...geoJsonData,
        features: geoJsonData.features.map((feature: any) => ({
            ...feature,
            geometry: {
                ...feature.geometry,
                coordinates: offsetCoordinateArray(feature.geometry.coordinates)
            }
        }))
    }
}

const CadastralMap = ({ coordinateOffset = { latitude: 0, longitude: 0, enabled: false } }: CadastralMapProps) => {
    const mapRef = useRef<MapRef>(null)
    const [loading, setLoading] = useState(false)
    const [dataLoading, setDataLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)
    const [selectedFilter, setSelectedFilter] = useState('all')

    const [rawCadastralData, setRawCadastralData] = useState<CadastralData | null>(null)
    const [displayData, setDisplayData] = useState<CadastralData | null>(null)

    const [viewState, setViewState] = useState<ViewState>({
        longitude: 98.6,
        latitude: 3.62,
        zoom: 12,
        bearing: 0,
        pitch: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 }
    })

    // Get Mapbox token from environment variables
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

    // Apply offset whenever offset changes or raw data changes
    useEffect(() => {
        if (rawCadastralData) {
            const correctedData = applyCoordinateOffset(rawCadastralData, coordinateOffset)
            setDisplayData(correctedData)
        }
    }, [rawCadastralData, coordinateOffset])

    // Load cadastral data from API with offset support
    const loadCadastralData = useCallback(async (searchTerm?: string) => {
        setDataLoading(true)
        try {
            const params = new URLSearchParams()
            if (searchTerm) params.append('search', searchTerm)

            const response = await fetch(`/api/cadastral-data?${params}`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            // Handle different response formats
            if (data.error) {
                console.error('API Error:', data.error)
                setRawCadastralData({ type: 'FeatureCollection', features: [] })
            } else if (data.features && Array.isArray(data.features)) {
                // Store raw data
                setRawCadastralData(data)
            } else if (data.type === 'FeatureCollection') {
                setRawCadastralData(data)
            } else {
                console.log('No cadastral data found, starting with empty dataset')
                setRawCadastralData({ type: 'FeatureCollection', features: [] })
            }
        } catch (error) {
            console.error('Error loading cadastral data:', error)
            // Set empty data instead of leaving it null
            setRawCadastralData({ type: 'FeatureCollection', features: [] })
        } finally {
            setDataLoading(false)
        }
    }, [])

    // Load data on component mount
    useEffect(() => {
        loadCadastralData()
    }, [loadCadastralData])

    // Helper function to extract coordinates from geometry
    const extractCoordinates = (geometry: any): number[][] => {
        if (geometry.type === 'Polygon') {
            return geometry.coordinates[0] as number[][]
        } else if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates[0][0] as number[][]
        }
        return []
    }

    // Filter data based on selected filter
    const filteredData = displayData ? {
        ...displayData,
        features: displayData.features.filter(feature => {
            if (selectedFilter === 'all') return true
            return feature.properties.status === selectedFilter ||
                feature.properties.tipe_hak === selectedFilter
        })
    } : null

    // Layer styles
    const parcelFillLayer = {
        id: 'cadastral-parcels-fill',
        type: 'fill' as const,
        paint: {
            'fill-color': [
                'case',
                ['==', ['get', 'tipe_hak'], 'Hak Guna Usaha'], '#10b981',
                ['==', ['get', 'tipe_hak'], 'HGU'], '#10b981',
                ['==', ['get', 'tipe_hak'], 'Hak Milik'], '#3b82f6',
                ['==', ['get', 'tipe_hak'], 'HM'], '#3b82f6',
                ['==', ['get', 'tipe_hak'], 'Hak Pakai'], '#f59e0b',
                ['==', ['get', 'status'], 'pending'], '#ef4444',
                '#6b7280'
            ] as any,
            'fill-opacity': 0.6
        }
    }

    const parcelBorderLayer = {
        id: 'cadastral-parcels-border',
        type: 'line' as const,
        paint: {
            'line-color': '#374151',
            'line-width': [
                'case',
                ['==', ['get', 'status'], 'active'], 2,
                1
            ] as any
        }
    }

    const highlightLayer = {
        id: 'cadastral-parcels-highlight',
        type: 'line' as const,
        paint: {
            'line-color': '#fbbf24',
            'line-width': 3,
            'line-opacity': 0.8
        },
        filter: ['==', ['get', 'id'], ''] as any
    }

    // Handle map click to show parcel details
    const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (feature && feature.properties && feature.geometry) {
            setPopupInfo({
                longitude: event.lngLat.lng,
                latitude: event.lngLat.lat,
                properties: feature.properties,
                geometry: feature.geometry
            })

            // Highlight the clicked parcel
            if (mapRef.current) {
                mapRef.current.getMap().setFilter('cadastral-parcels-highlight', [
                    '==', ['get', 'id'], feature.properties.id
                ] as any)
            }
        }
    }, [])

    // Search functionality
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            loadCadastralData()
            return
        }

        setLoading(true)
        try {
            await loadCadastralData(searchQuery.trim())

            // If we have results, zoom to first match
            if (filteredData && filteredData.features.length > 0) {
                const firstMatch = filteredData.features[0]
                const coords = extractCoordinates(firstMatch.geometry)

                if (coords.length > 0) {
                    const lngs = coords.map(coord => coord[0])
                    const lats = coords.map(coord => coord[1])

                    const bounds: [[number, number], [number, number]] = [
                        [Math.min(...lngs), Math.min(...lats)],
                        [Math.max(...lngs), Math.max(...lats)]
                    ]

                    mapRef.current?.fitBounds(bounds, {
                        padding: 100,
                        duration: 1000,
                        maxZoom: 16
                    })
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
    }, [searchQuery, filteredData, loadCadastralData])

    // Format area for display
    const formatArea = (area: number | string) => {
        if (!area) return 'N/A'
        const numArea = typeof area === 'string' ? parseFloat(area) : area
        if (numArea >= 10000) {
            return `${(numArea / 10000).toFixed(2)} ha`
        }
        return `${numArea.toFixed(2)} m²`
    }

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === '-') return 'N/A'
        try {
            return new Date(dateStr).toLocaleDateString('id-ID')
        } catch {
            return dateStr
        }
    }

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
            {/* Search and Filter Bar */}
            <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 min-w-80">
                <div className="space-y-3">
                    {/* Navigation */}
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-800">📍 Cadastral System</h3>
                        <a
                            href="/admin/import"
                            className="ml-auto px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                        >
                            📤 Upload Data
                        </a>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by owner, parcel ID, location..."
                            className="outline-none text-sm flex-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading || dataLoading}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    {/* Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Filter:</span>
                        <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            className="text-sm border rounded px-2 py-1 outline-none"
                            disabled={!displayData || displayData.features.length === 0}
                        >
                            <option value="all">All Parcels</option>
                            <option value="Hak Guna Usaha">HGU (Hak Guna Usaha)</option>
                            <option value="Hak Milik">HM (Hak Milik)</option>
                            <option value="Hak Pakai">HP (Hak Pakai)</option>
                            <option value="active">Active Status</option>
                            <option value="pending">Pending Status</option>
                        </select>
                    </div>

                    {/* Coordinate Offset Status */}
                    {coordinateOffset.enabled && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2 text-orange-800">
                                <span className="text-xs">🔧</span>
                                <span className="text-xs font-medium">Coordinate correction active</span>
                            </div>
                            <p className="text-xs text-orange-700 mt-1">
                                Offset: {(coordinateOffset.latitude * 111320).toFixed(1)}m N/S, {(coordinateOffset.longitude * 111320).toFixed(1)}m E/W
                            </p>
                        </div>
                    )}

                    {/* Show message when no data */}
                    {displayData && displayData.features.length === 0 && !dataLoading && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" x2="12" y1="9" y2="13" />
                                    <line x1="12" x2="12.01" y1="17" y2="17" />
                                </svg>
                                <span className="text-sm font-medium">No cadastral data found</span>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">
                                Upload your GeoJSON or shapefile data to get started.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Statistics */}
            <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4">
                <div className="text-sm text-gray-600">
                    <div className="font-semibold mb-2">📊 Cadastral Statistics</div>
                    <div>Total Parcels: {filteredData?.features.length || 0}</div>

                    {displayData && displayData.features.length > 0 ? (
                        <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded"></div>
                                <span className="text-xs">HGU ({displayData.features.filter(f => f.properties.tipe_hak === 'Hak Guna Usaha' || f.properties.tipe_hak === 'HGU').length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                <span className="text-xs">Hak Milik ({displayData.features.filter(f => f.properties.tipe_hak === 'Hak Milik' || f.properties.tipe_hak === 'HM').length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                                <span className="text-xs">Hak Pakai ({displayData.features.filter(f => f.properties.tipe_hak === 'Hak Pakai' || f.properties.tipe_hak === 'HP').length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded"></div>
                                <span className="text-xs">Issues ({displayData.features.filter(f => f.properties.kasus && f.properties.kasus !== '-').length})</span>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2 text-xs text-gray-500">
                            No data to display
                        </div>
                    )}
                </div>
            </div>

            {/* Loading indicator */}
            {dataLoading && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-lg p-4 shadow-lg">
                    <div className="flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                        </svg>
                        <span>Loading cadastral data...</span>
                    </div>
                </div>
            )}

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
                {filteredData && filteredData.features.length > 0 && (
                    <Source id="cadastral-data" type="geojson" data={filteredData}>
                        <Layer {...parcelFillLayer} />
                        <Layer {...parcelBorderLayer} />
                        <Layer {...highlightLayer} />
                    </Source>
                )}

                {/* Enhanced Popup for parcel details */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.longitude}
                        latitude={popupInfo.latitude}
                        anchor="bottom"
                        onClose={() => {
                            setPopupInfo(null)
                            // Clear highlight
                            if (mapRef.current) {
                                mapRef.current.getMap().setFilter('cadastral-parcels-highlight', ['==', ['get', 'id'], ''])
                            }
                        }}
                        closeButton={true}
                        closeOnClick={false}
                        maxWidth="400px"
                    >
                        <div className="p-3 max-h-80 overflow-y-auto">
                            <h3 className="font-semibold text-base mb-3 border-b pb-2">
                                📍 {popupInfo.properties.parcel_id || 'Unknown Parcel'}
                            </h3>

                            <div className="space-y-2 text-sm">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div><strong>Province:</strong></div>
                                    <div>{popupInfo.properties.provinsi || 'N/A'}</div>

                                    <div><strong>Regency:</strong></div>
                                    <div>{popupInfo.properties.kabupaten || 'N/A'}</div>
                                </div>

                                {/* Owner Information */}
                                <div className="border-t pt-2">
                                    <div className="font-medium text-gray-700 mb-1">Owner Information</div>
                                    <div><strong>Owner:</strong> {popupInfo.properties.pemilik || 'N/A'}</div>
                                    <div><strong>Owner Type:</strong> {popupInfo.properties.tipe_pemilik || 'N/A'}</div>
                                </div>

                                {/* Land Rights */}
                                <div className="border-t pt-2">
                                    <div className="font-medium text-gray-700 mb-1">Land Rights</div>
                                    <div><strong>Rights Type:</strong> {popupInfo.properties.tipe_hak || 'N/A'}</div>
                                    <div><strong>Certificate:</strong> {popupInfo.properties.hak || 'N/A'}</div>
                                    <div><strong>Decree:</strong> {popupInfo.properties.sk || 'N/A'}</div>
                                </div>

                                {/* Area Information */}
                                <div className="border-t pt-2">
                                    <div className="font-medium text-gray-700 mb-1">Area Information</div>
                                    <div><strong>Written Area:</strong> {formatArea(popupInfo.properties.luas_tertulis)}</div>
                                    <div><strong>Measured Area:</strong> {formatArea(popupInfo.properties.luas_peta)}</div>
                                </div>

                                {/* Land Use */}
                                <div className="border-t pt-2">
                                    <div className="font-medium text-gray-700 mb-1">Land Use</div>
                                    <div><strong>Classification:</strong> {popupInfo.properties.guna_tanah_klasifikasi || 'N/A'}</div>
                                    <div><strong>Primary Use:</strong> {popupInfo.properties.guna_tanah_utama || 'N/A'}</div>
                                    <div><strong>Current Usage:</strong> {popupInfo.properties.penggunaan || 'N/A'}</div>
                                </div>

                                {/* Dates */}
                                <div className="border-t pt-2">
                                    <div className="font-medium text-gray-700 mb-1">Important Dates</div>
                                    <div><strong>Rights Issued:</strong> {formatDate(popupInfo.properties.tanggal_terbit_hak)}</div>
                                    <div><strong>Rights Expire:</strong> {formatDate(popupInfo.properties.berakhir_hak)}</div>
                                </div>

                                {/* Issues */}
                                {popupInfo.properties.kasus && popupInfo.properties.kasus !== '-' && (
                                    <div className="border-t pt-2">
                                        <div className="font-medium text-red-700 mb-1">Issues</div>
                                        <div><strong>Problem:</strong> {popupInfo.properties.kasus}</div>
                                        {popupInfo.properties.solusi && (
                                            <div><strong>Solution:</strong> {popupInfo.properties.solusi}</div>
                                        )}
                                    </div>
                                )}

                                {/* Status */}
                                <div className="border-t pt-2">
                                    <div><strong>Status:</strong>
                                        <span className={`ml-1 px-2 py-0.5 rounded text-xs ${popupInfo.properties.status === 'active' ? 'bg-green-100 text-green-800' :
                                            popupInfo.properties.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {popupInfo.properties.status || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-2 border-t">
                                <button className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                                    📝 Edit Details
                                </button>
                                <button className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                                    📄 View Documents
                                </button>
                                <button
                                    onClick={() => {
                                        const coords = extractCoordinates(popupInfo.geometry)
                                        if (coords.length > 0) {
                                            const lngs = coords.map(c => c[0])
                                            const lats = coords.map(c => c[1])
                                            const bounds: [[number, number], [number, number]] = [
                                                [Math.min(...lngs), Math.min(...lats)],
                                                [Math.max(...lngs), Math.max(...lats)]
                                            ]
                                            mapRef.current?.fitBounds(bounds, { padding: 50, duration: 1000 })
                                        }
                                    }}
                                    className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                                >
                                    🔍 Zoom to Parcel
                                </button>
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>
        </div>
    )
}

export default CadastralMap