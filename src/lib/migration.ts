import * as fs from 'fs-extra';
import * as path from 'path';
import { DatabaseClient } from './database';
import { CachedData, CacheEntry, IdentityData, RepositoryDetail } from '../types/github';
import { RunGhostConfig } from '../types/config';

export interface MigrationOptions {
    config: RunGhostConfig;
    backupOldFile?: boolean;
    deleteOldFile?: boolean;
}

export interface MigrationResult {
    success: boolean;
    message: string;
    identitiesMigrated: number;
    repositoriesMigrated: number;
    errors?: string[];
}

/**
 * Migrates data from the old JSON cache format to the new database format
 */
export class CacheMigrator {
    private database: DatabaseClient;
    private config: RunGhostConfig;
    private oldCacheFile: string;

    constructor(config: RunGhostConfig) {
        this.config = config;
        this.oldCacheFile = path.join(
            config.dataDirectory.replace('~', process.env.HOME || '~'),
            'cache.json'
        );
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
    }

    /**
     * Check if migration is needed
     */
    async needsMigration(): Promise<boolean> {
        // Check if old cache file exists
        const hasOldFile = await fs.pathExists(this.oldCacheFile);

        // Check if database is empty
        const dbStatus = await this.database.getCacheStatus();
        const hasDbData = dbStatus.identities > 0 || dbStatus.repositories > 0;

        return hasOldFile && !hasDbData;
    }

    /**
     * Perform the migration
     */
    async migrate(options: MigrationOptions = { config: this.config }): Promise<MigrationResult> {
        const errors: string[] = [];
        let identitiesMigrated = 0;
        let repositoriesMigrated = 0;

        try {
            // Initialize database
            await this.database.initialize();

            // Check if old cache file exists
            if (!(await fs.pathExists(this.oldCacheFile))) {
                return {
                    success: true,
                    message: 'No old cache file found. Migration not needed.',
                    identitiesMigrated: 0,
                    repositoriesMigrated: 0
                };
            }

            // Load old cache data
            const oldCacheData: CachedData = await fs.readJson(this.oldCacheFile);

            // Migrate identities
            for (const [identityId, cacheEntry] of Object.entries(oldCacheData.identities || {})) {
                try {
                    const identityData = this.convertCacheEntryToIdentity(cacheEntry);
                    await this.database.saveIdentity(identityId, identityData);

                    // Migrate repositories for this identity
                    for (const repo of identityData.repositories) {
                        const repoId = `${identityId}/${repo.name}`;
                        await this.database.saveRepository(repoId, identityId, repo);
                        repositoriesMigrated++;
                    }

                    identitiesMigrated++;
                } catch (error) {
                    errors.push(`Failed to migrate identity ${identityId}: ${error}`);
                }
            }

            // Migrate repository details
            for (const [repoKey, cacheEntry] of Object.entries(oldCacheData.repositories || {})) {
                try {
                    const repoDetail = this.convertCacheEntryToRepositoryDetail(cacheEntry);
                    const [identityId, repoName] = repoKey.split('/');
                    const repoId = `${identityId}/${repoName}`;

                    // Save repository if not already saved
                    const existingRepo = await this.database.getRepository(repoId);
                    if (!existingRepo) {
                        await this.database.saveRepository(repoId, identityId, repoDetail.repository);
                    }

                    // Save issues, releases, and branches
                    for (const issue of repoDetail.issues) {
                        const issueId = `${repoId}/${issue.number}`;
                        await this.database.saveIssue(issueId, repoId, issue);
                    }

                    for (const release of repoDetail.releases) {
                        const releaseId = `${repoId}/${release.tag_name}`;
                        await this.database.saveRelease(releaseId, repoId, release);
                    }

                    for (const branch of repoDetail.branches) {
                        const branchId = `${repoId}/${branch.name}`;
                        await this.database.saveBranch(branchId, repoId, branch);
                    }

                } catch (error) {
                    errors.push(`Failed to migrate repository ${repoKey}: ${error}`);
                }
            }

            // Handle old file
            if (options.backupOldFile) {
                const backupPath = `${this.oldCacheFile}.backup`;
                await fs.move(this.oldCacheFile, backupPath);
                console.log(`Old cache file backed up to: ${backupPath}`);
            } else if (options.deleteOldFile) {
                await fs.remove(this.oldCacheFile);
                console.log('Old cache file deleted');
            }

            const result: MigrationResult = {
                success: true,
                message: `Migration completed successfully! Migrated ${identitiesMigrated} identities and ${repositoriesMigrated} repositories.`,
                identitiesMigrated,
                repositoriesMigrated
            };

            if (errors.length > 0) {
                result.errors = errors;
                result.message += ` However, ${errors.length} errors occurred during migration.`;
            }

            return result;

        } catch (error) {
            return {
                success: false,
                message: `Migration failed: ${error}`,
                identitiesMigrated,
                repositoriesMigrated,
                errors: [error?.toString() || 'Unknown error']
            };
        }
    }

    /**
     * Convert old cache entry to identity data
     */
    private convertCacheEntryToIdentity(cacheEntry: CacheEntry<IdentityData>): IdentityData {
        // The data structure should be the same, just return the data
        return cacheEntry.data;
    }

    /**
     * Convert old cache entry to repository detail
     */
    private convertCacheEntryToRepositoryDetail(cacheEntry: CacheEntry<RepositoryDetail>): RepositoryDetail {
        // The data structure should be the same, just return the data
        return cacheEntry.data;
    }

    /**
     * Clean up migration resources
     */
    async cleanup(): Promise<void> {
        await this.database.close();
    }
}

/**
 * Utility function to run migration from CLI or programmatically
 */
export async function runMigration(config: RunGhostConfig, options: Partial<MigrationOptions> = {}): Promise<MigrationResult> {
    const migrator = new CacheMigrator(config);

    try {
        const needsMigration = await migrator.needsMigration();

        if (!needsMigration) {
            return {
                success: true,
                message: 'Migration not needed. Database already has data or no old cache file found.',
                identitiesMigrated: 0,
                repositoriesMigrated: 0
            };
        }

        const result = await migrator.migrate({
            config,
            backupOldFile: options.backupOldFile ?? true,
            deleteOldFile: options.deleteOldFile ?? false
        });

        return result;
    } finally {
        await migrator.cleanup();
    }
}

/**
 * Display migration result in a user-friendly format
 */
export function displayMigrationResult(result: MigrationResult): void {
    console.log('\n=== Migration Results ===');
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Message: ${result.message}`);
    console.log(`Identities migrated: ${result.identitiesMigrated}`);
    console.log(`Repositories migrated: ${result.repositoriesMigrated}`);

    if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }

    console.log('========================\n');
} 