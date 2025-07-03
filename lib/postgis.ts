// lib/postgis.ts
import { supabase } from './supabase'

export interface SpatialBounds {
    minLng: number
    minLat: number
    maxLng: number
    maxLat: number
}

export interface ParcelWithGeometry {
    id: number
    parcel_id: string
    pemilik?: string
    luas_peta?: number
    geometry: any // GeoJSON geometry
    [key: string]: any // Other properties
}

export class PostGISService {
    /**
     * Check if PostGIS is enabled and working
     */
    static async checkPostGISStatus(): Promise<{ enabled: boolean, version?: string, error?: string }> {
        try {
            const { data, error } = await supabase.rpc('postgis_version')

            if (error) {
                return { enabled: false, error: error.message }
            }

            return { enabled: true, version: data }
        } catch (error) {
            return { enabled: false, error: String(error) }
        }
    }

    /**
     * Insert a parcel with geometry using PostGIS
     */
    static async insertParcelWithGeometry(
        parcelData: any,
        geometry: any
    ): Promise<{ success: boolean, id?: number, error?: string }> {
        try {
            const { data, error } = await supabase.rpc('insert_parcel_with_geometry', {
                parcel_data: parcelData,
                geom_geojson: JSON.stringify(geometry)
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, id: data?.[0]?.id }
        } catch (error) {
            return { success: false, error: String(error) }
        }
    }

    /**
     * Get parcels within geographic bounds
     */
    static async getParcelsInBounds(bounds: SpatialBounds): Promise<ParcelWithGeometry[]> {
        try {
            const { data, error } = await supabase.rpc('get_parcels_in_bounds', {
                min_lng: bounds.minLng,
                min_lat: bounds.minLat,
                max_lng: bounds.maxLng,
                max_lat: bounds.maxLat
            })

            if (error) {
                throw new Error(error.message)
            }

            return (data || []).map((item: any) => ({
                ...item,
                geometry: JSON.parse(item.geometry_json)
            }))
        } catch (error) {
            console.error('Error getting parcels in bounds:', error)
            return []
        }
    }

    /**
     * Get parcels with geometry as GeoJSON
     */
    static async getParcelsAsGeoJSON(
        limit: number = 1000,
        offset: number = 0,
        bounds?: SpatialBounds
    ): Promise<{ type: 'FeatureCollection', features: any[] }> {
        try {
            let query = supabase
                .from('cadastral_parcels')
                .select(`
                    *,
                    geometry_geojson:ST_AsGeoJSON(geometry)
                `)
                .range(offset, offset + limit - 1)
                .order('created_at', { ascending: false })

            // Add spatial filter if bounds provided
            if (bounds) {
                // This would require a custom RPC function for complex spatial queries
                // For now, we'll get all and filter client-side
            }

            const { data, error } = await query

            if (error) {
                throw new Error(error.message)
            }

            const features = (data || []).map(record => ({
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
                    updated_at: record.updated_at
                },
                geometry: record.geometry_geojson ? JSON.parse(record.geometry_geojson) : null
            })).filter(feature => feature.geometry !== null)

            return {
                type: 'FeatureCollection',
                features
            }
        } catch (error) {
            console.error('Error getting parcels as GeoJSON:', error)
            return { type: 'FeatureCollection', features: [] }
        }
    }

    /**
     * Calculate area of a geometry in square meters
     */
    static async calculateArea(geometry: any): Promise<number | null> {
        try {
            const { data, error } = await supabase.rpc('calculate_geometry_area', {
                geom_geojson: JSON.stringify(geometry)
            })

            if (error) {
                throw new Error(error.message)
            }

            return data
        } catch (error) {
            console.error('Error calculating area:', error)
            return null
        }
    }

    /**
     * Find parcels that intersect with a given geometry
     */
    static async findIntersectingParcels(geometry: any): Promise<ParcelWithGeometry[]> {
        try {
            const { data, error } = await supabase.rpc('find_intersecting_parcels', {
                search_geom: JSON.stringify(geometry)
            })

            if (error) {
                throw new Error(error.message)
            }

            return (data || []).map((item: any) => ({
                ...item,
                geometry: JSON.parse(item.geometry_json)
            }))
        } catch (error) {
            console.error('Error finding intersecting parcels:', error)
            return []
        }
    }

    /**
     * Get statistics about the cadastral data
     */
    static async getCadastralStats(): Promise<{
        totalParcels: number
        totalArea: number
        avgParcelSize: number
        parcelsByProvince: Array<{ provinsi: string, count: number, totalArea: number }>
    }> {
        try {
            const { data, error } = await supabase.rpc('get_cadastral_statistics')

            if (error) {
                throw new Error(error.message)
            }

            return data || {
                totalParcels: 0,
                totalArea: 0,
                avgParcelSize: 0,
                parcelsByProvince: []
            }
        } catch (error) {
            console.error('Error getting cadastral stats:', error)
            return {
                totalParcels: 0,
                totalArea: 0,
                avgParcelSize: 0,
                parcelsByProvince: []
            }
        }
    }

    /**
     * Validate and repair geometry if needed
     */
    static async validateAndRepairGeometry(geometry: any): Promise<{
        isValid: boolean
        repaired?: any
        error?: string
    }> {
        try {
            const { data, error } = await supabase.rpc('validate_and_repair_geometry', {
                geom_geojson: JSON.stringify(geometry)
            })

            if (error) {
                throw new Error(error.message)
            }

            return {
                isValid: data.is_valid,
                repaired: data.repaired_geom ? JSON.parse(data.repaired_geom) : undefined
            }
        } catch (error) {
            return {
                isValid: false,
                error: String(error)
            }
        }
    }
}

// Helper functions for coordinate transformations
export class CoordinateUtils {
    /**
     * Convert coordinates from one CRS to another using PostGIS
     */
    static async transformCoordinates(
        geometry: any,
        fromSRID: number,
        toSRID: number
    ): Promise<any | null> {
        try {
            const { data, error } = await supabase.rpc('transform_geometry', {
                geom_geojson: JSON.stringify(geometry),
                from_srid: fromSRID,
                to_srid: toSRID
            })

            if (error) {
                throw new Error(error.message)
            }

            return JSON.parse(data)
        } catch (error) {
            console.error('Error transforming coordinates:', error)
            return null
        }
    }

    /**
     * Get the bounding box of a geometry
     */
    static async getBoundingBox(geometry: any): Promise<SpatialBounds | null> {
        try {
            const { data, error } = await supabase.rpc('get_geometry_bounds', {
                geom_geojson: JSON.stringify(geometry)
            })

            if (error) {
                throw new Error(error.message)
            }

            return {
                minLng: data.min_lng,
                minLat: data.min_lat,
                maxLng: data.max_lng,
                maxLat: data.max_lat
            }
        } catch (error) {
            console.error('Error getting bounding box:', error)
            return null
        }
    }
}

// Export types for use in other files
export type { SpatialBounds, ParcelWithGeometry }