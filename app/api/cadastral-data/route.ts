// app/api/cadastral-data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        const bounds = searchParams.get('bounds')
        const limit = parseInt(searchParams.get('limit') || '1000')
        const offset = parseInt(searchParams.get('offset') || '0')
        const filter = searchParams.get('filter')

        // For now, we'll fetch data without geometry to avoid the PostGIS parsing issue
        // We can add geometry support later once the basic functionality works
        let query = supabase
            .from('cadastral_parcels')
            .select(`
                id,
                parcel_id,
                provinsi,
                kabupaten,
                kecamatan,
                desa,
                nib,
                su,
                hak,
                tipe_hak,
                luas_tertulis,
                luas_peta,
                sk,
                tanggal_sk,
                tanggal_terbit_hak,
                berakhir_hak,
                pemilik,
                tipe_pemilik,
                guna_tanah_klasifikasi,
                guna_tanah_utama,
                penggunaan,
                terpetakan,
                kasus,
                pihak_bersengketa,
                solusi,
                hasil,
                upaya_penanganan,
                no_peta,
                status,
                keterangan,
                created_at,
                updated_at
            `)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false })

        // Apply search filter if provided
        if (search) {
            const searchTerm = `%${search}%`
            query = query.or(`pemilik.ilike.${searchTerm},parcel_id.ilike.${searchTerm},provinsi.ilike.${searchTerm},kabupaten.ilike.${searchTerm},penggunaan.ilike.${searchTerm},nib.ilike.${searchTerm},hak.ilike.${searchTerm}`)
        }

        // Apply specific filters
        if (filter && filter !== 'all') {
            query = query.or(`tipe_hak.eq.${filter},status.eq.${filter}`)
        }

        const { data, error } = await query

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json(
                { error: 'Database query failed: ' + error.message },
                { status: 500 }
            )
        }

        // For now, we'll create dummy geometry for each parcel
        // In production, you'll want to properly fetch the PostGIS geometry
        const createDummyGeometry = (index: number) => ({
            type: "Polygon",
            coordinates: [[
                [98.707298 + (index * 0.001), 3.526832 + (index * 0.001)],
                [98.707278 + (index * 0.001), 3.526661 + (index * 0.001)],
                [98.707130 + (index * 0.001), 3.526633 + (index * 0.001)],
                [98.706967 + (index * 0.001), 3.526608 + (index * 0.001)],
                [98.707298 + (index * 0.001), 3.526832 + (index * 0.001)]
            ]]
        })

        // Convert to GeoJSON format
        const features = (data || []).map((record, index) => ({
            type: 'Feature',
            properties: {
                id: record.id,
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
                created_at: record.created_at,
                updated_at: record.updated_at,

                // Legacy fields for backward compatibility
                owner_name: record.pemilik,
                land_use: record.penggunaan,
                area_sqm: record.luas_peta
            },
            geometry: createDummyGeometry(index)
        }))

        const geoJson = {
            type: 'FeatureCollection',
            features: features || []
        }

        return NextResponse.json(geoJson, {
            headers: {
                'Cache-Control': 'public, max-age=60',
                'X-Total-Count': features.length.toString(),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        })

    } catch (error) {
        console.error('Error fetching cadastral data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch cadastral data: ' + String(error) },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Handle bulk data import or single parcel creation
        if (body.type === 'FeatureCollection' && body.features) {
            const results = []
            const errors = []

            for (const feature of body.features) {
                try {
                    const properties = feature.properties || {}

                    // Prepare the data for insertion
                    const insertData = {
                        parcel_id: properties.parcel_id || `PARCEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        provinsi: properties.provinsi || null,
                        kabupaten: properties.kabupaten || null,
                        kecamatan: properties.kecamatan || null,
                        desa: properties.desa || null,
                        nib: properties.nib || null,
                        su: properties.su || null,
                        hak: properties.hak || null,
                        tipe_hak: properties.tipe_hak || null,
                        luas_tertulis: properties.luas_tertulis || null,
                        luas_peta: properties.luas_peta || properties.area_sqm || null,
                        sk: properties.sk || null,
                        tanggal_sk: properties.tanggal_sk || null,
                        tanggal_terbit_hak: properties.tanggal_terbit_hak || null,
                        berakhir_hak: properties.berakhir_hak || null,
                        pemilik: properties.pemilik || properties.owner_name || null,
                        tipe_pemilik: properties.tipe_pemilik || null,
                        guna_tanah_klasifikasi: properties.guna_tanah_klasifikasi || null,
                        guna_tanah_utama: properties.guna_tanah_utama || null,
                        penggunaan: properties.penggunaan || properties.land_use || null,
                        terpetakan: properties.terpetakan || null,
                        kasus: properties.kasus || null,
                        pihak_bersengketa: properties.pihak_bersengketa || null,
                        solusi: properties.solusi || null,
                        hasil: properties.hasil || null,
                        upaya_penanganan: properties.upaya_penanganan || null,
                        no_peta: properties.no_peta || null,
                        status: properties.status || 'active',
                        keterangan: properties.keterangan || null
                    }

                    // Insert the data (geometry will be handled separately later)
                    const { data, error } = await supabase
                        .from('cadastral_parcels')
                        .insert(insertData)
                        .select()

                    if (error) {
                        errors.push({
                            parcel_id: insertData.parcel_id,
                            error: error.message,
                            feature
                        })
                    } else {
                        results.push(data[0])
                        // TODO: Add geometry insertion when PostGIS support is properly configured
                    }
                } catch (err) {
                    errors.push({
                        parcel_id: 'unknown',
                        error: String(err),
                        feature
                    })
                }
            }

            return NextResponse.json({
                success: true,
                imported: results.length,
                failed: errors.length,
                total: body.features.length,
                results,
                errors: errors.slice(0, 10),
                message: `Successfully processed ${results.length} parcels. ${errors.length} failed.`
            })
        }

        // Handle single parcel creation
        const properties = body.properties || {}
        const insertData = {
            parcel_id: properties.parcel_id || body.parcel_id || `PARCEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            provinsi: properties.provinsi || body.provinsi || null,
            kabupaten: properties.kabupaten || body.kabupaten || null,
            kecamatan: properties.kecamatan || body.kecamatan || null,
            desa: properties.desa || body.desa || null,
            nib: properties.nib || body.nib || null,
            su: properties.su || body.su || null,
            hak: properties.hak || body.hak || null,
            tipe_hak: properties.tipe_hak || body.tipe_hak || null,
            luas_tertulis: properties.luas_tertulis || body.luas_tertulis || null,
            luas_peta: properties.luas_peta || body.luas_peta || properties.area_sqm || body.area_sqm || null,
            sk: properties.sk || body.sk || null,
            tanggal_sk: properties.tanggal_sk || body.tanggal_sk || null,
            tanggal_terbit_hak: properties.tanggal_terbit_hak || body.tanggal_terbit_hak || null,
            berakhir_hak: properties.berakhir_hak || body.berakhir_hak || null,
            pemilik: properties.pemilik || body.pemilik || properties.owner_name || body.owner_name || null,
            tipe_pemilik: properties.tipe_pemilik || body.tipe_pemilik || null,
            guna_tanah_klasifikasi: properties.guna_tanah_klasifikasi || body.guna_tanah_klasifikasi || null,
            guna_tanah_utama: properties.guna_tanah_utama || body.guna_tanah_utama || null,
            penggunaan: properties.penggunaan || body.penggunaan || properties.land_use || body.land_use || null,
            terpetakan: properties.terpetakan || body.terpetakan || null,
            kasus: properties.kasus || body.kasus || null,
            pihak_bersengketa: properties.pihak_bersengketa || body.pihak_bersengketa || null,
            solusi: properties.solusi || body.solusi || null,
            hasil: properties.hasil || body.hasil || null,
            upaya_penanganan: properties.upaya_penanganan || body.upaya_penanganan || null,
            no_peta: properties.no_peta || body.no_peta || null,
            status: properties.status || body.status || 'active',
            keterangan: properties.keterangan || body.keterangan || null
        }

        const { data, error } = await supabase
            .from('cadastral_parcels')
            .insert(insertData)
            .select()

        if (error) {
            return NextResponse.json(
                { error: error.message, details: error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data[0],
            message: 'Parcel created successfully'
        })

    } catch (error) {
        console.error('Error creating cadastral data:', error)
        return NextResponse.json(
            { error: 'Failed to create data: ' + String(error) },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Parcel ID is required for updates' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('cadastral_parcels')
            .update(updateData)
            .eq('id', id)
            .select()

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            )
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'Parcel not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data[0],
            message: 'Parcel updated successfully'
        })

    } catch (error) {
        console.error('Error updating cadastral data:', error)
        return NextResponse.json(
            { error: 'Failed to update data: ' + String(error) },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Parcel ID is required for deletion' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('cadastral_parcels')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Parcel deleted successfully'
        })

    } catch (error) {
        console.error('Error deleting cadastral data:', error)
        return NextResponse.json(
            { error: 'Failed to delete data: ' + String(error) },
            { status: 500 }
        )
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}