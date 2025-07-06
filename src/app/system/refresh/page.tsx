import { GitHubRefreshButton } from '@/components/GitHubRefreshButton';
import { DependenciesRefreshButton } from '@/components/DependenciesRefreshButton';
import Link from 'next/link';

export default function RefreshPage() {
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
                    <h1 className="text-3xl font-bold">Data Refresh</h1>
                    <p className="text-muted-foreground">
                        Manually refresh GitHub data and dependencies information
                    </p>
                </div>
            </div>

            {/* Refresh Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border rounded-lg p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2">GitHub Data</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Refresh GitHub repositories, issues, pull requests, and releases. You can refresh all identities or select a specific identity to refresh.
                        </p>
                    </div>
                    <GitHubRefreshButton />
                </div>

                <div className="bg-card border rounded-lg p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2">Dependencies</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Refresh package dependencies and workspace information from npm and local sources.
                        </p>
                    </div>
                    <DependenciesRefreshButton />
                </div>
            </div>

            {/* Information Section */}
            <div className="bg-card border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">About Data Refresh</h2>
                <div className="space-y-4 text-sm text-muted-foreground">
                    <p>
                        RunGhost caches data from external services to improve performance and reduce API calls.
                        Use these refresh controls when you need the most up-to-date information. You can refresh all data at once or target specific identities for more focused updates.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-medium text-foreground mb-2">GitHub Data Includes:</h3>
                            <ul className="space-y-1">
                                <li>• Repository metadata and statistics</li>
                                <li>• Issues and pull requests</li>
                                <li>• Releases and tags</li>
                                <li>• Branch information</li>
                                <li>• User profile data</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium text-foreground mb-2">Dependencies Include:</h3>
                            <ul className="space-y-1">
                                <li>• NPM package information</li>
                                <li>• Workspace package relationships</li>
                                <li>• Internal dependencies mapping</li>
                                <li>• Package vulnerability data</li>
                                <li>• Version compatibility information</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <p className="text-xs">
                            <strong>Note:</strong> Refresh operations may take a few minutes to complete depending on the amount of data.
                            You can monitor progress and view any errors in the system audit logs.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 