'use client';

import { AuditLogStats as AuditLogStatsType } from '@/lib/audit';
import { Badge } from '@/components/ui/Badge';
import {
    BarChart3,
    Clock,
    Activity,
    AlertTriangle,
    TrendingUp
} from 'lucide-react';

interface AuditLogStatsProps {
    stats: AuditLogStatsType;
}

export function AuditLogStats({ stats }: AuditLogStatsProps) {
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getPercentage = (value: number, total: number) => {
        if (total === 0) return 0;
        return ((value / total) * 100).toFixed(1);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Breakdown */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Requests by Service</h3>
                </div>
                <div className="space-y-3">
                    {Object.entries(stats.requestsByService)
                        .sort(([, a], [, b]) => b - a)
                        .map(([service, count]) => (
                            <div key={service} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {service}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{count.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground">
                                        ({getPercentage(count, stats.totalRequests)}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Method Breakdown */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold">Requests by Method</h3>
                </div>
                <div className="space-y-3">
                    {Object.entries(stats.requestsByMethod)
                        .sort(([, a], [, b]) => b - a)
                        .map(([method, count]) => (
                            <div key={method} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <code className="text-sm bg-muted px-2 py-1 rounded">
                                        {method}
                                    </code>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{count.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground">
                                        ({getPercentage(count, stats.totalRequests)}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Top Endpoints */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold">Top Endpoints</h3>
                </div>
                <div className="space-y-3">
                    {stats.topEndpoints.slice(0, 5).map((endpoint, index) => (
                        <div key={endpoint.url} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        #{index + 1}
                                    </span>
                                    <span className="text-sm font-mono truncate max-w-xs">
                                        {endpoint.url}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {endpoint.count}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground ml-6">
                                Avg response time: {endpoint.averageResponseTime.toFixed(0)}ms
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">Performance Metrics</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cache Hit Rate</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                                {(stats.cacheHitRate * 100).toFixed(1)}%
                            </span>
                            <Badge variant={stats.cacheHitRate > 0.5 ? 'default' : 'secondary'}>
                                {stats.cacheHitRate > 0.5 ? 'Good' : 'Low'}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Data Transfer</span>
                        <span className="text-sm font-medium">
                            {formatBytes(stats.totalResponseSize)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rate Limit Warnings</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{stats.rateLimitHits}</span>
                            {stats.rateLimitHits > 0 && (
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 