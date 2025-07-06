'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, FileText } from 'lucide-react'

interface WorkspaceLauncherProps {
    workspaces: string[]
    identityName: string
    compact?: boolean
    variant?: 'default' | 'card-action'
}

export function WorkspaceLauncher({ workspaces, identityName, compact = false, variant = 'default' }: WorkspaceLauncherProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const handleLaunchWorkspace = (workspacePath: string) => {
        // Simple cursor protocol launch
        const cursorUrl = `cursor://file/${workspacePath}`

        // Create and click the link
        const link = document.createElement('a')
        link.href = cursorUrl
        link.target = '_blank'
        link.click()

        console.log(`Launching Cursor workspace: ${workspacePath}`)
    }

    const getWorkspaceName = (workspacePath: string) => {
        const filename = workspacePath.split('/').pop() || ''
        return filename.replace('.code-workspace', '')
    }

    if (!workspaces || workspaces.length === 0) {
        return null
    }

    // Card action variant - small button with "IDE" text
    if (variant === 'card-action') {
        // Single workspace - show as direct link
        if (workspaces.length === 1) {
            return (
                <button
                    onClick={() => handleLaunchWorkspace(workspaces[0])}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                    title={`Launch ${getWorkspaceName(workspaces[0])} in Cursor`}
                >
                    <ExternalLink className="w-3 h-3" />
                    IDE
                </button>
            )
        }

        // Multiple workspaces - show as dropdown
        return (
            <div className="relative">
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                    title={`Launch workspace in Cursor`}
                >
                    <ExternalLink className="w-3 h-3" />
                    IDE
                    <ChevronDown className="w-3 h-3" />
                </button>

                {dropdownOpen && (
                    <div className="absolute top-full mt-2 right-0 bg-card border rounded-md shadow-lg min-w-[200px] z-10">
                        <div className="py-1">
                            {workspaces.map((workspace, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        handleLaunchWorkspace(workspace)
                                        setDropdownOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors"
                                    title={workspace}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="truncate">{getWorkspaceName(workspace)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Backdrop to close dropdown */}
                {dropdownOpen && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setDropdownOpen(false)}
                    />
                )}
            </div>
        )
    }

    // Compact mode - just show icon
    if (compact) {
        // Single workspace - show as direct link
        if (workspaces.length === 1) {
            return (
                <button
                    onClick={() => handleLaunchWorkspace(workspaces[0])}
                    className="inline-flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    title={`Launch ${getWorkspaceName(workspaces[0])} in Cursor`}
                >
                    <ExternalLink className="w-3 h-3" />
                </button>
            )
        }

        // Multiple workspaces - show as dropdown
        return (
            <div className="relative">
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="inline-flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    title={`Launch workspace in Cursor`}
                >
                    <ExternalLink className="w-3 h-3" />
                </button>

                {dropdownOpen && (
                    <div className="absolute top-full mt-2 right-0 bg-card border rounded-md shadow-lg min-w-[200px] z-10">
                        <div className="py-1">
                            {workspaces.map((workspace, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        handleLaunchWorkspace(workspace)
                                        setDropdownOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors"
                                    title={workspace}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="truncate">{getWorkspaceName(workspace)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Backdrop to close dropdown */}
                {dropdownOpen && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setDropdownOpen(false)}
                    />
                )}
            </div>
        )
    }

    // Full size mode (original)
    // Single workspace - show as direct link
    if (workspaces.length === 1) {
        return (
            <button
                onClick={() => handleLaunchWorkspace(workspaces[0])}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                title={`Launch ${getWorkspaceName(workspaces[0])} in Cursor`}
            >
                <ExternalLink className="w-4 h-4" />
                Open in Cursor
            </button>
        )
    }

    // Multiple workspaces - show as dropdown
    return (
        <div className="relative">
            <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                title={`Launch workspace in Cursor`}
            >
                <ExternalLink className="w-4 h-4" />
                Open in Cursor
                <ChevronDown className="w-4 h-4" />
            </button>

            {dropdownOpen && (
                <div className="absolute top-full mt-2 right-0 bg-card border rounded-md shadow-lg min-w-[200px] z-10">
                    <div className="py-1">
                        {workspaces.map((workspace, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    handleLaunchWorkspace(workspace)
                                    setDropdownOpen(false)
                                }}
                                className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors"
                                title={workspace}
                            >
                                <FileText className="w-4 h-4" />
                                <span className="truncate">{getWorkspaceName(workspace)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Backdrop to close dropdown */}
            {dropdownOpen && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setDropdownOpen(false)}
                />
            )}
        </div>
    )
} 