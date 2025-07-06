import { formatDistance } from 'date-fns'
import { GitHubRepository } from '@/types/github'
import { Star, GitFork, ExternalLink, AlertCircle, Calendar } from 'lucide-react'

interface RepositoryListProps {
    repositories: GitHubRepository[]
    identityId: string
}

export function RepositoryList({ repositories, identityId }: RepositoryListProps) {
    const sortedRepos = [...repositories].sort((a, b) =>
        new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
    )

    return (
        <div className="space-y-4">
            {sortedRepos.map((repo) => (
                <div key={repo.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{repo.name}</h3>
                            {repo.private && (
                                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs">
                                    Private
                                </span>
                            )}
                            {repo.archived && (
                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">
                                    Archived
                                </span>
                            )}
                        </div>
                        <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>

                    {repo.description && (
                        <p className="text-muted-foreground mb-3">{repo.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mb-3">
                        {repo.language && (
                            <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                                {repo.language}
                            </span>
                        )}

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="w-4 h-4" />
                            <span>{repo.stargazers_count}</span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <GitFork className="w-4 h-4" />
                            <span>{repo.forks_count}</span>
                        </div>

                        {repo.open_issues_count > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <AlertCircle className="w-4 h-4" />
                                <span>{repo.open_issues_count} issues</span>
                            </div>
                        )}

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                                Updated {formatDistance(new Date(repo.pushed_at), new Date(), { addSuffix: true })}
                            </span>
                        </div>
                    </div>

                    {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {repo.topics.map((topic) => (
                                <span
                                    key={topic}
                                    className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-xs"
                                >
                                    {topic}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {repositories.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No repositories found for this identity.</p>
                </div>
            )}
        </div>
    )
} 