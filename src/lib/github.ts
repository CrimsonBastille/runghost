import { Octokit } from '@octokit/rest';
import * as path from 'path';
import { formatDistance } from 'date-fns';
import {
    GitHubUser,
    GitHubRepository,
    GitHubIssue,
    GitHubPullRequest,
    GitHubRelease,
    GitHubBranch,
    IdentityData,
    RepositoryDetail,
    APIResponse
} from '../types/github';
import { RunGhostConfig, GitHubIdentity } from '../types/config';
import { DatabaseClient } from './database';
import { auditedFetch } from './audit';

/**
 * GitHub API client with database caching
 */
export class GitHubClient {
    private clients: Map<string, Octokit> = new Map();
    private config: RunGhostConfig;
    private database: DatabaseClient;

    constructor(config: RunGhostConfig) {
        this.config = config;

        // Convert config.cache to CacheTimeouts with defaults for missing properties
        const cacheTimeouts = {
            identityTimeout: config.cache?.identityTimeout || 86400,
            repositoryTimeout: config.cache?.repositoryTimeout || 21600,
            issuesTimeout: config.cache?.issuesTimeout || 3600,
            releasesTimeout: config.cache?.releasesTimeout || 7200,
            branchesTimeout: config.cache?.branchesTimeout || 1800,
            commitsTimeout: config.cache?.commitsTimeout || 900,
            npmPackagesTimeout: 24 * 60 * 60, // 24 hours
            workspacePackagesTimeout: 1 * 60 * 60, // 1 hour
        };

        this.database = new DatabaseClient(
            config.database || {},
            config.dataDirectory.replace('~', process.env.HOME || '~'),
            cacheTimeouts
        );
        this.initializeClients();
    }

    /**
     * Initialize Octokit clients for each identity
     */
    private initializeClients(): void {
        for (const [id, identity] of Object.entries(this.config.identities)) {
            this.clients.set(id, new Octokit({
                auth: identity.token,
                userAgent: this.config.github?.userAgent || 'RunGhost/1.0.0',
                request: {
                    retries: this.config.github?.maxRetries || 3,
                    retryAfter: this.config.github?.retryDelay || 1000,
                    fetch: this.createAuditedFetch(id),
                },
            }));
        }
    }

    /**
     * Create audited fetch function for a specific identity
     */
    private createAuditedFetch(identityId: string) {
        return async (url: string, options: any = {}) => {
            return await auditedFetch(url, {
                ...options,
                service: 'github',
                identityId,
                metadata: {
                    username: this.config.identities[identityId]?.username,
                    name: this.config.identities[identityId]?.name
                }
            });
        };
    }

    /**
     * Get all identity data
     */
    async getAllIdentities(): Promise<APIResponse<Record<string, IdentityData>>> {
        try {
            // First, try to get from database
            const cachedIdentities = await this.database.getAllIdentities();
            const identities: Record<string, IdentityData> = {};

            // Fill in cached identities
            for (const [id, cachedIdentity] of Object.entries(cachedIdentities)) {
                // Add repositories to the identity
                const repositories = await this.database.getRepositoriesForIdentity(id);
                identities[id] = {
                    ...cachedIdentity,
                    repositories
                };
            }

            // Check if we need to refresh any identities
            const identitiesNeedingRefresh = Object.keys(this.config.identities).filter(
                id => !identities[id]
            );

            // Refresh missing identities
            for (const identityId of identitiesNeedingRefresh) {
                const result = await this.getIdentityData(identityId);
                if (result.success && result.data) {
                    identities[identityId] = result.data;
                }
            }

            return { success: true, data: identities };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get data for a specific identity
     */
    async getIdentityData(identityId: string, forceRefresh: boolean = false): Promise<APIResponse<IdentityData>> {
        try {
            // Check database cache first (unless force refresh is requested)
            if (!forceRefresh) {
                const cached = await this.database.getIdentity(identityId);
                if (cached) {
                    // Add repositories to the cached identity
                    const repositories = await this.database.getRepositoriesForIdentity(identityId);
                    return {
                        success: true,
                        data: { ...cached, repositories }
                    };
                }
            }

            const identity = this.config.identities[identityId];
            if (!identity) {
                return { success: false, error: `Identity ${identityId} not found` };
            }

            const client = this.clients.get(identityId);
            if (!client) {
                return { success: false, error: `Client for identity ${identityId} not initialized` };
            }

            // Fetch user data
            const { data: user } = await client.rest.users.getAuthenticated();

            // Fetch repositories
            const { data: repos } = await client.rest.repos.listForAuthenticatedUser({
                per_page: 100,
                sort: 'updated',
            });

            // Calculate statistics
            const stats = this.calculateStats(repos);

            // Count issues and pull requests across all repositories
            let totalIssues = 0;
            let totalPullRequests = 0;
            let totalReleases = 0;

            for (const repo of repos) {
                totalIssues += repo.open_issues_count;

                // Get PR count (issues count includes PRs, so we need to subtract)
                try {
                    const { data: prs } = await client.rest.pulls.list({
                        owner: repo.owner.login,
                        repo: repo.name,
                        state: 'open',
                        per_page: 1,
                    });
                    totalPullRequests += prs.length;
                } catch (error) {
                    // Skip if we can't access PRs
                }

                // Get release count
                try {
                    const { data: releases } = await client.rest.repos.listReleases({
                        owner: repo.owner.login,
                        repo: repo.name,
                        per_page: 1,
                    });
                    totalReleases += releases.length;
                } catch (error) {
                    // Skip if we can't access releases
                }
            }

            const identityData: IdentityData = {
                identity: {
                    id: identityId,
                    name: identity.name,
                    username: identity.username,
                    description: identity.description,
                    avatar: identity.avatar || user.avatar_url,
                    tags: identity.tags,
                },
                user: user as GitHubUser,
                repositories: repos as GitHubRepository[],
                lastUpdated: new Date().toISOString(),
                totalIssues,
                totalPullRequests,
                totalReleases,
                stats,
            };

            // Cache the result in database
            await this.database.saveIdentity(identityId, identityData);

            // Also cache individual repositories
            for (const repo of repos) {
                const repoId = `${identityId}/${repo.name}`;
                await this.database.saveRepository(repoId, identityId, repo as GitHubRepository);
            }

            return { success: true, data: identityData };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to fetch identity data',
                rateLimitRemaining: error.response?.headers?.['x-ratelimit-remaining'],
                rateLimitReset: error.response?.headers?.['x-ratelimit-reset'],
            };
        }
    }

    /**
     * Get detailed repository data
     */
    async getRepositoryDetail(identityId: string, repoName: string, forceRefresh: boolean = false): Promise<APIResponse<RepositoryDetail>> {
        try {
            const repoId = `${identityId}/${repoName}`;

            // Check database cache first (unless force refresh is requested)
            if (!forceRefresh) {
                const cached = await this.database.getRepositoryDetail(repoId);
                if (cached) {
                    return { success: true, data: cached };
                }
            }

            const identity = this.config.identities[identityId];
            if (!identity) {
                return { success: false, error: `Identity ${identityId} not found` };
            }

            const client = this.clients.get(identityId);
            if (!client) {
                return { success: false, error: `Client for identity ${identityId} not initialized` };
            }

            // Fetch repository data
            const { data: repository } = await client.rest.repos.get({
                owner: identity.username,
                repo: repoName,
            });

            // Fetch issues
            const { data: issues } = await client.rest.issues.listForRepo({
                owner: identity.username,
                repo: repoName,
                state: 'all',
                per_page: 100,
            });

            // Fetch pull requests
            const { data: pullRequests } = await client.rest.pulls.list({
                owner: identity.username,
                repo: repoName,
                state: 'all',
                per_page: 100,
            });

            // Fetch releases
            const { data: releases } = await client.rest.repos.listReleases({
                owner: identity.username,
                repo: repoName,
                per_page: 100,
            });

            // Fetch branches
            const { data: branches } = await client.rest.repos.listBranches({
                owner: identity.username,
                repo: repoName,
                per_page: 100,
            });

            const repositoryDetail: RepositoryDetail = {
                repository: repository as GitHubRepository,
                issues: issues as GitHubIssue[],
                pullRequests: pullRequests as any[],
                releases: releases as GitHubRelease[],
                branches: branches as GitHubBranch[],
                lastUpdated: new Date().toISOString(),
            };

            // Cache the result in database
            await this.database.saveRepository(repoId, identityId, repository as GitHubRepository);

            // Cache individual components
            for (const issue of issues) {
                const issueId = `${repoId}/${issue.number}`;
                await this.database.saveIssue(issueId, repoId, issue as GitHubIssue);
            }

            // Save pull requests to database
            for (const pr of pullRequests) {
                const prId = `${repoId}/${pr.number}`;
                // Map Octokit PR response to GitHubPullRequest interface
                const mappedPr: GitHubPullRequest = {
                    id: pr.id,
                    number: pr.number,
                    title: pr.title,
                    body: pr.body,
                    state: pr.state as 'open' | 'closed' | 'merged',
                    user: {
                        login: pr.user?.login || '',
                        avatar_url: pr.user?.avatar_url || '',
                    },
                    head: {
                        ref: pr.head.ref,
                        sha: pr.head.sha,
                        repo: pr.head.repo ? {
                            name: pr.head.repo.name,
                            full_name: pr.head.repo.full_name,
                        } : null,
                    },
                    base: {
                        ref: pr.base.ref,
                        sha: pr.base.sha,
                        repo: {
                            name: pr.base.repo.name,
                            full_name: pr.base.repo.full_name,
                        },
                    },
                    merged: pr.state === 'closed' && (pr as any).merged_at ? true : false,
                    mergeable: null, // Not available in list API
                    mergeable_state: 'unknown', // Not available in list API
                    merged_at: pr.merged_at || null,
                    created_at: pr.created_at,
                    updated_at: pr.updated_at,
                    closed_at: pr.closed_at || null,
                    html_url: pr.html_url,
                    comments: 0, // Not available in list API
                    review_comments: 0, // Not available in list API
                    commits: 0, // Not available in list API
                    additions: 0, // Not available in list API
                    deletions: 0, // Not available in list API
                    changed_files: 0, // Not available in list API
                };
                await this.database.savePullRequest(prId, repoId, mappedPr);
            }

            for (const release of releases) {
                const releaseId = `${repoId}/${release.tag_name}`;
                await this.database.saveRelease(releaseId, repoId, release as GitHubRelease);
            }

            for (const branch of branches) {
                const branchId = `${repoId}/${branch.name}`;
                await this.database.saveBranch(branchId, repoId, branch as GitHubBranch);
            }

            return { success: true, data: repositoryDetail };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to fetch repository data',
                rateLimitRemaining: error.response?.headers?.['x-ratelimit-remaining'],
                rateLimitReset: error.response?.headers?.['x-ratelimit-reset'],
            };
        }
    }

    /**
     * Calculate statistics for repositories
     */
    private calculateStats(repos: any[]): {
        totalStars: number;
        totalForks: number;
        totalSize: number;
        languageBreakdown: Record<string, number>;
        activityScore: number;
    } {
        const stats = {
            totalStars: 0,
            totalForks: 0,
            totalSize: 0,
            languageBreakdown: {} as Record<string, number>,
            activityScore: 0,
        };

        for (const repo of repos) {
            stats.totalStars += repo.stargazers_count;
            stats.totalForks += repo.forks_count;
            stats.totalSize += repo.size;

            if (repo.language) {
                stats.languageBreakdown[repo.language] = (stats.languageBreakdown[repo.language] || 0) + 1;
            }

            // Calculate activity score based on recent updates
            const lastUpdate = new Date(repo.updated_at);
            const now = new Date();
            const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceUpdate < 30) {
                stats.activityScore += 10;
            } else if (daysSinceUpdate < 90) {
                stats.activityScore += 5;
            } else if (daysSinceUpdate < 365) {
                stats.activityScore += 1;
            }
        }

        return stats;
    }

    /**
     * Clear cache
     */
    async clearCache(): Promise<void> {
        await this.database.clearAllCache();
    }

    /**
     * Reset database completely (delete and recreate)
     */
    async resetDatabase(): Promise<void> {
        await this.database.resetDatabase();
    }

    /**
     * Get all repositories across all identities
     */
    async getAllRepositories(): Promise<APIResponse<Array<GitHubRepository & { identity_id: string }>>> {
        try {
            const repositories = await this.database.getAllRepositories();
            return { success: true, data: repositories };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all releases across all identities
     */
    async getAllReleases(): Promise<APIResponse<Array<GitHubRelease & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>>> {
        try {
            const releases = await this.database.getAllReleases();
            return { success: true, data: releases };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all issues across all identities
     */
    async getAllIssues(): Promise<APIResponse<Array<GitHubIssue & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>>> {
        try {
            const issues = await this.database.getAllIssues();
            return { success: true, data: issues };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all issues for a specific identity
     */
    async getIssuesForIdentity(identityId: string): Promise<APIResponse<Array<GitHubIssue & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>>> {
        try {
            const allIssues = await this.database.getAllIssues();
            const filteredIssues = allIssues.filter(issue => issue.identity_id === identityId);
            return { success: true, data: filteredIssues };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all pull requests across all identities
     */
    async getAllPullRequests(): Promise<APIResponse<Array<GitHubPullRequest & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>>> {
        try {
            const pullRequests = await this.database.getAllPullRequests();
            return { success: true, data: pullRequests };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all pull requests for a specific identity
     */
    async getPullRequestsForIdentity(identityId: string): Promise<APIResponse<Array<GitHubPullRequest & { repository_id: string; identity_id: string; repository_name: string; repository_full_name: string }>>> {
        try {
            const allPullRequests = await this.database.getAllPullRequests();
            const filteredPullRequests = allPullRequests.filter(pr => pr.identity_id === identityId);
            return { success: true, data: filteredPullRequests };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get cache status
     */
    async getCacheStatus(): Promise<{
        identities: number;
        repositories: number;
        size: string;
        lastUpdated: string;
    }> {
        const status = await this.database.getCacheStatus();

        return {
            identities: status.identities,
            repositories: status.repositories,
            size: status.size,
            lastUpdated: status.lastUpdated ? formatDistance(new Date(status.lastUpdated), new Date(), { addSuffix: true }) : 'Never'
        };
    }
} 