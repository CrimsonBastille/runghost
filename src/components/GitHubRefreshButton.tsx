'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface RefreshStats {
    identities: number;
    repositories: number;
    releases: number;
    issues: number;
    pullRequests: number;
    branches: number;
    errors: string[];
}

interface RefreshResult {
    success: boolean;
    message?: string;
    stats?: RefreshStats;
    refreshedIdentities?: string[];
    error?: string;
    details?: string;
}

interface Identity {
    id: string;
    name: string;
    username: string;
    avatar?: string;
}

export function GitHubRefreshButton() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshResult, setLastRefreshResult] = useState<RefreshResult | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [identities, setIdentities] = useState<Identity[]>([]);
    const [selectedIdentity, setSelectedIdentity] = useState<string>('all');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loadingIdentities, setLoadingIdentities] = useState(true);

    // Load available identities on component mount
    useEffect(() => {
        const loadIdentities = async () => {
            try {
                const response = await fetch('/api/github/identities');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.identities) {
                        const identityList = Object.entries(data.identities).map(([id, identity]: [string, any]) => ({
                            id,
                            name: identity.identity.name,
                            username: identity.identity.username,
                            avatar: identity.identity.avatar || identity.user.avatar_url
                        }));
                        setIdentities(identityList);
                    }
                }
            } catch (error) {
                console.error('Failed to load identities:', error);
            } finally {
                setLoadingIdentities(false);
            }
        };

        loadIdentities();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setLastRefreshResult(null);

        try {
            const body = selectedIdentity === 'all' ? {} : { identityId: selectedIdentity };

            const response = await fetch('/api/github/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const result: RefreshResult = await response.json();
            setLastRefreshResult(result);

            if (result.success) {
                // Refresh the page after a short delay to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            setLastRefreshResult({
                success: false,
                error: 'Failed to refresh GitHub data',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const getSelectedIdentityName = () => {
        if (selectedIdentity === 'all') return 'All Identities';
        const identity = identities.find(id => id.id === selectedIdentity);
        return identity ? identity.name : 'Unknown Identity';
    };

    const getSelectedIdentityDetails = () => {
        if (selectedIdentity === 'all') return 'Refresh all configured GitHub identities';
        const identity = identities.find(id => id.id === selectedIdentity);
        return identity ? `Refresh data for @${identity.username}` : 'Selected identity not found';
    };

    return (
        <div className="space-y-4">
            {/* Identity Selection */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Identity to Refresh:</label>
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        disabled={isRefreshing || loadingIdentities}
                        className="w-full px-3 py-2 text-left bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            {selectedIdentity !== 'all' && (
                                <img
                                    src={identities.find(id => id.id === selectedIdentity)?.avatar}
                                    alt=""
                                    className="w-5 h-5 rounded-full"
                                />
                            )}
                            <span className="truncate">
                                {loadingIdentities ? 'Loading identities...' : getSelectedIdentityName()}
                            </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && !loadingIdentities && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        setSelectedIdentity('all');
                                        setDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground ${selectedIdentity === 'all' ? 'bg-accent text-accent-foreground' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                            <RefreshCw className="w-3 h-3 text-primary" />
                                        </div>
                                        <span>All Identities</span>
                                    </div>
                                </button>

                                {identities.map((identity) => (
                                    <button
                                        key={identity.id}
                                        onClick={() => {
                                            setSelectedIdentity(identity.id);
                                            setDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground ${selectedIdentity === identity.id ? 'bg-accent text-accent-foreground' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={identity.avatar}
                                                alt={identity.name}
                                                className="w-5 h-5 rounded-full"
                                            />
                                            <div>
                                                <div className="font-medium">{identity.name}</div>
                                                <div className="text-sm text-muted-foreground">@{identity.username}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    {getSelectedIdentityDetails()}
                </p>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || loadingIdentities}
                    className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${isRefreshing || loadingIdentities
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                        }`}
                >
                    {isRefreshing ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            Refresh {selectedIdentity === 'all' ? 'All' : 'Selected'} Identity
                        </>
                    )}
                </button>

                {lastRefreshResult && !isRefreshing && (
                    <div className="flex items-center gap-2">
                        {lastRefreshResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${lastRefreshResult.success ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {lastRefreshResult.success ? 'Success' : 'Failed'}
                        </span>
                    </div>
                )}
            </div>

            {/* Results */}
            {lastRefreshResult && (
                <div className={`p-4 rounded-lg border ${lastRefreshResult.success
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    }`}>
                    <div className="flex items-center justify-between">
                        <p className={`font-medium ${lastRefreshResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                            }`}>
                            {lastRefreshResult.message || lastRefreshResult.error}
                        </p>
                        {lastRefreshResult.stats && (
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                {showDetails ? 'Hide Details' : 'Show Details'}
                            </button>
                        )}
                    </div>

                    {lastRefreshResult.details && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {lastRefreshResult.details}
                        </p>
                    )}

                    {showDetails && lastRefreshResult.stats && (
                        <div className="mt-4 space-y-2">
                            <h4 className="font-medium text-green-800 dark:text-green-200">Refresh Statistics:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium">Identities:</span>
                                    <span>{lastRefreshResult.stats.identities}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Repositories:</span>
                                    <span>{lastRefreshResult.stats.repositories}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Releases:</span>
                                    <span>{lastRefreshResult.stats.releases}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Issues:</span>
                                    <span>{lastRefreshResult.stats.issues}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Pull Requests:</span>
                                    <span>{lastRefreshResult.stats.pullRequests}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium">Branches:</span>
                                    <span>{lastRefreshResult.stats.branches}</span>
                                </div>
                            </div>

                            {lastRefreshResult.refreshedIdentities && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        Refreshed Identities: {lastRefreshResult.refreshedIdentities.join(', ')}
                                    </p>
                                </div>
                            )}

                            {lastRefreshResult.stats.errors.length > 0 && (
                                <div className="mt-4">
                                    <h5 className="font-medium text-red-800 dark:text-red-200">Errors:</h5>
                                    <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">
                                        {lastRefreshResult.stats.errors.map((error, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="mr-2">•</span>
                                                <span>{error}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 