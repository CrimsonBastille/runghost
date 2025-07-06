import 'server-only';
import fs from 'fs';
import path from 'path';
import { DependencyGraph, RepositoryDependencies, PackageInfo, DependencyInfo, EnhancedDependencyGraph, NpmScopeDependencies, NpmDependencyRelation } from '../types/dependencies';
import { GitHubIdentity } from '../types/config';
import { npmClient, NpmPackage } from './npm';
import { DatabaseClient } from './database';
import { CacheTimeouts } from '../types/database';

export async function parsePackageJson(
    packagePath: string,
    configuredIdentities: Record<string, GitHubIdentity> = {}
): Promise<RepositoryDependencies | null> {
    try {
        const packageJsonPath = path.join(packagePath, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            return null;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        const packageInfo: PackageInfo = {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description || '',
            repository: packageJson.repository?.url || packageJson.repository,
            author: packageJson.author,
            license: packageJson.license,
        };

        const dependencies: DependencyInfo[] = Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({
            name,
            version: version as string,
            type: 'runtime' as const,
        }));

        const devDependencies: DependencyInfo[] = Object.entries(packageJson.devDependencies || {}).map(([name, version]) => ({
            name,
            version: version as string,
            type: 'dev' as const,
        }));

        // Extract internal dependencies based on configured npm scopes from GitHub identities
        const internalScopes: string[] = [];
        Object.values(configuredIdentities).forEach(identity => {
            if (identity.npmjs?.scopes) {
                internalScopes.push(...identity.npmjs.scopes);
            }
        });

        const internalDependencies: DependencyInfo[] = dependencies.filter(dep =>
            dep.name.startsWith('@') && internalScopes.some(scope => dep.name.startsWith(scope))
        );

        return {
            package: packageInfo,
            dependencies,
            devDependencies,
            internalDependencies,
            dependents: [], // Will be populated later
            repositoryPath: packagePath, // Add repository path for unique identification
        };
    } catch (error) {
        console.error(`Error parsing package.json at ${packagePath}:`, error);
        return null;
    }
}

export async function buildDependencyGraph(
    repositoryPaths: string[],
    configuredIdentities: Record<string, GitHubIdentity> = {}
): Promise<DependencyGraph> {
    const repositories: RepositoryDependencies[] = [];
    const organizations: { [orgName: string]: string[] } = {};
    const seenPackages = new Set<string>();

    // Parse all package.json files and deduplicate by package name
    for (const repoPath of repositoryPaths) {
        const repoData = await parsePackageJson(repoPath, configuredIdentities);
        if (repoData) {
            // Skip if we've already seen this package name
            if (seenPackages.has(repoData.package.name)) {
                console.log(`Skipping duplicate package: ${repoData.package.name} at ${repoPath}`);
                continue;
            }

            // Also skip packages with no name or invalid names
            if (!repoData.package.name || repoData.package.name.trim() === '') {
                console.log(`Skipping package with no name at ${repoPath}`);
                continue;
            }

            seenPackages.add(repoData.package.name);
            repositories.push(repoData);

            // Extract organization from package name
            const packageName = repoData.package.name;
            if (packageName.startsWith('@')) {
                const orgName = packageName.split('/')[0];
                if (!organizations[orgName]) {
                    organizations[orgName] = [];
                }
                // Only add if not already present
                if (!organizations[orgName].includes(packageName)) {
                    organizations[orgName].push(packageName);
                }
            }
        }
    }

    // Build interdependencies and populate dependents
    const interdependencies: { from: string; to: string; version: string }[] = [];
    const packageNames = new Set(repositories.map(r => r.package.name));

    for (const repo of repositories) {
        for (const dep of repo.internalDependencies) {
            interdependencies.push({
                from: repo.package.name,
                to: dep.name,
                version: dep.version,
            });

            // Find the target repository and add this as a dependent
            const targetRepo = repositories.find(r => r.package.name === dep.name);
            if (targetRepo) {
                targetRepo.dependents.push(repo.package.name);
            }
        }
    }

    return {
        repositories,
        organizations,
        interdependencies,
    };
}

/**
 * Build an enhanced dependency graph that includes npm packages from configured scopes
 */
export async function buildEnhancedDependencyGraph(
    repositoryPaths: string[],
    configuredIdentities: Record<string, GitHubIdentity> = {}
): Promise<EnhancedDependencyGraph> {
    // First, build the traditional dependency graph for local repositories
    const localGraph = await buildDependencyGraph(repositoryPaths, configuredIdentities);

    // Extract all npm scopes from identities
    const npmScopeMap = new Map<string, string>(); // scope -> identityId
    Object.entries(configuredIdentities).forEach(([identityId, identity]) => {
        if (identity.npmjs?.scopes) {
            identity.npmjs.scopes.forEach(scope => {
                npmScopeMap.set(scope, identityId);
            });
        }
    });

    const allScopes = Array.from(npmScopeMap.keys());
    console.log(`Fetching npm packages for scopes: ${allScopes.join(', ')}`);

    // Fetch npm packages for all scopes
    const npmScopeDependencies: NpmScopeDependencies[] = [];
    const allNpmPackages: NpmPackage[] = [];
    const npmOrganizations: { [scopeName: string]: string[] } = {};

    if (allScopes.length > 0) {
        try {
            const scopePackagesMap = await npmClient.getPackagesForScopes(allScopes);

            for (const [scope, packages] of Object.entries(scopePackagesMap)) {
                const identityId = npmScopeMap.get(scope) || npmScopeMap.get(scope.replace('@', '')) || 'unknown';

                npmScopeDependencies.push({
                    scope,
                    packages,
                    identityId
                });

                // Add to all packages list
                allNpmPackages.push(...packages);

                // Group by scope for organizations
                npmOrganizations[scope] = packages.map(pkg => pkg.name);

                console.log(`Found ${packages.length} packages in scope ${scope}`);
            }
        } catch (error) {
            console.error('Error fetching npm packages:', error);
        }
    }

    // Build npm dependencies by analyzing package.json files of npm packages
    const npmDependencies: NpmDependencyRelation[] = [];
    const crossDependencies: NpmDependencyRelation[] = [];

    // Create maps for quick lookup
    const npmPackageMap = new Map<string, NpmPackage>();
    allNpmPackages.forEach(pkg => npmPackageMap.set(pkg.name, pkg));

    const localPackageMap = new Map<string, RepositoryDependencies>();
    localGraph.repositories.forEach(repo => localPackageMap.set(repo.package.name, repo));

    // For each npm package, fetch its package.json to analyze dependencies
    for (const npmPackage of allNpmPackages) {
        try {
            const packageMetadata = await npmClient.getPackageMetadata(npmPackage.name);
            if (!packageMetadata) continue;

            // We would need to fetch the actual package.json from the npm package to get dependencies
            // For now, we'll focus on the packages we have and their relationships
            // This could be enhanced by fetching package manifests from npm registry
        } catch (error) {
            console.error(`Error analyzing dependencies for ${npmPackage.name}:`, error);
        }
    }

    // Analyze cross-dependencies between local and npm packages
    for (const localRepo of localGraph.repositories) {
        for (const dep of localRepo.dependencies) {
            const npmPackage = npmPackageMap.get(dep.name);
            if (npmPackage) {
                crossDependencies.push({
                    from: localRepo.package.name,
                    to: dep.name,
                    version: dep.version,
                    type: 'local',
                    toScope: npmPackage.scope
                });
            }
        }
    }

    return {
        // Local repository data
        repositories: localGraph.repositories,
        organizations: localGraph.organizations,
        interdependencies: localGraph.interdependencies,

        // Npm-based data
        npmScopes: npmScopeDependencies,
        npmPackages: allNpmPackages,
        npmOrganizations,
        npmDependencies,
        crossDependencies
    };
}

export async function scanWorkspaceForPackages(workspacePath: string): Promise<string[]> {
    const packagePaths: string[] = [];

    try {
        // Recursively scan for package.json files, excluding common build/dependency directories
        const scanDirectory = (dirPath: string, depth: number = 0) => {
            // Limit depth to prevent infinite recursion
            if (depth > 10) return;

            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                // Skip common directories that shouldn't contain root package.json files
                if (entry.name.startsWith('.') ||
                    entry.name === 'node_modules' ||
                    entry.name === 'dist' ||
                    entry.name === 'build' ||
                    entry.name === 'coverage' ||
                    entry.name === '.next') {
                    continue;
                }

                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    const packageJsonPath = path.join(fullPath, 'package.json');

                    if (fs.existsSync(packageJsonPath)) {
                        packagePaths.push(fullPath);
                    }

                    // Continue scanning subdirectories
                    scanDirectory(fullPath, depth + 1);
                }
            }
        };

        scanDirectory(workspacePath);
    } catch (error) {
        console.error('Error scanning workspace:', error);
    }

    return packagePaths;
}

/**
 * Build an enhanced dependency graph using cached data from the database.
 * Falls back to fresh API calls and caches the results if cache is empty or expired.
 */
export async function buildCachedEnhancedDependencyGraph(
    repositoryPaths: string[],
    configuredIdentities: Record<string, GitHubIdentity>,
    database: DatabaseClient,
    forceRefresh: boolean = false
): Promise<EnhancedDependencyGraph> {
    console.log('Building cached enhanced dependency graph...');

    // Check if we have cached workspace packages
    const cachedWorkspacePackages = await database.getAllWorkspacePackages();
    const shouldRefreshWorkspace = forceRefresh || cachedWorkspacePackages.length === 0;

    let repositories: RepositoryDependencies[];

    if (shouldRefreshWorkspace) {
        console.log('Refreshing workspace packages...');
        // Parse workspace packages fresh and cache them
        repositories = [];
        const seenPackages = new Set<string>();

        for (const repoPath of repositoryPaths) {
            const repoData = await parsePackageJson(repoPath, configuredIdentities);
            if (repoData) {
                // Skip duplicates
                if (seenPackages.has(repoData.package.name)) {
                    console.log(`Skipping duplicate package: ${repoData.package.name} at ${repoPath}`);
                    continue;
                }

                if (!repoData.package.name || repoData.package.name.trim() === '') {
                    console.log(`Skipping package with no name at ${repoPath}`);
                    continue;
                }

                seenPackages.add(repoData.package.name);
                repositories.push(repoData);

                // Cache the workspace package
                await database.saveWorkspacePackage(repoData);
            }
        }
    } else {
        console.log('Using cached workspace packages');
        repositories = cachedWorkspacePackages;
    }

    // Build interdependencies
    const interdependencies: { from: string; to: string; version: string }[] = [];
    const organizations: { [orgName: string]: string[] } = {};
    const packageNames = new Set(repositories.map(r => r.package.name));

    for (const repo of repositories) {
        for (const dep of repo.internalDependencies) {
            interdependencies.push({
                from: repo.package.name,
                to: dep.name,
                version: dep.version,
            });

            // Find the target repository and add this as a dependent
            const targetRepo = repositories.find(r => r.package.name === dep.name);
            if (targetRepo) {
                targetRepo.dependents.push(repo.package.name);
            }
        }

        // Extract organization from package name
        const packageName = repo.package.name;
        if (packageName.startsWith('@')) {
            const orgName = packageName.split('/')[0];
            if (!organizations[orgName]) {
                organizations[orgName] = [];
            }
            if (!organizations[orgName].includes(packageName)) {
                organizations[orgName].push(packageName);
            }
        }
    }

    // Check for cached npm packages
    const npmScopeMap = new Map<string, string>();
    Object.entries(configuredIdentities).forEach(([identityId, identity]) => {
        if (identity.npmjs?.scopes) {
            identity.npmjs.scopes.forEach(scope => {
                npmScopeMap.set(scope, identityId);
            });
        }
    });

    const allScopes = Array.from(npmScopeMap.keys());
    const cachedNpmPackages = await database.getAllNpmPackages();
    const shouldRefreshNpm = forceRefresh || cachedNpmPackages.length === 0;

    let allNpmPackages: NpmPackage[];

    if (shouldRefreshNpm) {
        console.log(`Refreshing npm packages for scopes: ${allScopes.join(', ')}`);
        allNpmPackages = [];

        if (allScopes.length > 0) {
            try {
                const scopePackagesMap = await npmClient.getPackagesForScopes(allScopes);

                for (const [scope, packages] of Object.entries(scopePackagesMap)) {
                    for (const pkg of packages) {
                        // Cache each npm package
                        await database.saveNpmPackage(pkg);
                        allNpmPackages.push(pkg);
                    }
                    console.log(`Cached ${packages.length} packages for scope ${scope}`);
                }
            } catch (error) {
                console.error('Error fetching npm packages:', error);
            }
        }
    } else {
        console.log('Using cached npm packages');
        allNpmPackages = cachedNpmPackages;
    }

    // Build npm scope dependencies
    const npmScopeDependencies: NpmScopeDependencies[] = [];
    const npmOrganizations: { [scopeName: string]: string[] } = {};

    for (const scope of allScopes) {
        const scopePackages = allNpmPackages.filter(pkg => pkg.scope === scope);
        const identityId = npmScopeMap.get(scope) || npmScopeMap.get(scope.replace('@', '')) || 'unknown';

        npmScopeDependencies.push({
            scope,
            packages: scopePackages,
            identityId
        });

        npmOrganizations[scope] = scopePackages.map(pkg => pkg.name);
    }

    // Build cross-dependencies between local and npm packages
    const crossDependencies: NpmDependencyRelation[] = [];
    const npmPackageMap = new Map<string, NpmPackage>();
    allNpmPackages.forEach(pkg => npmPackageMap.set(pkg.name, pkg));

    for (const localRepo of repositories) {
        for (const dep of localRepo.dependencies) {
            const npmPackage = npmPackageMap.get(dep.name);
            if (npmPackage) {
                crossDependencies.push({
                    from: localRepo.package.name,
                    to: dep.name,
                    version: dep.version,
                    type: 'local',
                    toScope: npmPackage.scope
                });
            }
        }
    }

    console.log(`Enhanced dependency graph built with:`);
    console.log(`- ${repositories.length} local repositories`);
    console.log(`- ${allNpmPackages.length} npm packages`);
    console.log(`- ${npmScopeDependencies.length} npm scopes`);
    console.log(`- ${interdependencies.length} local dependencies`);
    console.log(`- ${crossDependencies.length} cross dependencies`);

    return {
        repositories,
        organizations,
        interdependencies,
        npmScopes: npmScopeDependencies,
        npmPackages: allNpmPackages,
        npmOrganizations,
        npmDependencies: [], // TODO: Implement npm-to-npm dependencies if needed
        crossDependencies
    };
}

/**
 * Create a database client with appropriate cache timeouts for dependencies
 */
export function createDependenciesDatabase(dataDirectory: string = './.runghost'): DatabaseClient {
    const cacheTimeouts: CacheTimeouts = {
        identityTimeout: 24 * 60 * 60, // 24 hours
        repositoryTimeout: 12 * 60 * 60, // 12 hours
        issuesTimeout: 2 * 60 * 60, // 2 hours
        releasesTimeout: 6 * 60 * 60, // 6 hours
        branchesTimeout: 1 * 60 * 60, // 1 hour
        commitsTimeout: 1 * 60 * 60, // 1 hour
        npmPackagesTimeout: 24 * 60 * 60, // 24 hours - npm packages don't change frequently
        workspacePackagesTimeout: 1 * 60 * 60, // 1 hour - workspace packages change more frequently
    };

    return new DatabaseClient(
        { url: undefined, authToken: undefined }, // Use local database
        dataDirectory,
        cacheTimeouts
    );
} 