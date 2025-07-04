// app/api/debug-coordinates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '5')

        // Get a few sample parcels to debug
        const { data: parcels, error } = await supabase
            .from('cadastral_parcels')
            .select('id, parcel_id, pemilik')
            .limit(limit)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!parcels || parcels.length === 0) {
            return NextResponse.json({
                message: 'No parcels found in database',
                parcels: [],
                coordinates: []
            })
        }

        // Get geometry data for these parcels
        const ids = parcels.map(p => p.id)
        const { data: geometryData, error: geomError } = await supabase
            .rpc('get_geometries_by_ids', { parcel_ids: ids })

        let coordinateDebugInfo = []

        if (geomError) {
            console.log('Using direct geometry query fallback')
            // Fallback: direct query with ST_AsGeoJSON
            const { data: directGeom, error: directError } = await supabase
                .from('cadastral_parcels')
                .select(`
                    id, 
                    parcel_id, 
                    pemilik,
                    geometry_geojson:ST_AsGeoJSON(geometry),
                    bbox:ST_AsText(ST_Envelope(geometry)),
                    centroid:ST_AsText(ST_Centroid(geometry)),
                    geometry_type:ST_GeometryType(geometry),
                    srid:ST_SRID(geometry)
                `)
                .in('id', ids)

            if (directError) {
                return NextResponse.json({ error: directError.message }, { status: 500 })
            }

            coordinateDebugInfo = directGeom?.map(record => {
                let geometry = null
                let firstCoordinate = null
                let boundingBox = null
                let centroid = null

                try {
                    if (record.geometry_geojson) {
                        geometry = JSON.parse(record.geometry_geojson)

                        // Extract first coordinate for analysis
                        if (geometry.type === 'MultiPolygon') {
                            firstCoordinate = geometry.coordinates[0][0][0]
                        } else if (geometry.type === 'Polygon') {
                            firstCoordinate = geometry.coordinates[0][0]
                        }
                    }

                    // Parse bounding box
                    if (record.bbox) {
                        const bboxMatch = record.bbox.match(/POLYGON\(\(([^)]+)\)\)/)
                        if (bboxMatch) {
                            const coords = bboxMatch[1].split(',').map(coord => {
                                const [x, y] = coord.trim().split(' ').map(Number)
                                return [x, y]
                            })
                            boundingBox = {
                                minX: Math.min(...coords.map(c => c[0])),
                                maxX: Math.max(...coords.map(c => c[0])),
                                minY: Math.min(...coords.map(c => c[1])),
                                maxY: Math.max(...coords.map(c => c[1]))
                            }
                        }
                    }

                    // Parse centroid
                    if (record.centroid) {
                        const centroidMatch = record.centroid.match(/POINT\(([^)]+)\)/)
                        if (centroidMatch) {
                            const [x, y] = centroidMatch[1].split(' ').map(Number)
                            centroid = [x, y]
                        }
                    }
                } catch (e) {
                    console.error('Error parsing geometry for', record.parcel_id, e)
                }

                return {
                    parcel_id: record.parcel_id,
                    pemilik: record.pemilik,
                    geometry_type: record.geometry_type,
                    srid: record.srid,
                    first_coordinate: firstCoordinate,
                    centroid: centroid,
                    bounding_box: boundingBox,
                    coordinate_analysis: analyzeCoordinate(firstCoordinate),
                    raw_geometry: geometry
                }
            }) || []
        } else {
            // Use the RPC function result
            coordinateDebugInfo = geometryData?.map((record: any) => {
                let geometry = null
                let firstCoordinate = null

                try {
                    geometry = JSON.parse(record.geometry_json)

                    if (geometry.type === 'MultiPolygon') {
                        firstCoordinate = geometry.coordinates[0][0][0]
                    } else if (geometry.type === 'Polygon') {
                        firstCoordinate = geometry.coordinates[0][0]
                    }
                } catch (e) {
                    console.error('Error parsing geometry for', record.parcel_id, e)
                }

                const parcel = parcels.find(p => p.id === record.id)

                return {
                    parcel_id: parcel?.parcel_id,
                    pemilik: parcel?.pemilik,
                    first_coordinate: firstCoordinate,
                    coordinate_analysis: analyzeCoordinate(firstCoordinate),
                    raw_geometry: geometry
                }
            }) || []
        }

        // Analyze coordinate patterns
        const coordinatePattern = analyzeCoordinatePattern(coordinateDebugInfo)

        return NextResponse.json({
            total_parcels: parcels.length,
            sample_parcels: coordinateDebugInfo,
            coordinate_pattern_analysis: coordinatePattern,
            expected_indonesia_bounds: {
                longitude: { min: 95, max: 141, description: "95°E to 141°E" },
                latitude: { min: -11, max: 6, description: "11°S to 6°N" },
                sumatra_region: {
                    longitude: { min: 95, max: 106, description: "95°E to 106°E" },
                    latitude: { min: -6, max: 6, description: "6°S to 6°N" }
                }
            },
            debugging_steps: [
                "1. Check if coordinates are within Indonesia bounds",
                "2. Verify coordinate order (longitude, latitude)",
                "3. Check if coordinates need to be swapped",
                "4. Verify SRID is 4326 (WGS84)",
                "5. Test coordinate transformation if needed"
            ]
        })

    } catch (error) {
        console.error('Debug error:', error)
        return NextResponse.json(
            { error: 'Debug failed: ' + String(error) },
            { status: 500 }
        )
    }
}

function analyzeCoordinate(coord: number[] | null) {
    if (!coord || coord.length < 2) {
        return { status: 'invalid', message: 'No coordinate data' }
    }

    const [x, y] = coord

    // Check if coordinates look like they're in the right format
    const analysis = {
        x_value: x,
        y_value: y,
        x_range: getCoordinateRange(x, 'longitude'),
        y_range: getCoordinateRange(y, 'latitude'),
        likely_system: 'unknown',
        issues: [] as string[],
        suggestions: [] as string[]
    }

    // Detect coordinate system
    if (Math.abs(x) > 1000 || Math.abs(y) > 1000) {
        analysis.likely_system = 'projected (UTM/other)'
        analysis.issues.push('Coordinates appear to be in projected system, not geographic')
        analysis.suggestions.push('May need coordinate transformation')
    } else if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
        analysis.likely_system = 'geographic (WGS84)'

        // Check if it's in Indonesia region
        if (x >= 95 && x <= 141 && y >= -11 && y <= 6) {
            analysis.suggestions.push('✅ Coordinates are in Indonesia region')

            // Check if it's in Sumatra region specifically
            if (x >= 95 && x <= 106 && y >= -6 && y <= 6) {
                analysis.suggestions.push('✅ Coordinates are in Sumatra region')
            }
        } else {
            analysis.issues.push('Coordinates are outside Indonesia region')

            // Check if coordinates might be swapped
            if (y >= 95 && y <= 141 && x >= -11 && x <= 6) {
                analysis.issues.push('⚠️ Coordinates might be swapped (lat/lon instead of lon/lat)')
                analysis.suggestions.push('Try swapping X and Y coordinates')
            }
        }
    } else {
        analysis.issues.push('Coordinates are outside valid geographic bounds')
    }

    return analysis
}

function getCoordinateRange(value: number, type: 'longitude' | 'latitude') {
    if (type === 'longitude') {
        if (value >= -180 && value <= 180) return 'valid longitude range'
        return 'outside longitude range (-180 to 180)'
    } else {
        if (value >= -90 && value <= 90) return 'valid latitude range'
        return 'outside latitude range (-90 to 90)'
    }
}

function analyzeCoordinatePattern(samples: any[]) {
    const validSamples = samples.filter(s => s.first_coordinate)

    if (validSamples.length === 0) {
        return { status: 'no_data', message: 'No valid coordinates found' }
    }

    const coordinates = validSamples.map(s => s.first_coordinate)
    const xValues = coordinates.map(c => c[0])
    const yValues = coordinates.map(c => c[1])

    const xRange = { min: Math.min(...xValues), max: Math.max(...xValues) }
    const yRange = { min: Math.min(...yValues), max: Math.max(...yValues) }

    let analysis = {
        sample_count: validSamples.length,
        x_range: xRange,
        y_range: yRange,
        likely_coordinate_system: 'unknown',
        geographic_validity: 'unknown',
        indonesia_validity: 'unknown',
        recommendations: [] as string[]
    }

    // Determine coordinate system
    if (Math.abs(xRange.min) > 1000 || Math.abs(xRange.max) > 1000 ||
        Math.abs(yRange.min) > 1000 || Math.abs(yRange.max) > 1000) {
        analysis.likely_coordinate_system = 'projected'
        analysis.recommendations.push('Coordinates appear to be in projected system - may need transformation')
    } else {
        analysis.likely_coordinate_system = 'geographic'
    }

    // Check geographic validity
    if (xRange.min >= -180 && xRange.max <= 180 && yRange.min >= -90 && yRange.max <= 90) {
        analysis.geographic_validity = 'valid'

        // Check Indonesia bounds
        if (xRange.min >= 95 && xRange.max <= 141 && yRange.min >= -11 && yRange.max <= 6) {
            analysis.indonesia_validity = 'valid'
            analysis.recommendations.push('✅ All coordinates are within Indonesia bounds')
        } else {
            analysis.indonesia_validity = 'outside_bounds'

            // Check if swapped
            if (yRange.min >= 95 && yRange.max <= 141 && xRange.min >= -11 && xRange.max <= 6) {
                analysis.recommendations.push('⚠️ Coordinates may be swapped (X/Y or lon/lat)')
                analysis.recommendations.push('Try swapping coordinate order in display logic')
            } else {
                analysis.recommendations.push('❌ Coordinates are outside Indonesia region')
            }
        }
    } else {
        analysis.geographic_validity = 'invalid'
        analysis.recommendations.push('Coordinates are outside valid geographic bounds')
    }

    return analysis
}