import { ReleasesTable } from '@/components/ReleasesTable'
import { loadConfigFromDirectory } from '@/lib/config'
import { GitHubClient } from '@/lib/github'

export default async function ReleasesPage() {
    try {
        // Load configuration
        const config = await loadConfigFromDirectory()

        // Initialize GitHub client
        const githubClient = new GitHubClient(config)

        // Get all releases with repository and identity information
        const releasesResult = await githubClient.getAllReleases()

        if (!releasesResult.success || !releasesResult.data) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Releases</h2>
                    <p className="text-muted-foreground">
                        {releasesResult.error || 'Failed to load releases'}
                    </p>
                </div>
            )
        }

        const releases = releasesResult.data

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold">All Releases</h2>
                        <p className="text-muted-foreground">
                            Showing {releases.length} releases across all repositories and identities
                        </p>
                    </div>
                </div>

                <ReleasesTable releases={releases} />
            </div>
        )
    } catch (error) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-destructive mb-4">Configuration Error</h2>
                <p className="text-muted-foreground mb-6">
                    {error instanceof Error ? error.message : 'Failed to load configuration'}
                </p>
            </div>
        )
    }
} 