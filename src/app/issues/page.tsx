import { IssuesTable } from '@/components/IssuesTable'
import { loadConfigFromDirectory } from '@/lib/config'
import { GitHubClient } from '@/lib/github'

export default async function IssuesPage() {
    try {
        // Load configuration
        const config = await loadConfigFromDirectory()

        // Initialize GitHub client
        const githubClient = new GitHubClient(config)

        // Get all issues with repository and identity information
        const issuesResult = await githubClient.getAllIssues()

        if (!issuesResult.success || !issuesResult.data) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Issues</h2>
                    <p className="text-muted-foreground">
                        {issuesResult.error || 'Failed to load issues'}
                    </p>
                </div>
            )
        }

        const issues = issuesResult.data

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold">All Issues</h2>
                        <p className="text-muted-foreground">
                            Showing {issues.length} issues across all repositories and identities
                        </p>
                    </div>
                </div>

                <IssuesTable issues={issues} />
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