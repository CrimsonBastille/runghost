import Link from 'next/link'
import { loadConfigFromDirectory } from '@/lib/config'
import { GitHubClient } from '@/lib/github'
import { PullRequestsTable } from '@/components/PullRequestsTable'
import { ArrowLeft } from 'lucide-react'

interface PullRequestsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function PullRequestsPage({ params }: PullRequestsPageProps) {
    const { id } = await params

    try {
        // Load configuration
        const config = await loadConfigFromDirectory()

        // Initialize GitHub client
        const githubClient = new GitHubClient(config)

        // Get pull requests for this identity
        const pullRequestsResult = await githubClient.getPullRequestsForIdentity(id)

        if (!pullRequestsResult.success || !pullRequestsResult.data) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Pull Requests</h2>
                    <p className="text-muted-foreground mb-6">
                        {pullRequestsResult.error || 'Failed to load pull requests'}
                    </p>
                    <Link
                        href={`/identity/${id}`}
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Identity
                    </Link>
                </div>
            )
        }

        const pullRequests = pullRequestsResult.data
        const configIdentity = config.identities[id]

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/identity/${id}`}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">
                                {configIdentity?.name || id} - Pull Requests
                            </h1>
                            <p className="text-muted-foreground">
                                Showing {pullRequests.length} pull requests across all repositories
                            </p>
                        </div>
                    </div>
                </div>

                <PullRequestsTable pullRequests={pullRequests} />
            </div>
        )
    } catch (error) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-destructive mb-4">Configuration Error</h2>
                <p className="text-muted-foreground mb-6">
                    {error instanceof Error ? error.message : 'Failed to load configuration'}
                </p>
                <Link
                    href={`/identity/${id}`}
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Identity
                </Link>
            </div>
        )
    }
} 