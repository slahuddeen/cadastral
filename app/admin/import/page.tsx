// app/admin/import/page.tsx
'use client'

import { useState } from 'react'

interface UploadResult {
    success: boolean
    imported?: number
    failed?: number
    errors?: any[]
    message?: string
}

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<UploadResult | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            // Accept both ZIP files (for shapefiles) and GeoJSON files
            const validTypes = [
                'application/zip',
                'application/x-zip-compressed',
                'application/json',
                'application/geo+json'
            ]

            const isValidType = validTypes.includes(selectedFile.type) ||
                selectedFile.name.endsWith('.zip') ||
                selectedFile.name.endsWith('.geojson') ||
                selectedFile.name.endsWith('.json')

            if (isValidType) {
                setFile(selectedFile)
                setResult(null)
            } else {
                alert('Please select a valid file: ZIP file containing shapefiles or GeoJSON file')
            }
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        setUploadProgress(0)

        try {
            const formData = new FormData()
            formData.append('file', file)

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

            const result = await response.json()
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
                            accept=".zip,.json,.geojson"
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
                            <p>• ZIP files containing shapefiles (.shp, .dbf, .shx, .prj)</p>
                            <p>• GeoJSON files (.json, .geojson)</p>
                            <p><strong>Maximum file size:</strong> 100MB</p>
                        </div>
                    </div>

                    {file && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                            </svg>
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-sm text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                        </div>
                    )}

                    {uploadProgress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
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
                                <span className="font-medium">Import completed successfully!</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="font-medium text-green-800">✅ Successfully Imported</div>
                                    <div className="text-2xl font-bold text-green-600">{result.imported || 0}</div>
                                    <div className="text-green-700">cadastral parcels</div>
                                </div>

                                <div className="bg-red-50 p-4 rounded-lg">
                                    <div className="font-medium text-red-800">❌ Failed</div>
                                    <div className="text-2xl font-bold text-red-600">{result.failed || 0}</div>
                                    <div className="text-red-700">records with errors</div>
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="font-medium text-gray-800 mb-2">Error Details:</h3>
                                    <div className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                                        {result.errors.map((error, index) => (
                                            <div key={index} className="text-sm text-red-600 mb-1">
                                                Row {error.index + 1}: {error.message}
                                            </div>
                                        ))}
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

            {/* Data Mapping Guide */}
            <div className="bg-blue-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-blue-800">📋 Data Field Mapping</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h3 className="font-medium text-blue-800 mb-2">Required Fields:</h3>
                        <ul className="space-y-1 text-blue-700">
                            <li>• parcel_id (unique identifier)</li>
                            <li>• geometry (spatial data)</li>
                            <li>• provinsi (province)</li>
                            <li>• kabupaten (regency)</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-medium text-blue-800 mb-2">Supported Fields:</h3>
                        <ul className="space-y-1 text-blue-700">
                            <li>• pemilik (owner)</li>
                            <li>• tipe_hak (rights type)</li>
                            <li>• luas_peta (area)</li>
                            <li>• penggunaan (land use)</li>
                            <li>• And many more...</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}