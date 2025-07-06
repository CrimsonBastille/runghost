'use client'

import { useState, useMemo } from 'react'
import { formatDistance } from 'date-fns'
import { GitHubPullRequest } from '@/types/github'
import {
    Tag,
    Calendar,
    ExternalLink,
    Search,
    ChevronUp,
    ChevronDown,
    Settings,
    X,
    FileText,
    MessageSquare,
    CheckCircle,
    XCircle,
    GitMerge,
    GitPullRequest
} from 'lucide-react'

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    PaginationState,
} from '@tanstack/react-table'

type PullRequest = GitHubPullRequest & {
    repository_id: string;
    identity_id: string;
    repository_name: string;
    repository_full_name: string;
}

interface PullRequestsTableProps {
    pullRequests: PullRequest[]
}

export function PullRequestsTable({ pullRequests }: PullRequestsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'updated_at', desc: true }
    ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        identity_id: false,
        state: false,
        'user.login': false,
        updated_at: false,
    })
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    })
    const [showColumnSettings, setShowColumnSettings] = useState(false)

    const columns = useMemo<ColumnDef<PullRequest>[]>(() => [
        {
            accessorKey: 'repository_name',
            header: 'Repository',
            cell: (info) => {
                const pr = info.row.original
                return (
                    <div className="font-medium text-primary">
                        {pr.repository_name}
                    </div>
                )
            },
            minSize: 150,
        },
        {
            accessorKey: 'title',
            header: 'Pull Request',
            cell: (info) => {
                const pr = info.row.original
                return (
                    <div className="space-y-1">
                        <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 mt-1">
                                <GitPullRequest className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <a
                                        href={pr.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-primary hover:underline flex items-center gap-1"
                                    >
                                        {pr.title}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <span className="text-sm text-muted-foreground">
                                        #{pr.number}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">
                                            {pr.user.login}
                                        </span>
                                        <span>opened</span>
                                        <span>
                                            {formatDistance(new Date(pr.created_at), new Date(), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${pr.state === 'open'
                                                    ? 'bg-green-100 text-green-800'
                                                    : pr.state === 'merged'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {pr.state === 'open' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                                            {pr.state === 'merged' && <GitMerge className="w-3 h-3 mr-1 inline" />}
                                            {pr.state === 'closed' && <XCircle className="w-3 h-3 mr-1 inline" />}
                                            {pr.state}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>{pr.comments}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>{pr.commits} commits</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>+{pr.additions} -{pr.deletions}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            minSize: 600,
        },
        {
            accessorKey: 'identity_id',
            header: 'Identity',
            cell: (info) => info.getValue(),
            minSize: 100,
        },
        {
            accessorKey: 'state',
            header: 'State',
            cell: (info) => info.getValue(),
            minSize: 80,
        },
        {
            accessorKey: 'user.login',
            header: 'Author',
            cell: (info) => info.getValue(),
            minSize: 100,
        },
        {
            accessorKey: 'updated_at',
            header: 'Updated',
            cell: (info) => formatDistance(new Date(info.getValue() as string), new Date(), { addSuffix: true }),
            minSize: 100,
        },
    ], [])

    const table = useReactTable({
        data: pullRequests,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: (row, columnId, filterValue) => {
            const searchValue = filterValue.toLowerCase()
            const title = row.original.title.toLowerCase()
            const number = row.original.number.toString()
            const repoName = row.original.repository_name.toLowerCase()
            const repoFullName = row.original.repository_full_name.toLowerCase()
            const identity = row.original.identity_id.toLowerCase()
            const author = row.original.user.login.toLowerCase()
            const body = (row.original.body || '').toLowerCase()

            return title.includes(searchValue) ||
                number.includes(searchValue) ||
                repoName.includes(searchValue) ||
                repoFullName.includes(searchValue) ||
                identity.includes(searchValue) ||
                author.includes(searchValue) ||
                body.includes(searchValue)
        },
    })

    const resetFilters = () => {
        setColumnFilters([])
        setGlobalFilter('')
        table.resetColumnFilters()
    }

    const uniqueIdentities = useMemo(() => {
        const identities = pullRequests.map(pr => pr.identity_id)
        return [...new Set(identities)].sort()
    }, [pullRequests])

    const uniqueRepositories = useMemo(() => {
        const repositories = pullRequests.map(pr => pr.repository_name)
        return [...new Set(repositories)].sort()
    }, [pullRequests])

    const uniqueAuthors = useMemo(() => {
        const authors = pullRequests.map(pr => pr.user.login)
        return [...new Set(authors)].sort()
    }, [pullRequests])

    const uniqueStates = useMemo(() => {
        const states = pullRequests.map(pr => pr.state)
        return [...new Set(states)].sort()
    }, [pullRequests])

    if (pullRequests.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No pull requests found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder="Search pull requests..."
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-8 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full"
                        />
                    </div>
                    {(globalFilter || table.getState().columnFilters.length > 0) && (
                        <button
                            onClick={resetFilters}
                            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowColumnSettings(!showColumnSettings)}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md hover:bg-accent"
                    >
                        <Settings className="w-4 h-4" />
                        Columns
                    </button>
                </div>
            </div>

            {/* Column Settings */}
            {showColumnSettings && (
                <div className="border border-input rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Column Settings</h3>
                        <button
                            onClick={() => setShowColumnSettings(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {table.getAllColumns().map(column => (
                            <label key={column.id} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={column.getIsVisible()}
                                    onChange={(e) => column.toggleVisibility(e.target.checked)}
                                    className="rounded border-input"
                                />
                                <span className="text-sm">
                                    {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="text-sm font-medium">Quick Filters</div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm mb-1">Identity</label>
                                <select
                                    value={table.getColumn('identity_id')?.getFilterValue() as string ?? ''}
                                    onChange={(e) =>
                                        table.getColumn('identity_id')?.setFilterValue(e.target.value || undefined)
                                    }
                                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">All Identities</option>
                                    {uniqueIdentities.map(identity => (
                                        <option key={identity} value={identity}>{identity}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Repository</label>
                                <select
                                    value={table.getColumn('repository_name')?.getFilterValue() as string ?? ''}
                                    onChange={(e) =>
                                        table.getColumn('repository_name')?.setFilterValue(e.target.value || undefined)
                                    }
                                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">All Repositories</option>
                                    {uniqueRepositories.map(repository => (
                                        <option key={repository} value={repository}>{repository}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Author</label>
                                <select
                                    value={table.getColumn('user.login')?.getFilterValue() as string ?? ''}
                                    onChange={(e) =>
                                        table.getColumn('user.login')?.setFilterValue(e.target.value || undefined)
                                    }
                                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">All Authors</option>
                                    {uniqueAuthors.map(author => (
                                        <option key={author} value={author}>{author}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">State</label>
                                <select
                                    value={table.getColumn('state')?.getFilterValue() as string ?? ''}
                                    onChange={(e) =>
                                        table.getColumn('state')?.setFilterValue(e.target.value || undefined)
                                    }
                                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">All States</option>
                                    {uniqueStates.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="border border-input rounded-lg">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="border-b bg-muted/50">
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            style={{ minWidth: header.column.columnDef.minSize }}
                                            className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    {...{
                                                        className: header.column.getCanSort()
                                                            ? 'cursor-pointer select-none flex items-center gap-1 hover:text-foreground'
                                                            : '',
                                                        onClick: header.column.getToggleSortingHandler(),
                                                    }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {{
                                                        asc: <ChevronUp className="w-4 h-4" />,
                                                        desc: <ChevronDown className="w-4 h-4" />,
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className={`border-b hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/25'
                                        }`}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3 text-sm align-top"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                        {Math.min(
                            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                            table.getFilteredRowModel().rows.length
                        )}{' '}
                        of {table.getFilteredRowModel().rows.length} pull requests
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        First
                    </button>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                    <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Last
                    </button>
                </div>
            </div>
        </div>
    )
} 