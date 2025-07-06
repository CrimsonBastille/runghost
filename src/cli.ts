#!/usr/bin/env node

import { configureFromCLI, initializeConfig, showConfig, runMigrationCommand } from './lib/config';
import { startServer } from './lib/server';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
    try {
        const [config, cliConfig] = await configureFromCLI();

        switch (cliConfig.command) {
            case 'init':
                await initializeConfig();
                break;

            case 'config':
                await showConfig();
                break;

            case 'migrate':
                await runMigrationCommand();
                break;

            case 'start':
            default:
                await startServer(config);
                break;
        }
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Handle the main function with proper error handling
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
}); 