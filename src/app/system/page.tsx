import Link from 'next/link';

export default function SystemPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">System</h1>
                <p className="text-muted-foreground">
                    Monitor system performance, database status, and audit logs
                </p>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* System Audit Logs */}
                <Link href="/system/audit" className="group">
                    <div className="bg-card border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                                    System Audit Logs
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Monitor external service requests and system performance
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            View request logs, response times, error rates, and system performance metrics
                        </div>
                        <div className="mt-4 flex items-center text-sm text-primary">
                            <span>View Audit Logs</span>
                            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>

                {/* Database Status */}
                <Link href="/system/database" className="group">
                    <div className="bg-card border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                                    Database Status
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Explore database tables and execute queries
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            View database tables, records, schema information, and run SQL queries
                        </div>
                        <div className="mt-4 flex items-center text-sm text-primary">
                            <span>View Database</span>
                            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>

                {/* Data Refresh */}
                <Link href="/system/refresh" className="group">
                    <div className="bg-card border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                                    Data Refresh
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Manually refresh GitHub data and dependencies
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Force refresh of GitHub repositories, issues, releases, and dependency information
                        </div>
                        <div className="mt-4 flex items-center text-sm text-primary">
                            <span>Refresh Data</span>
                            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
} 