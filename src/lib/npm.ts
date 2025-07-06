import 'server-only';
import { auditedFetch } from './audit';

export interface NpmPackage {
    name: string;
    version: string;
    description?: string;
    keywords?: string[];
    author?: {
        name?: string;
        email?: string;
        username?: string;
    };
    maintainers?: Array<{
        username: string;
        email: string;
    }>;
    repository?: {
        type?: string;
        url?: string;
    };
    homepage?: string;
    license?: string;
    date?: string;
    scope?: string;
    links?: {
        npm?: string;
        homepage?: string;
        repository?: string;
        bugs?: string;
    };
    publisher?: {
        username: string;
        email: string;
    };
    score?: {
        final: number;
        detail: {
            quality: number;
            popularity: number;
            maintenance: number;
        };
    };
    searchScore?: number;
}

export interface NpmSearchResult {
    objects: Array<{
        package: NpmPackage;
        score: {
            final: number;
            detail: {
                quality: number;
                popularity: number;
                maintenance: number;
            };
        };
        searchScore: number;
    }>;
    total: number;
    time: string;
}

export class NpmClient {
    private baseUrl: string;
    private searchUrl: string;

    constructor(baseUrl: string = 'https://registry.npmjs.org') {
        this.baseUrl = baseUrl;
        this.searchUrl = `${baseUrl}/-/v1/search`;
    }

    /**
     * Search for packages by scope
     */
    async searchPackagesByScope(scope: string, options: {
        limit?: number;
        from?: number;
        detailed?: boolean;
    } = {}): Promise<NpmPackage[]> {
        const { limit = 250, from = 0, detailed = true } = options;

        // Ensure scope starts with @
        const normalizedScope = scope.startsWith('@') ? scope : `@${scope}`;

        try {
            // Use the proper npm search syntax for scoped packages
            const searchParams = new URLSearchParams({
                text: normalizedScope,
                size: limit.toString(),
                from: from.toString(),
                ...(detailed && { detailed: 'true' })
            });

            const response = await auditedFetch(`${this.searchUrl}?${searchParams}`, {
                service: 'npm',
                method: 'GET',
                metadata: {
                    scope: normalizedScope,
                    searchType: 'packages_by_scope'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to search packages: ${response.statusText}`);
            }

            const data: NpmSearchResult = await response.json();

            // Filter to only include packages that actually belong to the scope
            const scopePackages = data.objects
                .filter(item => item.package.name.startsWith(normalizedScope + '/'))
                .map(item => ({
                    ...item.package,
                    scope: normalizedScope,
                    score: item.score,
                    searchScore: item.searchScore
                }));

            return scopePackages;
        } catch (error) {
            console.error(`Error searching packages for scope ${normalizedScope}:`, error);
            return [];
        }
    }

    /**
     * Get all packages for multiple scopes
     */
    async getPackagesForScopes(scopes: string[]): Promise<Record<string, NpmPackage[]>> {
        const results: Record<string, NpmPackage[]> = {};

        // Process scopes in parallel
        const scopePromises = scopes.map(async (scope) => {
            const packages = await this.searchPackagesByScope(scope);
            return { scope, packages };
        });

        const scopeResults = await Promise.all(scopePromises);

        for (const { scope, packages } of scopeResults) {
            const normalizedScope = scope.startsWith('@') ? scope : `@${scope}`;
            results[normalizedScope] = packages;
        }

        return results;
    }

    /**
     * Get package metadata for a specific package
     */
    async getPackageMetadata(packageName: string): Promise<NpmPackage | null> {
        try {
            const response = await auditedFetch(`${this.baseUrl}/${packageName}`, {
                service: 'npm',
                method: 'GET',
                metadata: {
                    packageName,
                    searchType: 'package_metadata'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`Failed to get package metadata: ${response.statusText}`);
            }

            const data = await response.json();

            // Extract latest version info
            const latestVersion = data['dist-tags']?.latest || Object.keys(data.versions || {}).pop();
            const versionData = data.versions?.[latestVersion] || {};

            return {
                name: data.name,
                version: latestVersion,
                description: data.description || versionData.description,
                keywords: data.keywords || versionData.keywords,
                author: data.author || versionData.author,
                maintainers: data.maintainers,
                repository: data.repository || versionData.repository,
                homepage: data.homepage || versionData.homepage,
                license: data.license || versionData.license,
                date: data.time?.[latestVersion],
                scope: packageName.startsWith('@') ? packageName.split('/')[0] : undefined,
                links: {
                    npm: `https://www.npmjs.com/package/${packageName}`,
                    homepage: data.homepage || versionData.homepage,
                    repository: (data.repository || versionData.repository)?.url,
                    bugs: (data.bugs || versionData.bugs)?.url
                }
            };
        } catch (error) {
            console.error(`Error getting package metadata for ${packageName}:`, error);
            return null;
        }
    }

    /**
     * Search packages with custom query
     */
    async searchPackages(query: string, options: {
        limit?: number;
        from?: number;
        detailed?: boolean;
    } = {}): Promise<NpmPackage[]> {
        const { limit = 20, from = 0, detailed = true } = options;

        try {
            const searchParams = new URLSearchParams({
                text: query,
                size: limit.toString(),
                from: from.toString(),
                ...(detailed && { detailed: 'true' })
            });

            const response = await auditedFetch(`${this.searchUrl}?${searchParams}`, {
                service: 'npm',
                method: 'GET',
                metadata: {
                    query,
                    searchType: 'packages_by_query'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to search packages: ${response.statusText}`);
            }

            const data: NpmSearchResult = await response.json();

            return data.objects.map(item => ({
                ...item.package,
                score: item.score,
                searchScore: item.searchScore
            }));
        } catch (error) {
            console.error(`Error searching packages with query "${query}":`, error);
            return [];
        }
    }
}

export const npmClient = new NpmClient(); 