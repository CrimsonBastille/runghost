import 'server-only';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    service: string;
    method: string;
    url: string;
    requestHeaders?: Record<string, string>;
    requestBody?: any;
    responseStatus?: number;
    responseTime: number;
    responseSize?: number;
    error?: string;
    identityId?: string;
    rateLimitRemaining?: number;
    rateLimitReset?: string;
    userAgent?: string;
    ipAddress?: string;
    cacheHit?: boolean;
    metadata?: Record<string, any>;
}

export interface AuditLogFilter {
    service?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
    identityId?: string;
    status?: 'success' | 'error';
    limit?: number;
    offset?: number;
}

export interface AuditLogStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    totalResponseSize: number;
    requestsByService: Record<string, number>;
    requestsByMethod: Record<string, number>;
    requestsByHour: Record<string, number>;
    requestsByDay: Record<string, number>;
    rateLimitHits: number;
    cacheHitRate: number;
    topEndpoints: Array<{
        url: string;
        count: number;
        averageResponseTime: number;
    }>;
}

export class AuditLogger {
    private auditLogsDir: string;
    private currentLogFile: string;
    private logBuffer: AuditLogEntry[] = [];
    private bufferSize: number = 100;
    private flushInterval: number = 5000; // 5 seconds
    private initialized: boolean = false;

    constructor(dataDirectory: string = '~/.runghost') {
        const expandedDir = dataDirectory.replace('~', process.env.HOME || '~');
        this.auditLogsDir = path.join(expandedDir, 'audit_logs');
        this.currentLogFile = this.getLogFileName();
        this.startFlushTimer();
    }

    private async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await mkdir(this.auditLogsDir, { recursive: true });
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize audit logs directory:', error);
        }
    }

    private getLogFileName(date: Date = new Date()): string {
        const dateStr = date.toISOString().split('T')[0];
        return path.join(this.auditLogsDir, `audit_${dateStr}.json`);
    }

    private startFlushTimer(): void {
        setInterval(() => {
            this.flushBuffer();
        }, this.flushInterval);
    }

    private async flushBuffer(): Promise<void> {
        if (this.logBuffer.length === 0) return;

        await this.initialize();

        const entries = [...this.logBuffer];
        this.logBuffer = [];

        try {
            // Group entries by date
            const entriesByDate = entries.reduce((acc, entry) => {
                const date = entry.timestamp.split('T')[0];
                if (!acc[date]) acc[date] = [];
                acc[date].push(entry);
                return acc;
            }, {} as Record<string, AuditLogEntry[]>);

            // Write to appropriate log files
            for (const [date, dayEntries] of Object.entries(entriesByDate)) {
                const logFile = this.getLogFileName(new Date(date));
                await this.appendToLogFile(logFile, dayEntries);
            }
        } catch (error) {
            console.error('Failed to flush audit log buffer:', error);
            // Put entries back in buffer
            this.logBuffer.unshift(...entries);
        }
    }

    private async appendToLogFile(logFile: string, entries: AuditLogEntry[]): Promise<void> {
        let existingEntries: AuditLogEntry[] = [];

        try {
            const content = await readFile(logFile, 'utf8');
            existingEntries = JSON.parse(content);
        } catch (error) {
            // File doesn't exist or is empty, start fresh
            existingEntries = [];
        }

        existingEntries.push(...entries);

        await writeFile(logFile, JSON.stringify(existingEntries, null, 2));
    }

    public async logRequest(
        service: string,
        method: string,
        url: string,
        startTime: number,
        options: {
            requestHeaders?: Record<string, string>;
            requestBody?: any;
            responseStatus?: number;
            responseSize?: number;
            error?: string;
            identityId?: string;
            rateLimitRemaining?: number;
            rateLimitReset?: string;
            userAgent?: string;
            ipAddress?: string;
            cacheHit?: boolean;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<void> {
        const entry: AuditLogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            service,
            method,
            url,
            responseTime: Date.now() - startTime,
            ...options
        };

        this.logBuffer.push(entry);

        // Flush immediately if buffer is full
        if (this.logBuffer.length >= this.bufferSize) {
            await this.flushBuffer();
        }
    }

    public async getLogs(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
        await this.initialize();

        const logs: AuditLogEntry[] = [];
        const files = await this.getLogFiles(filter.startDate, filter.endDate);

        for (const file of files) {
            try {
                const content = await readFile(file, 'utf8');
                const entries: AuditLogEntry[] = JSON.parse(content);
                logs.push(...entries);
            } catch (error) {
                console.error(`Failed to read log file ${file}:`, error);
            }
        }

        // Apply filters
        let filteredLogs = logs;

        if (filter.service) {
            filteredLogs = filteredLogs.filter(log => log.service === filter.service);
        }

        if (filter.method) {
            filteredLogs = filteredLogs.filter(log => log.method === filter.method);
        }

        if (filter.identityId) {
            filteredLogs = filteredLogs.filter(log => log.identityId === filter.identityId);
        }

        if (filter.status) {
            if (filter.status === 'success') {
                filteredLogs = filteredLogs.filter(log => !log.error && log.responseStatus && log.responseStatus < 400);
            } else if (filter.status === 'error') {
                filteredLogs = filteredLogs.filter(log => log.error || (log.responseStatus && log.responseStatus >= 400));
            }
        }

        if (filter.startDate) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
        }

        if (filter.endDate) {
            filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
        }

        // Sort by timestamp (newest first)
        filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Apply pagination
        const offset = filter.offset || 0;
        const limit = filter.limit || 100;

        return filteredLogs.slice(offset, offset + limit);
    }

    public async getStats(filter: AuditLogFilter = {}): Promise<AuditLogStats> {
        const logs = await this.getLogs({ ...filter, limit: 10000 }); // Get more logs for stats

        const stats: AuditLogStats = {
            totalRequests: logs.length,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalResponseSize: 0,
            requestsByService: {},
            requestsByMethod: {},
            requestsByHour: {},
            requestsByDay: {},
            rateLimitHits: 0,
            cacheHitRate: 0,
            topEndpoints: []
        };

        if (logs.length === 0) return stats;

        let totalResponseTime = 0;
        let cacheHits = 0;
        const endpointStats = new Map<string, { count: number; totalResponseTime: number }>();

        for (const log of logs) {
            // Success/failure counts
            if (log.error || (log.responseStatus && log.responseStatus >= 400)) {
                stats.failedRequests++;
            } else {
                stats.successfulRequests++;
            }

            // Response time
            totalResponseTime += log.responseTime;

            // Response size
            if (log.responseSize) {
                stats.totalResponseSize += log.responseSize;
            }

            // Service breakdown
            stats.requestsByService[log.service] = (stats.requestsByService[log.service] || 0) + 1;

            // Method breakdown
            stats.requestsByMethod[log.method] = (stats.requestsByMethod[log.method] || 0) + 1;

            // Time-based breakdown
            const date = new Date(log.timestamp);
            const hour = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
            const day = date.toISOString().substring(0, 10); // YYYY-MM-DD

            stats.requestsByHour[hour] = (stats.requestsByHour[hour] || 0) + 1;
            stats.requestsByDay[day] = (stats.requestsByDay[day] || 0) + 1;

            // Rate limit hits
            if (log.rateLimitRemaining !== undefined && log.rateLimitRemaining <= 10) {
                stats.rateLimitHits++;
            }

            // Cache hits
            if (log.cacheHit) {
                cacheHits++;
            }

            // Endpoint stats
            const endpoint = this.normalizeEndpoint(log.url);
            const endpointStat = endpointStats.get(endpoint) || { count: 0, totalResponseTime: 0 };
            endpointStat.count++;
            endpointStat.totalResponseTime += log.responseTime;
            endpointStats.set(endpoint, endpointStat);
        }

        // Calculate averages
        stats.averageResponseTime = totalResponseTime / logs.length;
        stats.cacheHitRate = cacheHits / logs.length;

        // Top endpoints
        stats.topEndpoints = Array.from(endpointStats.entries())
            .map(([url, stat]) => ({
                url,
                count: stat.count,
                averageResponseTime: stat.totalResponseTime / stat.count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return stats;
    }

    private normalizeEndpoint(url: string): string {
        // Remove query parameters and replace dynamic segments
        return url
            .split('?')[0]
            .replace(/\/\d+/g, '/:id')
            .replace(/\/[a-f0-9]{40}/g, '/:hash')
            .replace(/\/[a-f0-9]{7,}/g, '/:hash');
    }

    private async getLogFiles(startDate?: string, endDate?: string): Promise<string[]> {
        try {
            const files = await readdir(this.auditLogsDir);
            let logFiles = files
                .filter(file => file.startsWith('audit_') && file.endsWith('.json'))
                .map(file => path.join(this.auditLogsDir, file));

            if (startDate || endDate) {
                logFiles = logFiles.filter(file => {
                    const fileName = path.basename(file);
                    const dateMatch = fileName.match(/audit_(\d{4}-\d{2}-\d{2})\.json/);
                    if (!dateMatch) return false;

                    const fileDate = dateMatch[1];

                    if (startDate && fileDate < startDate.substring(0, 10)) return false;
                    if (endDate && fileDate > endDate.substring(0, 10)) return false;

                    return true;
                });
            }

            return logFiles.sort();
        } catch (error) {
            console.error('Failed to get log files:', error);
            return [];
        }
    }

    public async cleanup(): Promise<void> {
        await this.flushBuffer();
    }
}

// Global audit logger instance
export const auditLogger = new AuditLogger();

// Request interceptor for external HTTP calls
export async function auditedFetch(
    url: string,
    options: RequestInit & {
        service: string;
        identityId?: string;
        metadata?: Record<string, any>;
    }
): Promise<Response> {
    const startTime = Date.now();
    const service = options.service;
    const method = options.method || 'GET';
    const identityId = options.identityId;
    const metadata = options.metadata;

    // Remove our custom options before making the request
    const { service: _, identityId: __, metadata: ___, ...fetchOptions } = options;

    try {
        const response = await fetch(url, fetchOptions);

        // Log the request
        await auditLogger.logRequest(service, method, url, startTime, {
            requestHeaders: fetchOptions.headers as Record<string, string>,
            requestBody: fetchOptions.body,
            responseStatus: response.status,
            responseSize: parseInt(response.headers.get('content-length') || '0'),
            identityId,
            rateLimitRemaining: response.headers.get('x-ratelimit-remaining') ?
                parseInt(response.headers.get('x-ratelimit-remaining')!) : undefined,
            rateLimitReset: response.headers.get('x-ratelimit-reset') || undefined,
            userAgent: fetchOptions.headers && typeof fetchOptions.headers === 'object' ?
                (fetchOptions.headers as Record<string, string>)['User-Agent'] : undefined,
            metadata
        });

        return response;
    } catch (error) {
        // Log the error
        await auditLogger.logRequest(service, method, url, startTime, {
            requestHeaders: fetchOptions.headers as Record<string, string>,
            requestBody: fetchOptions.body,
            error: error instanceof Error ? error.message : String(error),
            identityId,
            userAgent: fetchOptions.headers && typeof fetchOptions.headers === 'object' ?
                (fetchOptions.headers as Record<string, string>)['User-Agent'] : undefined,
            metadata
        });

        throw error;
    }
} 