import { spawn } from 'child_process';
import * as path from 'path';
import { RunGhostConfig } from '../types/config';
import { DatabaseClient } from './database';
import { loadConfigFromDirectory } from './config';

let databaseClient: DatabaseClient | null = null;

/**
 * Get the database client instance
 */
export async function getDb(): Promise<DatabaseClient> {
    if (!databaseClient) {
        // Load configuration
        const config = await loadConfigFromDirectory();

        // Create database client
        databaseClient = new DatabaseClient(
            config.database || {},
            config.dataDirectory,
            {
                identityTimeout: config.cache.identityTimeout,
                repositoryTimeout: config.cache.repositoryTimeout,
                issuesTimeout: config.cache.issuesTimeout,
                releasesTimeout: config.cache.releasesTimeout,
                branchesTimeout: config.cache.branchesTimeout,
                commitsTimeout: config.cache.commitsTimeout,
                npmPackagesTimeout: config.cache.issuesTimeout, // Use issues timeout for npm packages
                workspacePackagesTimeout: config.cache.issuesTimeout, // Use issues timeout for workspace packages
            }
        );

        // Initialize the database
        await databaseClient.initialize();
    }

    return databaseClient;
}

/**
 * Start the RunGhost server using Next.js
 */
export async function startServer(config: RunGhostConfig): Promise<void> {
    console.log(`Starting RunGhost server on ${config.host}:${config.port}`);
    console.log(`Data directory: ${config.dataDirectory}`);

    // Set environment variables for Next.js
    process.env.RUNGHOST_CONFIG = JSON.stringify(config);
    process.env.PORT = config.port.toString();
    process.env.HOST = config.host;

    // Find the project root (where package.json is located)
    const projectRoot = findProjectRoot(__dirname);

    // Start Next.js development server
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const command = isDevelopment ? 'dev' : 'start';

    const nextProcess = spawn('npm', ['run', command], {
        stdio: 'inherit',
        cwd: projectRoot,
        env: {
            ...process.env,
            PORT: config.port.toString(),
            HOST: config.host,
        },
    });

    nextProcess.on('error', (error) => {
        console.error('Failed to start Next.js server:', error);
        process.exit(1);
    });

    nextProcess.on('exit', (code) => {
        if (code !== 0) {
            console.error(`Next.js server exited with code ${code}`);
            process.exit(code || 1);
        }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('Shutting down RunGhost server...');
        nextProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
        console.log('Shutting down RunGhost server...');
        nextProcess.kill('SIGTERM');
    });
}

/**
 * Find the project root directory by looking for package.json
 */
function findProjectRoot(startDir: string): string {
    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (require('fs').existsSync(packageJsonPath)) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }

    // If we can't find package.json, use current directory
    return process.cwd();
} 