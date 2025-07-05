// components/NavigationHeader.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface CoordinateOffset {
    latitude: number
    longitude: number
    enabled: boolean
}

interface NavigationHeaderProps {
    onCoordinateOffsetChange?: (offset: CoordinateOffset) => void
    currentOffset?: CoordinateOffset
}

export default function NavigationHeader({
    onCoordinateOffsetChange,
    currentOffset = { latitude: 0, longitude: 0, enabled: false }
}: NavigationHeaderProps) {
    const pathname = usePathname()
    const [showCorrectionPanel, setShowCorrectionPanel] = useState(false)
    const [tempOffset, setTempOffset] = useState(currentOffset)

    const navItems = [
        { href: '/', label: '🗺️ Map View', icon: 'map' },
        { href: '/admin/import', label: '📤 Upload Data', icon: 'upload' },
        { href: '/test', label: '🔧 System Test', icon: 'test' }
    ]

    const presetOffsets = [
        { name: "No Offset", lat: 0, lon: 0 },
        { name: "UTM to WGS84 (~50m south)", lat: -0.0005, lon: 0 },
        { name: "Datum Shift (~100m south)", lat: -0.001, lon: 0 },
        { name: "Small North Shift", lat: 0.0005, lon: 0 },
        { name: "Small South Shift", lat: -0.0005, lon: 0 },
        { name: "Small East Shift", lat: 0, lon: 0.0005 },
        { name: "Small West Shift", lat: 0, lon: -0.0005 }
    ]

    const applyOffset = () => {
        if (onCoordinateOffsetChange) {
            onCoordinateOffsetChange(tempOffset)
        }
    }

    const applyPreset = (lat: number, lon: number) => {
        const newOffset = { latitude: lat, longitude: lon, enabled: true }
        setTempOffset(newOffset)
        if (onCoordinateOffsetChange) {
            onCoordinateOffsetChange(newOffset)
        }
    }

    // Update tempOffset when currentOffset changes
    useState(() => {
        setTempOffset(currentOffset)
    })

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200 relative z-50">
            <div className="max-w-full mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M21 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </div>
                        Cadastral System
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === item.href
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right side with Coordinate Fix and Status */}
                    <div className="flex items-center gap-4">
                        {/* Coordinate Fix Button - Only show on map page */}
                        {pathname === '/' && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowCorrectionPanel(!showCorrectionPanel)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentOffset.enabled
                                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <span className="text-xs">🔧</span>
                                    <span>Coordinate Fix</span>
                                    {currentOffset.enabled && (
                                        <span className="text-xs bg-white bg-opacity-20 px-1 rounded">ON</span>
                                    )}
                                </button>

                                {/* Coordinate Correction Panel */}
                                {showCorrectionPanel && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border p-4 z-50">
                                        <h3 className="font-semibold text-sm mb-3">Coordinate Correction</h3>

                                        {/* Manual Offset Controls */}
                                        <div className="space-y-3 mb-4">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Latitude Offset (degrees)</label>
                                                <input
                                                    type="number"
                                                    step="0.00001"
                                                    value={tempOffset.latitude}
                                                    onChange={(e) => setTempOffset({
                                                        ...tempOffset,
                                                        latitude: parseFloat(e.target.value) || 0
                                                    })}
                                                    className="w-full px-2 py-1 border rounded text-xs"
                                                    placeholder="0.00000"
                                                />
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {(tempOffset.latitude * 111320).toFixed(1)}m {tempOffset.latitude > 0 ? 'north' : 'south'}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1">Longitude Offset (degrees)</label>
                                                <input
                                                    type="number"
                                                    step="0.00001"
                                                    value={tempOffset.longitude}
                                                    onChange={(e) => setTempOffset({
                                                        ...tempOffset,
                                                        longitude: parseFloat(e.target.value) || 0
                                                    })}
                                                    className="w-full px-2 py-1 border rounded text-xs"
                                                    placeholder="0.00000"
                                                />
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {(tempOffset.longitude * 111320).toFixed(1)}m {tempOffset.longitude > 0 ? 'east' : 'west'}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={tempOffset.enabled}
                                                    onChange={(e) => setTempOffset({
                                                        ...tempOffset,
                                                        enabled: e.target.checked
                                                    })}
                                                />
                                                <span className="text-xs">Enable correction</span>
                                            </div>

                                            <button
                                                onClick={applyOffset}
                                                className="w-full px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                            >
                                                Apply Manual Offset
                                            </button>
                                        </div>

                                        {/* Preset Offsets */}
                                        <div>
                                            <h4 className="text-xs font-medium mb-2">Quick Presets</h4>
                                            <div className="space-y-1">
                                                {presetOffsets.map((preset, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => applyPreset(preset.lat, preset.lon)}
                                                        className="w-full px-2 py-1 text-xs border rounded hover:bg-gray-50 text-left"
                                                    >
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Current Status */}
                                        <div className="mt-4 pt-3 border-t text-xs">
                                            <div className="font-medium">Current Offset:</div>
                                            <div>Lat: {currentOffset.latitude.toFixed(6)}° ({(currentOffset.latitude * 111320).toFixed(1)}m)</div>
                                            <div>Lon: {currentOffset.longitude.toFixed(6)}° ({(currentOffset.longitude * 111320).toFixed(1)}m)</div>
                                            <div>Status: {currentOffset.enabled ? '✅ Active' : '❌ Disabled'}</div>
                                        </div>

                                        {/* Close button */}
                                        <div className="mt-3 pt-3 border-t">
                                            <button
                                                onClick={() => setShowCorrectionPanel(false)}
                                                className="w-full px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Status Indicator */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            System Online
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}