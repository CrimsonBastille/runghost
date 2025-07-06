import { DatabaseStatusSection } from '@/components/DatabaseStatusSection';
import { GitHubRefreshButton } from '@/components/GitHubRefreshButton';
import { DependenciesRefreshButton } from '@/components/DependenciesRefreshButton';
import { DatabaseResetButton } from '@/components/DatabaseResetButton';
import Link from 'next/link';

export default function DatabasePage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/system" className="text-muted-foreground hover:text-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Database Status</h1>
                    <p className="text-muted-foreground">
                        Explore database tables, records, and execute queries
                    </p>
                </div>
            </div>

            {/* Data Refresh Section */}
            <div className="bg-card border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Data Refresh</h2>
                <p className="text-muted-foreground mb-6">
                    Manually refresh GitHub data and dependencies information
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <GitHubRefreshButton />
                    </div>
                    <div>
                        <DependenciesRefreshButton />
                    </div>
                </div>
            </div>

            {/* Database Reset Section */}
            <div className="bg-card border rounded-lg p-6">
                <DatabaseResetButton />
            </div>

            {/* Database Status Section */}
            <DatabaseStatusSection />
        </div>
    );
} 