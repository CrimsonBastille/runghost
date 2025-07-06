// Database types and schema definitions for libSQL

export interface DatabaseConfig {
    url?: string;
    authToken?: string;
}

// Database table interfaces
export interface IdentityTable {
    id: string;
    name: string;
    username: string;
    description?: string;
    avatar?: string;
    tags?: string; // JSON string
    github_user_data: string; // JSON string of GitHubUser
    total_issues: number;
    total_pull_requests: number;
    total_releases: number;
    stats_data: string; // JSON string of stats
    last_updated: string;
    cached_at: number;
    expires_at: number;
}

export interface RepositoryTable {
    id: string; // identity_id/repo_name
    identity_id: string;
    name: string;
    full_name: string;
    description?: string;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    language?: string;
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
    topics: string; // JSON string
    license_data?: string; // JSON string
    last_updated: string;
    cached_at: number;
    expires_at: number;
}

export interface IssueTable {
    id: string; // repo_id/issue_number
    repository_id: string;
    github_id: number;
    number: number;
    title: string;
    body?: string;
    state: 'open' | 'closed';
    user_data: string; // JSON string of user object
    labels_data: string; // JSON string of labels array
    assignees_data: string; // JSON string of assignees array
    milestone_data?: string; // JSON string of milestone object
    created_at: string;
    updated_at: string;
    closed_at?: string;
    html_url: string;
    comments: number;
    cached_at: number;
    expires_at: number;
}

export interface ReleaseTable {
    id: string; // repo_id/tag_name
    repository_id: string;
    github_id: number;
    tag_name: string;
    target_commitish: string;
    name?: string;
    body?: string;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at?: string;
    author_data: string; // JSON string of author object
    assets_data: string; // JSON string of assets array
    html_url: string;
    cached_at: number;
    expires_at: number;
}

export interface BranchTable {
    id: string; // repo_id/branch_name
    repository_id: string;
    name: string;
    commit_sha: string;
    commit_url: string;
    protected: boolean;
    cached_at: number;
    expires_at: number;
}

export interface PullRequestTable {
    id: string; // repo_id/pr_number
    repository_id: string;
    github_id: number;
    number: number;
    title: string;
    body?: string;
    state: 'open' | 'closed' | 'merged';
    user_data: string; // JSON string of user object
    head_data: string; // JSON string of head object
    base_data: string; // JSON string of base object
    merged: boolean;
    mergeable?: boolean;
    mergeable_state: string;
    merged_at?: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    html_url: string;
    comments: number;
    review_comments: number;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
    cached_at: number;
    expires_at: number;
}

export interface NpmPackageTable {
    id: string; // scope/package_name
    scope: string;
    name: string;
    version: string;
    description?: string;
    keywords?: string; // JSON array
    author_data?: string; // JSON object
    maintainers_data?: string; // JSON array
    repository_data?: string; // JSON object
    homepage?: string;
    license?: string;
    date?: string;
    links_data?: string; // JSON object
    publisher_data?: string; // JSON object
    score_data?: string; // JSON object
    search_score?: number;
    cached_at: number;
    expires_at: number;
}

export interface WorkspacePackageTable {
    id: string; // package_name or path hash
    name: string;
    version: string;
    description?: string;
    repository_path: string;
    author_data?: string; // JSON object
    license?: string;
    dependencies_data: string; // JSON array
    dev_dependencies_data: string; // JSON array
    internal_dependencies_data: string; // JSON array
    dependents_data: string; // JSON array
    cached_at: number;
    expires_at: number;
}

// SQL schema for creating tables
export const DATABASE_SCHEMA = `
-- Identities table
CREATE TABLE IF NOT EXISTS identities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL,
    description TEXT,
    avatar TEXT,
    tags TEXT, -- JSON array
    github_user_data TEXT NOT NULL, -- JSON object
    total_issues INTEGER DEFAULT 0,
    total_pull_requests INTEGER DEFAULT 0,
    total_releases INTEGER DEFAULT 0,
    stats_data TEXT NOT NULL, -- JSON object
    last_updated TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY, -- identity_id/repo_name
    identity_id TEXT NOT NULL,
    github_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    private INTEGER NOT NULL,
    html_url TEXT NOT NULL,
    clone_url TEXT NOT NULL,
    ssh_url TEXT NOT NULL,
    language TEXT,
    size INTEGER NOT NULL,
    stargazers_count INTEGER NOT NULL,
    watchers_count INTEGER NOT NULL,
    forks_count INTEGER NOT NULL,
    open_issues_count INTEGER NOT NULL,
    default_branch TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    pushed_at TEXT NOT NULL,
    archived INTEGER NOT NULL,
    disabled INTEGER NOT NULL,
    topics TEXT NOT NULL, -- JSON array
    license_data TEXT, -- JSON object
    last_updated TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (identity_id) REFERENCES identities(id)
);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY, -- repo_id/issue_number
    repository_id TEXT NOT NULL,
    github_id INTEGER NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    state TEXT NOT NULL CHECK (state IN ('open', 'closed')),
    user_data TEXT NOT NULL, -- JSON object
    labels_data TEXT NOT NULL, -- JSON array
    assignees_data TEXT NOT NULL, -- JSON array
    milestone_data TEXT, -- JSON object
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    html_url TEXT NOT NULL,
    comments INTEGER NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);

-- Releases table
CREATE TABLE IF NOT EXISTS releases (
    id TEXT PRIMARY KEY, -- repo_id/tag_name
    repository_id TEXT NOT NULL,
    github_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL,
    target_commitish TEXT NOT NULL,
    name TEXT,
    body TEXT,
    draft INTEGER NOT NULL,
    prerelease INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    published_at TEXT,
    author_data TEXT NOT NULL, -- JSON object
    assets_data TEXT NOT NULL, -- JSON array
    html_url TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY, -- repo_id/branch_name
    repository_id TEXT NOT NULL,
    name TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    commit_url TEXT NOT NULL,
    protected INTEGER NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);

-- Pull requests table
CREATE TABLE IF NOT EXISTS pull_requests (
    id TEXT PRIMARY KEY, -- repo_id/pr_number
    repository_id TEXT NOT NULL,
    github_id INTEGER NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    state TEXT NOT NULL CHECK (state IN ('open', 'closed', 'merged')),
    user_data TEXT NOT NULL, -- JSON object
    head_data TEXT NOT NULL, -- JSON object
    base_data TEXT NOT NULL, -- JSON object
    merged INTEGER NOT NULL,
    mergeable INTEGER,
    mergeable_state TEXT NOT NULL,
    merged_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    html_url TEXT NOT NULL,
    comments INTEGER NOT NULL,
    review_comments INTEGER NOT NULL,
    commits INTEGER NOT NULL,
    additions INTEGER NOT NULL,
    deletions INTEGER NOT NULL,
    changed_files INTEGER NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);

-- NPM packages table
CREATE TABLE IF NOT EXISTS npm_packages (
    id TEXT PRIMARY KEY, -- scope/package_name
    scope TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    keywords TEXT, -- JSON array
    author_data TEXT, -- JSON object
    maintainers_data TEXT, -- JSON array
    repository_data TEXT, -- JSON object
    homepage TEXT,
    license TEXT,
    date TEXT,
    links_data TEXT, -- JSON object
    publisher_data TEXT, -- JSON object
    score_data TEXT, -- JSON object
    search_score REAL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

-- Workspace packages table
CREATE TABLE IF NOT EXISTS workspace_packages (
    id TEXT PRIMARY KEY, -- package_name or path hash
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    repository_path TEXT NOT NULL,
    author_data TEXT, -- JSON object
    license TEXT,
    dependencies_data TEXT NOT NULL, -- JSON array
    dev_dependencies_data TEXT NOT NULL, -- JSON array
    internal_dependencies_data TEXT NOT NULL, -- JSON array
    dependents_data TEXT NOT NULL, -- JSON array
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_identities_cached_at ON identities(cached_at);
CREATE INDEX IF NOT EXISTS idx_identities_expires_at ON identities(expires_at);
CREATE INDEX IF NOT EXISTS idx_repositories_identity_id ON repositories(identity_id);
CREATE INDEX IF NOT EXISTS idx_repositories_cached_at ON repositories(cached_at);
CREATE INDEX IF NOT EXISTS idx_repositories_expires_at ON repositories(expires_at);
CREATE INDEX IF NOT EXISTS idx_issues_repository_id ON issues(repository_id);
CREATE INDEX IF NOT EXISTS idx_issues_cached_at ON issues(cached_at);
CREATE INDEX IF NOT EXISTS idx_issues_expires_at ON issues(expires_at);
CREATE INDEX IF NOT EXISTS idx_releases_repository_id ON releases(repository_id);
CREATE INDEX IF NOT EXISTS idx_releases_cached_at ON releases(cached_at);
CREATE INDEX IF NOT EXISTS idx_releases_expires_at ON releases(expires_at);
CREATE INDEX IF NOT EXISTS idx_branches_repository_id ON branches(repository_id);
CREATE INDEX IF NOT EXISTS idx_branches_cached_at ON branches(cached_at);
CREATE INDEX IF NOT EXISTS idx_branches_expires_at ON branches(expires_at);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repository_id ON pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_cached_at ON pull_requests(cached_at);
CREATE INDEX IF NOT EXISTS idx_pull_requests_expires_at ON pull_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_npm_packages_scope ON npm_packages(scope);
CREATE INDEX IF NOT EXISTS idx_npm_packages_cached_at ON npm_packages(cached_at);
CREATE INDEX IF NOT EXISTS idx_npm_packages_expires_at ON npm_packages(expires_at);
CREATE INDEX IF NOT EXISTS idx_workspace_packages_name ON workspace_packages(name);
CREATE INDEX IF NOT EXISTS idx_workspace_packages_cached_at ON workspace_packages(cached_at);
CREATE INDEX IF NOT EXISTS idx_workspace_packages_expires_at ON workspace_packages(expires_at);
`;

// Cache entry types for different data types
export enum CacheType {
    IDENTITY = 'identity',
    REPOSITORY = 'repository',
    ISSUES = 'issues',
    RELEASES = 'releases',
    BRANCHES = 'branches',
    COMMITS = 'commits',
    PULL_REQUESTS = 'pull_requests',
    NPM_PACKAGES = 'npm_packages',
    WORKSPACE_PACKAGES = 'workspace_packages',
}

export interface CacheTimeouts {
    identityTimeout: number;
    repositoryTimeout: number;
    issuesTimeout: number;
    releasesTimeout: number;
    branchesTimeout: number;
    commitsTimeout: number;
    npmPackagesTimeout: number;
    workspacePackagesTimeout: number;
} 