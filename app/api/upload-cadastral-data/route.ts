// app/api/upload-cadastral-data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

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
        timestamp: new Date().toISOString()
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

        // Process file based on type
        if (file.name.endsWith('.zip')) {
            return NextResponse.json(
                { success: false, message: 'Shapefile support coming soon. Please use GeoJSON for now.' },
                { status: 400 }
            )
        } else if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
            const buffer = Buffer.from(await file.arrayBuffer())
            let content = buffer.toString('utf-8')

            // Remove BOM (Byte Order Mark) if present
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1)
            }

            console.log('Content preview:', content.substring(0, 100))
            const geoJson = JSON.parse(content)

            // Process the GeoJSON
            const processResult = await processGeoJSON(geoJson)
            console.log(`Processed ${processResult.success.length} features, ${processResult.errors.length} errors`)

            // Insert into database
            let imported = 0
            const insertErrors: any[] = []

            for (const record of processResult.success) {
                try {
                    // Prepare data for insertion
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
                        // Note: We'll handle geometry separately to avoid PostGIS compilation issues
                    }

                    console.log(`Inserting parcel: ${record.parcel_id}`)

                    const { data, error } = await supabase
                        .from('cadastral_parcels')
                        .insert(insertData)
                        .select('id')

                    if (error) {
                        console.error(`Insert error for ${record.parcel_id}:`, error)
                        insertErrors.push({
                            parcel_id: record.parcel_id,
                            message: error.message,
                            details: error
                        })
                    } else {
                        imported++
                        console.log(`Successfully inserted: ${record.parcel_id}`)

                        // TODO: Add geometry insertion here when PostGIS is properly configured
                        // For now, geometry will be handled in a future update
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
                message: `Successfully imported ${imported} parcels. ${allErrors.length} failed.${allErrors.length > 0 ? ' Geometry data will be supported in a future update.' : ''}`
            })
        } else {
            return NextResponse.json(
                { success: false, message: 'Unsupported file format. Please use GeoJSON (.json or .geojson).' },
                { status: 400 }
            )
        }

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { success: false, message: `Server error: ${error}` },
            { status: 500 }
        )
    }
}