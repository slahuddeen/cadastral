// app/admin/layout.tsx
import NavigationHeader from '../../components/NavigationHeader'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <NavigationHeader />

            <main className="flex-1 py-6">
                {children}
            </main>
        </div>
    )
}