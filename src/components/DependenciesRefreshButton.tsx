'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Database, Globe, HardDrive, CheckCircle, AlertCircle } from 'lucide-react';

interface RefreshStats {
    localRepositories: number;
    npmPackages: number;
    npmScopes: number;
    interdependencies: number;
    crossDependencies: number;
}

export function DependenciesRefreshButton() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshStats, setLastRefreshStats] = useState<RefreshStats | null>(null);
    const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
    const [refreshStatus, setRefreshStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const router = useRouter();

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setRefreshStatus('idle');

        try {
            const response = await fetch('/api/dependencies/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setLastRefreshStats(data.stats);
                setLastRefreshTime(new Date());
                setRefreshStatus('success');
                // Refresh the page to show new data
                router.refresh();
            } else {
                console.error('Failed to refresh:', data.error);
                setRefreshStatus('error');
                alert('Failed to refresh dependency data: ' + data.error);
            }
        } catch (error) {
            console.error('Error refreshing:', error);
            setRefreshStatus('error');
            alert('Error refreshing dependency data');
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatLastRefresh = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Main Refresh Button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`px-4 py-2 rounded-md text-white font-medium transition-all flex items-center gap-2 ${isRefreshing
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                        }`}
                    title="Refresh both local workspace packages and remote npm package data"
                >
                    {isRefreshing ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            Refresh Data
                        </>
                    )}
                </button>

                {/* Status Indicator */}
                {refreshStatus === 'success' && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Updated successfully</span>
                    </div>
                )}
                {refreshStatus === 'error' && (
                    <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Refresh failed</span>
                    </div>
                )}
            </div>

            {/* What Gets Refreshed - Info Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-blue-800 mb-2">🔄 What gets refreshed:</div>
                <div className="space-y-1 text-blue-700">
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-3 h-3" />
                        <span><strong>Local packages:</strong> Rescans your workspace for package.json files</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        <span><strong>NPM packages:</strong> Refetches published packages from npmjs.org</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Database className="w-3 h-3" />
                        <span><strong>Dependencies:</strong> Rebuilds the entire dependency graph</span>
                    </div>
                </div>
            </div>

            {/* Last Refresh Stats */}
            {lastRefreshStats && lastRefreshTime && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">📊 Last Refresh</span>
                        <span className="text-xs text-gray-500">{formatLastRefresh(lastRefreshTime)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                            <strong className="text-blue-600">{lastRefreshStats.localRepositories}</strong> local repos
                        </div>
                        <div>
                            <strong className="text-green-600">{lastRefreshStats.npmPackages}</strong> npm packages
                        </div>
                        <div>
                            <strong className="text-purple-600">{lastRefreshStats.npmScopes}</strong> npm scopes
                        </div>
                        <div>
                            <strong className="text-orange-600">{lastRefreshStats.interdependencies + lastRefreshStats.crossDependencies}</strong> dependencies
                        </div>
                    </div>
                </div>
            )}

            {/* Help Text */}
            <div className="text-xs text-gray-500 italic">
                💡 Use this when you've added new packages, published to npm, or want to ensure you have the latest dependency information.
            </div>
        </div>
    );
} 