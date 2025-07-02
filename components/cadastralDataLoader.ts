// lib/cadastralDataLoader.ts
import React from 'react'

export interface CadastralParcel {
  id: string
  parcel_id: string
  owner_name: string
  land_use: string
  area_sqm: number
  status: string
  // Additional properties
  provinsi?: string
  kabupaten?: string
  nib?: string
  hak?: string
  tipeHak?: string
  luasTertulis?: string
  luasPeta?: string
  sk?: string
  tanggalSk?: string
  tanggalTerbitHak?: string
  berakhirHak?: string
  tipePemilik?: string
  penggunaan?: string
}

export interface CadastralFeature {
  type: 'Feature'
  properties: CadastralParcel
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface CadastralGeoJSON {
  type: 'FeatureCollection'
  features: CadastralFeature[]
}

/**
 * Convert your raw data to GeoJSON format for Mapbox
 */
export function convertToCadastralGeoJSON(rawData: any[]): CadastralGeoJSON {
  const features: CadastralFeature[] = rawData.map((item, index) => ({
    type: 'Feature',
    properties: {
      id: item.id || `parcel_${index}`,
      parcel_id: item.parcel_id || item.nib || `PARCEL_${index}`,
      owner_name: item.owner_name || item.pemilik || 'Unknown Owner',
      land_use: item.land_use || item.penggunaan || 'Unknown',
      area_sqm: parseFloat(item.area_sqm || item.luasPeta || '0'),
      status: item.status || 'active',
      // Include all other properties
      provinsi: item.provinsi,
      kabupaten: item.kabupaten,
      nib: item.nib,
      hak: item.hak,
      tipeHak: item.tipeHak,
      luasTertulis: item.luasTertulis,
      luasPeta: item.luasPeta,
      sk: item.sk,
      tanggalSk: item.tanggalSk,
      tanggalTerbitHak: item.tanggalTerbitHak,
      berakhirHak: item.berakhirHak,
      tipePemilik: item.tipePemilik,
      penggunaan: item.penggunaan
    },
    geometry: item.geometry
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Load cadastral data from various sources
 */
export class CadastralDataLoader {
  private static instance: CadastralDataLoader
  private cachedData: CadastralGeoJSON | null = null

  static getInstance(): CadastralDataLoader {
    if (!CadastralDataLoader.instance) {
      CadastralDataLoader.instance = new CadastralDataLoader()
    }
    return CadastralDataLoader.instance
  }

  /**
   * Load data from a GeoJSON file
   */
  async loadFromGeoJSON(file: File): Promise<CadastralGeoJSON> {
    try {
      const text = await file.text()
      const geoJson = JSON.parse(text)
      
      // Validate and convert if necessary
      if (geoJson.type === 'FeatureCollection') {
        return geoJson
      } else if (geoJson.features) {
        return convertToCadastralGeoJSON(geoJson.features)
      } else {
        throw new Error('Invalid GeoJSON format')
      }
    } catch (error) {
      console.error('Error loading GeoJSON:', error)
      throw new Error('Failed to load GeoJSON file')
    }
  }

  /**
   * Load data from API endpoint
   */
  async loadFromAPI(endpoint: string = '/api/cadastral-data'): Promise<CadastralGeoJSON> {
    try {
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Cache the data
      this.cachedData = data
      return data
    } catch (error) {
      console.error('Error loading data from API:', error)
      throw new Error('Failed to load data from API')
    }
  }

  /**
   * Search parcels by various criteria
   */
  searchParcels(query: string, data: CadastralGeoJSON): CadastralGeoJSON {
    const searchTerm = query.toLowerCase()
    
    const matchingFeatures = data.features.filter(feature => {
      const props = feature.properties
      return (
        props.owner_name?.toLowerCase().includes(searchTerm) ||
        props.parcel_id?.toLowerCase().includes(searchTerm) ||
        props.land_use?.toLowerCase().includes(searchTerm) ||
        props.provinsi?.toLowerCase().includes(searchTerm) ||
        props.kabupaten?.toLowerCase().includes(searchTerm)
      )
    })

    return {
      type: 'FeatureCollection',
      features: matchingFeatures
    }
  }

  /**
   * Get cached data
   */
  getCachedData(): CadastralGeoJSON | null {
    return this.cachedData
  }

  /**
   * Calculate bounds for a set of features
   */
  calculateBounds(features: CadastralFeature[]): [[number, number], [number, number]] | null {
    if (features.length === 0) return null

    let minLng = Infinity, minLat = Infinity
    let maxLng = -Infinity, maxLat = -Infinity

    features.forEach(feature => {
      const coords = this.extractCoordinates(feature.geometry)
      coords.forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng)
        minLat = Math.min(minLat, lat)
        maxLng = Math.max(maxLng, lng)
        maxLat = Math.max(maxLat, lat)
      })
    })

    return [[minLng, minLat], [maxLng, maxLat]]
  }

  private extractCoordinates(geometry: any): number[][] {
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
}

/**
 * React hook for loading cadastral data
 */
export function useCadastralData() {
  const [data, setData] = React.useState<CadastralGeoJSON | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = async (source: 'api' | File) => {
    setLoading(true)
    setError(null)
    
    try {
      const loader = CadastralDataLoader.getInstance()
      let result: CadastralGeoJSON
      
      if (source === 'api') {
        result = await loader.loadFromAPI()
      } else {
        result = await loader.loadFromGeoJSON(source)
      }
      
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, loadData }
}
