"use client";

import { DependencyGraph as DependencyGraphType, RepositoryDependencies, EnhancedDependencyGraph } from '../types/dependencies';
import { NpmPackage } from '../lib/npm';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DependencyGraphProps {
    graph: DependencyGraphType | EnhancedDependencyGraph;
}

// Check if the graph is enhanced
function isEnhancedGraph(graph: DependencyGraphType | EnhancedDependencyGraph): graph is EnhancedDependencyGraph {
    return 'npmPackages' in graph;
}

// Simple visual network graph component
function VisualDependencyGraph({
    interdependencies,
    repositories,
    npmPackages = [],
    npmOrganizations = {},
    crossDependencies = []
}: {
    interdependencies: DependencyGraphType['interdependencies'],
    repositories: RepositoryDependencies[],
    npmPackages?: NpmPackage[],
    npmOrganizations?: { [scopeName: string]: string[] },
    crossDependencies?: any[]
}) {
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [visibleOrgs, setVisibleOrgs] = useState<Set<string>>(new Set());

    // Combine all dependencies for the graph
    const allDependencies = [
        ...interdependencies,
        ...crossDependencies.map(dep => ({
            from: dep.from,
            to: dep.to,
            version: dep.version,
            type: dep.type
        }))
    ];

    // Only show packages that are involved in interdependencies
    const involvedPackages = new Set();
    allDependencies.forEach(dep => {
        involvedPackages.add(dep.from);
        involvedPackages.add(dep.to);
    });

    // Filter to only relevant repositories and npm packages
    const relevantRepos = repositories.filter(repo => involvedPackages.has(repo.package.name));
    const relevantNpmPackages = npmPackages.filter(pkg => involvedPackages.has(pkg.name));

    // Create unified nodes from both local repos and npm packages
    const localNodes = relevantRepos.map(repo => ({
        id: `local:${repo.package.name}`,
        packageName: repo.package.name,
        label: repo.package.name.split('/')[1] || repo.package.name,
        org: repo.package.name.startsWith('@') ? repo.package.name.split('/')[0] : '',
        version: repo.package.version,
        type: 'local' as const,
        description: repo.package.description
    }));

    const npmNodes = relevantNpmPackages.map(pkg => ({
        id: `npm:${pkg.name}`,
        packageName: pkg.name,
        label: pkg.name.split('/')[1] || pkg.name,
        org: pkg.scope || (pkg.name.startsWith('@') ? pkg.name.split('/')[0] : ''),
        version: pkg.version,
        type: 'npm' as const,
        description: pkg.description,
        homepage: pkg.homepage,
        repository: pkg.repository?.url
    }));

    const nodes = [...localNodes, ...npmNodes];

    // Create a mapping from package names to node IDs for link creation
    const packageToNodeId = new Map<string, string>();
    nodes.forEach(node => {
        packageToNodeId.set(node.packageName, node.id);
    });

    const links = allDependencies.map(dep => ({
        source: packageToNodeId.get(dep.from) || dep.from,
        target: packageToNodeId.get(dep.to) || dep.to,
        version: dep.version,
        type: (dep as any).type || 'local'
    }));

    // Calculate dynamic dimensions based on the number of nodes
    const maxNodesPerRow = 5;
    const nodeRadius = 60; // Increased from 50 to 60
    const nodeSpacing = 200; // Increased spacing too
    const rowSpacing = 160; // Increased row spacing
    const margin = 100;

    // Group nodes by whether they are sources (have outgoing dependencies) or targets
    const sourceNodeIds = new Set(allDependencies.map(d => packageToNodeId.get(d.from) || d.from));
    const targetNodeIds = new Set(allDependencies.map(d => packageToNodeId.get(d.to) || d.to));
    const onlyTargets = [...targetNodeIds].filter(n => !sourceNodeIds.has(n));
    const onlySources = [...sourceNodeIds].filter(n => !targetNodeIds.has(n));
    const bothNodes = [...sourceNodeIds].filter(n => targetNodeIds.has(n));

    // Calculate layout dimensions
    const allLayers = [onlySources, bothNodes, onlyTargets].filter(layer => layer.length > 0);
    const maxLayerWidth = Math.max(...allLayers.map(layer => layer.length), 1);
    const totalWidth = Math.max(800, margin * 2 + maxLayerWidth * nodeSpacing);
    const totalHeight = allLayers.length * rowSpacing + margin * 2;

    // Better layout for fewer nodes - use a hierarchy-like positioning
    const nodePositions = new Map();

    let currentY = margin + nodeRadius;

    // Position nodes in layers with better spacing
    if (onlySources.length > 0) {
        const startX = (totalWidth - (onlySources.length - 1) * nodeSpacing) / 2;
        onlySources.forEach((nodeId, index) => {
            nodePositions.set(nodeId, {
                x: startX + (index * nodeSpacing),
                y: currentY,
            });
        });
        currentY += rowSpacing;
    }

    if (bothNodes.length > 0) {
        const startX = (totalWidth - (bothNodes.length - 1) * nodeSpacing) / 2;
        bothNodes.forEach((nodeId, index) => {
            nodePositions.set(nodeId, {
                x: startX + (index * nodeSpacing),
                y: currentY,
            });
        });
        currentY += rowSpacing;
    }

    if (onlyTargets.length > 0) {
        const startX = (totalWidth - (onlyTargets.length - 1) * nodeSpacing) / 2;
        onlyTargets.forEach((nodeId, index) => {
            nodePositions.set(nodeId, {
                x: startX + (index * nodeSpacing),
                y: currentY,
            });
        });
    }

    // Dynamic color generation for organizations
    const generateOrgColor = (org: string, index: number, isNpm: boolean = false): string => {
        // Different color palettes for local vs npm packages
        const localColorPalette = [
            '#e1f5fe', // Light blue
            '#f3e5f5', // Light purple
            '#e8f5e8', // Light green
            '#fff3e0', // Light orange
            '#ffebee', // Light red
            '#f1f8e9', // Light lime
        ];

        const npmColorPalette = [
            '#fce4ec', // Light pink
            '#e0f2f1', // Light teal
            '#fff8e1', // Light yellow
            '#f9fbe7', // Light olive
            '#e8eaf6', // Light indigo
            '#efebe9', // Light brown
        ];

        const colorPalette = isNpm ? npmColorPalette : localColorPalette;
        return colorPalette[index % colorPalette.length];
    };

    // Get unique organizations and create color mapping
    const uniqueOrgs = [...new Set(nodes.map(node => node.org).filter(Boolean))];
    const orgColors: { [key: string]: string } = {};
    uniqueOrgs.forEach((org, index) => {
        // Check if this org has any npm packages
        const hasNpmPackages = nodes.some(node => node.org === org && node.type === 'npm');
        orgColors[org] = generateOrgColor(org, index, hasNpmPackages);
    });

    // Initialize visible organizations if not set
    useEffect(() => {
        if (visibleOrgs.size === 0 && uniqueOrgs.length > 0) {
            setVisibleOrgs(new Set(uniqueOrgs));
        }
    }, [uniqueOrgs, visibleOrgs.size]);

    // Filter nodes and links based on visible organizations
    const filteredNodes = nodes.filter(node => visibleOrgs.has(node.org));
    const filteredLinks = links.filter(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        return sourceNode && targetNode &&
            visibleOrgs.has(sourceNode.org) &&
            visibleOrgs.has(targetNode.org);
    });

    // Helper functions for highlighting
    const isNodeHighlighted = (nodeId: string) => {
        if (!selectedNode) return false;
        if (nodeId === selectedNode) return true;

        // Check if this node is connected to the selected node
        return allDependencies.some(dep => {
            const sourceId = packageToNodeId.get(dep.from) || dep.from;
            const targetId = packageToNodeId.get(dep.to) || dep.to;
            return (sourceId === selectedNode && targetId === nodeId) ||
                (targetId === selectedNode && sourceId === nodeId);
        });
    };

    const isLinkHighlighted = (link: { source: string; target: string }) => {
        if (!selectedNode) return false;
        return link.source === selectedNode || link.target === selectedNode;
    };

    const handleNodeClick = (nodeId: string) => {
        setSelectedNode(selectedNode === nodeId ? null : nodeId);
    };

    const handleOrgToggle = (org: string) => {
        const newVisibleOrgs = new Set(visibleOrgs);
        if (newVisibleOrgs.has(org)) {
            newVisibleOrgs.delete(org);
        } else {
            newVisibleOrgs.add(org);
        }
        setVisibleOrgs(newVisibleOrgs);
    };

    const handleShowAllOrgs = () => {
        setVisibleOrgs(new Set(uniqueOrgs));
    };

    const handleHideAllOrgs = () => {
        setVisibleOrgs(new Set());
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">Dependency Network</h3>
            <p className="text-sm text-gray-600 mb-4">
                Showing packages with dependencies. Arrows show "from → to" relationships.
            </p>
            <div className="w-full">
                <svg
                    width={totalWidth}
                    height={totalHeight}
                    viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                    className="border rounded w-full h-auto"
                    style={{ minHeight: '300px', maxHeight: '600px' }}
                >
                    {/* Links */}
                    {filteredLinks.map((link, index) => {
                        const sourcePos = nodePositions.get(link.source);
                        const targetPos = nodePositions.get(link.target);
                        if (!sourcePos || !targetPos) return null;

                        const isHighlighted = isLinkHighlighted(link);
                        const isConnected = selectedNode && !isHighlighted;

                        // Find the target repository to get its current version
                        const targetNode = nodes.find(node => node.id === link.target);
                        const currentVersion = targetNode?.version;

                        // Compare dependency version with current version to determine if it's up-to-date
                        const isUpToDate = currentVersion && link.version.replace(/^\^|~/, '') === currentVersion;

                        // Determine line color based on version comparison and type
                        const getLineColor = () => {
                            if (isHighlighted) return "#2563eb"; // Blue when highlighted
                            if (isConnected) return "#e5e7eb"; // Gray when faded
                            if (link.type === 'npm') return "#8b5cf6"; // Purple for cross dependencies
                            return isUpToDate ? "#10b981" : "#ef4444"; // Green if up-to-date, red if outdated
                        };

                        // Calculate line endpoints at circle edges instead of centers
                        const dx = targetPos.x - sourcePos.x;
                        const dy = targetPos.y - sourcePos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const unitX = dx / distance;
                        const unitY = dy / distance;

                        // Start line at edge of source circle
                        const x1 = sourcePos.x + unitX * nodeRadius;
                        const y1 = sourcePos.y + unitY * nodeRadius;

                        // End line at edge of target circle
                        const x2 = targetPos.x - unitX * nodeRadius;
                        const y2 = targetPos.y - unitY * nodeRadius;

                        // Choose appropriate arrow marker based on state
                        const getArrowMarker = () => {
                            if (isHighlighted) return "url(#arrowhead-highlighted)";
                            if (isConnected) return "url(#arrowhead-faded)";
                            if (link.type === 'npm') return "url(#arrowhead-cross)";
                            return isUpToDate ? "url(#arrowhead-uptodate)" : "url(#arrowhead-outdated)";
                        };
                        const arrowMarker = getArrowMarker();

                        return (
                            <g key={`link-${index}-${link.source}-${link.target}`}>
                                <line
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={getLineColor()}
                                    strokeWidth={isHighlighted ? "4" : "2"}
                                    markerEnd={arrowMarker}
                                    opacity={isConnected ? "0.3" : "1"}
                                />
                                {/* Link label - only show when nodes are highlighted */}
                                {(() => {
                                    // Only show version text if either source or target node is selected/highlighted
                                    const showVersion = selectedNode && (
                                        selectedNode === link.source ||
                                        selectedNode === link.target ||
                                        isHighlighted
                                    );

                                    if (!showVersion) return null;

                                    // Calculate angle of the line for text rotation
                                    let angle = Math.atan2(dy, dx) * 180 / Math.PI;

                                    // Keep text readable by flipping it if it would be upside down
                                    if (angle > 90 || angle < -90) {
                                        angle += 180;
                                    }

                                    // Position text closer to center (40% along the line)
                                    const textX = sourcePos.x + dx * 0.4;
                                    const textY = sourcePos.y + dy * 0.4;

                                    // Offset perpendicular to the line to position above it with moderate spacing
                                    const offsetDistance = 16; // Reduced from 24 to 16
                                    const perpX = -dy / distance * offsetDistance;
                                    const perpY = dx / distance * offsetDistance;

                                    return (
                                        <text
                                            x={textX + perpX}
                                            y={textY + perpY}
                                            textAnchor="middle"
                                            className={`text-sm font-medium ${isHighlighted ? 'fill-blue-700' : 'fill-blue-700'}`}
                                            opacity="1"
                                            transform={`rotate(${angle}, ${textX + perpX}, ${textY + perpY})`}
                                        >
                                            {link.version}
                                        </text>
                                    );
                                })()}
                            </g>
                        );
                    })}

                    {/* Nodes */}
                    {filteredNodes.map((node) => {
                        const pos = nodePositions.get(node.id);
                        if (!pos) return null;

                        const fillColor = orgColors[node.org] || '#f8fafc';
                        const isSelected = selectedNode === node.id;
                        const isHighlighted = isNodeHighlighted(node.id);
                        const isConnected = selectedNode && !isHighlighted;

                        // Different styling for npm vs local packages
                        const strokeColor = node.type === 'npm'
                            ? (isSelected ? "#059669" : isHighlighted ? "#10b981" : "#6b7280")
                            : (isSelected ? "#1e40af" : isHighlighted ? "#3b82f6" : "#334155");

                        return (
                            <g key={node.id}>
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={nodeRadius}
                                    fill={isSelected ? (node.type === 'npm' ? "#10b981" : "#3b82f6") : fillColor}
                                    stroke={strokeColor}
                                    strokeWidth={isSelected ? "4" : isHighlighted ? "3" : "2"}
                                    opacity={isConnected ? "0.3" : "1"}
                                    onClick={() => handleNodeClick(node.id)}
                                    className="cursor-pointer hover:stroke-blue-500 hover:stroke-[3px] transition-all"
                                />
                                {/* Package name */}
                                <text
                                    x={pos.x}
                                    y={pos.y - 12}
                                    textAnchor="middle"
                                    className={`text-sm font-bold ${isSelected ? 'fill-white' : 'fill-gray-900'}`}
                                    onClick={() => handleNodeClick(node.id)}
                                    style={{ pointerEvents: 'none' }}
                                    opacity={isConnected ? "0.3" : "1"}
                                >
                                    {node.label}
                                </text>
                                {/* Package version */}
                                <text
                                    x={pos.x}
                                    y={pos.y + 2}
                                    textAnchor="middle"
                                    className={`text-xs font-medium ${isSelected ? 'fill-blue-100' : 'fill-gray-700'}`}
                                    onClick={() => handleNodeClick(node.id)}
                                    style={{ pointerEvents: 'none' }}
                                    opacity={isConnected ? "0.3" : "1"}
                                >
                                    v{node.version}
                                </text>
                                {/* Organization name and type indicator */}
                                <text
                                    x={pos.x}
                                    y={pos.y + 16}
                                    textAnchor="middle"
                                    className={`text-xs ${isSelected ? 'fill-blue-200' : 'fill-gray-600'}`}
                                    onClick={() => handleNodeClick(node.id)}
                                    style={{ pointerEvents: 'none' }}
                                    opacity={isConnected ? "0.3" : "1"}
                                >
                                    {node.org} {node.type === 'npm' ? '📦' : '🏠'}
                                </text>
                            </g>
                        );
                    })}

                    {/* Arrow marker definitions */}
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="4"
                            markerHeight="3"
                            refX="3.5"
                            refY="1.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 4 1.5, 0 3"
                                fill="#64748b"
                            />
                        </marker>
                        <marker
                            id="arrowhead-highlighted"
                            markerWidth="4"
                            markerHeight="3"
                            refX="3.5"
                            refY="1.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 4 1.5, 0 3"
                                fill="#2563eb"
                            />
                        </marker>
                        <marker
                            id="arrowhead-faded"
                            markerWidth="4"
                            markerHeight="3"
                            refX="3.5"
                            refY="1.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 4 1.5, 0 3"
                                fill="#e5e7eb"
                            />
                        </marker>
                        <marker
                            id="arrowhead-uptodate"
                            markerWidth="4"
                            markerHeight="3"
                            refX="3.5"
                            refY="1.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 4 1.5, 0 3"
                                fill="#10b981"
                            />
                        </marker>
                        <marker
                            id="arrowhead-outdated"
                            markerWidth="4"
                            markerHeight="3"
                            refX="3.5"
                            refY="1.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 4 1.5, 0 3"
                                fill="#ef4444"
                            />
                        </marker>
                        <marker
                            id="arrowhead-cross"
                            markerWidth="4"
                            markerHeight="3"
                            refX="3.5"
                            refY="1.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 4 1.5, 0 3"
                                fill="#8b5cf6"
                            />
                        </marker>
                    </defs>
                </svg>
            </div>

            {/* Selected Node Info Panel */}
            {selectedNode && (() => {
                const selectedNodeData = nodes.find(node => node.id === selectedNode);
                if (!selectedNodeData) return null;

                // For local packages, extract owner and repo name for repository link
                const getRepositoryLink = () => {
                    if (selectedNodeData.type === 'local' && selectedNodeData.packageName.includes('/')) {
                        const [owner, repo] = selectedNodeData.packageName.split('/');
                        const cleanOwner = owner.replace('@', '');
                        return `/repositories/${cleanOwner}/${repo}`;
                    }
                    return null;
                };

                // For local packages, get the identity (organization) for identity link
                const getIdentityLink = () => {
                    if (selectedNodeData.type === 'local' && selectedNodeData.org) {
                        const cleanIdentity = selectedNodeData.org.replace('@', '');
                        return `/identity/${cleanIdentity}`;
                    }
                    return null;
                };

                const repositoryLink = getRepositoryLink();
                const identityLink = getIdentityLink();

                return (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Selected Package Details</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Package:</span>
                                <span>{selectedNodeData.packageName}</span>
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                    {selectedNodeData.type === 'local' ? '🏠 Local' : '📦 NPM'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Version:</span>
                                <span>v{selectedNodeData.version}</span>
                            </div>
                            {selectedNodeData.org && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Organization:</span>
                                    <span>{selectedNodeData.org}</span>
                                </div>
                            )}
                            {selectedNodeData.description && (
                                <div className="flex items-start gap-2">
                                    <span className="font-medium">Description:</span>
                                    <span className="text-gray-700">{selectedNodeData.description}</span>
                                </div>
                            )}

                            {/* Links section */}
                            {(repositoryLink || identityLink || (selectedNodeData.type === 'npm' && (selectedNodeData.homepage || selectedNodeData.repository))) && (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                    <span className="font-medium text-blue-900 block mb-2">Quick Links:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {repositoryLink && (
                                            <Link
                                                href={repositoryLink}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                <span>📁</span>
                                                Repository
                                            </Link>
                                        )}
                                        {identityLink && (
                                            <Link
                                                href={identityLink}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                                            >
                                                <span>👤</span>
                                                Identity
                                            </Link>
                                        )}
                                        {selectedNodeData.type === 'npm' && selectedNodeData.homepage && (
                                            <a
                                                href={selectedNodeData.homepage}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 transition-colors"
                                            >
                                                <span>🌐</span>
                                                Homepage
                                            </a>
                                        )}
                                        {selectedNodeData.type === 'npm' && selectedNodeData.repository && (
                                            <a
                                                href={selectedNodeData.repository}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors"
                                            >
                                                <span>🔗</span>
                                                Source
                                            </a>
                                        )}
                                        {selectedNodeData.type === 'npm' && (
                                            <a
                                                href={`https://www.npmjs.com/package/${selectedNodeData.packageName}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                                            >
                                                <span>📦</span>
                                                NPM
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Legend */}
            <div className="mt-4 space-y-4">
                {/* Node Types */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Node Types:</h4>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-50"></div>
                            <span className="text-sm text-gray-600">Local Packages</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border-2 border-green-500 bg-green-50"></div>
                            <span className="text-sm text-gray-600">NPM Packages</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border-4 border-blue-600 bg-blue-500"></div>
                            <span className="text-sm text-gray-600">Selected Node</span>
                        </div>
                    </div>
                </div>

                {/* Dependency Types */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Dependencies:</h4>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-1 bg-green-500"></div>
                            <span className="text-sm text-gray-600">Up-to-date</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-1 bg-red-500"></div>
                            <span className="text-sm text-gray-600">Outdated</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-1 bg-purple-500"></div>
                            <span className="text-sm text-gray-600">Cross (Local ↔ NPM)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-1 bg-blue-600"></div>
                            <span className="text-sm text-gray-600">Highlighted</span>
                        </div>
                    </div>
                </div>

                {/* Organizations/Scopes - Interactive */}
                {Object.keys(orgColors).length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Organizations/Scopes (node fill colors):</h4>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShowAllOrgs}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                    Show All
                                </button>
                                <button
                                    onClick={handleHideAllOrgs}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                >
                                    Hide All
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(orgColors).map(([org, color]) => {
                                const isVisible = visibleOrgs.has(org);
                                const nodeCount = filteredNodes.filter(n => n.org === org).length;
                                const totalCount = nodes.filter(n => n.org === org).length;

                                return (
                                    <div
                                        key={org}
                                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${isVisible
                                            ? 'border-gray-300 bg-white shadow-sm'
                                            : 'border-gray-200 bg-gray-50 opacity-50'
                                            } hover:shadow-md`}
                                        onClick={() => handleOrgToggle(org)}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                                            style={{ backgroundColor: color }}
                                        ></div>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-800 font-medium">{org}</span>
                                            <span className="text-xs text-gray-500">
                                                {isVisible ? nodeCount : totalCount} package{totalCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {isVisible ? '👁️' : '🔒'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-xs text-gray-500 italic mt-2">
                            Click to show/hide organizations. Each node's fill color represents its organization/scope.
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="text-xs text-gray-500 italic">
                    Click on nodes to highlight connections and see version details on the arrows.
                </div>
            </div>
        </div>
    );
}

export function DependencyGraph({ graph }: DependencyGraphProps) {
    const isEnhanced = isEnhancedGraph(graph);
    const { repositories, organizations, interdependencies } = graph;

    // Extract enhanced data if available
    const npmPackages = isEnhanced ? graph.npmPackages : [];
    const npmOrganizations = isEnhanced ? graph.npmOrganizations : {};
    const crossDependencies = isEnhanced ? graph.crossDependencies : [];
    const npmScopes = isEnhanced ? graph.npmScopes : [];

    const hasAnyDependencies = interdependencies.length > 0 || crossDependencies.length > 0;

    return (
        <div className="space-y-8">
            {/* Visual Network Graph */}
            {hasAnyDependencies && (
                <VisualDependencyGraph
                    interdependencies={interdependencies}
                    repositories={repositories}
                    npmPackages={npmPackages}
                    npmOrganizations={npmOrganizations}
                    crossDependencies={crossDependencies}
                />
            )}

            {/* NPM Scopes Overview (if enhanced) */}
            {isEnhanced && npmScopes.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">NPM Scopes & Published Packages</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {npmScopes.map((scopeData, scopeIndex) => (
                            <div key={`scope-${scopeData.scope}-${scopeIndex}`} className="border rounded-lg p-4">
                                <h3 className="font-semibold text-lg text-green-600">{scopeData.scope}</h3>
                                <p className="text-sm text-gray-500 mb-2">Identity: {scopeData.identityId}</p>
                                <p className="text-sm text-gray-600 mb-2">{scopeData.packages.length} packages</p>
                                <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                    {scopeData.packages.slice(0, 10).map((pkg, pkgIndex) => (
                                        <li key={`scope-${scopeData.scope}-pkg-${pkg.name}-${pkgIndex}`} className="text-sm text-gray-600">
                                            <a
                                                href={pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-blue-600 hover:underline"
                                            >
                                                {pkg.name} (v{pkg.version})
                                            </a>
                                        </li>
                                    ))}
                                    {scopeData.packages.length > 10 && (
                                        <li className="text-sm text-gray-500 italic">
                                            ... and {scopeData.packages.length - 10} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Organizations Overview */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Local Organizations & Packages</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(organizations).map(([orgName, packages], orgIndex) => (
                        <div key={`org-${orgName}-${orgIndex}`} className="border rounded-lg p-4">
                            <h3 className="font-semibold text-lg text-blue-600">{orgName}</h3>
                            <ul className="mt-2 space-y-1">
                                {packages.map((pkg, pkgIndex) => (
                                    <li key={`org-${orgName}-pkg-${pkg}-${pkgIndex}`} className="text-sm text-gray-600">{pkg}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Interdependencies */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Dependencies</h2>
                {hasAnyDependencies ? (
                    <div className="space-y-4">
                        {/* Local Interdependencies */}
                        {interdependencies.length > 0 && (
                            <div>
                                <h3 className="text-lg font-medium mb-2 text-blue-600">Local Package Dependencies</h3>
                                <div className="space-y-2">
                                    {interdependencies.map((dep, index) => (
                                        <div key={`local-dep-${dep.from}-${dep.to}-${index}`} className="flex items-center space-x-2 p-3 bg-blue-50 rounded">
                                            <span className="font-medium text-blue-600">{dep.from}</span>
                                            <span className="text-gray-400">→</span>
                                            <span className="font-medium text-green-600">{dep.to}</span>
                                            <span className="text-sm text-gray-500">({dep.version})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cross Dependencies */}
                        {crossDependencies.length > 0 && (
                            <div>
                                <h3 className="text-lg font-medium mb-2 text-purple-600">Cross Dependencies (Local ↔ NPM)</h3>
                                <div className="space-y-2">
                                    {crossDependencies.map((dep, index) => (
                                        <div key={`cross-dep-${dep.from}-${dep.to}-${index}`} className="flex items-center space-x-2 p-3 bg-purple-50 rounded">
                                            <span className="font-medium text-blue-600">{dep.from}</span>
                                            <span className="text-gray-400">→</span>
                                            <span className="font-medium text-green-600">{dep.to}</span>
                                            <span className="text-sm text-gray-500">({dep.version})</span>
                                            {dep.toScope && (
                                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                                    {dep.toScope}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No dependencies found in current workspace.</p>
                )}
            </div>

            {/* Repository Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Repository Details</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {repositories.map((repo, index) => (
                        <RepositoryCard key={`repo-${repo.package.name}-${repo.repositoryPath}-${index}`} repository={repo} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function RepositoryCard({ repository }: { repository: RepositoryDependencies }) {
    const { package: pkg, dependencies, devDependencies, internalDependencies, dependents, repositoryPath } = repository;

    return (
        <div className="border rounded-lg p-4">
            <div className="mb-3">
                <h3 className="font-semibold text-lg">{pkg.name}</h3>
                <p className="text-sm text-gray-600">{pkg.description}</p>
                <p className="text-xs text-gray-500">v{pkg.version}</p>
            </div>

            {internalDependencies.length > 0 && (
                <div className="mb-3">
                    <h4 className="font-medium text-sm text-blue-600">Internal Dependencies:</h4>
                    <ul className="text-sm text-gray-600 ml-4">
                        {internalDependencies.map((dep, index) => (
                            <li key={`repo-${repositoryPath}-internal-${dep.name}-${index}`}>• {dep.name} ({dep.version})</li>
                        ))}
                    </ul>
                </div>
            )}

            {dependents.length > 0 && (
                <div className="mb-3">
                    <h4 className="font-medium text-sm text-green-600">Used by:</h4>
                    <ul className="text-sm text-gray-600 ml-4">
                        {dependents.map((dep, index) => (
                            <li key={`repo-${repositoryPath}-dependent-${dep}-${index}`}>• {dep}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
                {dependencies.length} runtime deps, {devDependencies.length} dev deps
            </div>
        </div>
    );
} 