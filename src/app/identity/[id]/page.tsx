import Link from 'next/link'
import { formatDistance } from 'date-fns'
import { loadConfigFromDirectory } from '@/lib/config'
import { GitHubClient } from '@/lib/github'
import { buildCachedEnhancedDependencyGraph, createDependenciesDatabase, scanWorkspaceForPackages } from '@/lib/dependencies'
import { RepositoryList } from '@/components/RepositoryList'
import { IdentityStats } from '@/components/IdentityStats'
import { WorkspaceLauncher } from '@/components/WorkspaceLauncher'
import { PullRequestsTable } from '@/components/PullRequestsTable'
import { NetworkGraphWrapper } from '@/components/InteractiveNetworkGraph'
import { ArrowLeft, ExternalLink, MapPin, Building, Calendar } from 'lucide-react'

interface IdentityDetailPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function IdentityDetailPage({ params }: IdentityDetailPageProps) {
    const { id } = await params

    try {
        // Load configuration
        const config = await loadConfigFromDirectory()

        // Initialize GitHub client
        const githubClient = new GitHubClient(config)

        // Get identity data
        const identityResult = await githubClient.getIdentityData(id)

        // Get workspace information from config
        const configIdentity = config.identities[id]
        const workspaces = configIdentity?.workspaces || []

        // Get pull requests for this identity
        const pullRequestsResult = await githubClient.getPullRequestsForIdentity(id)

        // Get dependency graph data for this identity
        const repositoryPaths = await scanWorkspaceForPackages(config.workspacePath)
        const database = createDependenciesDatabase()
        await database.initialize()
        const fullDependencyGraph = await buildCachedEnhancedDependencyGraph(repositoryPaths, config.identities, database)

        // Get the identity's configured npm scopes
        const identityConfig = config.identities[id];
        const configuredScopes = identityConfig?.npmjs?.scopes || [];

        // Normalize scopes to handle both @scope and scope formats
        const normalizedScopes = configuredScopes.flatMap(scope => {
            const withAt = scope.startsWith('@') ? scope : `@${scope}`;
            const withoutAt = scope.startsWith('@') ? scope.slice(1) : scope;
            return [scope, withAt, withoutAt];
        });

        // Filter dependency graph to show only packages related to this identity's scopes
        const identityDependencyGraph = {
            ...fullDependencyGraph,
            repositories: fullDependencyGraph.repositories.filter(repo => {
                // Include repositories that match the identity's scopes or are in the identity's directory
                return normalizedScopes.some(scope => repo.package.name.startsWith(scope)) ||
                    repo.package.name === id ||
                    repo.repositoryPath.includes(id);
            }),
            npmPackages: fullDependencyGraph.npmPackages?.filter(pkg => {
                // Include npm packages that match the identity's scopes
                return normalizedScopes.some(scope => pkg.name.startsWith(scope) || pkg.scope === scope) ||
                    pkg.name === id;
            }) || [],
            npmScopes: fullDependencyGraph.npmScopes?.filter(scope =>
                scope.identityId === id
            ) || [],
            interdependencies: fullDependencyGraph.interdependencies.filter(dep => {
                // Include dependencies where either from or to matches the identity's scopes
                return normalizedScopes.some(scope =>
                    dep.from.startsWith(scope) || dep.to.startsWith(scope)
                ) || dep.from === id || dep.to === id;
            }),
            crossDependencies: fullDependencyGraph.crossDependencies?.filter(dep => {
                // Include cross-dependencies where either from or to matches the identity's scopes
                return normalizedScopes.some(scope =>
                    dep.from.startsWith(scope) || dep.to.startsWith(scope)
                ) || dep.from === id || dep.to === id;
            }) || []
        }

        if (!identityResult.success || !identityResult.data) {
            return (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Identity Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        {identityResult.error || `Identity "${id}" could not be loaded`}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>
            )
        }

        const { identity, user, repositories, stats, lastUpdated } = identityResult.data
        const pullRequests = pullRequestsResult.success && pullRequestsResult.data ? pullRequestsResult.data : []
        // Filter to show only open pull requests
        const openPullRequests = pullRequests.filter(pr => pr.state === 'open')

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        Last updated: {formatDistance(new Date(lastUpdated), new Date(), { addSuffix: true })}
                    </p>
                </div>

                {/* Identity Header */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-start gap-6">
                        <img
                            src={identity.avatar || user.avatar_url}
                            alt={identity.name}
                            className="w-24 h-24 rounded-full"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">{identity.name}</h1>
                                <a
                                    href={`https://github.com/${identity.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                                <p className="text-lg text-muted-foreground">@{identity.username}</p>
                                <WorkspaceLauncher workspaces={workspaces} identityName={identity.name} />
                            </div>

                            {user.bio && (
                                <p className="text-foreground mb-3">{user.bio}</p>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {user.location && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{user.location}</span>
                                    </div>
                                )}
                                {user.company && (
                                    <div className="flex items-center gap-1">
                                        <Building className="w-4 h-4" />
                                        <span>{user.company}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Joined {formatDistance(new Date(user.created_at), new Date(), { addSuffix: true })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {identity.description && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-foreground">{identity.description}</p>
                        </div>
                    )}

                    {identity.tags && identity.tags.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex flex-wrap gap-2">
                                {identity.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Statistics */}
                <IdentityStats stats={stats} user={user} />

                {/* Pull Requests */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">
                            Open Pull Requests ({openPullRequests.length})
                        </h2>
                        <Link
                            href={`/identity/${id}/pull_requests`}
                            className="text-sm text-primary hover:underline"
                        >
                            View All Pull Requests ({pullRequests.length})
                        </Link>
                    </div>
                    <PullRequestsTable pullRequests={openPullRequests} />
                </div>

                {/* Repositories */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">
                        Repositories ({repositories.length})
                    </h2>
                    <RepositoryList repositories={repositories} identityId={id} />
                </div>

                {/* Package Dependencies */}
                <div className="bg-card border rounded-lg p-6">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Package Dependencies
                        </h2>
                        {configuredScopes.length > 0 && (
                            <div className="mb-4">
                                <p className="text-sm text-muted-foreground mb-2">
                                    Showing packages and dependencies for npm scopes: {configuredScopes.join(', ')}
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-blue-600">{identityDependencyGraph.repositories.length}</div>
                                        <div className="text-sm text-blue-800">Local Repositories</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-green-600">{identityDependencyGraph.npmPackages?.length || 0}</div>
                                        <div className="text-sm text-green-800">NPM Packages</div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-purple-600">{identityDependencyGraph.npmScopes?.length || 0}</div>
                                        <div className="text-sm text-purple-800">NPM Scopes</div>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-lg">
                                        <div className="text-lg font-bold text-orange-600">{identityDependencyGraph.interdependencies.length + (identityDependencyGraph.crossDependencies?.length || 0)}</div>
                                        <div className="text-sm text-orange-800">Dependencies</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <NetworkGraphWrapper graph={identityDependencyGraph} />
                </div>
            </div>
        )
    } catch (error) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Identity</h2>
                <p className="text-muted-foreground mb-6">
                    {error instanceof Error ? error.message : 'Failed to load identity data'}
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>
        )
    }
} 