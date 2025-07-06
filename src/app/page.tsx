import { IdentityCard } from '@/components/IdentityCard'
import { loadConfigFromDirectory } from '@/lib/config'
import { GitHubClient } from '@/lib/github'

export default async function Dashboard() {
    try {
        // Load configuration
        const config = await loadConfigFromDirectory()

        // Initialize GitHub client
        const githubClient = new GitHubClient(config)

        // Get all identities data
        const identitiesResult = await githubClient.getAllIdentities()

        if (!identitiesResult.success || !identitiesResult.data) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Identities</h2>
                    <p className="text-muted-foreground">
                        {identitiesResult.error || 'Failed to load GitHub identities'}
                    </p>
                </div>
            )
        }

        const identities = identitiesResult.data
        const identityCount = Object.keys(identities).length

        // Get cache status
        const cacheStatus = await githubClient.getCacheStatus()

        if (identityCount === 0) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-4">No Identities Configured</h2>
                    <p className="text-muted-foreground mb-6">
                        Add GitHub identities to your configuration to get started.
                    </p>
                    <div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto">
                        <p className="text-sm font-medium mb-2">To add identities:</p>
                        <ol className="text-sm text-muted-foreground space-y-1">
                            <li>1. Run <code className="bg-background px-1 rounded">runghost init</code></li>
                            <li>2. Edit <code className="bg-background px-1 rounded">.runghost/config.yaml</code></li>
                            <li>3. Add your GitHub usernames and tokens</li>
                            <li>4. Restart RunGhost</li>
                        </ol>
                    </div>
                </div>
            )
        }

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold">GitHub Identities</h2>
                        <p className="text-muted-foreground">
                            Monitoring {identityCount} GitHub {identityCount === 1 ? 'identity' : 'identities'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                            Cache: {cacheStatus.lastUpdated}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(identities).map(([identityId, identityData]) => {
                        // Get workspace information from config
                        const configIdentity = config.identities[identityId]
                        const workspaces = configIdentity?.workspaces || []

                        return (
                            <IdentityCard
                                key={identityId}
                                identityId={identityId}
                                identityData={identityData}
                                workspaces={workspaces}
                            />
                        )
                    })}
                </div>

                <div className="mt-12 bg-muted/30 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                                {Object.values(identities).reduce((sum, id) => sum + id.repositories.length, 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Repositories</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                                {Object.values(identities).reduce((sum, id) => sum + id.stats.totalStars, 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Stars</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                                {Object.values(identities).reduce((sum, id) => sum + id.totalIssues, 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Open Issues</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                                {Object.values(identities).reduce((sum, id) => sum + id.totalReleases, 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Releases</div>
                        </div>
                    </div>
                </div>
            </div>
        )
    } catch (error) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-destructive mb-4">Configuration Error</h2>
                <p className="text-muted-foreground mb-6">
                    {error instanceof Error ? error.message : 'Failed to load configuration'}
                </p>
                <div className="bg-muted p-4 rounded-lg text-left max-w-md mx-auto">
                    <p className="text-sm font-medium mb-2">To fix this issue:</p>
                    <ol className="text-sm text-muted-foreground space-y-1">
                        <li>1. Run <code className="bg-background px-1 rounded">runghost init</code></li>
                        <li>2. Configure your GitHub identities</li>
                        <li>3. Restart RunGhost</li>
                    </ol>
                </div>
            </div>
        )
    }
} 