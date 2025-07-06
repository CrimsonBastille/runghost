'use client'

import { useState, useMemo } from 'react'
import { formatDistance } from 'date-fns'
import Link from 'next/link'
import { GitHubIssue } from '@/types/github'
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
    XCircle
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

type Issue = GitHubIssue & {
    repository_id: string;
    identity_id: string;
    repository_name: string;
    repository_full_name: string;
}

interface IssuesTableProps {
    issues: Issue[]
}

export function IssuesTable({ issues }: IssuesTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'updated_at', desc: true }
    ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        identity_id: false,
        repository_name: false,
        state: false,
        updated_at: false,
    })
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    })
    const [showColumnSettings, setShowColumnSettings] = useState(false)

    const columns = useMemo<ColumnDef<Issue>[]>(() => [
        {
            accessorKey: 'repository_id',
            header: 'Repository',
            cell: (info) => {
                const issue = info.row.original
                return (
                    <div className="min-w-0">
                        <Link
                            href={`/repositories/${issue.identity_id}/${issue.repository_name}`}
                            className="font-medium text-foreground truncate hover:text-primary transition-colors block"
                        >
                            {issue.repository_name}
                        </Link>
                        <Link
                            href={`/identity/${issue.identity_id}`}
                            className="text-sm text-muted-foreground truncate hover:text-primary transition-colors block"
                        >
                            {issue.identity_id}
                        </Link>
                    </div>
                )
            },
            minSize: 150,
        },
        {
            accessorKey: 'title',
            header: 'Issue',
            cell: (info) => {
                const issue = info.row.original
                return (
                    <div className="min-w-0">
                        {/* Title row - spans full width */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="font-medium text-foreground text-lg flex-1">
                                {issue.title}
                            </div>
                            <div className="flex items-center gap-1">
                                {issue.state === 'open' ? (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Open
                                    </span>
                                ) : (
                                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        Closed
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Details row - two columns */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {/* Left column */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Tag className="w-3 h-3" />
                                    <span className="font-mono">#{issue.number}</span>
                                    <span className="mx-1">•</span>
                                    <span>{issue.repository_name}</span>
                                    <span className="mx-1">•</span>
                                    <span>{issue.identity_id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img
                                        src={issue.user.avatar_url}
                                        alt={issue.user.login}
                                        className="w-4 h-4 rounded-full"
                                    />
                                    <span className="text-muted-foreground">{issue.user.login}</span>
                                    <span className="mx-1">•</span>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDistance(new Date(issue.created_at), new Date(), { addSuffix: true })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right column */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>{issue.comments}</span>
                                    </div>
                                    {issue.assignees.length > 0 && (
                                        <>
                                            <span className="mx-1">•</span>
                                            <div className="flex items-center gap-1">
                                                {issue.assignees.slice(0, 2).map((assignee) => (
                                                    <img
                                                        key={assignee.login}
                                                        src={assignee.avatar_url}
                                                        alt={assignee.login}
                                                        className="w-4 h-4 rounded-full"
                                                        title={assignee.login}
                                                    />
                                                ))}
                                                {issue.assignees.length > 2 && (
                                                    <span className="text-xs text-muted-foreground">+{issue.assignees.length - 2}</span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {issue.labels.slice(0, 3).map((label) => (
                                        <span
                                            key={label.id}
                                            className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                            style={{ backgroundColor: `#${label.color}` }}
                                        >
                                            {label.name}
                                        </span>
                                    ))}
                                    {issue.labels.length > 3 && (
                                        <span className="text-xs text-muted-foreground">+{issue.labels.length - 3}</span>
                                    )}
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
            accessorKey: 'repository_name',
            header: 'Repository Name',
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
            accessorKey: 'updated_at',
            header: 'Updated',
            cell: (info) => formatDistance(new Date(info.getValue() as string), new Date(), { addSuffix: true }),
            minSize: 100,
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: (info) => (
                <div className="flex items-center gap-2">
                    <a
                        href={info.row.original.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="View on GitHub"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                    {info.row.original.body && (
                        <button
                            onClick={() => {
                                // Could implement issue details modal here
                                window.open(info.row.original.html_url, '_blank')
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="View issue details"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
            minSize: 80,
        },
    ], [])

    const table = useReactTable({
        data: issues,
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
            const body = (row.original.body || '').toLowerCase()
            const labels = row.original.labels.map(label => label.name.toLowerCase()).join(' ')
            const assignees = row.original.assignees.map(assignee => assignee.login.toLowerCase()).join(' ')
            const milestone = row.original.milestone?.title.toLowerCase() || ''

            return title.includes(searchValue) ||
                number.includes(searchValue) ||
                repoName.includes(searchValue) ||
                repoFullName.includes(searchValue) ||
                identity.includes(searchValue) ||
                body.includes(searchValue) ||
                labels.includes(searchValue) ||
                assignees.includes(searchValue) ||
                milestone.includes(searchValue)
        },
    })

    const resetFilters = () => {
        setColumnFilters([])
        setGlobalFilter('')
        table.resetColumnFilters()
    }

    const uniqueIdentities = useMemo(() => {
        const identities = issues.map(issue => issue.identity_id)
        return [...new Set(identities)].sort()
    }, [issues])

    const uniqueRepositories = useMemo(() => {
        const repositories = issues.map(issue => issue.repository_name)
        return [...new Set(repositories)].sort()
    }, [issues])



    const uniqueStates = useMemo(() => {
        const states = issues.map(issue => issue.state)
        return [...new Set(states)].sort()
    }, [issues])

    const uniqueLabels = useMemo(() => {
        const labels = issues.flatMap(issue => issue.labels.map(label => label.name))
        return [...new Set(labels)].sort()
    }, [issues])

    if (issues.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No issues found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search issues..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={() => setShowColumnSettings(!showColumnSettings)}
                        className="flex items-center gap-2 px-3 py-2 border border-input rounded-md hover:bg-muted transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Columns
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        {table.getFilteredRowModel().rows.length} of {issues.length} issues
                    </div>
                    <button
                        onClick={resetFilters}
                        className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Column Settings Panel */}
            {showColumnSettings && (
                <div className="bg-muted/30 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Column Settings</h3>
                        <button
                            onClick={() => setShowColumnSettings(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {table.getAllColumns().map((column) => {
                            if (!column.getCanHide()) return null
                            return (
                                <label key={column.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={column.getIsVisible()}
                                        onChange={(e) => column.toggleVisibility(e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm">
                                        {typeof column.columnDef.header === 'string'
                                            ? column.columnDef.header
                                            : column.id}
                                    </span>
                                </label>
                            )
                        })}
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
                                    {uniqueRepositories.map(repo => (
                                        <option key={repo} value={repo}>{repo}</option>
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
                                        <option key={state} value={state}>{state.charAt(0).toUpperCase() + state.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm mb-1">Label</label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setGlobalFilter(e.target.value)
                                        }
                                    }}
                                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">Filter by label</option>
                                    {uniqueLabels.slice(0, 20).map(label => (
                                        <option key={label} value={label}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            className="px-4 py-3 text-left"
                                            style={{ width: header.getSize() }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    className={`flex items-center gap-1 font-medium ${header.column.getCanSort()
                                                        ? 'cursor-pointer hover:text-primary transition-colors'
                                                        : ''
                                                        }`}
                                                    onClick={header.column.getToggleSortingHandler()}
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
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="border-t hover:bg-muted/50 transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3"
                                            style={{ width: cell.column.getSize() }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {table.getRowModel().rows.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No issues found matching your criteria.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1 text-sm border border-input rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {'<<'}
                    </button>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1 text-sm border border-input rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {'<'}
                    </button>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1 text-sm border border-input rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {'>'}
                    </button>
                    <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1 text-sm border border-input rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {'>>'}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of{' '}
                        {table.getPageCount()}
                    </span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => {
                            table.setPageSize(Number(e.target.value))
                        }}
                        className="px-2 py-1 border border-input rounded-md text-sm"
                    >
                        {[10, 20, 30, 40, 50].map(pageSize => (
                            <option key={pageSize} value={pageSize}>
                                Show {pageSize}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
} 