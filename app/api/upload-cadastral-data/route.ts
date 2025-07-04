// app/api/upload-cadastral-data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import AdmZip from 'adm-zip'
import * as shapefile from 'shapefile'

interface CadastralRecord {
    parcel_id: string
    provinsi?: string
    kabupaten?: string
    kecamatan?: string
    desa?: string
    nib?: string
    su?: string
    hak?: string
    tipe_hak?: string
    luas_tertulis?: number
    luas_peta?: number
    sk?: string
    tanggal_sk?: string
    tanggal_terbit_hak?: string
    berakhir_hak?: string
    pemilik?: string
    tipe_pemilik?: string
    guna_tanah_klasifikasi?: string
    guna_tanah_utama?: string
    penggunaan?: string
    terpetakan?: string
    kasus?: string
    pihak_bersengketa?: any[]
    solusi?: string
    hasil?: string
    upaya_penanganan?: string
    no_peta?: string
    status?: string
    keterangan?: string
    geometry: any
}

function mapFieldNames(properties: any): Partial<CadastralRecord> {
    const fieldMap: { [key: string]: string } = {
        // Administrative
        'PROPINSI': 'provinsi',
        'PROVINSI': 'provinsi',
        'KABUPATEN': 'kabupaten',
        'KECAMATAN': 'kecamatan',
        'DESA': 'desa',
        'KELURAHAN': 'desa',

        // Identification
        'NIB': 'nib',
        'SU': 'su',
        'HAK': 'hak',
        'TIPEHAK': 'tipe_hak',
        'TIPE_HAK': 'tipe_hak',

        // Areas
        'LUASTERTUL': 'luas_tertulis',
        'LUAS_TERTUL': 'luas_tertulis',
        'LUAS_TERTULIS': 'luas_tertulis',
        'LUASPETA': 'luas_peta',
        'LUAS_PETA': 'luas_peta',
        'area_sqm': 'luas_peta',

        // Legal documents
        'SK': 'sk',
        'TANGGALSK': 'tanggal_sk',
        'TANGGAL_SK': 'tanggal_sk',
        'TGLTERBITH': 'tanggal_terbit_hak',
        'TANGGAL_TERBIT_HAK': 'tanggal_terbit_hak',
        'BERAKHIRHA': 'berakhir_hak',
        'BERAKHIR_HAK': 'berakhir_hak',

        // Ownership
        'PEMILIK': 'pemilik',
        'owner_name': 'pemilik',
        'TIPEPEMILI': 'tipe_pemilik',
        'TIPE_PEMILIK': 'tipe_pemilik',

        // Land use
        'GUNATANAHK': 'guna_tanah_klasifikasi',
        'GUNA_TANAH_KLASIFIKASI': 'guna_tanah_klasifikasi',
        'GUNATANAHU': 'guna_tanah_utama',
        'GUNA_TANAH_UTAMA': 'guna_tanah_utama',
        'land_use': 'penggunaan',
        'PENGGUNAAN': 'penggunaan',

        // Status and issues
        'TERPETAKAN': 'terpetakan',
        'Kasus': 'kasus',
        'KASUS': 'kasus',
        'Pihak': 'pihak_bersengketa',
        'PIHAK_BERSENGKETA': 'pihak_bersengketa',
        'Solusi': 'solusi',
        'SOLUSI': 'solusi',
        'Hasil': 'hasil',
        'HASIL': 'hasil',
        'UPAYA_PENANGANAN': 'upaya_penanganan',
        'Keterangan': 'keterangan',
        'KETERANGAN': 'keterangan',
        'NoPeta': 'no_peta',
        'NO_PETA': 'no_peta',
        'Status': 'status',
        'STATUS': 'status',
        'status': 'status'
    }

    const mapped: any = {}

    Object.keys(properties).forEach(key => {
        const mappedKey = fieldMap[key] || key.toLowerCase()
        let value = properties[key]

        // Handle special cases
        if (mappedKey === 'pihak_bersengketa') {
            if (typeof value === 'string') {
                try {
                    value = value === '[]' || value === '' || value === '-' ? [] : JSON.parse(value)
                } catch {
                    value = value ? [value] : []
                }
            } else if (Array.isArray(value)) {
                value = value
            } else {
                value = []
            }
        }

        // Convert numeric strings to numbers for area fields
        if (['luas_tertulis', 'luas_peta'].includes(mappedKey) && value) {
            if (typeof value === 'string') {
                const numValue = parseFloat(value.replace(/[^\d.-]/g, ''))
                value = isNaN(numValue) ? null : numValue
            }
        }

        // Handle date fields
        if (['tanggal_sk', 'tanggal_terbit_hak', 'berakhir_hak'].includes(mappedKey) && value) {
            if (value !== '-' && value !== '') {
                const dateValue = new Date(value)
                value = isNaN(dateValue.getTime()) ? null : dateValue.toISOString().split('T')[0]
            } else {
                value = null
            }
        }

        // Clean empty values
        if (value === '' || value === '-' || value === null || value === undefined) {
            value = null
        }

        mapped[mappedKey] = value
    })

    return mapped
}

// Function to detect and normalize geometry coordinates
function normalizeGeometry(geometry: any, projectionInfo?: string | null): any {
    if (!geometry || !geometry.coordinates) {
        return geometry
    }

    // Function to check if coordinates look like UTM (large numbers) vs Geographic (small numbers)
    const detectCoordinateSystem = (coords: number[][]): 'utm' | 'geographic' => {
        const firstCoord = coords[0]
        if (!firstCoord || firstCoord.length < 2) return 'geographic'

        const [x, y] = firstCoord

        // UTM coordinates are typically > 100,000 for easting and > 1,000,000 for northing
        // Geographic coordinates are typically -180 to 180 for longitude, -90 to 90 for latitude
        if (Math.abs(x) > 1000 || Math.abs(y) > 1000) {
            return 'utm'
        }

        return 'geographic'
    }

    // Function to extract coordinate pairs from any geometry type
    const extractCoordPairs = (coords: any): number[][] => {
        if (Array.isArray(coords[0])) {
            if (Array.isArray(coords[0][0])) {
                // MultiPolygon or nested structure
                return extractCoordPairs(coords[0])
            } else {
                // Polygon exterior ring
                return coords as number[][]
            }
        }
        return [coords] as number[][]
    }

    // Detect coordinate system
    let coordPairs: number[][]
    if (geometry.type === 'Polygon') {
        coordPairs = extractCoordPairs(geometry.coordinates[0])
    } else if (geometry.type === 'MultiPolygon') {
        coordPairs = extractCoordPairs(geometry.coordinates[0][0])
    } else {
        return geometry // Return as-is for other geometry types
    }

    const coordSystem = detectCoordinateSystem(coordPairs)

    // If coordinates are already in geographic format, return as-is but ensure MultiPolygon type
    if (coordSystem === 'geographic') {
        console.log('Coordinates detected as geographic (WGS84), converting to MultiPolygon if needed')
        if (geometry.type === 'Polygon') {
            return {
                type: 'MultiPolygon',
                coordinates: [geometry.coordinates]
            }
        }
        return geometry
    }

    console.log('Coordinates detected as UTM, conversion needed')

    // For UTM coordinates, we'll assume they need conversion
    // This is a simple approximation - in production you'd want proper coordinate transformation
    const convertUTMToGeographic = (coords: number[][]): number[][] => {
        return coords.map(([easting, northing]) => {
            // UTM Zone 47N conversion approximation
            // This is a simplified conversion - in production use proper proj4 library
            const centralMeridian = 99 // Central meridian for UTM Zone 47N
            const falseEasting = 500000
            const scaleFactor = 0.9996

            // Simplified conversion (this is an approximation)
            const x = easting - falseEasting
            const longitude = centralMeridian + (x / (scaleFactor * 111319.9))
            const latitude = northing / 111319.9

            return [longitude, latitude]
        })
    }

    // Apply conversion based on geometry type
    if (geometry.type === 'Polygon') {
        const normalizedGeometry = {
            ...geometry,
            coordinates: geometry.coordinates.map((ring: number[][]) =>
                convertUTMToGeographic(ring)
            )
        }
        // Convert Polygon to MultiPolygon for database compatibility
        return {
            type: 'MultiPolygon',
            coordinates: [normalizedGeometry.coordinates]
        }
    } else if (geometry.type === 'MultiPolygon') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map((polygon: number[][][]) =>
                polygon.map((ring: number[][]) => convertUTMToGeographic(ring))
            )
        }
    }

    return geometry
}

async function processShapefile(zipBuffer: Buffer): Promise<{ success: CadastralRecord[], errors: any[] }> {
    const success: CadastralRecord[] = []
    const errors: any[] = []

    try {
        console.log('Processing shapefile ZIP...')
        const zip = new AdmZip(zipBuffer)
        const entries = zip.getEntries()

        // Find .shp file
        const shpEntry = entries.find(entry => entry.entryName.toLowerCase().endsWith('.shp'))
        if (!shpEntry) {
            throw new Error('No .shp file found in ZIP archive')
        }

        // Find .dbf file (required for attributes)
        const dbfEntry = entries.find(entry => entry.entryName.toLowerCase().endsWith('.dbf'))
        if (!dbfEntry) {
            throw new Error('No .dbf file found in ZIP archive')
        }

        // Find .prj file (optional, contains projection info)
        const prjEntry = entries.find(entry => entry.entryName.toLowerCase().endsWith('.prj'))
        let projectionInfo = null
        if (prjEntry) {
            projectionInfo = prjEntry.getData().toString('utf8')
            console.log('Found projection info:', projectionInfo.substring(0, 100) + '...')
        }

        console.log(`Found shapefile: ${shpEntry.entryName}`)

        // Extract files to buffers
        const shpBuffer = shpEntry.getData()
        const dbfBuffer = dbfEntry.getData()

        // Read shapefile using shapefile library
        const features: any[] = []

        // Use shapefile.read with buffers
        const source = await shapefile.read(shpBuffer, dbfBuffer)

        if (source.type === 'FeatureCollection') {
            features.push(...source.features)
        } else if (source.features) {
            features.push(...source.features)
        } else {
            features.push(source)
        }

        console.log(`Processing ${features.length} features from shapefile`)

        // Process each feature
        for (let i = 0; i < features.length; i++) {
            try {
                const feature = features[i]
                const properties = mapFieldNames(feature.properties || {})

                // Generate parcel_id if not provided
                const parcel_id = properties.parcel_id ||
                    properties.nib ||
                    properties.hak ||
                    `PARCEL_${Date.now()}_${i}`

                // Normalize geometry coordinates
                const normalizedGeometry = normalizeGeometry(feature.geometry, projectionInfo)

                const record: CadastralRecord = {
                    parcel_id,
                    ...properties,
                    geometry: normalizedGeometry,
                    status: properties.status || 'active'
                }

                success.push(record)
            } catch (error) {
                console.error(`Error processing feature ${i}:`, error)
                errors.push({
                    index: i,
                    message: `Error processing feature ${i}: ${error}`,
                    feature: features[i]
                })
            }
        }

        console.log(`Successfully processed ${success.length} features, ${errors.length} errors`)
        return { success, errors }

    } catch (error) {
        console.error('Error processing shapefile:', error)
        throw new Error(`Failed to process shapefile: ${error}`)
    }
}

async function processGeoJSON(geoJson: any): Promise<{ success: CadastralRecord[], errors: any[] }> {
    const success: CadastralRecord[] = []
    const errors: any[] = []

    const features = geoJson.features || [geoJson]

    for (let i = 0; i < features.length; i++) {
        try {
            const feature = features[i]
            const properties = mapFieldNames(feature.properties || {})

            // Generate parcel_id if not provided
            const parcel_id = properties.parcel_id ||
                properties.nib ||
                properties.hak ||
                `PARCEL_${Date.now()}_${i}`

            // Normalize geometry coordinates (GeoJSON is typically already in WGS84)
            const normalizedGeometry = normalizeGeometry(feature.geometry, null)

            const record: CadastralRecord = {
                parcel_id,
                ...properties,
                geometry: normalizedGeometry,
                status: properties.status || 'active'
            }

            success.push(record)
        } catch (error) {
            errors.push({
                index: i,
                message: `Error processing feature ${i}: ${error}`,
                feature: features[i]
            })
        }
    }

    return { success, errors }
}

export async function GET() {
    return NextResponse.json({
        message: 'Upload API is working!',
        timestamp: new Date().toISOString(),
        supportedFormats: ['GeoJSON (.json, .geojson)', 'Shapefile (.zip)']
    })
}

export async function POST(request: NextRequest) {
    try {
        console.log('Upload API called!')

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'No file provided' },
                { status: 400 }
            )
        }

        console.log('File received:', file.name, file.size, 'bytes')

        const buffer = Buffer.from(await file.arrayBuffer())
        let processResult: { success: CadastralRecord[], errors: any[] }

        // Process file based on type
        if (file.name.toLowerCase().endsWith('.zip')) {
            console.log('Processing as shapefile ZIP...')
            processResult = await processShapefile(buffer)
        } else if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.geojson')) {
            console.log('Processing as GeoJSON...')
            let content = buffer.toString('utf-8')

            // Remove BOM (Byte Order Mark) if present
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1)
            }

            const geoJson = JSON.parse(content)
            processResult = await processGeoJSON(geoJson)
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Unsupported file format. Please use GeoJSON (.json or .geojson) or Shapefile (.zip).'
                },
                { status: 400 }
            )
        }

        console.log(`Processed ${processResult.success.length} features, ${processResult.errors.length} errors`)

        // Insert into database
        let imported = 0
        const insertErrors: any[] = []

        for (const record of processResult.success) {
            try {
                // Prepare data for insertion (excluding geometry for now)
                const insertData = {
                    parcel_id: record.parcel_id,
                    provinsi: record.provinsi,
                    kabupaten: record.kabupaten,
                    kecamatan: record.kecamatan,
                    desa: record.desa,
                    nib: record.nib,
                    su: record.su,
                    hak: record.hak,
                    tipe_hak: record.tipe_hak,
                    luas_tertulis: record.luas_tertulis,
                    luas_peta: record.luas_peta,
                    sk: record.sk,
                    tanggal_sk: record.tanggal_sk,
                    tanggal_terbit_hak: record.tanggal_terbit_hak,
                    berakhir_hak: record.berakhir_hak,
                    pemilik: record.pemilik,
                    tipe_pemilik: record.tipe_pemilik,
                    guna_tanah_klasifikasi: record.guna_tanah_klasifikasi,
                    guna_tanah_utama: record.guna_tanah_utama,
                    penggunaan: record.penggunaan,
                    terpetakan: record.terpetakan,
                    kasus: record.kasus,
                    pihak_bersengketa: record.pihak_bersengketa,
                    solusi: record.solusi,
                    hasil: record.hasil,
                    upaya_penanganan: record.upaya_penanganan,
                    no_peta: record.no_peta,
                    status: record.status,
                    keterangan: record.keterangan
                }

                console.log(`Inserting parcel with normalized geometry: ${record.parcel_id}`)

                // Try the smart coordinate detection function first
                let { data, error } = await supabase.rpc('insert_parcel_with_geometry', {
                    parcel_data: insertData,
                    geom_geojson: JSON.stringify(record.geometry)
                })

                // If that fails, try the simple function that assumes WGS84
                if (error) {
                    console.log(`First attempt failed for ${record.parcel_id}, trying simple function:`, error.message)

                    const { data: data2, error: error2 } = await supabase.rpc('insert_parcel_with_geometry_simple', {
                        parcel_data: insertData,
                        geom_geojson: JSON.stringify(record.geometry)
                    })

                    data = data2
                    error = error2
                }

                if (error) {
                    console.error(`Insert error for ${record.parcel_id}:`, error)
                    insertErrors.push({
                        parcel_id: record.parcel_id,
                        message: error.message,
                        details: error,
                        geometry_sample: JSON.stringify(record.geometry).substring(0, 200) + '...'
                    })
                } else {
                    imported++
                    console.log(`Successfully inserted with normalized geometry: ${record.parcel_id}`)
                }
            } catch (error) {
                console.error(`Exception inserting ${record.parcel_id}:`, error)
                insertErrors.push({
                    parcel_id: record.parcel_id,
                    message: String(error)
                })
            }
        }

        const allErrors = [...processResult.errors, ...insertErrors]

        console.log(`Import complete: ${imported} imported, ${allErrors.length} failed`)

        return NextResponse.json({
            success: true,
            imported,
            failed: allErrors.length,
            total: processResult.success.length + processResult.errors.length,
            errors: allErrors.slice(0, 10), // Limit error details
            message: `Successfully imported ${imported} parcels from ${file.name}. ${allErrors.length} failed.`,
            fileType: file.name.toLowerCase().endsWith('.zip') ? 'shapefile' : 'geojson'
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { success: false, message: `Server error: ${error}` },
            { status: 500 }
        )
    }
}