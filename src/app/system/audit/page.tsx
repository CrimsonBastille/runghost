import { auditLogger } from '@/lib/audit';
import { AuditLogTable } from '@/components/AuditLogTable';
import { AuditLogStats } from '@/components/AuditLogStats';
import { AuditLogFilter } from '@/components/AuditLogFilter';
import { AuditTimeSeriesChart } from '@/components/AuditTimeSeriesChart';
import { formatDistance } from 'date-fns';
import Link from 'next/link';

interface AuditPageProps {
    searchParams?: Promise<{
        service?: string;
        method?: string;
        status?: 'success' | 'error';
        startDate?: string;
        endDate?: string;
        identityId?: string;
        page?: string;
        limit?: string;
    }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
    const params = await searchParams;

    // Parse search parameters
    const page = parseInt(params?.page || '1', 10);
    const limit = parseInt(params?.limit || '50', 10);
    const offset = (page - 1) * limit;

    const filter = {
        service: params?.service,
        method: params?.method,
        status: params?.status,
        startDate: params?.startDate,
        endDate: params?.endDate,
        identityId: params?.identityId,
        limit,
        offset
    };

    try {
        // Get audit logs and stats
        const [logs, stats] = await Promise.all([
            auditLogger.getLogs(filter),
            auditLogger.getStats(filter)
        ]);

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/system" className="text-muted-foreground hover:text-foreground">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">System Audit Logs</h1>
                            <p className="text-muted-foreground">
                                Monitor all external service requests and system performance
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                            Last updated: {formatDistance(new Date(), new Date(), { addSuffix: true })}
                        </p>
                    </div>
                </div>

                {/* Statistics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-primary">
                            {stats.totalRequests.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Requests</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">
                            {stats.successfulRequests.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Successful ({((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%)
                        </div>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-600">
                            {stats.failedRequests.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Failed ({((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)
                        </div>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.averageResponseTime.toFixed(0)}ms
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Response Time</div>
                    </div>
                </div>

                {/* Time Series Chart */}
                <AuditTimeSeriesChart stats={stats} />

                {/* Detailed Statistics */}
                <AuditLogStats stats={stats} />

                {/* Filters */}
                <div className="bg-card border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Filters</h2>
                    <AuditLogFilter currentFilter={filter} />
                </div>

                {/* Audit Log Table */}
                <div className="bg-card border rounded-lg">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-semibold">
                            Request Log ({logs.length} entries)
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            All external service requests with timestamps, status codes, and response times
                        </p>
                    </div>
                    <AuditLogTable logs={logs} />
                </div>

                {/* Pagination */}
                {logs.length === limit && (
                    <div className="flex justify-center mt-6">
                        <div className="flex gap-2">
                            {page > 1 && (
                                <a
                                    href={`/system/audit?${new URLSearchParams({
                                        ...params,
                                        page: (page - 1).toString()
                                    }).toString()}`}
                                    className="px-3 py-2 text-sm bg-card border rounded hover:bg-accent"
                                >
                                    Previous
                                </a>
                            )}
                            <span className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded">
                                Page {page}
                            </span>
                            <a
                                href={`/system/audit?${new URLSearchParams({
                                    ...params,
                                    page: (page + 1).toString()
                                }).toString()}`}
                                className="px-3 py-2 text-sm bg-card border rounded hover:bg-accent"
                            >
                                Next
                            </a>
                        </div>
                    </div>
                )}
            </div>
        );
    } catch (error) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/system" className="text-muted-foreground hover:text-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">System Audit Logs</h1>
                        <p className="text-muted-foreground">
                            Monitor all external service requests and system performance
                        </p>
                    </div>
                </div>

                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading System Data</h2>
                    <p className="text-muted-foreground mb-6">
                        {error instanceof Error ? error.message : 'Failed to load system audit logs'}
                    </p>
                </div>
            </div>
        );
    }
} 