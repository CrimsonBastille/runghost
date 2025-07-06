import Link from 'next/link'
import { formatDistance } from 'date-fns'
import { IdentityData } from '@/types/github'
import { GitBranch, Star, Users, Calendar, ExternalLink } from 'lucide-react'
import { WorkspaceLauncher } from './WorkspaceLauncher'

interface IdentityCardProps {
    identityId: string
    identityData: IdentityData
    workspaces?: string[]
}

export function IdentityCard({ identityId, identityData, workspaces = [] }: IdentityCardProps) {
    const { identity, user, repositories, stats, lastUpdated } = identityData

    return (
        <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <img
                        src={identity.avatar || user.avatar_url}
                        alt={identity.name}
                        className="w-12 h-12 rounded-full"
                    />
                    <div>
                        <h3 className="font-semibold text-lg">{identity.name}</h3>
                        <p className="text-sm text-muted-foreground">@{identity.username}</p>
                    </div>
                </div>
                <Link
                    href={`/identity/${identityId}`}
                    className="text-primary hover:underline text-sm font-medium"
                >
                    View Details
                </Link>
            </div>

            {identity.description && (
                <p className="text-sm text-muted-foreground mb-4">{identity.description}</p>
            )}

            {identity.tags && identity.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {identity.tags.map((tag) => (
                        <span
                            key={tag}
                            className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{repositories.length} repos</span>
                </div>
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{stats.totalStars} stars</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{user.followers} followers</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                        {formatDistance(new Date(lastUpdated), new Date(), { addSuffix: true })}
                    </span>
                </div>
            </div>

            <div className="border-t pt-4 mb-4">
                <h4 className="font-medium mb-2">Recent Repositories</h4>
                <div className="space-y-1">
                    {repositories.slice(0, 3).map((repo) => (
                        <div key={repo.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium truncate">{repo.name}</span>
                                {repo.language && (
                                    <span className="text-xs bg-muted px-1 rounded">
                                        {repo.language}
                                    </span>
                                )}
                            </div>
                            <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    ))}
                    {repositories.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                            +{repositories.length - 3} more repositories
                        </div>
                    )}
                </div>
            </div>

            {/* Card Actions */}
            <div className="flex justify-end border-t pt-4">
                <div className="text-xs">
                    <WorkspaceLauncher workspaces={workspaces} identityName={identity.name} variant="card-action" />
                </div>
            </div>
        </div>
    )
} 