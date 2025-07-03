// app/admin/import/page.tsx
'use client'

import { useState } from 'react'

interface UploadResult {
    success: boolean
    imported?: number
    failed?: number
    errors?: any[]
    message?: string
    fileType?: string
}

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<UploadResult | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            const validTypes = [
                'application/json',
                'application/geo+json',
                'application/zip',
                'application/x-zip-compressed'
            ]

            const isValidType = validTypes.includes(selectedFile.type) ||
                selectedFile.name.endsWith('.geojson') ||
                selectedFile.name.endsWith('.json') ||
                selectedFile.name.endsWith('.zip')

            if (isValidType) {
                setFile(selectedFile)
                setResult(null)
                console.log('File selected:', selectedFile.name)
            } else {
                alert('Please select a valid file (.json, .geojson, or .zip)')
            }
        }
    }

    const handleUpload = async () => {
        if (!file) return

        console.log('Starting upload for:', file.name)
        setUploading(true)
        setUploadProgress(0)

        try {
            const formData = new FormData()
            formData.append('file', file)

            console.log('Sending request to /api/upload-cadastral-data')

            // Simulate progress for UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval)
                        return 90
                    }
                    return prev + 10
                })
            }, 200)

            const response = await fetch('/api/upload-cadastral-data', {
                method: 'POST',
                body: formData,
            })

            clearInterval(progressInterval)
            setUploadProgress(100)

            console.log('Response status:', response.status)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            console.log('Upload result:', result)
            setResult(result)

        } catch (error) {
            console.error('Upload failed:', error)
            setResult({
                success: false,
                message: 'Upload failed: ' + String(error)
            })
        } finally {
            setUploading(false)
            setTimeout(() => setUploadProgress(0), 2000)
        }
    }

    const getFileTypeIcon = () => {
        if (!file) return '📁'

        if (file.name.toLowerCase().endsWith('.zip')) {
            return '🗂️'
        } else if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.geojson')) {
            return '📄'
        }
        return '📁'
    }

    const getFileTypeDescription = () => {
        if (!file) return 'No file selected'

        if (file.name.toLowerCase().endsWith('.zip')) {
            return 'Shapefile Archive (.zip)'
        } else if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.geojson')) {
            return 'GeoJSON File'
        }
        return 'Unknown file type'
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">📁 Import Cadastral Data</h1>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Upload Files</h2>

                <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 mx-auto mb-4">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7,10 12,15 17,10" />
                            <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>

                        <input
                            type="file"
                            accept=".json,.geojson,.zip"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                            disabled={uploading}
                        />

                        <label
                            htmlFor="file-upload"
                            className={`cursor-pointer text-blue-600 hover:text-blue-700 block ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Click to select file
                        </label>

                        <div className="text-sm text-gray-500 mt-2 space-y-1">
                            <p><strong>Supported formats:</strong></p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <div className="bg-blue-50 p-3 rounded">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🗂️</span>
                                        <div>
                                            <p className="font-medium text-blue-800">Shapefile</p>
                                            <p className="text-xs text-blue-600">.zip archives containing .shp, .dbf, .shx files</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">📄</span>
                                        <div>
                                            <p className="font-medium text-green-800">GeoJSON</p>
                                            <p className="text-xs text-green-600">.json or .geojson files</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-2"><strong>Maximum file size:</strong> 100MB</p>
                        </div>
                    </div>

                    {file && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="text-2xl">{getFileTypeIcon()}</span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{file.name}</span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {getFileTypeDescription()}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                </span>
                            </div>
                        </div>
                    )}

                    {uploadProgress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300 relative"
                                style={{ width: `${uploadProgress}%` }}
                            >
                                <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-75"></div>
                            </div>
                            <div className="text-center text-sm text-gray-600 mt-1">
                                {uploadProgress < 100 ? `Processing... ${uploadProgress}%` : 'Finalizing...'}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                    >
                        {uploading ? (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                                </svg>
                                Processing... {uploadProgress}%
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7,10 12,15 17,10" />
                                    <line x1="12" x2="12" y1="15" y2="3" />
                                </svg>
                                Upload & Import Data
                            </>
                        )}
                    </button>
                </div>
            </div>

            {result && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Import Results</h2>

                    {result.success ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20,6 9,17 4,12" />
                                </svg>
                                <span className="font-medium">Upload completed successfully!</span>
                                {result.fileType && (
                                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                                        {result.fileType === 'shapefile' ? 'Shapefile' : 'GeoJSON'}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <div className="font-medium text-green-800">✅ Successfully Processed</div>
                                    <div className="text-2xl font-bold text-green-600">{result.imported || 0}</div>
                                    <div className="text-green-700">cadastral parcels</div>
                                </div>

                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <div className="font-medium text-red-800">❌ Failed</div>
                                    <div className="text-2xl font-bold text-red-600">{result.failed || 0}</div>
                                    <div className="text-red-700">records with errors</div>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    <strong>✅ Success!</strong> Your cadastral data has been imported with full spatial support using PostGIS. Geometry data is now available for spatial queries and analysis.
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <a
                                        href="/"
                                        className="text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 font-medium transition-colors"
                                    >
                                        🗺️ View parcels on map
                                    </a>
                                    <button
                                        onClick={() => { setResult(null); setFile(null) }}
                                        className="text-sm bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 font-medium transition-colors"
                                    >
                                        📤 Upload more data
                                    </button>
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-800 mb-2">
                                        <strong>⚠️ Warning:</strong> Some records had issues:
                                    </p>
                                    <div className="max-h-32 overflow-y-auto">
                                        {result.errors.slice(0, 5).map((error, index) => (
                                            <div key={index} className="text-xs text-yellow-700 mb-1">
                                                • {error.message}
                                            </div>
                                        ))}
                                        {result.errors.length > 5 && (
                                            <div className="text-xs text-yellow-600">
                                                ... and {result.errors.length - 5} more errors
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-600">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" x2="9" y1="9" y2="15" />
                                <line x1="9" x2="15" y1="9" y2="15" />
                            </svg>
                            <span>{result.message}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Help Section */}
            <div className="bg-blue-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">📋 Data Format Guidelines</h2>
                <div className="space-y-4 text-sm">
                    <div>
                        <h3 className="font-medium text-blue-800 mb-2">🗂️ Shapefile Requirements:</h3>
                        <ul className="list-disc list-inside ml-4 space-y-1 text-blue-700">
                            <li>ZIP file containing .shp, .dbf, and .shx files (minimum required)</li>
                            <li>Optional: .prj file for coordinate system information</li>
                            <li>Attribute table (.dbf) should contain cadastral information</li>
                            <li>Supports polygon and multipolygon geometries</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-medium text-blue-800 mb-2">📄 GeoJSON Requirements:</h3>
                        <ul className="list-disc list-inside ml-4 space-y-1 text-blue-700">
                            <li>Valid GeoJSON format with FeatureCollection</li>
                            <li>Each feature should have properties with cadastral data</li>
                            <li>Coordinates should be in WGS84 (EPSG:4326) format</li>
                            <li>Supports various geometry types</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-medium text-blue-800 mb-2">🏷️ Supported Field Names:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div>
                                <strong>Location:</strong><br />
                                PROVINSI, KABUPATEN, KECAMATAN, DESA
                            </div>
                            <div>
                                <strong>Identification:</strong><br />
                                NIB, HAK, TIPE_HAK, SU
                            </div>
                            <div>
                                <strong>Area:</strong><br />
                                LUAS_TERTULIS, LUAS_PETA
                            </div>
                            <div>
                                <strong>Owner:</strong><br />
                                PEMILIK, TIPE_PEMILIK
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}