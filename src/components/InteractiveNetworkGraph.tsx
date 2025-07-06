"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import Link from 'next/link';
import { DependencyGraph as DependencyGraphType, RepositoryDependencies, EnhancedDependencyGraph } from '../types/dependencies';
import { NpmPackage } from '../lib/npm';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Filter, X } from 'lucide-react';

interface NetworkNode extends d3.SimulationNodeDatum {
    id: string;
    packageName: string;
    label: string;
    org: string;
    version: string;
    type: 'local' | 'npm';
    description?: string;
    homepage?: string;
    repository?: string;
    color: string;
    radius: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
    source: string | NetworkNode;
    target: string | NetworkNode;
    version: string;
    type: 'local' | 'npm';
    value: number;
}

interface InteractiveNetworkGraphProps {
    interdependencies: DependencyGraphType['interdependencies'];
    repositories: RepositoryDependencies[];
    npmPackages?: NpmPackage[];
    crossDependencies?: any[];
    npmScopes?: any[]; // Add npmScopes to get scope -> identity mapping
}

// Check if the graph is enhanced
function isEnhancedGraph(graph: DependencyGraphType | EnhancedDependencyGraph): graph is EnhancedDependencyGraph {
    return 'npmPackages' in graph;
}

export function InteractiveNetworkGraph({
    interdependencies,
    repositories,
    npmPackages = [],
    crossDependencies = [],
    npmScopes = []
}: InteractiveNetworkGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [filterMode, setFilterMode] = useState<'all' | 'connected'>('all');
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visibleOrgs, setVisibleOrgs] = useState<Set<string>>(new Set());
    const [actualOrgColors, setActualOrgColors] = useState<{ [key: string]: string }>({});
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    // Store D3 objects in refs to avoid state issues
    const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const colorSchemeRef = useRef<d3.ScaleOrdinal<string, string> | null>(null);

    // Initialize D3 simulation
    useEffect(() => {
        setError(null);

        let cleanupFunction: (() => void) | null = null;

        const initializeGraph = async () => {
            try {
                // Wait for next tick to ensure DOM is rendered
                await new Promise(resolve => setTimeout(resolve, 100));

                const svgElement = svgRef.current;
                const containerElement = containerRef.current;

                if (!svgElement || !containerElement) {
                    setError('DOM elements not available');
                    return;
                }

                // Initialize color scheme only when needed
                if (!colorSchemeRef.current) {
                    colorSchemeRef.current = d3.scaleOrdinal(d3.schemeCategory10);
                }

                // Prepare data
                const allDependencies = [
                    ...interdependencies,
                    ...crossDependencies.map(dep => ({
                        from: dep.from,
                        to: dep.to,
                        version: dep.version,
                        type: dep.type
                    }))
                ];

                const involvedPackages = new Set<string>();
                allDependencies.forEach(dep => {
                    involvedPackages.add(dep.from);
                    involvedPackages.add(dep.to);
                });

                const relevantRepos = repositories.filter(repo => involvedPackages.has(repo.package.name));
                const relevantNpmPackages = npmPackages.filter(pkg => involvedPackages.has(pkg.name));

                // Create nodes
                const packageMap = new Map<string, NetworkNode>();
                const packageToNodeId = new Map<string, string>();

                relevantRepos.forEach(repo => {
                    const node: NetworkNode = {
                        id: `local:${repo.package.name}`,
                        packageName: repo.package.name,
                        label: repo.package.name.split('/')[1] || repo.package.name,
                        org: repo.package.name.startsWith('@') ? repo.package.name.split('/')[0] : 'unscoped',
                        version: repo.package.version,
                        type: 'local' as const,
                        description: repo.package.description,
                        color: colorSchemeRef.current!(repo.package.name.startsWith('@') ? repo.package.name.split('/')[0] : 'unscoped'),
                        radius: 12
                    };
                    packageMap.set(repo.package.name, node);
                    packageToNodeId.set(repo.package.name, node.id);
                });

                relevantNpmPackages.forEach(pkg => {
                    if (!packageMap.has(pkg.name)) {
                        const node: NetworkNode = {
                            id: `npm:${pkg.name}`,
                            packageName: pkg.name,
                            label: pkg.name.split('/')[1] || pkg.name,
                            org: pkg.scope || (pkg.name.startsWith('@') ? pkg.name.split('/')[0] : 'unscoped'),
                            version: pkg.version,
                            type: 'npm' as const,
                            description: pkg.description,
                            homepage: pkg.homepage,
                            repository: pkg.repository?.url,
                            color: colorSchemeRef.current!(pkg.scope || (pkg.name.startsWith('@') ? pkg.name.split('/')[0] : 'unscoped')),
                            radius: 10
                        };
                        packageMap.set(pkg.name, node);
                        packageToNodeId.set(pkg.name, node.id);
                    }
                });

                // Calculate inbound dependency counts
                const inboundCounts = new Map<string, number>();
                allDependencies.forEach(dep => {
                    if (packageToNodeId.has(dep.from) && packageToNodeId.has(dep.to)) {
                        const targetPackage = dep.to;
                        inboundCounts.set(targetPackage, (inboundCounts.get(targetPackage) || 0) + 1);
                    }
                });

                // Update node radii based on inbound dependency counts
                const nodes: NetworkNode[] = Array.from(packageMap.values()).map(node => {
                    const inboundCount = inboundCounts.get(node.packageName) || 0;
                    // Base radius: 8 for npm, 10 for local
                    // Scale up based on inbound dependencies: +1 radius per 2 dependencies
                    const baseRadius = node.type === 'local' ? 10 : 8;
                    const scaledRadius = baseRadius + Math.min(Math.floor(inboundCount / 2), 15); // Cap at +15
                    return {
                        ...node,
                        radius: scaledRadius
                    };
                });

                // Get unique organizations for filtering (don't set state here to avoid loops)
                const currentUniqueOrgs = [...new Set(nodes.map(node => node.org).filter(Boolean))];

                // Capture the actual colors being used by D3 for the legend
                const capturedOrgColors: { [key: string]: string } = {};
                nodes.forEach(node => {
                    if (!capturedOrgColors[node.org]) {
                        capturedOrgColors[node.org] = node.color;
                    }
                });
                setActualOrgColors(capturedOrgColors);

                // Show top packages by inbound dependencies
                const topPackages = Array.from(inboundCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                console.log('Top packages by inbound dependencies:', topPackages);

                const links: NetworkLink[] = allDependencies
                    .filter(dep => {
                        // Check if both packages exist before creating the link
                        return packageToNodeId.has(dep.from) && packageToNodeId.has(dep.to);
                    })
                    .map(dep => ({
                        source: packageToNodeId.get(dep.from) || dep.from,
                        target: packageToNodeId.get(dep.to) || dep.to,
                        version: dep.version,
                        type: (dep as any).type || 'local',
                        value: 1
                    }));



                // Filter data based on organization visibility first
                let orgFilteredNodes = nodes.filter(node => visibleOrgs.has(node.org));
                let orgFilteredLinks = links.filter(link => {
                    const sourceNode = nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
                    const targetNode = nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
                    return sourceNode && targetNode &&
                        visibleOrgs.has(sourceNode.org) &&
                        visibleOrgs.has(targetNode.org);
                });

                // Then filter based on selection mode
                let filteredNodes = orgFilteredNodes;
                let filteredLinks = orgFilteredLinks;

                if (filterMode === 'connected' && selectedNode) {
                    const connectedNodeIds = new Set<string>();
                    connectedNodeIds.add(selectedNode);

                    orgFilteredLinks.forEach(link => {
                        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

                        if (sourceId === selectedNode) {
                            connectedNodeIds.add(targetId);
                        }
                        if (targetId === selectedNode) {
                            connectedNodeIds.add(sourceId);
                        }
                    });

                    filteredNodes = orgFilteredNodes.filter(node => connectedNodeIds.has(node.id));
                    filteredLinks = orgFilteredLinks.filter(link => {
                        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                        return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId);
                    });
                }



                // Get dimensions
                const rect = containerElement.getBoundingClientRect();
                const width = Math.max(rect.width, 400);
                const height = Math.max(rect.height, 400);

                // Clean up previous content
                d3.select(svgElement).selectAll("*").remove();

                // Set up SVG
                const svg = d3.select(svgElement);
                svg.attr('width', width).attr('height', height);

                // Create main group
                const g = svg.append('g');

                // Create zoom behavior
                const zoom = d3.zoom<SVGSVGElement, unknown>()
                    .scaleExtent([0.1, 10])
                    .on('zoom', (event) => {
                        g.attr('transform', event.transform);
                    });

                svg.call(zoom);
                zoomBehaviorRef.current = zoom;

                // Create markers
                const defs = svg.append('defs');
                const arrowMarker = defs.append('marker')
                    .attr('id', 'arrowhead')
                    .attr('viewBox', '0 -2 4 4')
                    .attr('refX', 10)
                    .attr('refY', 0)
                    .attr('markerWidth', 2.5)  // Even smaller
                    .attr('markerHeight', 2.5)
                    .attr('orient', 'auto');

                arrowMarker.append('path')
                    .attr('d', 'M0,-2L4,0L0,2')  // Even smaller arrow shape
                    .attr('fill', '#d1d5db')  // Match light grey connection lines
                    .attr('fill-opacity', 0.6);

                // Create simulation with organized layout
                const simulation = d3.forceSimulation<NetworkNode>(filteredNodes)
                    .force('link', d3.forceLink<NetworkNode, NetworkLink>(filteredLinks)
                        .id(d => d.id)
                        .distance(200)  // Much longer links for spacious layout
                        .strength(0.3))  // Very weak link force for loose connections
                    .force('charge', d3.forceManyBody().strength(-1500))  // Very strong repulsion for maximum spacing
                    .force('center', d3.forceCenter(width / 2, height / 2))
                    .force('collision', d3.forceCollide().radius(d => (d as NetworkNode).radius + 25))  // Large collision buffer
                    .force('organizationX', d3.forceX(d => {
                        // Organize by organization horizontally
                        const uniqueOrgs = Array.from(new Set(filteredNodes.map(n => n.org))).sort();
                        const orgIndex = uniqueOrgs.indexOf((d as NetworkNode).org);
                        const totalOrgs = uniqueOrgs.length;
                        const spacing = width * 0.8 / Math.max(totalOrgs - 1, 1);
                        return width * 0.1 + orgIndex * spacing;
                    }).strength(0.1))  // Moderate organization force
                    .force('typeY', d3.forceY(d => {
                        // Separate local and npm packages vertically
                        return (d as NetworkNode).type === 'local' ? height * 0.4 : height * 0.6;
                    }).strength(0.08));  // Gentle vertical organization

                simulationRef.current = simulation;

                // Create links
                const link = g.append('g')
                    .attr('class', 'links')
                    .selectAll('line')
                    .data(filteredLinks)
                    .enter().append('line')
                    .attr('stroke', '#d1d5db')  // Very light grey
                    .attr('stroke-width', 1.5)  // Thinner lines
                    .attr('stroke-opacity', 0.4)  // Much more transparent
                    .attr('marker-end', 'url(#arrowhead)');



                // Create nodes
                const node = g.append('g')
                    .attr('class', 'nodes')
                    .selectAll('g')
                    .data(filteredNodes)
                    .enter().append('g')
                    .attr('class', 'node')
                    .style('cursor', 'pointer')
                    .call(d3.drag<SVGGElement, NetworkNode>()
                        .on('start', (event, d) => {
                            if (!event.active) simulation.alphaTarget(0.3).restart();
                            d.fx = d.x;
                            d.fy = d.y;
                        })
                        .on('drag', (event, d) => {
                            d.fx = event.x;
                            d.fy = event.y;
                        })
                        .on('end', (event, d) => {
                            if (!event.active) simulation.alphaTarget(0);
                            d.fx = null;
                            d.fy = null;
                        }));

                // Add circles
                node.append('circle')
                    .attr('r', d => d.radius)
                    .attr('fill', d => d.color)
                    .attr('stroke', d => d.type === 'npm' ? '#10b981' : '#3b82f6')
                    .attr('stroke-width', d => selectedNode === d.id ? 4 : 2);

                // Add labels
                node.append('text')
                    .text(d => d.label)
                    .attr('x', 0)
                    .attr('y', d => d.radius + 15)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '12px')
                    .attr('font-weight', d => selectedNode === d.id ? 'bold' : 'normal')
                    .attr('fill', '#374151');

                // Add version labels
                node.append('text')
                    .text(d => `v${d.version}`)
                    .attr('x', 0)
                    .attr('y', d => d.radius + 28)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', '#6b7280');

                // Add click handlers
                node.on('click', (event, d) => {
                    event.stopPropagation();
                    setSelectedNode(selectedNode === d.id ? null : d.id);
                });

                // Update positions
                simulation.on('tick', () => {
                    link
                        .attr('x1', d => (d.source as NetworkNode).x!)
                        .attr('y1', d => (d.source as NetworkNode).y!)
                        .attr('x2', d => (d.target as NetworkNode).x!)
                        .attr('y2', d => (d.target as NetworkNode).y!);

                    node.attr('transform', d => `translate(${d.x},${d.y})`);
                });

                // Cleanup function
                cleanupFunction = () => {
                    if (simulationRef.current) {
                        simulationRef.current.stop();
                        simulationRef.current = null;
                    }
                    d3.selectAll('.tooltip').remove();
                };

                setIsReady(true);

            } catch (error) {
                console.error('Error initializing graph:', error);
                setError(error instanceof Error ? error.message : 'Unknown error');
            }
        };

        // Start initialization
        initializeGraph();

        return () => {
            if (cleanupFunction) {
                cleanupFunction();
            }
        };
    }, [interdependencies, repositories, npmPackages, crossDependencies, filterMode, visibleOrgs]);

    // Center view on selected node
    useEffect(() => {
        if (selectedNode && svgRef.current && zoomBehaviorRef.current) {
            // Small delay to ensure D3 simulation has positioned the nodes
            setTimeout(() => {
                const svg = d3.select(svgRef.current!);
                const selectedNodeElement = svg.select(`.node`).filter((d: any) => d.id === selectedNode);

                if (!selectedNodeElement.empty()) {
                    const nodeData = selectedNodeElement.datum() as any;
                    if (nodeData && nodeData.x !== undefined && nodeData.y !== undefined) {
                        const containerRect = containerRef.current?.getBoundingClientRect();
                        if (containerRect) {
                            const centerX = containerRect.width / 2;
                            const centerY = containerRect.height / 2;

                            // Calculate the transform to center the selected node
                            const currentTransform = d3.zoomTransform(svgRef.current!);
                            const scale = currentTransform.k;

                            // New transform to center the node
                            const newX = centerX - nodeData.x * scale;
                            const newY = centerY - nodeData.y * scale;

                            // Apply smooth transition to center on the selected node
                            svg.transition()
                                .duration(750)
                                .call(zoomBehaviorRef.current!.transform, d3.zoomIdentity.translate(newX, newY).scale(scale));
                        }
                    }
                }
            }, 100);
        }
    }, [selectedNode]);

    // Update node styling when selection changes
    useEffect(() => {
        if (svgRef.current) {
            const svg = d3.select(svgRef.current);

            // Update circle stroke width for selection
            svg.selectAll('.node circle')
                .attr('stroke-width', (d: any) => selectedNode === d.id ? 4 : 2);

            // Update text font weight for selection
            svg.selectAll('.node text')
                .attr('font-weight', (d: any) => selectedNode === d.id ? 'bold' : 'normal');
        }
    }, [selectedNode]);

    // Derive unique organizations from data
    const derivedUniqueOrgs = useMemo(() => {
        const allDependencies = [
            ...interdependencies,
            ...crossDependencies.map(dep => ({
                from: dep.from,
                to: dep.to,
                version: dep.version,
                type: dep.type
            }))
        ];

        const involvedPackages = new Set();
        allDependencies.forEach(dep => {
            involvedPackages.add(dep.from);
            involvedPackages.add(dep.to);
        });

        const relevantRepos = repositories.filter(repo => involvedPackages.has(repo.package.name));
        const relevantNpmPackages = npmPackages.filter(pkg => involvedPackages.has(pkg.name));

        const allNodes = [
            ...relevantRepos.map(repo => ({
                org: repo.package.name.startsWith('@') ? repo.package.name.split('/')[0] : 'unscoped'
            })),
            ...relevantNpmPackages.map(pkg => ({
                org: pkg.scope || (pkg.name.startsWith('@') ? pkg.name.split('/')[0] : 'unscoped')
            }))
        ];

        return [...new Set(allNodes.map(node => node.org).filter(Boolean))];
    }, [interdependencies, repositories, npmPackages, crossDependencies]);

    // Initialize visible organizations (only if user hasn't manually interacted)
    useEffect(() => {
        if (!hasUserInteracted && visibleOrgs.size === 0 && derivedUniqueOrgs.length > 0) {
            setVisibleOrgs(new Set(derivedUniqueOrgs));
        }
    }, [derivedUniqueOrgs, visibleOrgs.size, hasUserInteracted]);

    // Zoom controls
    const zoomIn = useCallback(() => {
        if (svgRef.current && zoomBehaviorRef.current) {
            d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.5);
        }
    }, []);

    const zoomOut = useCallback(() => {
        if (svgRef.current && zoomBehaviorRef.current) {
            d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1 / 1.5);
        }
    }, []);

    const resetZoom = useCallback(() => {
        if (svgRef.current && zoomBehaviorRef.current) {
            d3.select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!isFullscreen) {
            if (containerRef.current?.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        setIsFullscreen(!isFullscreen);
    }, [isFullscreen]);

    const clearSelection = useCallback(() => {
        setSelectedNode(null);
        setFilterMode('all');
    }, []);

    const handleOrgToggle = useCallback((org: string) => {
        const newVisibleOrgs = new Set(visibleOrgs);
        if (newVisibleOrgs.has(org)) {
            newVisibleOrgs.delete(org);
        } else {
            newVisibleOrgs.add(org);
        }
        setVisibleOrgs(newVisibleOrgs);
        setHasUserInteracted(true);
    }, [visibleOrgs]);

    const handleShowAllOrgs = useCallback(() => {
        setVisibleOrgs(new Set(derivedUniqueOrgs));
        setHasUserInteracted(true);
    }, [derivedUniqueOrgs]);

    const handleHideAllOrgs = useCallback(() => {
        setVisibleOrgs(new Set());
        setHasUserInteracted(true);
    }, []);

    useEffect(() => {
        if (!selectedNode && filterMode === 'connected') {
            setFilterMode('all');
        }
    }, [selectedNode, filterMode]);

    return (
        <div
            ref={containerRef}
            className={`relative bg-white rounded-lg shadow-md ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[600px]'}`}
        >
            {/* Controls */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                    onClick={zoomIn}
                    className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn size={16} />
                </button>
                <button
                    onClick={zoomOut}
                    className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut size={16} />
                </button>
                <button
                    onClick={resetZoom}
                    className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    title="Reset Zoom"
                >
                    <RotateCcw size={16} />
                </button>
                <button
                    onClick={() => setFilterMode(filterMode === 'all' ? 'connected' : 'all')}
                    className={`px-3 py-2 rounded transition-colors flex items-center gap-2 text-sm font-medium ${filterMode === 'connected'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                        } ${!selectedNode && filterMode === 'all' ? 'opacity-50' : ''}`}
                    title={
                        !selectedNode
                            ? "First click a node to select it, then use this button to show only connected packages"
                            : filterMode === 'all'
                                ? "Show only packages connected to the selected node"
                                : "Show all packages again"
                    }
                    disabled={!selectedNode && filterMode === 'all'}
                >
                    <Filter size={16} />
                    {filterMode === 'connected' ? 'Show All' : 'Focus'}
                </button>
                {selectedNode && (
                    <button
                        onClick={clearSelection}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                        title="Clear selection and show all packages"
                    >
                        <X size={16} />
                        Clear
                    </button>
                )}
            </div>

            {/* Interactive Legend */}
            <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg p-4 text-sm max-w-sm space-y-4 shadow-lg">
                {/* Node Types */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Node Types:</h4>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-50"></div>
                            <span>🏠 Local Packages</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-green-500 bg-green-50"></div>
                            <span>📦 NPM Packages</span>
                        </div>
                    </div>
                </div>

                {/* Organizations/Scopes - Interactive */}
                {derivedUniqueOrgs.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Organizations/Scopes:</h4>
                            <div className="flex gap-1">
                                <button
                                    onClick={handleShowAllOrgs}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                    All
                                </button>
                                <button
                                    onClick={handleHideAllOrgs}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                >
                                    None
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {derivedUniqueOrgs.map((org) => {
                                const isVisible = visibleOrgs.has(org);
                                const orgColor = actualOrgColors[org] || '#f3f4f6';
                                return (
                                    <div
                                        key={org}
                                        className={`flex items-center gap-2 p-1 rounded cursor-pointer transition-all ${isVisible
                                            ? 'bg-white shadow-sm border border-gray-200'
                                            : 'bg-gray-50 opacity-50'
                                            } hover:shadow-md`}
                                        onClick={() => handleOrgToggle(org)}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full border border-gray-300"
                                            style={{ backgroundColor: orgColor }}
                                        ></div>
                                        <span className="text-xs font-medium truncate">{org}</span>
                                        <div className="text-xs text-gray-400 ml-auto">
                                            {isVisible ? '👁️' : '🔒'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-xs text-gray-500 italic mt-2">
                            Click to show/hide organizations
                        </div>
                    </div>
                )}
            </div>

            {/* Selection info */}
            {selectedNode && (() => {
                // Find the selected node data
                const allDependencies = [
                    ...interdependencies,
                    ...crossDependencies.map(dep => ({
                        from: dep.from,
                        to: dep.to,
                        version: dep.version,
                        type: dep.type
                    }))
                ];

                const involvedPackages = new Set<string>();
                allDependencies.forEach(dep => {
                    involvedPackages.add(dep.from);
                    involvedPackages.add(dep.to);
                });

                const relevantRepos = repositories.filter(repo => involvedPackages.has(repo.package.name));
                const relevantNpmPackages = npmPackages.filter(pkg => involvedPackages.has(pkg.name));

                // Create unified node data
                const allNodes = [
                    ...relevantRepos.map(repo => ({
                        id: `local:${repo.package.name}`,
                        packageName: repo.package.name,
                        label: repo.package.name.split('/')[1] || repo.package.name,
                        org: repo.package.name.startsWith('@') ? repo.package.name.split('/')[0] : 'unscoped',
                        version: repo.package.version,
                        type: 'local' as const,
                        description: repo.package.description
                    })),
                    ...relevantNpmPackages.map(pkg => ({
                        id: `npm:${pkg.name}`,
                        packageName: pkg.name,
                        label: pkg.name.split('/')[1] || pkg.name,
                        org: pkg.scope || (pkg.name.startsWith('@') ? pkg.name.split('/')[0] : 'unscoped'),
                        version: pkg.version,
                        type: 'npm' as const,
                        description: pkg.description,
                        homepage: pkg.homepage,
                        repository: pkg.repository?.url
                    }))
                ];

                const selectedNodeData = allNodes.find(node => node.id === selectedNode);
                if (!selectedNodeData) return null;

                // Create scope to identity mapping from npmScopes data
                // Handle both @scope and scope formats
                const scopeToIdentityMap = new Map<string, string>();
                npmScopes.forEach(scopeData => {
                    // Store both formats: @scope and scope
                    const scope = scopeData.scope;
                    const normalizedScope = scope.startsWith('@') ? scope : `@${scope}`;
                    const baseScope = scope.startsWith('@') ? scope.slice(1) : scope;

                    scopeToIdentityMap.set(scope, scopeData.identityId);
                    scopeToIdentityMap.set(normalizedScope, scopeData.identityId);
                    scopeToIdentityMap.set(baseScope, scopeData.identityId);
                });

                console.log('Selected node:', selectedNodeData);
                console.log('Available npmScopes:', npmScopes);
                console.log('Scope to identity map:', Array.from(scopeToIdentityMap.entries()));

                // For local packages, extract owner and repo name for repository link
                const getRepositoryLink = () => {
                    if (selectedNodeData.type === 'local' && selectedNodeData.packageName.includes('/')) {
                        const [scope, repo] = selectedNodeData.packageName.split('/');
                        console.log('Looking up scope:', scope);

                        // Try different scope formats
                        let identityId = scopeToIdentityMap.get(scope) ||
                            scopeToIdentityMap.get(scope.replace('@', '')) ||
                            scopeToIdentityMap.get(`@${scope.replace('@', '')}`);

                        console.log('Found identity for scope:', scope, '-> identity:', identityId);

                        if (identityId) {
                            return `/repositories/${identityId}/${repo}`;
                        }
                    }
                    return null;
                };

                // For local packages, get the identity (organization) for identity link
                const getIdentityLink = () => {
                    if (selectedNodeData.type === 'local' && selectedNodeData.org && selectedNodeData.org !== 'unscoped') {
                        console.log('Looking up org:', selectedNodeData.org);

                        // Try different scope formats
                        let identityId = scopeToIdentityMap.get(selectedNodeData.org) ||
                            scopeToIdentityMap.get(selectedNodeData.org.replace('@', '')) ||
                            scopeToIdentityMap.get(`@${selectedNodeData.org.replace('@', '')}`);

                        console.log('Found identity for org:', selectedNodeData.org, '-> identity:', identityId);

                        if (identityId) {
                            return `/identity/${identityId}`;
                        }
                    }
                    return null;
                };

                const repositoryLink = getRepositoryLink();
                const identityLink = getIdentityLink();

                return (
                    <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg p-4 text-sm max-w-md shadow-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Selected Package Details</h4>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Package:</span>
                                <span className="font-mono">{selectedNodeData.packageName}</span>
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                    {selectedNodeData.type === 'local' ? '🏠 Local' : '📦 NPM'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="font-medium">Version:</span>
                                <span>v{selectedNodeData.version}</span>
                            </div>

                            {selectedNodeData.org && selectedNodeData.org !== 'unscoped' && (
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

                            {/* Debug section - remove this after testing */}
                            <div className="mt-3 pt-3 border-t border-yellow-200 bg-yellow-50 p-2 rounded text-xs">
                                <div className="font-medium text-yellow-800 mb-1">Debug Info:</div>
                                <div>Package: {selectedNodeData.packageName}</div>
                                <div>Type: {selectedNodeData.type}</div>
                                <div>Org: {selectedNodeData.org}</div>
                                <div>npmScopes count: {npmScopes.length}</div>
                                <div>Repository link: {repositoryLink || 'null'}</div>
                                <div>Identity link: {identityLink || 'null'}</div>
                                {npmScopes.length > 0 && (
                                    <div>Available scopes: {npmScopes.map(s => `${s.scope} -> ${s.identityId}`).join(', ')}</div>
                                )}
                            </div>

                            {/* Links section */}
                            {(repositoryLink || identityLink || (selectedNodeData.type === 'npm' && ((selectedNodeData as any).homepage || (selectedNodeData as any).repository))) && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
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
                                        {selectedNodeData.type === 'npm' && (selectedNodeData as any).homepage && (
                                            <a
                                                href={(selectedNodeData as any).homepage}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 transition-colors"
                                            >
                                                <span>🌐</span>
                                                Homepage
                                            </a>
                                        )}
                                        {selectedNodeData.type === 'npm' && (selectedNodeData as any).repository && (
                                            <a
                                                href={(selectedNodeData as any).repository}
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

                            {/* Filter status */}
                            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                                {filterMode === 'connected'
                                    ? '🟣 Showing only connected packages'
                                    : '👀 All packages visible - click "Focus" to see only connections'}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Loading/Error Overlay */}
            {!isReady && !error && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
                    <div className="text-gray-500">Loading network graph...</div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
                    <div className="text-red-500">Error: {error}</div>
                </div>
            )}

            {/* SVG Container */}
            <svg
                ref={svgRef}
                className="w-full h-full"
                style={{ background: '#f9fafb' }}
            />
        </div>
    );
}

// Wrapper component that handles the graph type checking
export function NetworkGraphWrapper({ graph }: { graph: DependencyGraphType | EnhancedDependencyGraph }) {
    const isEnhanced = isEnhancedGraph(graph);
    const { repositories, interdependencies } = graph;

    // Extract enhanced data if available
    const npmPackages = isEnhanced ? graph.npmPackages : [];
    const crossDependencies = isEnhanced ? graph.crossDependencies : [];
    const npmScopes = isEnhanced ? graph.npmScopes : [];

    const hasAnyDependencies = interdependencies.length > 0 || crossDependencies.length > 0;

    if (!hasAnyDependencies) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-500 italic">No dependencies found to visualize.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold mb-2">Interactive Dependency Network</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Explore package dependencies with an interactive force-directed graph.
                    Click any package to select it, then use the "Focus" button to show only its connections.
                </p>
            </div>
            <InteractiveNetworkGraph
                interdependencies={interdependencies}
                repositories={repositories}
                npmPackages={npmPackages}
                crossDependencies={crossDependencies}
                npmScopes={npmScopes}
            />
        </div>
    );
} 