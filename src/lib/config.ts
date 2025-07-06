import * as Cardigantime from '@theunwalked/cardigantime';
import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { RunGhostConfigSchema, RunGhostConfig, CLIConfig, DEFAULT_CONFIG } from '../types/config';

const DEFAULT_CONFIG_DIR = '.runghost';
const PROGRAM_NAME = 'runghost';
const VERSION = '1.0.0';

/**
 * Configure early logging based on command line flags.
 */
function configureEarlyLogging(): void {
    const hasVerbose = process.argv.includes('--verbose');
    const hasDebug = process.argv.includes('--debug');

    if (hasDebug) {
        console.log('Debug logging enabled');
    } else if (hasVerbose) {
        console.log('Verbose logging enabled');
    }
}

/**
 * Initialize CardiganTime with RunGhost configuration schema
 */
function createCardigantime(): any {
    const createCardigantime: any = (Cardigantime as unknown as { create: unknown }).create as any;

    return createCardigantime({
        defaults: {
            configDirectory: DEFAULT_CONFIG_DIR,
            pathResolution: {
                resolvePathArray: ['dataDirectory'],
            },
            fieldOverlaps: {
                'identities': 'merge',
            },
        },
        features: ['config', 'hierarchical'],
        configShape: RunGhostConfigSchema.shape,
        logger: {
            log: console.log,
            info: console.info || console.log,
            error: console.error,
            warn: console.warn,
            verbose: console.log,
            debug: console.debug || console.log,
        },
    });
}

/**
 * Configure command line arguments and parse configuration
 */
export async function configureFromCLI(): Promise<[RunGhostConfig, CLIConfig]> {
    configureEarlyLogging();

    const cardigantime = createCardigantime();
    let program = new Command();

    // Configure program basics
    program
        .name(PROGRAM_NAME)
        .summary('Monitor multiple GitHub identities from a single dashboard')
        .description('RunGhost provides a unified dashboard for monitoring multiple GitHub accounts')
        .version(VERSION);

    // Let cardigantime add its arguments
    program = await cardigantime.configure(program);

    // Add RunGhost-specific options
    program
        .option('-p, --port <port>', 'port to run the server on', parseInt)
        .option('-h, --host <host>', 'host to bind the server to')
        .option('--data-dir <dataDirectory>', 'directory to store cached data')
        .option('--theme <theme>', 'UI theme (light, dark, auto)')
        .option('--verbose', 'enable verbose logging')
        .option('--debug', 'enable debug logging');

    // Add subcommands
    program
        .command('start')
        .description('Start the RunGhost server')
        .action(() => {
            // This will be handled by the main CLI logic
        });

    program
        .command('init')
        .description('Initialize RunGhost configuration')
        .action(() => {
            // This will be handled by the main CLI logic
        });

    program
        .command('config')
        .description('Show current configuration')
        .action(() => {
            // This will be handled by the main CLI logic
        });

    program
        .command('migrate')
        .description('Migrate data from JSON cache to database')
        .option('--backup', 'backup old cache file instead of deleting')
        .option('--delete', 'delete old cache file after migration')
        .action(() => {
            // This will be handled by the main CLI logic
        });

    // Parse command line arguments
    program.parse();
    const cliArgs = program.opts();

    // Transform CLI args to match our config schema
    const transformedCliArgs: Partial<RunGhostConfig> = {};

    if (cliArgs.port !== undefined) transformedCliArgs.port = cliArgs.port;
    if (cliArgs.host !== undefined) transformedCliArgs.host = cliArgs.host;
    if (cliArgs.dataDirectory !== undefined) transformedCliArgs.dataDirectory = cliArgs.dataDirectory;
    if (cliArgs.theme !== undefined) transformedCliArgs.theme = cliArgs.theme;
    if (cliArgs.verbose !== undefined) transformedCliArgs.verbose = cliArgs.verbose;
    if (cliArgs.debug !== undefined) transformedCliArgs.debug = cliArgs.debug;

    // Get configuration from hierarchical config files
    const fileValues: Partial<RunGhostConfig> = await cardigantime.read(transformedCliArgs) as Partial<RunGhostConfig>;

    // Merge configurations: Defaults -> File -> CLI
    const mergedConfig: Partial<RunGhostConfig> = {
        ...DEFAULT_CONFIG,
        ...fileValues,
        ...transformedCliArgs,
    };

    // Validate and parse the final configuration
    const config = RunGhostConfigSchema.parse(mergedConfig);

    // Expand tilde in dataDirectory
    if (config.dataDirectory.startsWith('~')) {
        config.dataDirectory = path.join(os.homedir(), config.dataDirectory.slice(1));
    }

    // Determine the command being run
    const command = program.args[0] || 'start';
    const cliConfig: CLIConfig = {
        configDirectory: DEFAULT_CONFIG_DIR,
        command: command as 'start' | 'config' | 'init' | 'migrate',
    };

    return [config, cliConfig];
}

/**
 * Load configuration from a specific directory (for Next.js app)
 */
export async function loadConfigFromDirectory(configDir?: string): Promise<RunGhostConfig> {
    const cardigantime = createCardigantime();

    const searchDir = configDir || process.cwd();
    const configPath = findConfigPath(searchDir);

    if (!configPath) {
        throw new Error(`No .runghost configuration found. Please run 'runghost init' to create one.`);
    }

    const fileValues: Partial<RunGhostConfig> = await cardigantime.read({
        configDirectory: configPath,
    }) as Partial<RunGhostConfig>;

    const mergedConfig: Partial<RunGhostConfig> = {
        ...DEFAULT_CONFIG,
        ...fileValues,
    };

    const config = RunGhostConfigSchema.parse(mergedConfig);

    // Expand tilde in dataDirectory
    if (config.dataDirectory.startsWith('~')) {
        config.dataDirectory = path.join(os.homedir(), config.dataDirectory.slice(1));
    }

    return config;
}

/**
 * Find the .runghost configuration directory by traversing up the directory tree
 */
function findConfigPath(startDir: string): string | null {
    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        const configPath = path.join(currentDir, DEFAULT_CONFIG_DIR);
        if (fs.existsSync(configPath)) {
            return configPath;
        }
        currentDir = path.dirname(currentDir);
    }

    // Check home directory as fallback
    const homeConfigPath = path.join(os.homedir(), DEFAULT_CONFIG_DIR);
    if (fs.existsSync(homeConfigPath)) {
        return homeConfigPath;
    }

    return null;
}

/**
 * Initialize a new RunGhost configuration
 */
export async function initializeConfig(configDir?: string): Promise<void> {
    const cardigantime = createCardigantime();
    const targetDir = configDir || path.join(process.cwd(), DEFAULT_CONFIG_DIR);

    // Create the configuration directory if it doesn't exist
    await fs.ensureDir(targetDir);

    // Generate the initial configuration file
    await cardigantime.generateConfig(targetDir);

    // Create a sample configuration file
    const sampleConfig = {
        port: 4000,
        host: 'localhost',
        dataDirectory: '~/.runghost',
        cacheTimeout: 300,
        theme: 'auto',
        identities: {
            example: {
                name: 'Example Identity',
                username: 'example-user',
                token: 'ghp_your_token_here',
                description: 'An example GitHub identity',
                tags: ['personal', 'example'],
                npmjs: {
                    scopes: ['@example-org', '@example-company']
                }
            },
        },
        verbose: false,
        debug: false,
    };

    const configPath = path.join(targetDir, 'config.yaml');
    if (!fs.existsSync(configPath)) {
        const yaml = require('yaml');
        await fs.writeFile(configPath, yaml.stringify(sampleConfig, null, 2));
    }

    console.log(`RunGhost configuration initialized in ${targetDir}`);
    console.log('Please edit config.yaml to add your GitHub identities and tokens.');
}

/**
 * Display current configuration
 */
export async function showConfig(): Promise<void> {
    try {
        const [config] = await configureFromCLI();
        console.log('Current RunGhost Configuration:');
        console.log(JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error loading configuration:', error);
        process.exit(1);
    }
}

/**
 * Run cache migration from JSON to database
 */
export async function runMigrationCommand(): Promise<void> {
    try {
        const [config] = await configureFromCLI();

        // Import migration functions (dynamic import to avoid circular dependencies)
        const { runMigration, displayMigrationResult } = await import('./migration');

        console.log('Starting migration from JSON cache to database...\n');

        const result = await runMigration(config, {
            backupOldFile: true, // Always backup by default
            deleteOldFile: false // Don't delete by default for safety
        });

        displayMigrationResult(result);

        if (!result.success) {
            process.exit(1);
        }
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
} 