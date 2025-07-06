import { GitHubUser } from '@/types/github'
import { Star, GitFork, Users, Eye, Code, TrendingUp } from 'lucide-react'

interface IdentityStatsProps {
    stats: {
        totalStars: number
        totalForks: number
        totalSize: number
        languageBreakdown: Record<string, number>
        activityScore: number
    }
    user: GitHubUser
}

export function IdentityStats({ stats, user }: IdentityStatsProps) {
    const topLanguages = Object.entries(stats.languageBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* User Statistics */}
            <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">User Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-muted-foreground" />
                            <span className="text-2xl font-bold">{user.followers}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Eye className="w-5 h-5 text-muted-foreground" />
                            <span className="text-2xl font-bold">{user.following}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Following</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Code className="w-5 h-5 text-muted-foreground" />
                            <span className="text-2xl font-bold">{user.public_repos}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Public Repos</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-muted-foreground" />
                            <span className="text-2xl font-bold">{Math.round(stats.activityScore)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Activity Score</div>
                    </div>
                </div>
            </div>

            {/* Repository Statistics */}
            <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Repository Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-muted-foreground" />
                            <span className="text-2xl font-bold">{stats.totalStars}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Total Stars</div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <GitFork className="w-5 h-5 text-muted-foreground" />
                            <span className="text-2xl font-bold">{stats.totalForks}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Total Forks</div>
                    </div>
                    <div className="text-center col-span-2">
                        <div className="text-2xl font-bold mb-2">
                            {(stats.totalSize / 1024).toFixed(1)} MB
                        </div>
                        <div className="text-sm text-muted-foreground">Total Size</div>
                    </div>
                </div>
            </div>

            {/* Language Breakdown */}
            <div className="bg-card border rounded-lg p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Top Languages</h3>
                {topLanguages.length > 0 ? (
                    <div className="space-y-3">
                        {topLanguages.map(([language, count]) => (
                            <div key={language} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{language}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 h-2 bg-muted rounded-full">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{
                                                width: `${(count / Math.max(...Object.values(stats.languageBreakdown))) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground w-8 text-right">
                                        {count}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 text-muted-foreground">
                        <p>No language data available</p>
                    </div>
                )}
            </div>
        </div>
    )
} 