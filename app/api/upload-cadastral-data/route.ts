// app/api/upload-cadastral-data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

// install these packages:
// npm install adm-zip shapefile
// npm install @types/adm-zip

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
    // Map various field name variations to our standard schema
    const fieldMap: { [key: string]: string } = {
        // Administrative
        'PROPINSI': 'provinsi',
        'KABUPATEN': 'kabupaten',
        'KECAMATAN': 'kecamatan',
        'DESA': 'desa',

        // Identification
        'NIB': 'nib',
        'SU': 'su',
        'HAK': 'hak',
        'TIPEHAK': 'tipe_hak',
        'TIPE_HAK': 'tipe_hak',

        // Areas
        'LUASTERTUL': 'luas_tertulis',
        'LUAS_TERTUL': 'luas_tertulis',
        'LUASPETA': 'luas_peta',
        'LUAS_PETA': 'luas_peta',
        'area_sqm': 'luas_peta',

        // Legal documents
        'SK': 'sk',
        'TANGGALSK': 'tanggal_sk',
        'TGLTERBITH': 'tanggal_terbit_hak',
        'BERAKHIRHA': 'berakhir_hak',

        // Ownership
        'PEMILIK': 'pemilik',
        'owner_name': 'pemilik',
        'TIPEPEMILI': 'tipe_pemilik',

        // Land use
        'GUNATANAHK': 'guna_tanah_klasifikasi',
        'GUNATANAHU': 'guna_tanah_utama',
        'land_use': 'penggunaan',
        'PENGGUNAAN': 'penggunaan',

        // Status
        'TERPETAKAN': 'terpetakan',
        'Kasus': 'kasus',
        'Pihak': 'pihak_bersengketa',
        'Solusi': 'solusi',
        'Hasil': 'hasil',
        'Keterangan': 'keterangan',
        'NoPeta': 'no_peta',
        'Status': 'status',
        'status': 'status'
    }

    const mapped: any = {}

    // Map known fields
    Object.keys(properties).forEach(key => {
        const mappedKey = fieldMap[key] || key.toLowerCase()
        let value = properties[key]

        // Handle special cases
        if (mappedKey === 'pihak_bersengketa' && typeof value === 'string') {
            try {
                value = value === '[]' ? [] : JSON.parse(value)
            } catch {
                value = value ? [value] : []
            }
        }

        // Convert numeric strings to numbers for area fields
        if (['luas_tertulis', 'luas_peta'].includes(mappedKey) && typeof value === 'string') {
            const numValue = parseFloat(value.replace(/[^\d.-]/g, ''))
            value = isNaN(numValue) ? null : numValue
        }

        // Handle date fields
        if (['tanggal_sk', 'tanggal_terbit_hak', 'berakhir_hak'].includes(mappedKey) && value) {
            // Try to parse various date formats
            const dateValue = new Date(value)
            value = isNaN(dateValue.getTime()) ? null : dateValue.toISOString().split('T')[0]
        }

        mapped[mappedKey] = value === '' || value === '-' ? null : value
    })

    return mapped
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

            const record: CadastralRecord = {
                parcel_id,
                ...properties,
                geometry: feature.geometry,
                status: properties.status || 'active'
            }

            success.push(record)
        } catch (error) {
            errors.push({
                index: i,
                message: `Error processing feature: ${error}`,
                feature: features[i]
            })
        }
    }

    return { success, errors }
}

async function processShapefile(zipBuffer: Buffer): Promise<{ success: CadastralRecord[], errors: any[] }> {
    try {
        // For now, return a placeholder implementation
        // In a real implementation, you would:
        // 1. Extract the ZIP file
        // 2. Find .shp, .dbf, .shx, .prj files
        // 3. Use a shapefile library to parse them
        // 4. Convert to GeoJSON format
        // 5. Process with processGeoJSON()

        return {
            success: [],
            errors: [{
                index: 0,
                message: "Shapefile processing not yet implemented. Please convert to GeoJSON first."
            }]
        }
    } catch (error) {
        return {
            success: [],
            errors: [{
                index: 0,
                message: `Error processing shapefile: ${error}`
            }]
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'No file provided' },
                { status: 400 }
            )
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        let processResult: { success: CadastralRecord[], errors: any[] }

        // Determine file type and process accordingly
        if (file.name.endsWith('.zip')) {
            processResult = await processShapefile(buffer)
        } else if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
            const geoJson = JSON.parse(buffer.toString('utf-8'))
            processResult = await processGeoJSON(geoJson)
        } else {
            return NextResponse.json(
                { success: false, message: 'Unsupported file format' },
                { status: 400 }
            )
        }

        // Insert successful records into database
        let imported = 0
        const insertErrors: any[] = []

        for (const record of processResult.success) {
            try {
                const { error } = await supabase
                    .from('cadastral_parcels')
                    .insert({
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
                        keterangan: record.keterangan,
                        geometry: `SRID=4326;${JSON.stringify(record.geometry)}`
                    })

                if (error) {
                    insertErrors.push({
                        parcel_id: record.parcel_id,
                        message: error.message
                    })
                } else {
                    imported++
                }
            } catch (error) {
                insertErrors.push({
                    parcel_id: record.parcel_id,
                    message: String(error)
                })
            }
        }

        const allErrors = [...processResult.errors, ...insertErrors]

        return NextResponse.json({
            success: true,
            imported,
            failed: allErrors.length,
            total: processResult.success.length + processResult.errors.length,
            errors: allErrors.slice(0, 10), // Limit error details
            message: `Successfully imported ${imported} parcels. ${allErrors.length} failed.`
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Server error: ' + String(error)
            },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('cadastral_parcels')
            .select('count')
            .single()

        if (error) throw error

        return NextResponse.json({
            total_parcels: data?.count || 0,
            message: 'Cadastral data statistics'
        })
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        )
    }
}