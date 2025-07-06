'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatDistance } from 'date-fns'
import Link from 'next/link'
import { GitHubRelease } from '@/types/github'
import {
    Tag,
    Calendar,
    ExternalLink,
    Download,
    AlertCircle,
    Search,
    ChevronUp,
    ChevronDown,
    Settings,
    X,
    FileText,
    Package,
    GitBranch
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

type Release = GitHubRelease & {
    repository_id: string;
    identity_id: string;
    repository_name: string;
    repository_full_name: string;
}

interface ReleasesTableProps {
    releases: Release[]
}

export function ReleasesTable({ releases }: ReleasesTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'published_at', desc: true }
    ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        identity_filter: false,
        repository_filter: false,
    })
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    })
    const [showColumnSettings, setShowColumnSettings] = useState(false)

    const columns = useMemo<ColumnDef<Release>[]>(() => [
        {
            accessorKey: 'repository_full_name',
            header: 'Repository',
            cell: (info) => {
                const release = info.row.original
                return (
                    <div className="min-w-0">
                        <Link
                            href={`/repositories/${release.identity_id}/${release.repository_name}`}
                            className="font-medium text-foreground truncate hover:text-primary transition-colors block"
                        >
                            {release.repository_name}
                        </Link>
                        <Link
                            href={`/identity/${release.identity_id}`}
                            className="text-sm text-muted-foreground truncate hover:text-primary transition-colors block"
                        >
                            {release.identity_id}
                        </Link>
                    </div>
                )
            },
            minSize: 150,
        },
        {
            accessorKey: 'name',
            header: 'Release',
            cell: (info) => {
                const release = info.row.original
                const displayName = release.name || release.tag_name
                return (
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="font-medium text-foreground truncate">
                                {displayName}
                            </div>
                            <div className="flex items-center gap-1">
                                {release.draft && (
                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs">
                                        Draft
                                    </span>
                                )}
                                {release.prerelease && (
                                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs">
                                        Pre-release
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Tag className="w-3 h-3" />
                            <span className="font-mono">{release.tag_name}</span>
                        </div>
                    </div>
                )
            },
            minSize: 200,
        },
        {
            accessorKey: 'assets',
            header: 'Assets',
            cell: (info) => {
                const assets = info.getValue() as GitHubRelease['assets']
                const totalDownloads = assets.reduce((sum, asset) => sum + asset.download_count, 0)
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm">
                            <Package className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{assets.length}</span>
                        </div>
                        {totalDownloads > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Download className="w-4 h-4" />
                                <span>{totalDownloads.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )
            },
            minSize: 100,
        },
        {
            accessorKey: 'published_at',
            header: 'Published',
            cell: (info) => {
                const publishedAt = info.getValue() as string | null
                if (!publishedAt) {
                    return (
                        <span className="text-muted-foreground text-sm">Unpublished</span>
                    )
                }
                return (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDistance(new Date(publishedAt), new Date(), { addSuffix: true })}</span>
                    </div>
                )
            },
            minSize: 140,
        },
        {
            accessorKey: 'created_at',
            header: 'Created',
            cell: (info) => (
                <div className="text-sm text-muted-foreground">
                    {formatDistance(new Date(info.getValue() as string), new Date(), { addSuffix: true })}
                </div>
            ),
            minSize: 120,
        },
        {
            accessorKey: 'target_commitish',
            header: 'Target',
            cell: (info) => {
                const target = info.getValue() as string
                return (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <GitBranch className="w-4 h-4" />
                        <span className="font-mono text-xs">{target}</span>
                    </div>
                )
            },
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
                                // Could implement release notes modal here
                                window.open(info.row.original.html_url, '_blank')
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="View release notes"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
            minSize: 80,
        },
        // Virtual columns for filtering
        {
            id: 'identity_filter',
            accessorKey: 'identity_id',
            header: 'Identity Filter',
            cell: () => null,
            enableHiding: false,
            enableSorting: false,
            enableResizing: false,
            size: 0,
        },
        {
            id: 'repository_filter',
            accessorKey: 'repository_name',
            header: 'Repository Filter',
            cell: () => null,
            enableHiding: false,
            enableSorting: false,
            enableResizing: false,
            size: 0,
        },
    ], [])

    const table = useReactTable({
        data: releases,
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
            const name = (row.original.name || row.original.tag_name).toLowerCase()
            const tagName = row.original.tag_name.toLowerCase()
            const repoName = row.original.repository_name.toLowerCase()
            const repoFullName = row.original.repository_full_name.toLowerCase()
            const identity = row.original.identity_id.toLowerCase()
            const body = (row.original.body || '').toLowerCase()

            return name.includes(searchValue) ||
                tagName.includes(searchValue) ||
                repoName.includes(searchValue) ||
                repoFullName.includes(searchValue) ||
                identity.includes(searchValue) ||
                body.includes(searchValue)
        },
    })

    const resetFilters = () => {
        setColumnFilters([])
        setGlobalFilter('')
        table.resetColumnFilters()
    }

    const uniqueIdentities = useMemo(() => {
        const identities = releases.map(release => release.identity_id)
        return [...new Set(identities)].sort()
    }, [releases])

    const uniqueRepositories = useMemo(() => {
        const selectedIdentity = table.getColumn('identity_filter')?.getFilterValue() as string
        const filteredReleases = selectedIdentity
            ? releases.filter(release => release.identity_id === selectedIdentity)
            : releases
        const repositories = filteredReleases.map(release => release.repository_name)
        return [...new Set(repositories)].sort()
    }, [releases, table.getColumn('identity_filter')?.getFilterValue()])

    // Clear repository filter when identity changes and selected repository is no longer valid
    useEffect(() => {
        const selectedRepository = table.getColumn('repository_filter')?.getFilterValue() as string
        if (selectedRepository && !uniqueRepositories.includes(selectedRepository)) {
            table.getColumn('repository_filter')?.setFilterValue(undefined)
        }
    }, [uniqueRepositories, table])

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search releases..."
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
                        {table.getFilteredRowModel().rows.length} of {releases.length} releases
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1">Identity</label>
                                <select
                                    value={table.getColumn('identity_filter')?.getFilterValue() as string ?? ''}
                                    onChange={(e) =>
                                        table.getColumn('identity_filter')?.setFilterValue(e.target.value || undefined)
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
                                    value={table.getColumn('repository_filter')?.getFilterValue() as string ?? ''}
                                    onChange={(e) =>
                                        table.getColumn('repository_filter')?.setFilterValue(e.target.value || undefined)
                                    }
                                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">All Repositories</option>
                                    {uniqueRepositories.map(repo => (
                                        <option key={repo} value={repo}>{repo}</option>
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
                        <p>No releases found matching your criteria.</p>
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
                        className="px-2 py-1 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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