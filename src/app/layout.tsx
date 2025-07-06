import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'RunGhost - GitHub Identity Dashboard',
    description: 'Monitor multiple GitHub identities from a single dashboard',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className} suppressHydrationWarning={true}>
                <div className="min-h-screen bg-background">
                    <header className="border-b">
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">RunGhost</h1>
                                    <p className="text-sm text-muted-foreground">GitHub Identity Dashboard</p>
                                </div>
                                <nav className="flex items-center space-x-6">
                                    <Link
                                        href="/"
                                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        Identities
                                    </Link>
                                    <Link
                                        href="/repositories"
                                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        Repositories
                                    </Link>
                                    <Link
                                        href="/releases"
                                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        Releases
                                    </Link>
                                    <Link
                                        href="/issues"
                                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        Issues
                                    </Link>
                                    <Link
                                        href="/dependencies"
                                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        Dependencies
                                    </Link>
                                    <Link
                                        href="/system"
                                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        System
                                    </Link>
                                </nav>
                            </div>
                        </div>
                    </header>
                    <main className="container mx-auto px-4 py-8">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
} 