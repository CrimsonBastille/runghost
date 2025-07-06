import { createClient, Client } from '@libsql/client';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
    DatabaseConfig,
    IdentityTable,
    RepositoryTable,
    IssueTable,
    ReleaseTable,
    BranchTable,
    PullRequestTable,
    DATABASE_SCHEMA,
    CacheType,
    CacheTimeouts
} from '../types/database';
import {
    IdentityData,
    RepositoryDetail,
    GitHubUser,
    GitHubRepository,
    GitHubIssue,
    GitHubRelease,
    GitHubBranch,
    GitHubPullRequest
} from '../types/github';
import { NpmPackage } from './npm';
import { RepositoryDependencies } from '../types/dependencies';

export class DatabaseClient {
    private client: Client;
    private cacheTimeouts: CacheTimeouts;
    private initialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;
    private dbPath: string | null = null;
    private dataDirectory: string;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig, dataDirectory: string, cacheTimeouts: CacheTimeouts) {
        this.cacheTimeouts = cacheTimeouts;
        this.dataDirectory = dataDirectory;
        this.config = config;

        if (config.url) {
            // Remote database (e.g., Turso)
            this.client = createClient({
                url: config.url,
                authToken: config.authToken,
            });
        } else {
            // Local database
            this.dbPath = path.join(dataDirectory, 'runghost.db');
            // Ensure directory exists
            fs.ensureDirSync(dataDirectory);

            this.client = createClient({
                url: `file:${this.dbPath}`,
            });
        }
    }

    /**
     * Initialize the database with schema
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }

    private async _doInitialize(): Promise<void> {
        await this.forceInitialize();
    }

    /**
     * Ensure database is initialized before any operation
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
 * Force initialization with better error handling
 */
    private async forceInitialize(): Promise<void> {
        try {
            // Execute each SQL statement separately
            const statements = DATABASE_SCHEMA.split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            for (const statement of statements) {
                try {
                    await this.client.execute(statement);
                } catch (error) {
                    console.error('Failed to execute statement:', statement.substring(0, 50) + '...', error);
                    throw error;
                }
            }

            this.initialized = true;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
        this.client.close();
    }

    /**
     * Execute a raw SQL query (for admin/debugging purposes)
     * Only allows SELECT statements for security
     */
    async executeQuery(sql: string): Promise<any> {
        await this.ensureInitialized();

        // Basic security: only allow SELECT statements
        const trimmedSql = sql.trim().toLowerCase();
        if (!trimmedSql.startsWith('select')) {
            throw new Error('Only SELECT queries are allowed');
        }

        return await this.client.execute(sql);
    }

    /**
     * Execute a raw SQL query with parameters (for admin/debugging purposes)
     * Only allows SELECT statements for security
     */
    async executeQueryWithParams(sql: string, params: any[]): Promise<any> {
        await this.ensureInitialized();

        // Basic security: only allow SELECT statements
        const trimmedSql = sql.trim().toLowerCase();
        if (!trimmedSql.startsWith('select')) {
            throw new Error('Only SELECT queries are allowed');
        }

        return await this.client.execute({ sql, args: params });
    }

    /**
     * Get all table names in the database
     */
    async getTables(): Promise<Array<{ name: string; count: number; columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }> }>> {
        await this.ensureInitialized();

        // Get all table names
        const tablesResult = await this.client.execute(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%' 
            ORDER BY name
        `);

        const tables = [];

        for (const row of tablesResult.rows) {
            const tableName = row.name as string;

            // Get record count for each table
            const countResult = await this.client.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
            const count = countResult.rows[0]?.count as number || 0;

            // Get table schema
            const schemaResult = await this.client.execute(`PRAGMA table_info(${tableName})`);
            const columns = schemaResult.rows.map((col: any) => ({
                name: col.name,
                type: col.type,
                notnull: col.notnull === 1,
                pk: col.pk === 1
            }));

            tables.push({
                name: tableName,
                count,
                columns
            });
        }

        return tables;
    }

    /**
     * Get records from a specific table with pagination
     */
    async getTableRecords(tableName: string, page: number = 1, limit: number = 50): Promise<{
        table: string;
        columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }>;
        records: Array<Record<string, any>>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }> {
        await this.ensureInitialized();

        // Security: validate table name to prevent SQL injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
            throw new Error('Invalid table name');
        }

        // Check if table exists
        const tableExistsResult = await this.client.execute({
            sql: `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
            args: [tableName]
        });

        if (tableExistsResult.rows.length === 0) {
            throw new Error('Table not found');
        }

        // Get total count
        const countResult = await this.client.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        const totalCount = countResult.rows[0]?.count as number || 0;

        // Get paginated records
        const offset = (page - 1) * limit;
        const recordsResult = await this.client.execute({
            sql: `SELECT * FROM ${tableName} ORDER BY rowid LIMIT ? OFFSET ?`,
            args: [limit, offset]
        });

        // Get column information
        const schemaResult = await this.client.execute(`PRAGMA table_info(${tableName})`);
        const columns = schemaResult.rows.map((col: any) => ({
            name: col.name,
            type: col.type,
            notnull: col.notnull === 1,
            pk: col.pk === 1
        }));

        // Convert rows to objects
        const records = recordsResult.rows.map((row: any) => {
            const obj: Record<string, any> = {};
            columns.forEach((col: any, index: number) => {
                obj[col.name] = row[index];
            });
            return obj;
        });

        return {
            table: tableName,
            columns,
            records,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
                hasNext: page * limit < totalCount,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Get cache timeout for a specific type
     */
    private getCacheTimeout(type: CacheType): number {
        switch (type) {
            case CacheType.IDENTITY:
                return this.cacheTimeouts.identityTimeout;
            case CacheType.REPOSITORY:
                return this.cacheTimeouts.repositoryTimeout;
            case CacheType.ISSUES:
                return this.cacheTimeouts.issuesTimeout;
            case CacheType.RELEASES:
                return this.cacheTimeouts.releasesTimeout;
            case CacheType.BRANCHES:
                return this.cacheTimeouts.branchesTimeout;
            case CacheType.COMMITS:
                return this.cacheTimeouts.commitsTimeout;
            case CacheType.PULL_REQUESTS:
                return this.cacheTimeouts.issuesTimeout; // Use same as issues
            case CacheType.NPM_PACKAGES:
                return this.cacheTimeouts.npmPackagesTimeout;
            case CacheType.WORKSPACE_PACKAGES:
                return this.cacheTimeouts.workspacePackagesTimeout;
            default:
                return this.cacheTimeouts.repositoryTimeout;
        }
    }

    /**
     * Check if a cache entry is still valid
     */
    private isCacheValid(expiresAt: number): boolean {
        return Date.now() < expiresAt;
    }

    /**
     * Calculate expiration time for a cache type
     */
    private calculateExpiresAt(type: CacheType): number {
        return Date.now() + (this.getCacheTimeout(type) * 1000);
    }

    // Identity operations
    async getIdentity(identityId: string): Promise<IdentityData | null> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM identities WHERE id = ? AND expires_at > ?',
            args: [identityId, Date.now()]
        });

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0] as any;
        return this.mapIdentityRowToData(row);
    }

    async saveIdentity(identityId: string, data: IdentityData): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.IDENTITY);

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO identities (
                id, name, username, description, avatar, tags, github_user_data,
                total_issues, total_pull_requests, total_releases, stats_data,
                last_updated, cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                identityId,
                data.identity.name,
                data.identity.username,
                data.identity.description || null,
                data.identity.avatar || null,
                data.identity.tags ? JSON.stringify(data.identity.tags) : null,
                JSON.stringify(data.user),
                data.totalIssues,
                data.totalPullRequests,
                data.totalReleases,
                JSON.stringify(data.stats),
                data.lastUpdated,
                now,
                expiresAt
            ]
        });
    }

    async getAllIdentities(): Promise<Record<string, IdentityData>> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM identities WHERE expires_at > ?',
            args: [Date.now()]
        });

        const identities: Record<string, IdentityData> = {};
        for (const row of result.rows) {
            const rowData = row as any;
            identities[rowData.id] = this.mapIdentityRowToData(rowData);
        }

        return identities;
    }

    private mapIdentityRowToData(row: any): IdentityData {
        return {
            identity: {
                id: row.id,
                name: row.name,
                username: row.username,
                description: row.description || undefined,
                avatar: row.avatar || undefined,
                tags: row.tags ? JSON.parse(row.tags) : undefined,
            },
            user: JSON.parse(row.github_user_data),
            repositories: [], // Will be populated separately
            lastUpdated: row.last_updated,
            totalIssues: row.total_issues,
            totalPullRequests: row.total_pull_requests,
            totalReleases: row.total_releases,
            stats: JSON.parse(row.stats_data),
        };
    }

    // Repository operations
    async getRepository(repoId: string): Promise<GitHubRepository | null> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM repositories WHERE id = ? AND expires_at > ?',
            args: [repoId, Date.now()]
        });

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0] as any;
        return this.mapRepositoryRowToGitHub(row);
    }

    async saveRepository(repoId: string, identityId: string, data: GitHubRepository): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.REPOSITORY);

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO repositories (
                id, identity_id, github_id, name, full_name, description, private, html_url,
                clone_url, ssh_url, language, size, stargazers_count, watchers_count,
                forks_count, open_issues_count, default_branch, created_at, updated_at,
                pushed_at, archived, disabled, topics, license_data, last_updated,
                cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                repoId,
                identityId,
                data.id,
                data.name,
                data.full_name,
                data.description || null,
                data.private ? 1 : 0,
                data.html_url,
                data.clone_url,
                data.ssh_url,
                data.language || null,
                data.size,
                data.stargazers_count,
                data.watchers_count,
                data.forks_count,
                data.open_issues_count,
                data.default_branch,
                data.created_at,
                data.updated_at,
                data.pushed_at,
                data.archived ? 1 : 0,
                data.disabled ? 1 : 0,
                JSON.stringify(data.topics),
                data.license ? JSON.stringify(data.license) : null,
                new Date().toISOString(),
                now,
                expiresAt
            ]
        });
    }

    async getRepositoriesForIdentity(identityId: string): Promise<GitHubRepository[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM repositories WHERE identity_id = ? AND expires_at > ?',
            args: [identityId, Date.now()]
        });

        return result.rows.map(row => this.mapRepositoryRowToGitHub(row as any));
    }

    async getAllRepositories(): Promise<Array<GitHubRepository & { identity_id: string }>> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM repositories WHERE expires_at > ? ORDER BY pushed_at DESC',
            args: [Date.now()]
        });

        return result.rows.map(row => ({
            ...this.mapRepositoryRowToGitHub(row as any),
            identity_id: (row as any).identity_id
        }));
    }

    private mapRepositoryRowToGitHub(row: any): GitHubRepository {
        return {
            id: row.github_id,
            name: row.name,
            full_name: row.full_name,
            description: row.description,
            private: row.private === 1,
            html_url: row.html_url,
            clone_url: row.clone_url,
            ssh_url: row.ssh_url,
            language: row.language,
            size: row.size,
            stargazers_count: row.stargazers_count,
            watchers_count: row.watchers_count,
            forks_count: row.forks_count,
            open_issues_count: row.open_issues_count,
            default_branch: row.default_branch,
            created_at: row.created_at,
            updated_at: row.updated_at,
            pushed_at: row.pushed_at,
            archived: row.archived === 1,
            disabled: row.disabled === 1,
            topics: JSON.parse(row.topics),
            license: row.license_data ? JSON.parse(row.license_data) : null,
        };
    }

    // Repository detail operations
    async getRepositoryDetail(repoId: string): Promise<RepositoryDetail | null> {
        await this.ensureInitialized();

        const repository = await this.getRepository(repoId);
        if (!repository) {
            return null;
        }

        const [issues, pullRequests, releases, branches] = await Promise.all([
            this.getIssuesForRepository(repoId),
            this.getPullRequestsForRepository(repoId),
            this.getReleasesForRepository(repoId),
            this.getBranchesForRepository(repoId)
        ]);

        return {
            repository,
            issues,
            pullRequests,
            releases,
            branches,
            lastUpdated: new Date().toISOString()
        };
    }

    // Issue operations
    async getIssuesForRepository(repoId: string): Promise<GitHubIssue[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM issues WHERE repository_id = ? AND expires_at > ?',
            args: [repoId, Date.now()]
        });

        return result.rows.map(row => this.mapIssueRowToGitHub(row as any));
    }

    async saveIssue(issueId: string, repoId: string, data: GitHubIssue): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.ISSUES);

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO issues (
                id, repository_id, github_id, number, title, body, state, user_data,
                labels_data, assignees_data, milestone_data, created_at, updated_at,
                closed_at, html_url, comments, cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                issueId,
                repoId,
                data.id,
                data.number,
                data.title,
                data.body || null,
                data.state,
                JSON.stringify(data.user),
                JSON.stringify(data.labels),
                JSON.stringify(data.assignees),
                data.milestone ? JSON.stringify(data.milestone) : null,
                data.created_at,
                data.updated_at,
                data.closed_at || null,
                data.html_url,
                data.comments,
                now,
                expiresAt
            ]
        });
    }

    private mapIssueRowToGitHub(row: any): GitHubIssue {
        return {
            id: row.github_id,
            number: row.number,
            title: row.title,
            body: row.body,
            state: row.state,
            user: JSON.parse(row.user_data),
            labels: JSON.parse(row.labels_data),
            assignees: JSON.parse(row.assignees_data),
            milestone: row.milestone_data ? JSON.parse(row.milestone_data) : null,
            created_at: row.created_at,
            updated_at: row.updated_at,
            closed_at: row.closed_at,
            html_url: row.html_url,
            comments: row.comments,
        };
    }

    // Pull request operations
    async getPullRequestsForRepository(repoId: string): Promise<GitHubPullRequest[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM pull_requests WHERE repository_id = ? AND expires_at > ?',
            args: [repoId, Date.now()]
        });

        return result.rows.map(row => this.mapPullRequestRowToGitHub(row as any));
    }

    async savePullRequest(prId: string, repoId: string, data: GitHubPullRequest): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.PULL_REQUESTS);

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO pull_requests (
                id, repository_id, github_id, number, title, body, state, user_data,
                head_data, base_data, merged, mergeable, mergeable_state, merged_at,
                created_at, updated_at, closed_at, html_url, comments, review_comments,
                commits, additions, deletions, changed_files, cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                prId,
                repoId,
                data.id,
                data.number,
                data.title,
                data.body || null,
                data.state,
                JSON.stringify(data.user),
                JSON.stringify(data.head),
                JSON.stringify(data.base),
                data.merged ? 1 : 0,
                data.mergeable ? 1 : 0,
                data.mergeable_state,
                data.merged_at || null,
                data.created_at,
                data.updated_at,
                data.closed_at || null,
                data.html_url,
                data.comments,
                data.review_comments,
                data.commits,
                data.additions,
                data.deletions,
                data.changed_files,
                now,
                expiresAt
            ]
        });
    }

    private mapPullRequestRowToGitHub(row: any): GitHubPullRequest {
        return {
            id: row.github_id,
            number: row.number,
            title: row.title,
            body: row.body,
            state: row.state,
            user: JSON.parse(row.user_data),
            head: JSON.parse(row.head_data),
            base: JSON.parse(row.base_data),
            merged: row.merged === 1,
            mergeable: row.mergeable === 1,
            mergeable_state: row.mergeable_state,
            merged_at: row.merged_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            closed_at: row.closed_at,
            html_url: row.html_url,
            comments: row.comments,
            review_comments: row.review_comments,
            commits: row.commits,
            additions: row.additions,
            deletions: row.deletions,
            changed_files: row.changed_files,
        };
    }

    // Release operations
    async getReleasesForRepository(repoId: string): Promise<GitHubRelease[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM releases WHERE repository_id = ? AND expires_at > ?',
            args: [repoId, Date.now()]
        });

        return result.rows.map(row => this.mapReleaseRowToGitHub(row as any));
    }

    async saveRelease(releaseId: string, repoId: string, data: GitHubRelease): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.RELEASES);

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO releases (
                id, repository_id, github_id, tag_name, target_commitish, name, body,
                draft, prerelease, created_at, published_at, author_data, assets_data,
                html_url, cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                releaseId,
                repoId,
                data.id,
                data.tag_name,
                data.target_commitish,
                data.name || null,
                data.body || null,
                data.draft ? 1 : 0,
                data.prerelease ? 1 : 0,
                data.created_at,
                data.published_at || null,
                JSON.stringify(data.author),
                JSON.stringify(data.assets),
                data.html_url,
                now,
                expiresAt
            ]
        });
    }

    async getAllReleases(): Promise<Array<GitHubRelease & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: `SELECT 
                r.*, 
                repo.identity_id,
                repo.name as repository_name,
                repo.full_name as repository_full_name
            FROM releases r
            JOIN repositories repo ON r.repository_id = repo.id
            WHERE r.expires_at > ?
            ORDER BY r.published_at DESC, r.created_at DESC`,
            args: [Date.now()]
        });

        return result.rows.map(row => ({
            ...this.mapReleaseRowToGitHub(row as any),
            repository_id: (row as any).repository_id,
            identity_id: (row as any).identity_id,
            repository_name: (row as any).repository_name,
            repository_full_name: (row as any).repository_full_name,
        }));
    }

    async getAllIssues(): Promise<Array<GitHubIssue & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: `SELECT 
                i.*, 
                repo.identity_id,
                repo.name as repository_name,
                repo.full_name as repository_full_name
            FROM issues i
            JOIN repositories repo ON i.repository_id = repo.id
            WHERE i.expires_at > ?
            ORDER BY i.updated_at DESC, i.created_at DESC`,
            args: [Date.now()]
        });

        return result.rows.map(row => ({
            ...this.mapIssueRowToGitHub(row as any),
            repository_id: (row as any).repository_id,
            identity_id: (row as any).identity_id,
            repository_name: (row as any).repository_name,
            repository_full_name: (row as any).repository_full_name,
        }));
    }

    async getAllPullRequests(): Promise<Array<GitHubPullRequest & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: `SELECT 
                pr.*, 
                repo.identity_id,
                repo.name as repository_name,
                repo.full_name as repository_full_name
            FROM pull_requests pr
            JOIN repositories repo ON pr.repository_id = repo.id
            WHERE pr.expires_at > ?
            ORDER BY pr.updated_at DESC, pr.created_at DESC`,
            args: [Date.now()]
        });

        return result.rows.map(row => ({
            ...this.mapPullRequestRowToGitHub(row as any),
            repository_id: (row as any).repository_id,
            identity_id: (row as any).identity_id,
            repository_name: (row as any).repository_name,
            repository_full_name: (row as any).repository_full_name,
        }));
    }

    private mapReleaseRowToGitHub(row: any): GitHubRelease {
        return {
            id: row.github_id,
            tag_name: row.tag_name,
            target_commitish: row.target_commitish,
            name: row.name,
            body: row.body,
            draft: row.draft === 1,
            prerelease: row.prerelease === 1,
            created_at: row.created_at,
            published_at: row.published_at,
            author: JSON.parse(row.author_data),
            assets: JSON.parse(row.assets_data),
            html_url: row.html_url,
        };
    }

    // Branch operations
    async getBranchesForRepository(repoId: string): Promise<GitHubBranch[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM branches WHERE repository_id = ? AND expires_at > ?',
            args: [repoId, Date.now()]
        });

        return result.rows.map(row => this.mapBranchRowToGitHub(row as any));
    }

    async saveBranch(branchId: string, repoId: string, data: GitHubBranch): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.BRANCHES);

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO branches (
                id, repository_id, name, commit_sha, commit_url, protected, cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                branchId,
                repoId,
                data.name,
                data.commit.sha,
                data.commit.url,
                data.protected ? 1 : 0,
                now,
                expiresAt
            ]
        });
    }

    private mapBranchRowToGitHub(row: any): GitHubBranch {
        return {
            name: row.name,
            commit: {
                sha: row.commit_sha,
                url: row.commit_url,
            },
            protected: row.protected === 1,
        };
    }

    // NPM package operations
    async getNpmPackagesForScope(scope: string): Promise<NpmPackage[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM npm_packages WHERE scope = ? AND expires_at > ?',
            args: [scope, Date.now()]
        });

        return result.rows.map(row => this.mapNpmPackageRowToNpmPackage(row as any));
    }

    async saveNpmPackage(packageData: NpmPackage): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.NPM_PACKAGES);
        const packageId = `${packageData.scope}/${packageData.name}`;

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO npm_packages (
                id, scope, name, version, description, keywords, author_data, maintainers_data,
                repository_data, homepage, license, date, links_data, publisher_data,
                score_data, search_score, cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                packageId,
                packageData.scope || '',
                packageData.name,
                packageData.version,
                packageData.description || null,
                packageData.keywords ? JSON.stringify(packageData.keywords) : null,
                packageData.author ? JSON.stringify(packageData.author) : null,
                packageData.maintainers ? JSON.stringify(packageData.maintainers) : null,
                packageData.repository ? JSON.stringify(packageData.repository) : null,
                packageData.homepage || null,
                packageData.license || null,
                packageData.date || null,
                packageData.links ? JSON.stringify(packageData.links) : null,
                packageData.publisher ? JSON.stringify(packageData.publisher) : null,
                packageData.score ? JSON.stringify(packageData.score) : null,
                packageData.searchScore || null,
                now,
                expiresAt
            ]
        });
    }

    async getAllNpmPackages(): Promise<NpmPackage[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM npm_packages WHERE expires_at > ?',
            args: [Date.now()]
        });

        return result.rows.map(row => this.mapNpmPackageRowToNpmPackage(row as any));
    }

    private mapNpmPackageRowToNpmPackage(row: any): NpmPackage {
        return {
            name: row.name,
            version: row.version,
            description: row.description,
            keywords: row.keywords ? JSON.parse(row.keywords) : undefined,
            author: row.author_data ? JSON.parse(row.author_data) : undefined,
            maintainers: row.maintainers_data ? JSON.parse(row.maintainers_data) : undefined,
            repository: row.repository_data ? JSON.parse(row.repository_data) : undefined,
            homepage: row.homepage,
            license: row.license,
            date: row.date,
            scope: row.scope,
            links: row.links_data ? JSON.parse(row.links_data) : undefined,
            publisher: row.publisher_data ? JSON.parse(row.publisher_data) : undefined,
            score: row.score_data ? JSON.parse(row.score_data) : undefined,
            searchScore: row.search_score,
        };
    }

    // Workspace package operations
    async getWorkspacePackage(packageName: string): Promise<RepositoryDependencies | null> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM workspace_packages WHERE name = ? AND expires_at > ?',
            args: [packageName, Date.now()]
        });

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0] as any;
        return this.mapWorkspacePackageRowToRepositoryDependencies(row);
    }

    async saveWorkspacePackage(packageData: RepositoryDependencies): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();
        const expiresAt = this.calculateExpiresAt(CacheType.WORKSPACE_PACKAGES);
        const packageId = packageData.package.name;

        await this.client.execute({
            sql: `INSERT OR REPLACE INTO workspace_packages (
                id, name, version, description, repository_path, author_data, license,
                dependencies_data, dev_dependencies_data, internal_dependencies_data,
                dependents_data, cached_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                packageId,
                packageData.package.name,
                packageData.package.version,
                packageData.package.description || null,
                packageData.repositoryPath,
                packageData.package.author ? JSON.stringify(packageData.package.author) : null,
                packageData.package.license || null,
                JSON.stringify(packageData.dependencies),
                JSON.stringify(packageData.devDependencies),
                JSON.stringify(packageData.internalDependencies),
                JSON.stringify(packageData.dependents),
                now,
                expiresAt
            ]
        });
    }

    async getAllWorkspacePackages(): Promise<RepositoryDependencies[]> {
        await this.ensureInitialized();

        const result = await this.client.execute({
            sql: 'SELECT * FROM workspace_packages WHERE expires_at > ?',
            args: [Date.now()]
        });

        return result.rows.map(row => this.mapWorkspacePackageRowToRepositoryDependencies(row as any));
    }

    private mapWorkspacePackageRowToRepositoryDependencies(row: any): RepositoryDependencies {
        return {
            package: {
                name: row.name,
                version: row.version,
                description: row.description,
                repository: undefined, // Not stored in workspace packages
                author: row.author_data ? JSON.parse(row.author_data) : undefined,
                license: row.license,
            },
            dependencies: JSON.parse(row.dependencies_data),
            devDependencies: JSON.parse(row.dev_dependencies_data),
            internalDependencies: JSON.parse(row.internal_dependencies_data),
            dependents: JSON.parse(row.dependents_data),
            repositoryPath: row.repository_path,
        };
    }

    // Cache management
    async clearExpiredCache(): Promise<void> {
        await this.ensureInitialized();

        const now = Date.now();

        await Promise.all([
            this.client.execute({
                sql: 'DELETE FROM identities WHERE expires_at < ?',
                args: [now]
            }),
            this.client.execute({
                sql: 'DELETE FROM repositories WHERE expires_at < ?',
                args: [now]
            }),
            this.client.execute({
                sql: 'DELETE FROM issues WHERE expires_at < ?',
                args: [now]
            }),
            this.client.execute({
                sql: 'DELETE FROM pull_requests WHERE expires_at < ?',
                args: [now]
            }),
            this.client.execute({
                sql: 'DELETE FROM releases WHERE expires_at < ?',
                args: [now]
            }),
            this.client.execute({
                sql: 'DELETE FROM branches WHERE expires_at < ?',
                args: [now]
            }),
            this.client.execute({
                sql: 'DELETE FROM npm_packages WHERE expires_at < ?',
                args: [now]
            }),
            this.client.execute({
                sql: 'DELETE FROM workspace_packages WHERE expires_at < ?',
                args: [now]
            })
        ]);
    }

    async clearAllCache(): Promise<void> {
        await this.ensureInitialized();

        await Promise.all([
            this.client.execute('DELETE FROM identities'),
            this.client.execute('DELETE FROM repositories'),
            this.client.execute('DELETE FROM issues'),
            this.client.execute('DELETE FROM pull_requests'),
            this.client.execute('DELETE FROM releases'),
            this.client.execute('DELETE FROM branches'),
            this.client.execute('DELETE FROM npm_packages'),
            this.client.execute('DELETE FROM workspace_packages')
        ]);
    }

    /**
     * Reset the database by deleting the database file and reinitializing
     */
    async resetDatabase(): Promise<void> {
        if (this.config.url) {
            // For remote databases, we can't delete the file, so just clear all data
            await this.clearAllCache();
            return;
        }

        if (!this.dbPath) {
            throw new Error('Database path not available for reset');
        }

        // Close the current client
        this.client.close();

        // Delete the database file if it exists
        if (await fs.pathExists(this.dbPath)) {
            await fs.remove(this.dbPath);
        }

        // Recreate the client
        this.client = createClient({
            url: `file:${this.dbPath}`,
        });

        // Reset initialization state
        this.initialized = false;
        this.initializationPromise = null;

        // Reinitialize the database
        await this.initialize();
    }

    async getCacheStatus(): Promise<{
        identities: number;
        repositories: number;
        issues: number;
        pullRequests: number;
        releases: number;
        branches: number;
        npmPackages: number;
        workspacePackages: number;
        size: string;
        lastUpdated: string;
    }> {
        await this.ensureInitialized();

        const [identities, repositories, issues, pullRequests, releases, branches, npmPackages, workspacePackages] = await Promise.all([
            this.client.execute('SELECT COUNT(*) as count FROM identities'),
            this.client.execute('SELECT COUNT(*) as count FROM repositories'),
            this.client.execute('SELECT COUNT(*) as count FROM issues'),
            this.client.execute('SELECT COUNT(*) as count FROM pull_requests'),
            this.client.execute('SELECT COUNT(*) as count FROM releases'),
            this.client.execute('SELECT COUNT(*) as count FROM branches'),
            this.client.execute('SELECT COUNT(*) as count FROM npm_packages'),
            this.client.execute('SELECT COUNT(*) as count FROM workspace_packages')
        ]);

        // Get last updated time
        const lastUpdatedResult = await this.client.execute(`
            SELECT MAX(cached_at) as last_updated FROM (
                SELECT cached_at FROM identities
                UNION ALL
                SELECT cached_at FROM repositories
                UNION ALL
                SELECT cached_at FROM issues
                UNION ALL
                SELECT cached_at FROM pull_requests
                UNION ALL
                SELECT cached_at FROM releases
                UNION ALL
                SELECT cached_at FROM branches
                UNION ALL
                SELECT cached_at FROM npm_packages
                UNION ALL
                SELECT cached_at FROM workspace_packages
            )
        `);

        const lastUpdated = lastUpdatedResult.rows[0]?.last_updated as number || 0;

        return {
            identities: identities.rows[0]?.count as number || 0,
            repositories: repositories.rows[0]?.count as number || 0,
            issues: issues.rows[0]?.count as number || 0,
            pullRequests: pullRequests.rows[0]?.count as number || 0,
            releases: releases.rows[0]?.count as number || 0,
            branches: branches.rows[0]?.count as number || 0,
            npmPackages: npmPackages.rows[0]?.count as number || 0,
            workspacePackages: workspacePackages.rows[0]?.count as number || 0,
            size: 'Database size not available',
            lastUpdated: lastUpdated > 0 ? new Date(lastUpdated).toISOString() : 'Never'
        };
    }
} 