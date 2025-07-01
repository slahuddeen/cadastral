'use client';

import { useState } from 'react';

// Simple SVG Icons
const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 mx-auto mb-4">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" x2="8" y1="13" y2="13"/>
    <line x1="16" x2="8" y1="17" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" x2="9" y1="9" y2="15"/>
    <line x1="9" x2="15" y1="9" y2="15"/>
  </svg>
);

const LoaderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <path d="M21 12a9 9 0 11-6.219-8.56"/>
  </svg>
);

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a valid GeoJSON file (.json)');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const fileContent = await file.text();
      const geojson = JSON.parse(fileContent);

      const response = await fetch('/api/import-parcels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geojson),
      });

      const result = await response.json();
      setResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      setResult({
        success: false,
        error: 'Failed to import file: ' + String(error)
      });
    } finally {
      setImporting(false);
    }
  };

  const sampleGeoJSON = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          parcel_id: "SAMPLE_001",
          owner_name: "John Doe",
          land_use: "Residential"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [98.707298, 3.526832],
            [98.707278, 3.526661],
            [98.707130, 3.526633],
            [98.706967, 3.526608],
            [98.707298, 3.526832]
          ]]
        }
      }
    ]
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📁 Import Cadastral Data</h1>
      
      {/* Import Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload GeoJSON File</h2>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <UploadIcon />
            <input
              type="file"
              accept=".json,.geojson"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-blue-600 hover:text-blue-700 block"
            >
              Click to select GeoJSON file
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Supported formats: .json, .geojson
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <FileIcon />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-sm text-gray-500">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <LoaderIcon />
                Importing...
              </>
            ) : (
              '📤 Import Parcels'
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Import Results</h2>
          
          {result.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckIcon />
                <span className="font-medium">Import completed successfully!</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 p-3 rounded">
                  <div className="font-medium text-green-800">✅ Imported</div>
                  <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <div className="font-medium text-red-800">❌ Failed</div>
                  <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-red-800 mb-2">Errors:</h3>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.map((error: any, index: number) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        Parcel {error.parcel_id}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <XIcon />
              <span>{result.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Sample Format Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">📄 Sample GeoJSON Format</h2>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
          {JSON.stringify(sampleGeoJSON, null, 2)}
        </pre>
        <p className="text-sm text-gray-600 mt-3">
          Your GeoJSON should include properties for parcel_id, owner_name, and land_use.
          Coordinates should be in WGS84 (EPSG:4326) format.
        </p>
      </div>
    </div>
  );
}
