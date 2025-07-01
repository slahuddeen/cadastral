import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold">
                🗺️ Cadastral System
              </Link>
              
              <div className="flex items-center gap-6">
                <Link 
                  href="/"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  🏠 Map View
                </Link>
                <Link 
                  href="/admin/import"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  📤 Import Data
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="py-6">
        {children}
      </main>
    </div>
  )
}