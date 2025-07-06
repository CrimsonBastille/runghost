'use client';

import { useState, useEffect } from 'react';
import { Badge } from './ui/Badge';

interface DatabaseTable {
    name: string;
    count: number;
    columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }>;
}

interface DatabaseStatusProps {
    onTableClick: (tableName: string) => void;
}

export function DatabaseStatus({ onTableClick }: DatabaseStatusProps) {
    const [tables, setTables] = useState<DatabaseTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTables = async () => {
        try {
            setRefreshing(true);
            const response = await fetch('/api/database/tables');
            const data = await response.json();

            if (data.success) {
                setTables(data.tables);
                setError(null);
            } else {
                setError(data.error || 'Failed to load tables');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    if (loading) {
        return (
            <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Database Tables</h2>
                    <div className="text-sm text-muted-foreground">Loading...</div>
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
                    <h2 className="text-xl font-semibold">Database Tables</h2>
                    <button
                        onClick={fetchTables}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </div>
                <div className="text-center py-8">
                    <p className="text-destructive mb-4">{error}</p>
                    <p className="text-muted-foreground text-sm">
                        Unable to load database tables. Please check your database connection.
                    </p>
                </div>
            </div>
        );
    }

    const totalRecords = tables.reduce((sum, table) => sum + table.count, 0);

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Database Tables</h2>
                    <p className="text-sm text-muted-foreground">
                        {tables.length} tables with {totalRecords.toLocaleString()} total records
                    </p>
                </div>
                <button
                    onClick={fetchTables}
                    disabled={refreshing}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {tables.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No tables found in the database.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tables.map((table) => (
                        <div
                            key={table.name}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => onTableClick(table.name)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{table.name}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                        {table.columns.length} columns
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {table.columns.filter(col => col.pk).length > 0 && (
                                        <span className="mr-2">🔑 {table.columns.filter(col => col.pk).length} PK</span>
                                    )}
                                    {table.columns.filter(col => col.notnull).length > 0 && (
                                        <span>⚠️ {table.columns.filter(col => col.notnull).length} NOT NULL</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-lg font-semibold">
                                        {table.count.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">records</div>
                                </div>
                                <div className="text-muted-foreground">
                                    →
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 