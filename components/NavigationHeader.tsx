// components/NavigationHeader.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavigationHeader() {
    const pathname = usePathname()

    const navItems = [
        { href: '/', label: '🗺️ Map View', icon: 'map' },
        { href: '/admin/import', label: '📤 Upload Data', icon: 'upload' },
        { href: '/test', label: '🔧 System Test', icon: 'test' }
    ]

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

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        System Online
                    </div>
                </div>
            </div>
        </nav>
    )
}