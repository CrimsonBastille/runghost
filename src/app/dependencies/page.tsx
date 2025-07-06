import { loadConfigFromDirectory } from '../../lib/config';
import { buildCachedEnhancedDependencyGraph, createDependenciesDatabase, scanWorkspaceForPackages } from '../../lib/dependencies';
import { NetworkGraphWrapper } from '../../components/InteractiveNetworkGraph';
import { DependenciesRefreshButton } from '../../components/DependenciesRefreshButton';

export default async function DependenciesPage() {
    const config = await loadConfigFromDirectory();

    // Use environment variable or fallback to the known workspace path
    const workspacePath = process.env.WORKSPACE_PATH || '/Users/you/gitw';
    const repositoryPaths = await scanWorkspaceForPackages(workspacePath);

    // Initialize database and build enhanced dependency graph with cached data
    const database = createDependenciesDatabase();
    await database.initialize();
    const dependencyGraph = await buildCachedEnhancedDependencyGraph(repositoryPaths, config.identities, database);

    // Summary statistics
    const totalLocalRepos = dependencyGraph.repositories.length;
    const totalNpmPackages = dependencyGraph.npmPackages?.length || 0;
    const totalScopes = dependencyGraph.npmScopes?.length || 0;
    const totalDependencies = dependencyGraph.interdependencies.length + (dependencyGraph.crossDependencies?.length || 0);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-6">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-3">📦 Package Dependencies</h1>
                        <p className="text-gray-600">
                            View dependencies between local packages and published NPM packages under your configured scopes.
                            The enhanced visualization shows both local development repositories and published packages from npmjs.org.
                        </p>
                    </div>
                    <div className="lg:w-80 flex-shrink-0">
                        <DependenciesRefreshButton />
                    </div>
                </div>

                {/* Summary Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{totalLocalRepos}</div>
                        <div className="text-sm text-blue-800">Local Repositories</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{totalNpmPackages}</div>
                        <div className="text-sm text-green-800">NPM Packages</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{totalScopes}</div>
                        <div className="text-sm text-purple-800">NPM Scopes</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{totalDependencies}</div>
                        <div className="text-sm text-orange-800">Total Dependencies</div>
                    </div>
                </div>
            </div>

            {/* Interactive Network Graph */}
            <NetworkGraphWrapper graph={dependencyGraph} />
        </div>
    );
} 