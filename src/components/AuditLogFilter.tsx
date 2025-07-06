'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuditLogFilter as AuditLogFilterType } from '@/lib/audit';
import { Badge } from '@/components/ui/Badge';
import {
    Filter,
    Calendar,
    User,
    RefreshCw
} from 'lucide-react';

interface AuditLogFilterProps {
    currentFilter: Partial<AuditLogFilterType>;
}

export function AuditLogFilter({ currentFilter }: AuditLogFilterProps) {
    const router = useRouter();
    const [filters, setFilters] = useState({
        service: currentFilter.service || '',
        method: currentFilter.method || '',
        status: currentFilter.status || '',
        startDate: currentFilter.startDate || '',
        endDate: currentFilter.endDate || '',
        identityId: currentFilter.identityId || '',
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });

        // Reset to first page when applying filters
        params.set('page', '1');

        router.push(`/system/audit?${params.toString()}`);
    };

    const clearFilters = () => {
        setFilters({
            service: '',
            method: '',
            status: '',
            startDate: '',
            endDate: '',
            identityId: '',
        });
        router.push('/system/audit');
    };

    const hasActiveFilters = Object.values(filters).some(value => value !== '');

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Service Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Service</label>
                    <select
                        value={filters.service}
                        onChange={(e) => handleFilterChange('service', e.target.value)}
                        className="w-full p-2 border border-border rounded-md bg-background"
                    >
                        <option value="">All Services</option>
                        <option value="github">GitHub</option>
                        <option value="npm">NPM</option>
                    </select>
                </div>

                {/* Method Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Method</label>
                    <select
                        value={filters.method}
                        onChange={(e) => handleFilterChange('method', e.target.value)}
                        className="w-full p-2 border border-border rounded-md bg-background"
                    >
                        <option value="">All Methods</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full p-2 border border-border rounded-md bg-background"
                    >
                        <option value="">All Status</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                    </select>
                </div>

                {/* Start Date Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="datetime-local"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full p-2 pl-10 border border-border rounded-md bg-background"
                        />
                    </div>
                </div>

                {/* End Date Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="datetime-local"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full p-2 pl-10 border border-border rounded-md bg-background"
                        />
                    </div>
                </div>

                {/* Identity Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Identity</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Identity ID"
                            value={filters.identityId}
                            onChange={(e) => handleFilterChange('identityId', e.target.value)}
                            className="w-full p-2 pl-10 border border-border rounded-md bg-background"
                        />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={applyFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <Filter className="w-4 h-4" />
                    Apply Filters
                </button>

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {Object.entries(filters).map(([key, value]) => {
                        if (!value) return null;
                        return (
                            <Badge key={key} variant="secondary" className="text-xs">
                                {key}: {value}
                            </Badge>
                        );
                    })}
                </div>
            )}
        </div>
    );
} 