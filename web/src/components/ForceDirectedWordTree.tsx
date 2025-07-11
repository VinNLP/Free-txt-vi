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
        const gRef = useRef<SVGGElement | null>(null);
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

            // Add a group for zoom/pan
            const g = svg.append('g').attr('ref', gRef);

            // Set up zoom behavior
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.2, 4])
                .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                    g.attr('transform', event.transform);
                });
            zoomRef.current = zoom;
            svg.call(zoom);

            // Find min/max count for scaling
            const counts = nodes.map(n => typeof n.count === 'number' ? n.count : 1);
            const minCount = Math.min(...counts);
            const maxCount = Math.max(...counts);
            const minR = 14, maxR = 40;
            function getRadius(count: number | undefined, isRoot: boolean) {
                if (isRoot) return maxR;
                if (maxCount === minCount) return minR;
                return minR + (((count ?? 1) - minCount) / (maxCount - minCount)) * (maxR - minR);
            }
            // Set up simulation
            const simulation = d3.forceSimulation<ForceNode>(nodes)
                .force('link', d3.forceLink<ForceNode, ForceLink>(links).id((d: ForceNode) => d.id).distance(80).strength(1))
                .force('charge', d3.forceManyBody<ForceNode>().strength(-250))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collide', d3.forceCollide<ForceNode>(d => getRadius(d.count, d.id === treeData.word) + 4));

            // Draw links
            const link = g.append('g')
                .attr('stroke', '#aaa')
                .attr('stroke-width', 2)
                .selectAll<SVGLineElement, ForceLink>('line')
                .data(links)
                .join('line')
                .attr('stroke-opacity', 0.7);

            // Draw nodes
            const node = g.append('g')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .selectAll<SVGCircleElement, ForceNode>('circle')
                .data(nodes)
                .join('circle')
                .attr('r', (d: ForceNode) => getRadius(d.count, d.id === treeData.word))
                .attr('fill', (d: ForceNode) => d.group === 'root' ? '#2563eb' : d.group === 'left' ? '#f59e42' : '#10b981')
                .call(drag(simulation));

            // Draw labels
            const label = g.append('g')
                .selectAll<SVGTextElement, ForceNode>('text')
                .data(nodes)
                .join('text')
                .text((d: ForceNode) => d.id === treeData.word ? d.id : d.id.split('__').pop())
                .attr('font-size', (d: ForceNode) => d.id === treeData.word ? 22 : 16)
                .attr('font-family', 'Inter,Roboto,Arial,Helvetica,sans-serif')
                .attr('text-anchor', 'middle')
                .attr('dy', 5)
                .attr('pointer-events', 'none')
                .attr('fill', '#222');

            simulation.on('tick', () => {
                link
                    .attr('x1', (d: ForceLink) => (d.source as ForceNode).x ?? 0)
                    .attr('y1', (d: ForceLink) => (d.source as ForceNode).y ?? 0)
                    .attr('x2', (d: ForceLink) => (d.target as ForceNode).x ?? 0)
                    .attr('y2', (d: ForceLink) => (d.target as ForceNode).y ?? 0);
                node
                    .attr('cx', (d: ForceNode) => d.x ?? 0)
                    .attr('cy', (d: ForceNode) => d.y ?? 0);
                label
                    .attr('x', (d: ForceNode) => d.x ?? 0)
                    .attr('y', (d: ForceNode) => d.y ?? 0);
            });

            // Drag behavior
            function drag(simulation: d3.Simulation<ForceNode, ForceLink>) {
                function dragstarted(event: d3.D3DragEvent<SVGCircleElement, ForceNode, ForceNode>, d: ForceNode) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }
                function dragged(event: d3.D3DragEvent<SVGCircleElement, ForceNode, ForceNode>, d: ForceNode) {
                    d.fx = event.x;
                    d.fy = event.y;
                }
                function dragended(event: d3.D3DragEvent<SVGCircleElement, ForceNode, ForceNode>, d: ForceNode) {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }
                return d3.drag<SVGCircleElement, ForceNode>()
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