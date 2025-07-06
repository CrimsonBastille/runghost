'use client';

import { useState, useEffect } from 'react';
import { Badge } from './ui/Badge';

interface TableColumn {
    name: string;
    type: string;
    notnull: boolean;
    pk: boolean;
}

interface TableRecord {
    [key: string]: any;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface TableData {
    table: string;
    columns: TableColumn[];
    records: TableRecord[];
    pagination: Pagination;
}

interface DatabaseTableViewerProps {
    tableName: string;
    onBack: () => void;
}

// Helper function to safely parse JSON strings
const safeJsonParse = (value: string): any => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

// Enhanced format function for better display of JSON fields
const formatValue = (value: any, columnName: string): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

    // Handle JSON string fields specially
    if (typeof value === 'string' && columnName.endsWith('_data')) {
        const parsed = safeJsonParse(value);
        if (parsed !== null) {
            // Format labels_data as readable label names
            if (columnName === 'labels_data' && Array.isArray(parsed)) {
                return parsed.map(label => label.name || label).join(', ') || 'No labels';
            }

            // Format user_data as readable user info
            if (columnName === 'user_data' && parsed.login) {
                return `${parsed.login} (${parsed.id})`;
            }

            // Format assignees_data as readable assignee names
            if (columnName === 'assignees_data' && Array.isArray(parsed)) {
                return parsed.map(assignee => assignee.login || assignee).join(', ') || 'No assignees';
            }

            // Format milestone_data as readable milestone info
            if (columnName === 'milestone_data' && parsed.title) {
                return `${parsed.title} (${parsed.state})`;
            }

            // For other JSON fields, show a summary
            if (Array.isArray(parsed)) {
                return `Array[${parsed.length}]`;
            } else if (typeof parsed === 'object') {
                const keys = Object.keys(parsed);
                return `Object{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
            }
        }
    }

    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

// Enhanced render function for better display of JSON fields
const renderValue = (value: any, columnName: string): React.ReactNode => {
    if (value === null || value === undefined) {
        return <span className="text-muted-foreground italic">NULL</span>;
    }

    if (typeof value === 'boolean') {
        return (
            <Badge variant={value ? "default" : "secondary"}>
                {value ? 'TRUE' : 'FALSE'}
            </Badge>
        );
    }

    // Handle JSON string fields specially
    if (typeof value === 'string' && columnName.endsWith('_data')) {
        const parsed = safeJsonParse(value);
        if (parsed !== null) {
            // Render labels_data as badges
            if (columnName === 'labels_data' && Array.isArray(parsed)) {
                if (parsed.length === 0) {
                    return <span className="text-muted-foreground italic">No labels</span>;
                }
                return (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                        {parsed.slice(0, 3).map((label, idx) => (
                            <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                                style={{
                                    backgroundColor: label.color ? `#${label.color}` : undefined,
                                    color: label.color ? '#fff' : undefined,
                                    borderColor: label.color ? `#${label.color}` : undefined
                                }}
                            >
                                {label.name || label}
                            </Badge>
                        ))}
                        {parsed.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{parsed.length - 3}</span>
                        )}
                    </div>
                );
            }

            // Render user_data with avatar if available
            if (columnName === 'user_data' && parsed.login) {
                return (
                    <div className="flex items-center gap-2">
                        {parsed.avatar_url && (
                            <img
                                src={parsed.avatar_url}
                                alt={parsed.login}
                                className="w-5 h-5 rounded-full"
                            />
                        )}
                        <span className="font-medium">{parsed.login}</span>
                        <span className="text-xs text-muted-foreground">({parsed.id})</span>
                    </div>
                );
            }

            // Render assignees_data
            if (columnName === 'assignees_data' && Array.isArray(parsed)) {
                if (parsed.length === 0) {
                    return <span className="text-muted-foreground italic">No assignees</span>;
                }
                return (
                    <div className="flex items-center gap-1 max-w-xs">
                        {parsed.slice(0, 3).map((assignee, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                                {assignee.avatar_url && (
                                    <img
                                        src={assignee.avatar_url}
                                        alt={assignee.login}
                                        className="w-4 h-4 rounded-full"
                                    />
                                )}
                                <span className="text-xs">{assignee.login || assignee}</span>
                            </div>
                        ))}
                        {parsed.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{parsed.length - 3}</span>
                        )}
                    </div>
                );
            }

            // Render milestone_data
            if (columnName === 'milestone_data' && parsed.title) {
                return (
                    <div className="flex items-center gap-2">
                        <Badge variant={parsed.state === 'open' ? "default" : "secondary"}>
                            {parsed.title}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({parsed.state})</span>
                    </div>
                );
            }
        }
    }

    // For long text fields, show truncated version
    const stringValue = String(value);
    if (stringValue.length > 100) {
        return (
            <span title={stringValue} className="cursor-help">
                {stringValue.substring(0, 100)}...
            </span>
        );
    }

    return stringValue;
};

export function DatabaseTableViewer({ tableName, onBack }: DatabaseTableViewerProps) {
    const [data, setData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const fetchTableData = async (page: number = 1, limit: number = 50) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/database/records?table=${tableName}&page=${page}&limit=${limit}`);
            const result = await response.json();

            if (result.success) {
                setData(result);
                setError(null);
            } else {
                setError(result.error || 'Failed to load table data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTableData(currentPage, pageSize);
    }, [tableName, currentPage, pageSize]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1);
    };

    const truncateValue = (value: any, maxLength: number = 50): string => {
        const formatted = formatValue(value, '');
        return formatted.length > maxLength ? formatted.substring(0, maxLength) + '...' : formatted;
    };

    if (loading) {
        return (
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold">Table: {tableName}</h2>
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                    <button
                        onClick={onBack}
                        className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                    >
                        ← Back to Tables
                    </button>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-12 bg-muted rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Table: {tableName}</h2>
                    <button
                        onClick={onBack}
                        className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                    >
                        ← Back to Tables
                    </button>
                </div>
                <div className="text-center py-8">
                    <p className="text-destructive mb-4">{error}</p>
                    <button
                        onClick={() => fetchTableData(currentPage, pageSize)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Table: {data.table}</h2>
                    <p className="text-sm text-muted-foreground">
                        {data.pagination.total.toLocaleString()} total records, {data.columns.length} columns
                    </p>
                </div>
                <button
                    onClick={onBack}
                    className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                    ← Back to Tables
                </button>
            </div>

            {/* Column Information */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Columns</h3>
                <div className="flex flex-wrap gap-2">
                    {data.columns.map((column) => (
                        <div key={column.name} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <span className="font-medium">{column.name}</span>
                            <Badge variant="outline" className="text-xs">
                                {column.type}
                            </Badge>
                            {column.pk && <Badge variant="secondary" className="text-xs">PK</Badge>}
                            {column.notnull && <Badge variant="destructive" className="text-xs">NOT NULL</Badge>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Table Controls */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Page size:</label>
                        <select
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                            className="px-2 py-1 border rounded text-sm"
                        >
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                        </select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                        {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                        {data.pagination.total.toLocaleString()} records
                    </div>
                </div>
                <button
                    onClick={() => fetchTableData(currentPage, pageSize)}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Refresh
                </button>
            </div>

            {/* Records Table */}
            {data.records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No records found in this table
                </div>
            ) : (
                <div className="border rounded-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    {data.columns.map((column) => (
                                        <th
                                            key={column.name}
                                            className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                                        >
                                            <div className="flex items-center gap-2">
                                                {column.name}
                                                {column.pk && <span className="text-xs">🔑</span>}
                                                {column.notnull && <span className="text-xs">⚠️</span>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.records.map((record, index) => (
                                    <tr
                                        key={index}
                                        className={index % 2 === 0 ? 'bg-background' : 'bg-muted/25'}
                                    >
                                        {data.columns.map((column) => (
                                            <td
                                                key={column.name}
                                                className="px-4 py-3 text-sm border-b"
                                            >
                                                <div className="max-w-xs">
                                                    {renderValue(record[column.name], column.name)}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Page {data.pagination.page} of {data.pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(1)}
                            disabled={data.pagination.page === 1}
                            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                            First
                        </button>
                        <button
                            onClick={() => handlePageChange(data.pagination.page - 1)}
                            disabled={data.pagination.page === 1}
                            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(data.pagination.page + 1)}
                            disabled={data.pagination.page === data.pagination.totalPages}
                            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => handlePageChange(data.pagination.totalPages)}
                            disabled={data.pagination.page === data.pagination.totalPages}
                            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
} 