import { RepositoryTable } from '@/components/RepositoryTable'
import { loadConfigFromDirectory } from '@/lib/config'
import { GitHubClient } from '@/lib/github'

export default async function RepositoriesPage() {
    try {
        // Load configuration
        const config = await loadConfigFromDirectory()

        // Initialize GitHub client
        const githubClient = new GitHubClient(config)

        // Get all repositories with identity information
        const repositoriesResult = await githubClient.getAllRepositories()

        if (!repositoriesResult.success || !repositoriesResult.data) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Repositories</h2>
                    <p className="text-muted-foreground">
                        {repositoriesResult.error || 'Failed to load repositories'}
                    </p>
                </div>
            )
        }

        const repositories = repositoriesResult.data

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold">All Repositories</h2>
                        <p className="text-muted-foreground">
                            Showing {repositories.length} repositories across all identities
                        </p>
                    </div>
                </div>

                <RepositoryTable repositories={repositories} />
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