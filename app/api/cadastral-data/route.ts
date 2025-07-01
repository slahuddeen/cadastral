// app/api/cadastral-data/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Sample data based on your feature object structure
const sampleCadastralFeatures = [
    {
        "type": "Feature",
        "properties": {
            "id": "1",
            "parcel_id": "PTPN_001",
            "provinsi": "Sumatera Utara",
            "kabupaten": "Langkat",
            "nib": "12345",
            "su": "SU-001",
            "hak": "Hak Guna Usaha",
            "tipeHak": "HGU",
            "luasTertulis": "1500 m²",
            "luasPeta": "1487 m²",
            "sk": "SK/001/2023",
            "tanggalSk": "2023-01-15",
            "tanggalTerbitHak": "2023-02-01",
            "berakhirHak": "2048-02-01",
            "pemilik": "PT Perkebunan Nusantara",
            "tipePemilik": "Badan Usaha",
            "gunaTanahK": "Perkebunan",
            "gunaTanahU": "Kebun Kelapa Sawit",
            "terpetakan": "Ya",
            "kasus": "Tidak Ada",
            "pihak": "[]",
            "solusi": "Tidak Ada",
            "hasil": "Selesai",
            "penggunaan": "Aktif",
            "owner_name": "PT Perkebunan Nusantara",
            "land_use": "Perkebunan",
            "area_sqm": 1487,
            "status": "active"
        },
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": [
                [
                    [
                        [98.61325979232788, 3.6191095821497044],
                        [98.61319541931152, 3.618317231252732],
                        [98.60620021820068, 3.6186812844536007],
                        [98.60624313354492, 3.61930231604687],
                        [98.61325979232788, 3.6191095821497044]
                    ]
                ],
                [
                    [
                        [98.60130786895752, 3.6192594862954905],
                        [98.60158681869507, 3.6194308052888715],
                        [98.6056637763977, 3.6193237309218063],
                        [98.60562086105347, 3.6190667523891875],
                        [98.60502004623413, 3.6190025077446535],
                        [98.60502004623413, 3.6187669440090247],
                        [98.60152244567871, 3.618895433326955],
                        [98.60130786895752, 3.6192594862954905]
                    ]
                ]
            ]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "id": "2",
            "parcel_id": "PTPN_002",
            "provinsi": "Sumatera Utara",
            "kabupaten": "Langkat",
            "nib": "12346",
            "su": "SU-002",
            "hak": "Hak Milik",
            "tipeHak": "HM",
            "luasTertulis": "2500 m²",
            "luasPeta": "2487 m²",
            "sk": "SK/002/2023",
            "tanggalSk": "2023-01-20",
            "tanggalTerbitHak": "2023-02-05",
            "berakhirHak": "-",
            "pemilik": "Ahmad Subagio",
            "tipePemilik": "Perorangan",
            "gunaTanahK": "Pertanian",
            "gunaTanahU": "Sawah",
            "terpetakan": "Ya",
            "kasus": "Sengketa Batas",
            "pihak": "[\"Ahmad Subagio\", \"Siti Aminah\"]",
            "solusi": "Mediasi",
            "hasil": "Dalam Proses",
            "penggunaan": "Aktif",
            "owner_name": "Ahmad Subagio",
            "land_use": "Pertanian",
            "area_sqm": 2487,
            "status": "pending"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [98.59457015991211, 3.6337358267753075],
                [98.59491348266602, 3.6333931941778133],
                [98.59572887420654, 3.6334574377997484],
                [98.5956859588623, 3.629902617178388],
                [98.59600782394409, 3.6298812025539178],
                [98.59583616256714, 3.624591774766614],
                [98.59457015991211, 3.6337358267753075]
            ]]
        }
    }
]

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        const bounds = searchParams.get('bounds')

        let features = [...sampleCadastralFeatures]

        // Apply search filter if provided
        if (search) {
            const searchTerm = search.toLowerCase()
            features = features.filter(feature => {
                const props = feature.properties
                return (
                    props.owner_name?.toLowerCase().includes(searchTerm) ||
                    props.parcel_id?.toLowerCase().includes(searchTerm) ||
                    props.provinsi?.toLowerCase().includes(searchTerm) ||
                    props.kabupaten?.toLowerCase().includes(searchTerm) ||
                    props.land_use?.toLowerCase().includes(searchTerm)
                )
            })
        }

        // Apply bounds filter if provided
        if (bounds) {
            try {
                const [west, south, east, north] = bounds.split(',').map(Number)
                features = features.filter(feature => {
                    // Simple bounds check - you might want to implement more sophisticated spatial filtering
                    const coords = extractCoordinatesFromGeometry(feature.geometry)
                    return coords.some(([lng, lat]) =>
                        lng >= west && lng <= east && lat >= south && lat <= north
                    )
                })
            } catch (error) {
                console.error('Invalid bounds parameter:', error)
            }
        }

        const geoJson = {
            type: 'FeatureCollection',
            features
        }

        return NextResponse.json(geoJson, {
            headers: {
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            }
        })

    } catch (error) {
        console.error('Error fetching cadastral data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch cadastral data' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Handle bulk data import
        if (body.type === 'FeatureCollection' && body.features) {
            // Here you would typically save to a database
            // For now, we'll just validate and return success

            const validFeatures = body.features.filter((feature: any) =>
                feature.type === 'Feature' &&
                feature.geometry &&
                feature.properties
            )

            return NextResponse.json({
                success: true,
                imported: validFeatures.length,
                total: body.features.length,
                message: `Successfully processed ${validFeatures.length} parcels`
            })
        }

        return NextResponse.json(
            { error: 'Invalid data format' },
            { status: 400 }
        )

    } catch (error) {
        console.error('Error processing cadastral data:', error)
        return NextResponse.json(
            { error: 'Failed to process data' },
            { status: 500 }
        )
    }
}

// Helper function to extract coordinates from geometry
function extractCoordinatesFromGeometry(geometry: any): number[][] {
    const coords: number[][] = []

    if (geometry.type === 'Polygon') {
        geometry.coordinates[0].forEach((coord: number[]) => coords.push(coord))
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: number[][][]) => {
            polygon[0].forEach((coord: number[]) => coords.push(coord))
        })
    } else if (geometry.type === 'Point') {
        coords.push(geometry.coordinates)
    }

    return coords
}