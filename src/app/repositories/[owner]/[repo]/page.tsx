import Link from 'next/link'
import { formatDistance } from 'date-fns'
import { loadConfigFromDirectory } from '@/lib/config'
import { GitHubClient } from '@/lib/github'
import { IssuesTable } from '@/components/IssuesTable'
import { ReleasesTable } from '@/components/ReleasesTable'
import { PullRequestsTable } from '@/components/PullRequestsTable'
import {
    ArrowLeft,
    ExternalLink,
    Star,
    GitFork,
    AlertCircle,
    Calendar,
    Eye,
    Code,
    FileText,
    GitBranch,
    Tag,
    Package
} from 'lucide-react'

interface RepositoryPageProps {
    params: Promise<{
        owner: string
        repo: string
    }>
}

export default async function RepositoryPage({ params }: RepositoryPageProps) {
    const { owner, repo } = await params

    try {
        // Load configuration
        const config = await loadConfigFromDirectory()

        // Initialize GitHub client
        const githubClient = new GitHubClient(config)

        // Find the identity that matches the owner
        const identityId = Object.keys(config.identities).find(
            id => config.identities[id].username === owner
        )

        if (!identityId) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Identity Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        No identity found for owner "{owner}"
                    </p>
                    <Link
                        href="/repositories"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Repositories
                    </Link>
                </div>
            )
        }

        // Get repository data
        const repositoryResult = await githubClient.getRepositoryDetail(identityId, repo)

        if (!repositoryResult.success || !repositoryResult.data) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Repository Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        {repositoryResult.error || `Repository "${owner}/${repo}" could not be loaded`}
                    </p>
                    <Link
                        href="/repositories"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Repositories
                    </Link>
                </div>
            )
        }

        const { repository, issues, releases, pullRequests } = repositoryResult.data

        // Enhance issues and releases with additional properties that the components expect
        const repoId = `${identityId}/${repo}`
        const enhancedIssues = issues.map(issue => ({
            ...issue,
            repository_id: repoId,
            identity_id: identityId,
            repository_name: repository.name,
            repository_full_name: repository.full_name,
        }))

        const enhancedReleases = releases.map(release => ({
            ...release,
            repository_id: repoId,
            identity_id: identityId,
            repository_name: repository.name,
            repository_full_name: repository.full_name,
        }))

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/repositories"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Repositories
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        Last updated: {formatDistance(new Date(repository.updated_at), new Date(), { addSuffix: true })}
                    </p>
                </div>

                {/* Repository Header */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-start gap-6">
                        <div className="bg-secondary rounded-lg p-4">
                            <Code className="w-12 h-12 text-secondary-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">
                                    <Link
                                        href={`/identity/${identityId}`}
                                        className="text-primary hover:underline"
                                    >
                                        {owner}
                                    </Link>
                                    <span className="text-muted-foreground">/</span>
                                    {repo}
                                </h1>
                                <a
                                    href={repository.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            </div>

                            {repository.description && (
                                <p className="text-foreground mb-4">{repository.description}</p>
                            )}

                            {/* Stats */}
                            <div className="flex flex-wrap gap-6 text-sm">
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    <span className="font-medium">{repository.stargazers_count.toLocaleString()}</span>
                                    <span className="text-muted-foreground">stars</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <GitFork className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium">{repository.forks_count.toLocaleString()}</span>
                                    <span className="text-muted-foreground">forks</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Eye className="w-4 h-4 text-green-500" />
                                    <span className="font-medium">{repository.watchers_count.toLocaleString()}</span>
                                    <span className="text-muted-foreground">watchers</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <span className="font-medium">{repository.open_issues_count.toLocaleString()}</span>
                                    <span className="text-muted-foreground">issues</span>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
                                {repository.language && (
                                    <div className="flex items-center gap-1">
                                        <Code className="w-4 h-4" />
                                        <span>{repository.language}</span>
                                    </div>
                                )}
                                {repository.license && (
                                    <div className="flex items-center gap-1">
                                        <FileText className="w-4 h-4" />
                                        <span>{repository.license.name}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Created {formatDistance(new Date(repository.created_at), new Date(), { addSuffix: true })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <GitBranch className="w-4 h-4" />
                                    <span>Default: {repository.default_branch}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {repository.topics && repository.topics.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex flex-wrap gap-2">
                                {repository.topics.map((topic) => (
                                    <span
                                        key={topic}
                                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Issues */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <h2 className="text-xl font-semibold">
                            Issues ({enhancedIssues.length})
                        </h2>
                    </div>
                    <IssuesTable issues={enhancedIssues} />
                </div>

                {/* Pull Requests */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <GitBranch className="w-5 h-5 text-blue-500" />
                        <h2 className="text-xl font-semibold">
                            Pull Requests ({pullRequests.length})
                        </h2>
                    </div>
                    <PullRequestsTable pullRequests={pullRequests} />
                </div>

                {/* Releases */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Tag className="w-5 h-5 text-purple-500" />
                        <h2 className="text-xl font-semibold">
                            Releases ({enhancedReleases.length})
                        </h2>
                    </div>
                    <ReleasesTable releases={enhancedReleases} />
                </div>
            </div>
        )
    } catch (error) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Repository</h2>
                <p className="text-muted-foreground mb-6">
                    {error instanceof Error ? error.message : 'Failed to load repository data'}
                </p>
                <Link
                    href="/repositories"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Repositories
                </Link>
            </div>
        )
    }
} 