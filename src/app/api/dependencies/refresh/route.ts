import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromDirectory } from '../../../../lib/config';
import { buildCachedEnhancedDependencyGraph, createDependenciesDatabase, scanWorkspaceForPackages } from '../../../../lib/dependencies';

export async function POST(req: NextRequest) {
    try {
        console.log('Refreshing dependency data...');

        const config = await loadConfigFromDirectory();
        const repositoryPaths = await scanWorkspaceForPackages(config.workspacePath);

        // Initialize database and force refresh
        const database = createDependenciesDatabase();
        await database.initialize();

        // Force refresh by passing true as the last parameter
        const dependencyGraph = await buildCachedEnhancedDependencyGraph(
            repositoryPaths,
            config.identities,
            database,
            true // forceRefresh
        );

        console.log('Dependency data refreshed successfully');

        return NextResponse.json({
            success: true,
            message: 'Dependency data refreshed successfully',
            stats: {
                localRepositories: dependencyGraph.repositories.length,
                npmPackages: dependencyGraph.npmPackages.length,
                npmScopes: dependencyGraph.npmScopes.length,
                interdependencies: dependencyGraph.interdependencies.length,
                crossDependencies: dependencyGraph.crossDependencies.length
            }
        });
    } catch (error) {
        console.error('Error refreshing dependency data:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to refresh dependency data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 