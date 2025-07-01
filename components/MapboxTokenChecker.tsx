// components/MapboxTokenChecker.tsx
'use client'

import { useState, useEffect } from 'react'

interface TokenInfo {
    valid: boolean
    scopes?: string[]
    usage?: any
    error?: string
}

export default function MapboxTokenChecker() {
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
    const [loading, setLoading] = useState(false)
    const [showDetails, setShowDetails] = useState(false)

    const checkToken = async () => {
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

        if (!token) {
            setTokenInfo({
                valid: false,
                error: 'No token found in environment variables'
            })
            return
        }

        setLoading(true)

        try {
            // Check token validity
            const response = await fetch(`https://api.mapbox.com/tokens/v2?access_token=${token}`)

            if (response.ok) {
                const data = await response.json()
                setTokenInfo({
                    valid: true,
                    scopes: data.scopes,
                    usage: data.usage
                })
            } else {
                const errorData = await response.json()
                setTokenInfo({
                    valid: false,
                    error: errorData.message || `HTTP ${response.status}`
                })
            }
        } catch (error) {
            setTokenInfo({
                valid: false,
                error: 'Network error or invalid token format'
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        checkToken()
    }, [])

    const tokenMasked = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        ? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.substring(0, 8) + '••••••••••••'
        : 'Not set'

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🗺️ Mapbox Token Status
                </h2>

                {/* Token Display */}
                <div className="mb-4 p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                        Environment Variable:
                    </div>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN={tokenMasked}
                    </code>
                </div>

                {/* Status */}
                <div className="mb-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-blue-600">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                                <path d="M21 12a9 9 0 11-6.219-8.56" />
                            </svg>
                            Checking token...
                        </div>
                    ) : tokenInfo ? (
                        <div className={`flex items-center gap-2 ${tokenInfo.valid ? 'text-green-600' : 'text-red-600'}`}>
                            {tokenInfo.valid ? '✅' : '❌'}
                            <span className="font-medium">
                                {tokenInfo.valid ? 'Token is valid!' : 'Token is invalid'}
                            </span>
                        </div>
                    ) : null}
                </div>

                {/* Error Details */}
                {tokenInfo && !tokenInfo.valid && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="text-red-800 font-medium mb-2">Error Details:</div>
                        <div className="text-red-700 text-sm">{tokenInfo.error}</div>
                    </div>
                )}

                {/* Token Scopes */}
                {tokenInfo && tokenInfo.valid && tokenInfo.scopes && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            {showDetails ? 'Hide' : 'Show'} Token Details
                        </button>

                        {showDetails && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                <div className="text-blue-800 font-medium mb-2">Token Scopes:</div>
                                <ul className="text-blue-700 text-sm space-y-1">
                                    {tokenInfo.scopes.map((scope, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                            {scope}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Troubleshooting */}
                <div className="mt-6 p-4 bg-gray-50 rounded">
                    <h3 className="font-medium text-gray-800 mb-3">🛠️ Troubleshooting</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                        <div>
                            <strong>1. Check your Vercel environment variables:</strong>
                            <ul className="ml-4 mt-1 space-y-1">
                                <li>• Go to your Vercel dashboard</li>
                                <li>• Navigate to Settings → Environment Variables</li>
                                <li>• Ensure <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> is set</li>
                                <li>• Redeploy your application after adding the variable</li>
                            </ul>
                        </div>

                        <div className="mt-3">
                            <strong>2. Verify your Mapbox token:</strong>
                            <ul className="ml-4 mt-1 space-y-1">
                                <li>• Make sure the token starts with 'pk.' for public tokens</li>
                                <li>• Check that the token has the required scopes (styles:read, fonts:read)</li>
                                <li>• Ensure the token isn't expired</li>
                            </ul>
                        </div>

                        <div className="mt-3">
                            <strong>3. Create a new token if needed:</strong>
                            <ul className="ml-4 mt-1 space-y-1">
                                <li>• Go to <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mapbox Account</a></li>
                                <li>• Click "Create a token"</li>
                                <li>• Select the required scopes</li>
                                <li>• Copy the token and add it to your environment variables</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Retry Button */}
                <div className="mt-4">
                    <button
                        onClick={checkToken}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading ? 'Checking...' : 'Recheck Token'}
                    </button>
                </div>
            </div>
        </div>
    )
}