import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import type { WordTreeResponse } from '../services/api';

interface ForceNode {
    id: string;
    group: string;
    count?: number;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}
interface ForceLink {
    source: string | ForceNode;
    target: string | ForceNode;
    value: number;
}

// Helper to convert nested word tree to flat nodes/links for force-directed graph
function wordTreeToForceData(tree: WordTreeResponse) {
    const nodes: ForceNode[] = [];
    const links: ForceLink[] = [];
    const seen = new Set<string>();

    // Recursively walk the tree and build nodes/links
    function walk(node: Record<string, unknown>, parent: string | null, group: string) {
        Object.entries(node).forEach(([key, valueRaw]) => {
            if (key === 'count') return;
            const value: Record<string, unknown> = valueRaw as Record<string, unknown>;
            const id = parent ? `${parent}__${key}` : key;
            if (!seen.has(id)) {
                nodes.push({ id, group, count: typeof value.count === 'number' ? value.count : 1 });
                seen.add(id);
            }
            if (parent) {
                links.push({ source: parent, target: id, value: typeof value.count === 'number' ? value.count : 1 });
            }
            if (typeof value === 'object' && value !== null) {
                walk(value, id, group);
            }
        });
    }

    // Root node
    nodes.push({ id: tree.word, group: 'root' });
    // Left and right
    walk(tree.left as Record<string, unknown>, tree.word, 'left');
    walk(tree.right as Record<string, unknown>, tree.word, 'right');

    return { nodes, links };
}

export interface ForceDirectedWordTreeHandle {
    reset: () => void;
}

interface ForceDirectedWordTreeProps {
    treeData: WordTreeResponse;
    width?: number;
    height?: number;
}

export const ForceDirectedWordTree = forwardRef<ForceDirectedWordTreeHandle, ForceDirectedWordTreeProps>(
    ({ treeData, width = 900, height = 700 }, ref) => {
        const svgRef = useRef<SVGSVGElement | null>(null);
        // const gRef = useRef<SVGGElement | null>(null); // Not used, remove
        const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

        useImperativeHandle(ref, () => ({
            reset: () => {
                if (svgRef.current && zoomRef.current) {
                    d3.select(svgRef.current)
                        .transition()
                        .duration(500)
                        .call(zoomRef.current.transform, d3.zoomIdentity);
                }
            },
        }), []);

        useEffect(() => {
            if (!treeData) return;
            const { nodes, links } = wordTreeToForceData(treeData);

            // Remove previous svg content
            d3.select(svgRef.current).selectAll('*').remove();

            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height)
                .style('cursor', 'grab');

            // --- Add arrowhead markers ---
            const defs = svg.append('defs');
            defs.append('marker')
                .attr('id', 'arrow-left')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 2)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M10,-5L0,0L10,5')
                .attr('fill', '#f59e42');
            defs.append('marker')
                .attr('id', 'arrow-right')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 8)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#10b981');

            // Add a group for zoom/pan
            const g = svg.append('g');

            // Set up zoom behavior
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.2, 4])
                .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                    g.attr('transform', event.transform.toString());
                });
            zoomRef.current = zoom;
            if (svgRef.current) {
                d3.select<SVGSVGElement, unknown>(svgRef.current).call(zoom);
            }

            // Rectangle sizing based on word length
            function getRectangleDimensions(id: string, count: number | undefined, isRoot: boolean) {
                const word = id === treeData.word ? id : id.split('__').pop() || '';
                const baseWidth = Math.max(word.length * 8, isRoot ? 60 : 40); // Root node wider
                const baseHeight = isRoot ? 38 : 28;
                return { width: baseWidth, height: baseHeight };
            }
            // Set up simulation
            const simulation = d3.forceSimulation<ForceNode>(nodes)
                .force('link', d3.forceLink<ForceNode, ForceLink>(links).id((d: ForceNode) => d.id).distance(80).strength(1))
                .force('charge', d3.forceManyBody<ForceNode>().strength(-250))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collide', d3.forceCollide<ForceNode>(d => {
                    const dims = getRectangleDimensions(d.id, d.count, d.id === treeData.word);
                    return Math.max(dims.width, dims.height) / 2 + 6;
                }));

            // Draw links
            const link = g.append('g')
                .attr('stroke', '#aaa')
                .attr('stroke-width', 2)
                .selectAll<SVGLineElement, ForceLink>('line')
                .data(links)
                .join('line')
                .attr('stroke-opacity', 0.7);

            // Draw arrows at the middle of each link
            const arrow = g.append('g')
                .selectAll<SVGPathElement, ForceLink>('path')
                .data(links)
                .join('path')
                .attr('fill', (d: ForceLink) => {
                    const targetId = typeof d.target === 'string' ? d.target : d.target.id;
                    const targetNode = nodes.find(n => n.id === targetId);
                    if (targetNode?.group === 'left') return '#f59e42';
                    if (targetNode?.group === 'right') return '#10b981';
                    return '#aaa';
                });

            const LEFT_COLOR = '#fde68a'; // light orange
            const RIGHT_COLOR = '#bbf7d0'; // light green
            const ROOT_COLOR = '#60a5fa'; // blue
            // Draw nodes as rectangles
            const node = g.append('g')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .selectAll<SVGRectElement, ForceNode>('rect')
                .data(nodes)
                .join('rect')
                .attr('fill', (d: ForceNode) =>
                    d.group === 'root' ? ROOT_COLOR :
                        d.group === 'left' ? LEFT_COLOR :
                            d.group === 'right' ? RIGHT_COLOR :
                                '#60a5fa')
                .attr('rx', 6)
                .attr('ry', 6)
                .call(drag(simulation));

            // Draw labels
            const label = g.append('g')
                .selectAll<SVGTextElement, ForceNode>('text')
                .data(nodes)
                .join('text')
                .text((d: ForceNode) => d.id === treeData.word ? d.id : d.id.split('__').pop() || '')
                .attr('font-size', (d: ForceNode) => d.id === treeData.word ? 22 : 16)
                .attr('font-family', 'Inter,Roboto,Arial,Helvetica,sans-serif')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('pointer-events', 'none')
                .attr('fill', '#222');

            simulation.on('tick', () => {
                link
                    .attr('x1', (d: ForceLink) => (d.source as ForceNode).x ?? 0)
                    .attr('y1', (d: ForceLink) => (d.source as ForceNode).y ?? 0)
                    .attr('x2', (d: ForceLink) => (d.target as ForceNode).x ?? 0)
                    .attr('y2', (d: ForceLink) => (d.target as ForceNode).y ?? 0);

                // Draw arrows at the midpoint of each link
                arrow.attr('d', (d: ForceLink) => {
                    let sx = (d.source as ForceNode).x ?? 0;
                    let sy = (d.source as ForceNode).y ?? 0;
                    let tx = (d.target as ForceNode).x ?? 0;
                    let ty = (d.target as ForceNode).y ?? 0;
                    // Determine direction based on group
                    const targetId = typeof d.target === 'string' ? d.target : d.target.id;
                    const targetNode = nodes.find(n => n.id === targetId);
                    if (targetNode?.group === 'left') {
                        // For left context, reverse the arrow direction
                        [sx, sy, tx, ty] = [tx, ty, sx, sy];
                    }
                    // Midpoint
                    const mx = (sx + tx) / 2;
                    const my = (sy + ty) / 2;
                    // Angle of the line
                    const angle = Math.atan2(ty - sy, tx - sx);
                    // Arrow size
                    const size = 12;
                    // Arrowhead points
                    const arrowPoints = [
                        [mx, my],
                        [mx - size * Math.cos(angle - Math.PI / 8), my - size * Math.sin(angle - Math.PI / 8)],
                        [mx - size * Math.cos(angle + Math.PI / 8), my - size * Math.sin(angle + Math.PI / 8)],
                        [mx, my]
                    ];
                    return `M${arrowPoints[0][0]},${arrowPoints[0][1]} L${arrowPoints[1][0]},${arrowPoints[1][1]} L${arrowPoints[2][0]},${arrowPoints[2][1]} Z`;
                });

                node.each(function (d) {
                    const dims = getRectangleDimensions(d.id, d.count, d.id === treeData.word);
                    d3.select(this)
                        .attr('x', (d.x ?? 0) - dims.width / 2)
                        .attr('y', (d.y ?? 0) - dims.height / 2)
                        .attr('width', dims.width)
                        .attr('height', dims.height);
                });
                label
                    .attr('x', (d: ForceNode) => d.x ?? 0)
                    .attr('y', (d: ForceNode) => d.y ?? 0);
            });

            // Drag behavior
            function drag(simulation: d3.Simulation<ForceNode, ForceLink>) {
                function dragstarted(event: d3.D3DragEvent<SVGRectElement, ForceNode, ForceNode>, d: ForceNode) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }
                function dragged(event: d3.D3DragEvent<SVGRectElement, ForceNode, ForceNode>, d: ForceNode) {
                    d.fx = event.x;
                    d.fy = event.y;
                }
                function dragended(event: d3.D3DragEvent<SVGRectElement, ForceNode, ForceNode>, d: ForceNode) {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }
                return d3.drag<SVGRectElement, ForceNode>()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended);
            }

            // Clean up on unmount
            return () => {
                simulation.stop();
            };
        }, [treeData, width, height]);

        return (
            <svg ref={svgRef} style={{ width: '100%', height: '100%', background: '#f8fafc', borderRadius: 12 }} />
        );
    }
); 