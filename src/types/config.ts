import { z } from 'zod';

// Schema for a single GitHub identity configuration
export const GitHubIdentitySchema = z.object({
    name: z.string().describe('Display name for this identity'),
    username: z.string().describe('GitHub username'),
    token: z.string().describe('GitHub personal access token'),
    description: z.string().optional().describe('Optional description of this identity'),
    avatar: z.string().optional().describe('Optional custom avatar URL'),
    tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
    workspaces: z.array(z.string()).optional().describe('Optional list of workspace paths associated with this identity'),
    npmjs: z.object({
        scopes: z.array(z.string()).describe('List of npm scopes this identity publishes under (e.g., ["@myorg", "@mycompany"])'),
    }).optional().describe('NPM publishing configuration for this identity'),
});

// Schema for the main RunGhost configuration
export const RunGhostConfigSchema = z.object({
    // Server configuration
    port: z.number().default(4000).describe('Port to run the server on'),
    host: z.string().default('localhost').describe('Host to bind the server to'),

    // Data storage configuration
    dataDirectory: z.string().default('~/.runghost').describe('Directory to store cached data'),

    // Database configuration
    database: z.object({
        url: z.string().optional().describe('Database URL (defaults to local file)'),
        authToken: z.string().optional().describe('Database auth token for remote databases'),
    }).optional(),

    // Cache configuration with different timeouts for different data types
    cache: z.object({
        // Identity data changes rarely - cache for 24 hours by default
        identityTimeout: z.number().default(86400).describe('Identity cache timeout in seconds (24 hours default)'),

        // Repository metadata changes less frequently - cache for 6 hours by default
        repositoryTimeout: z.number().default(21600).describe('Repository metadata cache timeout in seconds (6 hours default)'),

        // Issues and PRs change more frequently - cache for 1 hour by default
        issuesTimeout: z.number().default(3600).describe('Issues and PRs cache timeout in seconds (1 hour default)'),

        // Releases change less frequently - cache for 2 hours by default
        releasesTimeout: z.number().default(7200).describe('Releases cache timeout in seconds (2 hours default)'),

        // Branches can change frequently - cache for 30 minutes by default
        branchesTimeout: z.number().default(1800).describe('Branches cache timeout in seconds (30 minutes default)'),

        // Commit information changes frequently - cache for 15 minutes by default
        commitsTimeout: z.number().default(900).describe('Commits cache timeout in seconds (15 minutes default)'),
    }).default({}),

    // GitHub identities
    identities: z.record(z.string(), GitHubIdentitySchema).describe('Map of identity IDs to GitHub identity configurations'),

    // UI configuration
    theme: z.enum(['light', 'dark', 'auto']).default('auto').describe('UI theme preference'),
    itemsPerPage: z.number().default(20).describe('Number of items to show per page'),
    refreshInterval: z.number().default(60).describe('Auto-refresh interval in seconds'),

    // GitHub API configuration
    github: z.object({
        userAgent: z.string().default('RunGhost/1.0.0').describe('User agent for GitHub API requests'),
        maxRetries: z.number().default(3).describe('Maximum number of API request retries'),
        retryDelay: z.number().default(1000).describe('Delay between retries in milliseconds'),
    }).optional(),

    // Logging configuration
    verbose: z.boolean().default(false).describe('Enable verbose logging'),
    debug: z.boolean().default(false).describe('Enable debug logging'),
});

// CLI configuration schema
export const CLIConfigSchema = z.object({
    configDirectory: z.string().default('.runghost').describe('Configuration directory name'),
    command: z.enum(['start', 'config', 'init', 'migrate']).default('start').describe('Command to execute'),
});

// Export inferred types
export type GitHubIdentity = z.infer<typeof GitHubIdentitySchema>;
export type RunGhostConfig = z.infer<typeof RunGhostConfigSchema>;
export type CLIConfig = z.infer<typeof CLIConfigSchema>;

// Default configuration
export const DEFAULT_CONFIG: Partial<RunGhostConfig> = {
    port: 4000,
    host: 'localhost',
    dataDirectory: '~/.runghost',
    cache: {
        identityTimeout: 86400, // 24 hours
        repositoryTimeout: 21600, // 6 hours
        issuesTimeout: 3600, // 1 hour
        releasesTimeout: 7200, // 2 hours
        branchesTimeout: 1800, // 30 minutes
        commitsTimeout: 900, // 15 minutes
    },
    theme: 'auto',
    itemsPerPage: 20,
    refreshInterval: 60,
    identities: {},
    github: {
        userAgent: 'RunGhost/1.0.0',
        maxRetries: 3,
        retryDelay: 1000,
    },
    verbose: false,
    debug: false,
}; 