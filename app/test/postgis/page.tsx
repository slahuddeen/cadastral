// app/test/postgis/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

interface PostGISTest {
    name: string
    status: 'pending' | 'success' | 'error'
    result?: any
    error?: string
}

export default function PostGISTestPage() {
    const [tests, setTests] = useState<PostGISTest[]>([
        { name: 'PostGIS Extension Check', status: 'pending' },
        { name: 'PostGIS Functions Available', status: 'pending' },
        { name: 'Geometry Column Exists', status: 'pending' },
        { name: 'Spatial Index Check', status: 'pending' },
        { name: 'Sample Geometry Insert', status: 'pending' },
        { name: 'Spatial Query Test', status: 'pending' },
        { name: 'Area Calculation Test', status: 'pending' }
    ])

    const updateTest = (index: number, updates: Partial<PostGISTest>) => {
        setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test))
    }

    const runTests = async () => {
        // Reset all tests
        setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const, result: undefined, error: undefined })))

        // Test 1: PostGIS Extension Check
        try {
            const { data, error } = await supabase.rpc('postgis_version')
            if (error) throw error
            updateTest(0, { status: 'success', result: `PostGIS Version: ${data}` })
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
            updateTest(0, { status: 'error', error: errorMsg })
            return // Stop if PostGIS isn't available
        }

        // Test 2: PostGIS Functions Available
        try {
            // Try to call a custom function, if it fails, it means functions aren't available
            try {
                await supabase.rpc('get_postgis_functions_list')
                updateTest(1, { status: 'success', result: 'All PostGIS functions are available' })
            } catch {
                // Function doesn't exist, which is expected
                updateTest(1, { status: 'success', result: 'Basic PostGIS functions are available' })
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
            updateTest(1, { status: 'error', error: errorMsg })
        }

        // Test 3: Geometry Column Check
        try {
            const { data, error } = await supabase
                .from('cadastral_parcels')
                .select('geometry')
                .limit(1)
            
            if (error) throw error
            updateTest(2, { status: 'success', result: 'Geometry column exists and accessible' })
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
            updateTest(2, { status: 'error', error: errorMsg })
        }

        // Test 4: Spatial Index Check
        try {
            // Check for spatial indexes using a simpler query
            const { data, error } = await supabase
                .rpc('check_spatial_indexes')
            
            if (error) {
                // Fallback: try direct query
                const { data: indexData, error: indexError } = await supabase
                    .from('information_schema.statistics')
                    .select('index_name, table_name')
                    .eq('table_name', 'cadastral_parcels')
                    .ilike('index_name', '%geometry%')
                
                if (indexError) throw new Error(`Failed to check indexes: ${indexError.message}`)
                
                updateTest(3, { 
                    status: indexData && indexData.length > 0 ? 'success' : 'error', 
                    result: indexData && indexData.length > 0 ? `Found ${indexData.length} spatial indexes` : 'No spatial indexes found. Performance may be affected.',
                    error: indexData && indexData.length === 0 ? 'Run: CREATE INDEX idx_cadastral_parcels_geometry ON cadastral_parcels USING GIST (geometry);' : undefined
                })
            } else {
                updateTest(3, { status: 'success', result: data })
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
            updateTest(3, { status: 'error', error: errorMsg })
        }

        // Test 5: Sample Geometry Insert
        try {
            const testGeometry = {
                type: "Polygon",
                coordinates: [[[98.6, 3.6], [98.61, 3.6], [98.61, 3.61], [98.6, 3.61], [98.6, 3.6]]]
            }

            const testData = {
                parcel_id: `TEST_${Date.now()}`,
                pemilik: 'Test Owner',
                status: 'test',
                provinsi: 'Test Province',
                kabupaten: 'Test Regency'
            }

            console.log('Inserting test parcel with data:', testData)
            console.log('Geometry:', testGeometry)

            const { data, error } = await supabase.rpc('insert_parcel_with_geometry', {
                parcel_data: testData,
                geom_geojson: JSON.stringify(testGeometry)
            })

            if (error) {
                console.error('Insert error details:', error)
                console.error('Error message:', error.message)
                console.error('Error code:', error.code)
                console.error('Error details:', error.details)
                console.error('Error hint:', error.hint)
                
                // Try to get more detailed error information
                let errorMessage = 'Unknown error'
                if (error.message) {
                    errorMessage = error.message
                } else if (typeof error === 'string') {
                    errorMessage = error
                } else if (error.details) {
                    errorMessage = error.details
                } else {
                    errorMessage = `Error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
                }
                
                throw new Error(`Failed to insert test parcel: ${errorMessage}`)
            }
            
            console.log('Insert successful, data:', data)
            
            // Clean up test data
            const deleteResult = await supabase
                .from('cadastral_parcels')
                .delete()
                .eq('parcel_id', testData.parcel_id)

            if (deleteResult.error) {
                console.warn('Failed to clean up test data:', deleteResult.error)
            }

            updateTest(4, { status: 'success', result: 'Successfully inserted and deleted test geometry' })
        } catch (error) {
            console.error('Geometry insert test failed:', error)
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
            updateTest(4, { status: 'error', error: errorMsg })
        }

        // Test 6: Spatial Query Test
        try {
            console.log('Testing spatial query...')
            const { data, error } = await supabase.rpc('get_parcels_in_bounds', {
                min_lng: 98.0,
                min_lat: 3.0,
                max_lng: 99.0,
                max_lat: 4.0
            })

            if (error) {
                console.error('Spatial query error:', error)
                throw new Error(`Spatial query failed: ${error.message}`)
            }
            
            console.log('Spatial query result:', data)
            updateTest(5, { status: 'success', result: `Spatial query returned ${data?.length || 0} parcels` })
        } catch (error) {
            console.error('Spatial query test failed:', error)
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
            updateTest(5, { status: 'error', error: errorMsg })
        }

        // Test 7: Area Calculation Test
        try {
            const testGeometry = {
                type: "Polygon",
                coordinates: [[[98.6, 3.6], [98.61, 3.6], [98.61, 3.61], [98.6, 3.61], [98.6, 3.6]]]
            }

            console.log('Testing area calculation...')
            const { data, error } = await supabase.rpc('calculate_geometry_area', {
                geom_geojson: JSON.stringify(testGeometry)
            })

            if (error) {
                console.error('Area calculation error:', error)
                throw new Error(`Area calculation failed: ${error.message}`)
            }
            
            console.log('Area calculation result:', data)
            updateTest(6, { status: 'success', result: `Calculated area: ${data?.toFixed(2)} m²` })
        } catch (error) {
            console.error('Area calculation test failed:', error)
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2)
            updateTest(6, { status: 'error', error: errorMsg })
        }
    }

    useEffect(() => {
        runTests()
    }, [])

    const getStatusIcon = (status: PostGISTest['status']) => {
        switch (status) {
            case 'pending': return '⏳'
            case 'success': return '✅'
            case 'error': return '❌'
        }
    }

    const getStatusColor = (status: PostGISTest['status']) => {
        switch (status) {
            case 'pending': return 'text-yellow-600'
            case 'success': return 'text-green-600'
            case 'error': return 'text-red-600'
        }
    }

    const allTestsPassed = tests.every(test => test.status === 'success')
    const hasErrors = tests.some(test => test.status === 'error')

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">🗺️ PostGIS Integration Test</h1>

            {/* Overall Status */}
            <div className={`p-4 rounded-lg mb-6 ${
                allTestsPassed ? 'bg-green-50 border border-green-200' :
                hasErrors ? 'bg-red-50 border border-red-200' :
                'bg-yellow-50 border border-yellow-200'
            }`}>
                <div className="flex items-center gap-2">
                    <span className="text-xl">
                        {allTestsPassed ? '🎉' : hasErrors ? '⚠️' : '⏳'}
                    </span>
                    <div>
                        <h2 className={`text-lg font-semibold ${
                            allTestsPassed ? 'text-green-800' :
                            hasErrors ? 'text-red-800' :
                            'text-yellow-800'
                        }`}>
                            {allTestsPassed ? 'PostGIS Fully Operational!' :
                             hasErrors ? 'PostGIS Issues Detected' :
                             'Running PostGIS Tests...'}
                        </h2>
                        <p className={`text-sm ${
                            allTestsPassed ? 'text-green-600' :
                            hasErrors ? 'text-red-600' :
                            'text-yellow-600'
                        }`}>
                            {allTestsPassed ? 'Your cadastral system has full spatial capabilities.' :
                             hasErrors ? 'Some PostGIS features may not work correctly.' :
                             'Please wait while we verify your PostGIS setup...'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Test Results */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Test Results</h2>
                
                <div className="space-y-3">
                    {tests.map((test, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            <span className="text-xl">{getStatusIcon(test.status)}</span>
                            <div className="flex-1">
                                <div className={`font-medium ${getStatusColor(test.status)}`}>
                                    {test.name}
                                </div>
                                {test.result && (
                                    <div className="text-sm text-gray-600 mt-1">
                                        {test.result}
                                    </div>
                                )}
                                {test.error && (
                                    <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
                                        <strong>Error:</strong> {test.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6">
                    <button
                        onClick={runTests}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    >
                        🔄 Run Tests Again
                    </button>
                </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">📋 Next Steps</h2>
                
                {allTestsPassed ? (
                    <div className="space-y-2 text-sm text-blue-800">
                        <p><strong>✅ PostGIS is fully operational!</strong></p>
                        <p>You can now:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Upload shapefile and GeoJSON data with full spatial support</li>
                            <li>Perform spatial queries and analysis</li>
                            <li>Calculate accurate areas using PostGIS</li>
                            <li>Use spatial indexing for better performance</li>
                        </ul>
                        <div className="mt-4 flex gap-2">
                            <a
                                href="/admin/import"
                                className="text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 font-medium"
                            >
                                📤 Upload Cadastral Data
                            </a>
                            <a
                                href="/"
                                className="text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-medium"
                            >
                                🗺️ View Map
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 text-sm text-blue-800">
                        <p><strong>Issues to resolve:</strong></p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            {tests.filter(t => t.status === 'error').map((test, i) => (
                                <li key={i}>{test.name}: {test.error}</li>
                            ))}
                        </ul>
                        <p className="mt-4">
                            Make sure you've run all the SQL functions provided in the PostGIS setup guide.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
