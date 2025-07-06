'use client';

import { useState } from 'react';
import { Badge } from './ui/Badge';

interface QueryResult {
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    executionTime: number;
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

export function DatabaseQuery() {
    const [sql, setSql] = useState('');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeQuery = async () => {
        if (!sql.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/database/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sql }),
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.result);
            } else {
                setError(data.error || 'Query execution failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            executeQuery();
        }
    };

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Database Query</h2>
                    <p className="text-sm text-muted-foreground">
                        Execute SQL queries against the database (SELECT only)
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">SQL Query</label>
                    <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="SELECT * FROM issue_table LIMIT 10;"
                        className="w-full h-32 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Press <kbd>Ctrl+Enter</kbd> (or <kbd>⌘+Enter</kbd> on Mac) to execute
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={executeQuery}
                        disabled={loading || !sql.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Executing...' : 'Execute Query'}
                    </button>
                    <button
                        onClick={() => {
                            setSql('');
                            setResult(null);
                            setError(null);
                        }}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                    >
                        Clear
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-md">
                        <p className="font-medium">Query Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-6">
                                <div className="text-sm">
                                    <span className="font-medium">{result.rowCount}</span>
                                    <span className="text-muted-foreground"> rows returned</span>
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium">{result.executionTime}ms</span>
                                    <span className="text-muted-foreground"> execution time</span>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {result.columns.length} columns
                            </div>
                        </div>

                        {result.rows.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No rows returned
                            </div>
                        ) : (
                            <div className="border rounded-md overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                {result.columns.map((column) => (
                                                    <th
                                                        key={column}
                                                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                                                    >
                                                        {column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.rows.map((row, index) => (
                                                <tr
                                                    key={index}
                                                    className={index % 2 === 0 ? 'bg-background' : 'bg-muted/25'}
                                                >
                                                    {result.columns.map((column) => (
                                                        <td
                                                            key={column}
                                                            className="px-4 py-3 text-sm border-b"
                                                        >
                                                            <div className="max-w-xs">
                                                                {renderValue(row[column], column)}
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
                    </div>
                )}
            </div>
        </div>
    );
} 