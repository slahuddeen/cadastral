'use client'

import { useState, useEffect } from 'react'
import { supabase, cadastralService } from '../../lib/supabase'

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...')
  const [parcels, setParcels] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [envStatus, setEnvStatus] = useState<any>({})

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    // Test environment variables
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      keyValue: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
    }
    setEnvStatus(envCheck)

    try {
      // Test basic Supabase connection
      const { data, error } = await supabase
        .from('cadastral_parcels')
        .select('count', { count: 'exact', head: true })

      if (error) {
        setConnectionStatus('❌ Connection Failed')
        setError(error.message)
      } else {
        setConnectionStatus('✅ Connected Successfully')
        
        // Try to get some actual data
        const { data: parcelsData, error: parcelsError } = await supabase
          .from('cadastral_parcels')
          .select('*')
          .limit(5)

        if (parcelsError) {
          setError(parcelsError.message)
        } else {
          setParcels(parcelsData || [])
        }
      }
    } catch (err) {
      setConnectionStatus('❌ Connection Error')
      setError(String(err))
    }
  }

  const testInsert = async () => {
    try {
      const testParcel = {
        parcel_id: `TEST_${Date.now()}`,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [98.707298, 3.526832],
            [98.707278, 3.526661],
            [98.707130, 3.526633],
            [98.706967, 3.526608],
            [98.707298, 3.526832]
          ]]
        },
        area_sqm: 1500,
        owner_name: 'Test Owner',
        land_use: 'Test Use',
        status: 'active'
      }

      const { data, error } = await supabase
        .from('cadastral_parcels')
        .insert(testParcel)
        .select()

      if (error) {
        setError('Insert failed: ' + error.message)
      } else {
        setError(null)
        alert('Test parcel inserted successfully!')
        testConnection() // Refresh data
      }
    } catch (err) {
      setError('Insert error: ' + String(err))
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🔧 Supabase Connection Test</h1>
      
      {/* Environment Variables Check */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>{envStatus.supabaseUrl ? '✅' : '❌'}</span>
            <span>NEXT_PUBLIC_SUPABASE_URL: {envStatus.urlValue || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{envStatus.supabaseKey ? '✅' : '❌'}</span>
            <span>NEXT_PUBLIC_SUPABASE_ANON_KEY: {envStatus.keyValue || 'Not set'}</span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Database Connection</h2>
        <div className="space-y-4">
          <div className="text-lg font-medium">{connectionStatus}</div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h3 className="font-medium text-red-800 mb-2">Error Details:</h3>
              <code className="text-sm text-red-600">{error}</code>
            </div>
          )}
          
          <button 
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Test Connection Again
          </button>
        </div>
      </div>

      {/* Data Check */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Database Data</h2>
        
        {parcels.length > 0 ? (
          <div>
            <p className="text-green-600 font-medium mb-4">
              ✅ Found {parcels.length} parcels in database
            </p>
            <div className="space-y-2">
              {parcels.map((parcel, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                  <div><strong>ID:</strong> {parcel.parcel_id}</div>
                  <div><strong>Owner:</strong> {parcel.owner_name || 'N/A'}</div>
                  <div><strong>Use:</strong> {parcel.land_use || 'N/A'}</div>
                  <div><strong>Area:</strong> {parcel.area_sqm} m²</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-yellow-600 font-medium mb-4">
              ⚠️ No parcels found in database
            </p>
            <p className="text-sm text-gray-600 mb-4">
              This might mean the table is empty or there's a connection issue.
            </p>
          </div>
        )}
        
        <button 
          onClick={testInsert}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mt-4"
        >
          ➕ Insert Test Parcel
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">🛠️ Troubleshooting</h2>
        <div className="space-y-2 text-sm">
          <p><strong>If environment variables are missing:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Add them in your Vercel dashboard under Settings → Environment Variables</li>
            <li>Make sure they start with NEXT_PUBLIC_</li>
            <li>Redeploy after adding them</li>
          </ul>
          
          <p className="mt-4"><strong>If connection fails:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Check your Supabase project URL and anon key</li>
            <li>Make sure the cadastral_parcels table exists</li>
            <li>Check Row Level Security settings in Supabase</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
