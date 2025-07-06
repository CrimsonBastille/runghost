'use client';

import { useState } from 'react';
import { DatabaseStatus } from './DatabaseStatus';
import { DatabaseQuery } from './DatabaseQuery';
import { DatabaseTableViewer } from './DatabaseTableViewer';

type ViewMode = 'overview' | 'table' | 'query';

export function DatabaseStatusSection() {
    const [currentView, setCurrentView] = useState<ViewMode>('overview');
    const [selectedTable, setSelectedTable] = useState<string>('');

    const handleTableClick = (tableName: string) => {
        setSelectedTable(tableName);
        setCurrentView('table');
    };

    const handleBackToOverview = () => {
        setCurrentView('overview');
        setSelectedTable('');
    };

    const handleShowQuery = () => {
        setCurrentView('query');
    };

    return (
        <div className="space-y-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Database Status</h2>
                    <p className="text-muted-foreground">
                        Explore database tables and execute queries
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleBackToOverview}
                        className={`px-3 py-1 text-sm rounded ${currentView === 'overview'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                    >
                        Tables Overview
                    </button>
                    <button
                        onClick={handleShowQuery}
                        className={`px-3 py-1 text-sm rounded ${currentView === 'query'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                    >
                        SQL Query
                    </button>
                </div>
            </div>

            {/* Content */}
            {currentView === 'overview' && (
                <DatabaseStatus onTableClick={handleTableClick} />
            )}

            {currentView === 'table' && selectedTable && (
                <DatabaseTableViewer
                    tableName={selectedTable}
                    onBack={handleBackToOverview}
                />
            )}

            {currentView === 'query' && (
                <DatabaseQuery />
            )}
        </div>
    );
} 