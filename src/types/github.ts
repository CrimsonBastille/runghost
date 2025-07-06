// GitHub API data types
export interface GitHubUser {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    blog: string | null;
    twitter_username: string | null;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
}

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    language: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    forks_count: number;
    open_issues_count: number;
    default_branch: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    archived: boolean;
    disabled: boolean;
    topics: string[];
    license: {
        key: string;
        name: string;
        spdx_id: string;
    } | null;
}

export interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    user: {
        login: string;
        avatar_url: string;
    };
    labels: Array<{
        id: number;
        name: string;
        color: string;
        description: string | null;
    }>;
    assignees: Array<{
        login: string;
        avatar_url: string;
    }>;
    milestone: {
        title: string;
        description: string | null;
        state: 'open' | 'closed';
        due_on: string | null;
    } | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    html_url: string;
    comments: number;
}

export interface GitHubPullRequest {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed' | 'merged';
    user: {
        login: string;
        avatar_url: string;
    };
    head: {
        ref: string;
        sha: string;
        repo: {
            name: string;
            full_name: string;
        } | null;
    };
    base: {
        ref: string;
        sha: string;
        repo: {
            name: string;
            full_name: string;
        };
    };
    merged: boolean;
    mergeable: boolean | null;
    mergeable_state: string;
    merged_at: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    html_url: string;
    comments: number;
    review_comments: number;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
}

export interface GitHubRelease {
    id: number;
    tag_name: string;
    target_commitish: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string | null;
    author: {
        login: string;
        avatar_url: string;
    };
    assets: Array<{
        id: number;
        name: string;
        size: number;
        download_count: number;
        created_at: string;
        updated_at: string;
        browser_download_url: string;
    }>;
    html_url: string;
}

export interface GitHubBranch {
    name: string;
    commit: {
        sha: string;
        url: string;
    };
    protected: boolean;
}

// Aggregated data types for the dashboard
export interface IdentityData {
    identity: {
        id: string;
        name: string;
        username: string;
        description?: string;
        avatar?: string;
        tags?: string[];
    };
    user: GitHubUser;
    repositories: GitHubRepository[];
    lastUpdated: string;
    totalIssues: number;
    totalPullRequests: number;
    totalReleases: number;
    stats: {
        totalStars: number;
        totalForks: number;
        totalSize: number;
        languageBreakdown: Record<string, number>;
        activityScore: number; // Calculated score based on recent activity
    };
}

export interface RepositoryDetail {
    repository: GitHubRepository;
    issues: GitHubIssue[];
    pullRequests: any[];
    releases: GitHubRelease[];
    branches: GitHubBranch[];
    lastUpdated: string;
}

// Cache data structure (kept for migration compatibility)
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

export interface CachedData {
    identities: Record<string, CacheEntry<IdentityData>>;
    repositories: Record<string, CacheEntry<RepositoryDetail>>;
}

// API response wrapper
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
} 