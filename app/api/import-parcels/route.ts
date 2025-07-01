import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { features } = body

    if (!features || !Array.isArray(features)) {
      return NextResponse.json(
        { error: 'Invalid GeoJSON format. Expected features array.' },
        { status: 400 }
      )
    }

    // Simulate import process
    const results = []
    const errors = []

    for (let i = 0; i < features.length; i++) {
      try {
        const feature = features[i]
        const parcelId = feature.properties?.parcel_id || `PARCEL_${Date.now()}_${i}`
        
        // Simulate successful import
        results.push({
          id: i + 1,
          parcel_id: parcelId,
          status: 'imported'
        })
      } catch (error) {
        errors.push({ 
          index: i, 
          parcel_id: `unknown_${i}`, 
          error: String(error) 
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import parcels', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      total_parcels: 0,
      recent_imports: []
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch import status' },
      { status: 500 }
    )
  }
}