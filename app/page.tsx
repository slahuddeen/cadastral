export default function Home() {
  return (
    <main className="h-screen w-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Cadastral Mapping System
        </h1>
        <p className="text-gray-600 mb-8">
          Interactive Parcel Viewer - Coming Soon
        </p>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Next.js App</span>
              <span className="text-green-600 text-sm font-semibold">✓ Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="text-yellow-600 text-sm font-semibold">⚠ Setup Required</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Map Service</span>
              <span className="text-yellow-600 text-sm font-semibold">⚠ Setup Required</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-500">
              Configure environment variables to enable full functionality
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
