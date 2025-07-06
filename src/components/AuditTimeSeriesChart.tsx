'use client';

import { useState } from 'react';
import { AuditLogStats } from '@/lib/audit';
import { Badge } from '@/components/ui/Badge';
import {
    BarChart3,
    TrendingUp,
    Calendar,
    Filter
} from 'lucide-react';

interface AuditTimeSeriesChartProps {
    stats: AuditLogStats;
}

export function AuditTimeSeriesChart({ stats }: AuditTimeSeriesChartProps) {
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'custom'>('24h');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Process data based on time range
    const getChartData = () => {
        let data: Array<{ label: string; value: number; date: string }> = [];

        if (timeRange === '24h') {
            // Show hourly data for last 24 hours
            const hourlyData = Object.entries(stats.requestsByHour)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-24);

            data = hourlyData.map(([hour, count]) => ({
                label: new Date(hour + ':00:00').toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true
                }),
                value: count,
                date: hour
            }));
        } else {
            // Show daily data
            let dailyData = Object.entries(stats.requestsByDay)
                .sort(([a], [b]) => a.localeCompare(b));

            if (timeRange === '7d') {
                dailyData = dailyData.slice(-7);
            } else if (timeRange === '30d') {
                dailyData = dailyData.slice(-30);
            }

            data = dailyData.map(([day, count]) => ({
                label: new Date(day).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                }),
                value: count,
                date: day
            }));
        }

        return data;
    };

    const chartData = getChartData();
    const maxValue = Math.max(...chartData.map(d => d.value));

    const getBarHeight = (value: number) => {
        if (maxValue === 0) return 0;
        return Math.max((value / maxValue) * 100, 2); // Minimum 2% height for visibility
    };

    const getBarColor = (value: number) => {
        const intensity = value / maxValue;
        if (intensity > 0.8) return 'bg-red-500';
        if (intensity > 0.6) return 'bg-orange-500';
        if (intensity > 0.4) return 'bg-yellow-500';
        if (intensity > 0.2) return 'bg-blue-500';
        return 'bg-gray-400';
    };

    const totalRequests = chartData.reduce((sum, d) => sum + d.value, 0);
    const averageRequests = chartData.length > 0 ? totalRequests / chartData.length : 0;

    return (
        <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Request Timeline</h3>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Range:</span>
                    <div className="flex gap-1">
                        {['24h', '7d', '30d', 'custom'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range as any)}
                                className={`px-3 py-1 text-xs rounded ${timeRange === range
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                {range === 'custom' ? 'Custom' : range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Date Range Inputs */}
            {timeRange === 'custom' && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 pl-10 border border-border rounded-md bg-background"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 pl-10 border border-border rounded-md bg-background"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Statistics */}
            <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-lg font-semibold text-primary">
                        {totalRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Requests</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-lg font-semibold text-blue-600">
                        {averageRequests.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Average per {timeRange === '24h' ? 'Hour' : 'Day'}</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">
                        {maxValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Peak Requests</div>
                </div>
            </div>

            {/* Chart */}
            <div className="space-y-4">
                {chartData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No data available for the selected time range</p>
                    </div>
                ) : (
                    <>
                        {/* Chart Area */}
                        <div className="relative h-48 bg-muted/10 rounded-lg p-4">
                            <div className="flex items-end justify-between h-full gap-1">
                                {chartData.map((item, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center">
                                        <div className="relative group">
                                            <div
                                                className={`w-full rounded-t transition-all duration-200 hover:opacity-80 ${getBarColor(item.value)}`}
                                                style={{ height: `${getBarHeight(item.value)}%` }}
                                                title={`${item.label}: ${item.value} requests`}
                                            />

                                            {/* Tooltip on hover */}
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                                    {item.label}: {item.value} requests
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* X-axis Labels */}
                        <div className="flex justify-between text-xs text-muted-foreground px-4">
                            {chartData.map((item, index) => {
                                // Show every nth label to avoid crowding
                                const showLabel = timeRange === '24h'
                                    ? index % 4 === 0 || index === chartData.length - 1
                                    : index % Math.ceil(chartData.length / 8) === 0 || index === chartData.length - 1;

                                return (
                                    <span key={index} className={showLabel ? '' : 'invisible'}>
                                        {item.label}
                                    </span>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                                <span>Low (0-20%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                <span>Medium (20-40%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                                <span>High (40-60%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                                <span>Very High (60-80%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded"></div>
                                <span>Peak (80-100%)</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 