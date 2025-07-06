'use client';

import { formatDistance } from 'date-fns';
import { AuditLogEntry } from '@/lib/audit';
import { Badge } from '@/components/ui/Badge';
import {
    CheckCircle,
    XCircle,
    Clock,
    ExternalLink,
    User,
    AlertCircle
} from 'lucide-react';

interface AuditLogTableProps {
    logs: AuditLogEntry[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
    const getStatusIcon = (log: AuditLogEntry) => {
        if (log.error) {
            return <XCircle className="w-4 h-4 text-red-500" />;
        }
        if (log.responseStatus && log.responseStatus >= 400) {
            return <AlertCircle className="w-4 h-4 text-yellow-500" />;
        }
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    };

    const getStatusBadge = (log: AuditLogEntry) => {
        if (log.error) {
            return <Badge variant="destructive">Error</Badge>;
        }
        if (log.responseStatus && log.responseStatus >= 400) {
            return <Badge variant="secondary">{log.responseStatus}</Badge>;
        }
        return <Badge variant="default">{log.responseStatus || 'OK'}</Badge>;
    };

    const getResponseTimeColor = (responseTime: number) => {
        if (responseTime < 1000) return 'text-green-600';
        if (responseTime < 3000) return 'text-yellow-600';
        return 'text-red-600';
    };

    const truncateUrl = (url: string, maxLength: number = 60) => {
        if (url.length <= maxLength) return url;
        return `${url.substring(0, maxLength)}...`;
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (logs.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
                <p className="text-sm">External service requests will appear here</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Service</th>
                        <th className="text-left p-3 font-medium">Method</th>
                        <th className="text-left p-3 font-medium">URL</th>
                        <th className="text-left p-3 font-medium">Identity</th>
                        <th className="text-left p-3 font-medium">Response Time</th>
                        <th className="text-left p-3 font-medium">Size</th>
                        <th className="text-left p-3 font-medium">Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(log)}
                                    {getStatusBadge(log)}
                                </div>
                            </td>
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {log.service}
                                    </Badge>
                                    {log.cacheHit && (
                                        <Badge variant="secondary" className="text-xs">
                                            Cache
                                        </Badge>
                                    )}
                                </div>
                            </td>
                            <td className="p-3">
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                    {log.method}
                                </code>
                            </td>
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-sm font-mono"
                                        title={log.url}
                                    >
                                        {truncateUrl(log.url)}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                </div>
                            </td>
                            <td className="p-3">
                                {log.identityId && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{log.identityId}</span>
                                    </div>
                                )}
                            </td>
                            <td className="p-3">
                                <span className={`text-sm font-medium ${getResponseTimeColor(log.responseTime)}`}>
                                    {log.responseTime}ms
                                </span>
                            </td>
                            <td className="p-3">
                                <span className="text-sm text-muted-foreground">
                                    {log.responseSize ? formatBytes(log.responseSize) : '-'}
                                </span>
                            </td>
                            <td className="p-3">
                                <span className="text-sm text-muted-foreground">
                                    {formatDistance(new Date(log.timestamp), new Date(), { addSuffix: true })}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
} 