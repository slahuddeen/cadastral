// app/debug-coordinates/page.tsx
'use client'

import { useState, useEffect } from 'react'

interface CoordinateDebugInfo {
    parcel_id: string
    pemilik: string
    first_coordinate: [number, number]
    coordinate_analysis: any
    raw_geometry: any
}

interface DebugResponse {
    sample_parcels: CoordinateDebugInfo[]
    coordinate_pattern_analysis: any
    expected_indonesia_bounds: any
}

export default function CoordinateDebugPage() {
    const [debugData, setDebugData] = useState<DebugResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchDebugData = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/debug-coordinates?limit=10')
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()
            setDebugData(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch debug data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDebugData()
    }, [])

    const expectedSumatraCoordinates = [
        { name: "Medan", coords: [98.6667, 3.5833] },
        { name: "Padang", coords: [100.3543, -0.9471] },
        { name: "Palembang", coords: [104.7458, -2.9761] },
        { name: "Pekanbaru", coords: [101.4500, 0.5167] },
        { name: "Banda Aceh", coords: [95.3222, 5.5481] }
    ]

    const isCoordinateInSumatra = (coord: [number, number]) => {
        const [lon, lat] = coord
        return lon >= 95 && lon <= 106 && lat >= -6 && lat <= 6
    }

    const getCoordinateStatus = (coord: [number, number]) => {
        if (!coord || coord.length !== 2) return '❌ Invalid'

        const [x, y] = coord

        if (isCoordinateInSumatra([x, y])) {
            return '✅ Valid Sumatra'
        }

        if (isCoordinateInSumatra([y, x])) {
            return '⚠️ Swapped? (try [' + y + ', ' + x + '])'
        }

        if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
            return '⚠️ Valid geographic but outside Sumatra'
        }

        return '❌ Invalid coordinates'
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">🐛 Coordinate Alignment Debug Tool</h1>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Debug Actions</h2>
                    <button
                        onClick={fetchDebugData}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : '🔄 Refresh Debug Data'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <a
                        href="/api/debug-coordinates"
                        target="_blank"
                        className="p-3 border rounded-lg hover:bg-gray-50 text-center"
                    >
                        📊 View Raw API Response
                    </a>
                    <a
                        href="https://www.google.com/maps/@3.6,98.6,10z"
                        target="_blank"
                        className="p-3 border rounded-lg hover:bg-gray-50 text-center"
                    >
                        🗺️ Expected Region (Google Maps)
                    </a>
                    <a
                        href="/"
                        className="p-3 border rounded-lg hover:bg-gray-50 text-center"
                    >
                        🏠 Back to Map View
                    </a>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-red-800 mb-2">Error</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Expected Coordinates Reference */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">📍 Expected Sumatra Region Coordinates</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    {expectedSumatraCoordinates.map((city, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                            <div className="font-medium">{city.name}</div>
                            <div className="text-gray-600">
                                {city.coords[0].toFixed(4)}, {city.coords[1].toFixed(4)}
                            </div>
                            <div className="text-xs text-gray-500">
                                Lon: {city.coords[0]}°E<br />
                                Lat: {city.coords[1]}°N
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 text-sm text-blue-700">
                    <strong>Expected Range:</strong> Longitude 95°E to 106°E, Latitude 6°S to 6°N
                </div>
            </div>

            {/* Debug Results */}
            {debugData && (
                <>
                    {/* Pattern Analysis */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">📊 Coordinate Pattern Analysis</h2>

                        {debugData.coordinate_pattern_analysis && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="bg-gray-50 p-3 rounded">
                                        <div className="font-medium">Sample Count</div>
                                        <div className="text-lg">{debugData.coordinate_pattern_analysis.sample_count}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <div className="font-medium">Coordinate System</div>
                                        <div className="text-lg">{debugData.coordinate_pattern_analysis.likely_coordinate_system}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <div className="font-medium">Geographic Valid</div>
                                        <div className="text-lg">{debugData.coordinate_pattern_analysis.geographic_validity}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <div className="font-medium">Indonesia Valid</div>
                                        <div className="text-lg">{debugData.coordinate_pattern_analysis.indonesia_validity}</div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                                    <h3 className="font-medium text-yellow-800 mb-2">X-Axis Range (Usually Longitude)</h3>
                                    <div className="text-sm text-yellow-700">
                                        Min: {debugData.coordinate_pattern_analysis.x_range?.min?.toFixed(6)} |
                                        Max: {debugData.coordinate_pattern_analysis.x_range?.max?.toFixed(6)}
                                    </div>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded p-4">
                                    <h3 className="font-medium text-green-800 mb-2">Y-Axis Range (Usually Latitude)</h3>
                                    <div className="text-sm text-green-700">
                                        Min: {debugData.coordinate_pattern_analysis.y_range?.min?.toFixed(6)} |
                                        Max: {debugData.coordinate_pattern_analysis.y_range?.max?.toFixed(6)}
                                    </div>
                                </div>

                                {debugData.coordinate_pattern_analysis.recommendations && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                        <h3 className="font-medium text-blue-800 mb-2">🔧 Recommendations</h3>
                                        <ul className="space-y-1">
                                            {debugData.coordinate_pattern_analysis.recommendations.map((rec: string, i: number) => (
                                                <li key={i} className="text-sm text-blue-700">• {rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sample Coordinates */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">🔍 Sample Parcel Coordinates</h2>

                        <div className="space-y-4">
                            {debugData.sample_parcels.map((parcel, index) => (
                                <div key={index} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <span className="font-medium">{parcel.parcel_id}</span>
                                            {parcel.pemilik && (
                                                <span className="ml-2 text-gray-600">({parcel.pemilik})</span>
                                            )}
                                        </div>
                                        <div className="text-sm">
                                            {getCoordinateStatus(parcel.first_coordinate)}
                                        </div>
                                    </div>

                                    {parcel.first_coordinate && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="font-medium">First Coordinate</div>
                                                <div className="font-mono">
                                                    [{parcel.first_coordinate[0].toFixed(6)}, {parcel.first_coordinate[1].toFixed(6)}]
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    X: {parcel.first_coordinate[0]} | Y: {parcel.first_coordinate[1]}
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 p-3 rounded">
                                                <div className="font-medium">If Longitude/Latitude</div>
                                                <div className="text-xs">
                                                    Lon: {parcel.first_coordinate[0]}°E<br />
                                                    Lat: {parcel.first_coordinate[1]}°N
                                                </div>
                                                <div className="text-xs mt-1">
                                                    <a
                                                        href={`https://www.google.com/maps/@${parcel.first_coordinate[1]},${parcel.first_coordinate[0]},15z`}
                                                        target="_blank"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        🔗 View on Google Maps
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="bg-orange-50 p-3 rounded">
                                                <div className="font-medium">If Swapped (Lat/Lon)</div>
                                                <div className="text-xs">
                                                    Lon: {parcel.first_coordinate[1]}°E<br />
                                                    Lat: {parcel.first_coordinate[0]}°N
                                                </div>
                                                <div className="text-xs mt-1">
                                                    <a
                                                        href={`https://www.google.com/maps/@${parcel.first_coordinate[0]},${parcel.first_coordinate[1]},15z`}
                                                        target="_blank"
                                                        className="text-orange-600 hover:underline"
                                                    >
                                                        🔗 View Swapped on Maps
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Quick Fix Suggestions */}
            <div className="bg-gray-50 rounded-lg p-6 mt-6">
                <h2 className="text-lg font-semibold mb-4">🔧 Quick Fix Steps</h2>
                <div className="space-y-2 text-sm">
                    <div><strong>1. Run the debug API:</strong> <code>GET /api/debug-coordinates</code></div>
                    <div><strong>2. Check coordinate ranges:</strong> Should be ~98-99°E, ~3-4°N for your Sumatra data</div>
                    <div><strong>3. If coordinates are swapped:</strong> Fix the coordinate order in your map display logic</div>
                    <div><strong>4. If coordinates are way off:</strong> Check coordinate transformation in upload processing</div>
                    <div><strong>5. Test with Google Maps links:</strong> Click the links above to see where coordinates actually point</div>
                </div>
            </div>
        </div>
    )
}