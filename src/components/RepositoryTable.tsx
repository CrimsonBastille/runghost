'use client'

import { useState, useMemo } from 'react'
import { formatDistance } from 'date-fns'
import Link from 'next/link'
import { GitHubRepository } from '@/types/github'
import {
    Star,
    GitFork,
    ExternalLink,
    AlertCircle,
    Calendar,
    Search,
    ChevronUp,
    ChevronDown,
    Archive,
    Lock,
    Unlock,
    Settings,
    X
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

type Repository = GitHubRepository & { identity_id: string }

interface RepositoryTableProps {
    repositories: Repository[]
}

export function RepositoryTable({ repositories }: RepositoryTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'pushed_at', desc: true }
    ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        identity_id: false,
    })
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    })
    const [showColumnSettings, setShowColumnSettings] = useState(false)

    const columns = useMemo<ColumnDef<Repository>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Repository',
            cell: (info) => {
                const repository = info.row.original;
                const fullName = repository.full_name;
                const [owner, repo] = fullName.split('/');

                return (
                    <div className="min-w-0">
                        <Link
                            href={`/repositories/${owner}/${repo}`}
                            className="font-medium text-foreground truncate hover:text-primary transition-colors block"
                        >
                            {repo}
                        </Link>
                        <Link
                            href={`/identity/${repository.identity_id}`}
                            className="text-sm text-muted-foreground truncate hover:text-primary transition-colors block"
                        >
                            {repository.identity_id}
                        </Link>
                        {repository.description && (
                            <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {repository.description}
                            </div>
                        )}
                    </div>
                );
            },
            minSize: 200,
        },
        {
            accessorKey: 'identity_id',
            header: 'Identity',
            cell: (info) => info.getValue(),
            minSize: 100,
        },
        {
            accessorKey: 'language',
            header: 'Language',
            cell: (info) => {
                const language = info.getValue() as string | null
                return language ? (
                    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                        {language}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                )
            },
            minSize: 100,
        },
        {
            accessorKey: 'stargazers_count',
            header: 'Stars',
            cell: (info) => (
                <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <span className="font-medium">{(info.getValue() as number).toLocaleString()}</span>
                </div>
            ),
            minSize: 80,
        },
        {
            accessorKey: 'forks_count',
            header: 'Forks',
            cell: (info) => (
                <div className="flex items-center gap-1 text-sm">
                    <GitFork className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="font-medium">{(info.getValue() as number).toLocaleString()}</span>
                </div>
            ),
            minSize: 80,
        },
        {
            accessorKey: 'open_issues_count',
            header: 'Issues',
            cell: (info) => (
                <div className="flex items-center gap-1 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="font-medium">{(info.getValue() as number).toLocaleString()}</span>
                </div>
            ),
            minSize: 80,
        },
        {
            accessorKey: 'pushed_at',
            header: 'Last Updated',
            cell: (info) => (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{formatDistance(new Date(info.getValue() as string), new Date(), { addSuffix: true })}</span>
                </div>
            ),
            minSize: 150,
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
            id: 'status',
            header: 'Status',
            cell: (info) => (
                <div className="flex items-center gap-1">
                    {info.row.original.private ? (
                        <span title="Private">
                            <Lock className="w-4 h-4 text-orange-500" />
                        </span>
                    ) : (
                        <span title="Public">
                            <Unlock className="w-4 h-4 text-green-500" />
                        </span>
                    )}
                    {info.row.original.archived && (
                        <span title="Archived">
                            <Archive className="w-4 h-4 text-gray-500" />
                        </span>
                    )}
                </div>
            ),
            minSize: 80,
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: (info) => (
                <a
                    href={info.row.original.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="View on GitHub"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            ),
            minSize: 80,
        },
    ], [])

    const table = useReactTable({
        data: repositories,
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
            const name = row.original.name.toLowerCase()
            const description = row.original.description?.toLowerCase() || ''
            const identity = row.original.identity_id.toLowerCase()
            const language = row.original.language?.toLowerCase() || ''

            return name.includes(searchValue) ||
                description.includes(searchValue) ||
                identity.includes(searchValue) ||
                language.includes(searchValue)
        },
    })

    const resetFilters = () => {
        setColumnFilters([])
        setGlobalFilter('')
        table.resetColumnFilters()
    }

    const uniqueLanguages = useMemo(() => {
        const languages = repositories
            .map(repo => repo.language)
            .filter((lang): lang is string => lang !== null && lang !== undefined)
        return [...new Set(languages)].sort()
    }, [repositories])

    const uniqueIdentities = useMemo(() => {
        const identities = repositories.map(repo => repo.identity_id)
        return [...new Set(identities)].sort()
    }, [repositories])

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search repositories..."
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
                        {table.getFilteredRowModel().rows.length} of {repositories.length} repositories
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

                    <div className="space-y-2">
                        <div className="text-sm font-medium">Visibility</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {table.getAllLeafColumns().map(column => (
                                <label key={column.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={column.getIsVisible()}
                                        onChange={column.getToggleVisibilityHandler()}
                                        className="rounded border-input"
                                    />
                                    {typeof column.columnDef.header === 'string' ?
                                        column.columnDef.header :
                                        column.id
                                    }
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="text-sm font-medium">Quick Filters</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1">Language</label>
                                <select
                                    value={table.getColumn('language')?.getFilterValue() as string ?? ''}
                                    onChange={(e) =>
                                        table.getColumn('language')?.setFilterValue(e.target.value || undefined)
                                    }
                                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">All Languages</option>
                                    {uniqueLanguages.map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>

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
                        <p>No repositories found matching your criteria.</p>
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