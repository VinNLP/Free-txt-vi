import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export interface Node {
    id: string;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

export interface Edge {
    source: string | Node;
    target: string | Node;
    weight: number;
}

interface ForceDirectedWordNetworkProps {
    nodes: Node[];
    edges: Edge[];
    width?: number;
    height?: number;
}

const ForceDirectedWordNetwork: React.FC<ForceDirectedWordNetworkProps> = ({ nodes, edges, width = 900, height = 600 }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string } | null>(null);
    const [highlightedEdge, setHighlightedEdge] = useState<number | null>(null);
    const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

    useEffect(() => {
        if (!nodes.length || !svgRef.current) return;
        d3.select(svgRef.current).selectAll('*').remove();
        const svg = d3.select(svgRef.current as SVGSVGElement)
            .attr('width', width)
            .attr('height', height)
            .style('cursor', 'grab');
        const g = svg.append('g');
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 4])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                g.attr('transform', event.transform.toString());
            });
        (svg as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(zoom);
        const getRectangleDimensions = (word: string) => {
            const baseWidth = Math.max(word.length * 8, 40);
            const baseHeight = 30;
            return { width: baseWidth, height: baseHeight };
        };
        // Edge thickness and color scale
        const weights = edges.map(e => e.weight);
        const minW = Math.min(...weights);
        const maxW = Math.max(...weights);
        const thicknessScale = d3.scaleLinear().domain([minW, maxW]).range([1, 8]);
        const colorScale = d3.scaleLinear<string>().domain([minW, maxW]).range(['#d1d5db', '#2563eb']);
        // Set up simulation
        const simulation = d3.forceSimulation<Node>(nodes)
            .force('link', d3.forceLink<Node, Edge>(edges).id((d: Node) => d.id).distance(120).strength(1))
            .force('charge', d3.forceManyBody<Node>().strength(-350))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide<Node>((d) => {
                const dims = getRectangleDimensions(d.id);
                return Math.max(dims.width, dims.height) / 2 + 10;
            }));
        // Draw links
        const link = g.append('g')
            .attr('stroke', '#aaa')
            .selectAll<SVGLineElement, Edge>('line')
            .data(edges)
            .join('line')
            .attr('stroke-opacity', (d, i) => highlightedEdge === i ? 1 : 0.7)
            .attr('stroke-width', d => thicknessScale(d.weight))
            .attr('stroke', d => colorScale(d.weight))
            .on('click', function (event, d) {
                const i = edges.indexOf(d);
                if (highlightedEdge === i) {
                    setHighlightedEdge(null);
                    setTooltip(null);
                } else {
                    setHighlightedEdge(i);
                    setTooltip({
                        x: event.offsetX,
                        y: event.offsetY,
                        content: `Edge: ${typeof d.source === 'string' ? d.source : d.source.id} → ${typeof d.target === 'string' ? d.target : d.target.id} (weight: ${d.weight})`
                    });
                }
            });
        // Draw nodes as rectangles
        const node = g.append('g')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .selectAll<SVGRectElement, Node>('rect')
            .data(nodes)
            .join('rect')
            .attr('fill', '#60a5fa')
            .attr('rx', 6)
            .attr('ry', 6)
            .on('click', function (event, d) {
                if (highlightedNode === d.id) {
                    setHighlightedNode(null);
                    setTooltip(null);
                } else {
                    setHighlightedNode(d.id);
                    // Count degree and log connected edges for debugging
                    const connectedEdges = edges.filter(e => {
                        const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
                        const targetId = typeof e.target === 'string' ? e.target : e.target.id;
                        return sourceId === d.id || targetId === d.id;
                    });
                    console.log(`Node "${d.id}" clicked. Connected edges:`, connectedEdges.map(e => ({
                        source: typeof e.source === 'string' ? e.source : e.source.id,
                        target: typeof e.target === 'string' ? e.target : e.target.id,
                        weight: e.weight
                    })));
                    const degree = connectedEdges.length;
                    setTooltip({
                        x: event.offsetX,
                        y: event.offsetY,
                        content: `Node: ${d.id} (degree: ${degree})`
                    });
                }
            })
            .call(drag(simulation));
        // Draw labels
        const label = g.append('g')
            .selectAll<SVGTextElement, Node>('text')
            .data(nodes)
            .join('text')
            .text((d) => d.id)
            .attr('font-size', 14)
            .attr('font-family', 'Inter,Roboto,Arial,Helvetica,sans-serif')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('pointer-events', 'none')
            .attr('fill', '#222');
        simulation.on('tick', () => {
            link
                .attr('x1', (d) => (typeof d.source === 'string' ? 0 : d.source.x ?? 0))
                .attr('y1', (d) => (typeof d.source === 'string' ? 0 : d.source.y ?? 0))
                .attr('x2', (d) => (typeof d.target === 'string' ? 0 : d.target.x ?? 0))
                .attr('y2', (d) => (typeof d.target === 'string' ? 0 : d.target.y ?? 0))
                .attr('stroke-opacity', (d, i) => {
                    // Check if this specific edge is highlighted
                    if (highlightedEdge === i) return 1;
                    
                    // Check if a node is highlighted and this edge connects to it
                    if (highlightedNode) {
                        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
                        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
                        return (sourceId === highlightedNode || targetId === highlightedNode) ? 1 : 0.3;
                    }
                    
                    return 0.7;
                })
                .attr('stroke', (d, i) => {
                    // Check if this specific edge is highlighted
                    if (highlightedEdge === i) return '#2563eb';
                    
                    // Check if a node is highlighted and this edge connects to it
                    if (highlightedNode) {
                        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
                        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
                        return (sourceId === highlightedNode || targetId === highlightedNode) ? '#2563eb' : colorScale(d.weight);
                    }
                    
                    return colorScale(d.weight);
                });
            node.each(function (d) {
                const dims = getRectangleDimensions(d.id);
                const rect = d3.select(this);
                rect
                    .attr('x', (d.x ?? 0) - dims.width / 2)
                    .attr('y', (d.y ?? 0) - dims.height / 2)
                    .attr('width', dims.width)
                    .attr('height', dims.height)
                    .attr('fill', highlightedNode === d.id ? '#2563eb' : '#60a5fa');
            });
            label
                .attr('x', (d) => d.x ?? 0)
                .attr('y', (d) => d.y ?? 0)
                .attr('fill', d => highlightedNode === d.id ? '#fff' : '#222');
        });
        function drag(simulation: d3.Simulation<Node, Edge>) {
            function dragstarted(event: d3.D3DragEvent<SVGRectElement, Node, Node>, d: Node) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            function dragged(event: d3.D3DragEvent<SVGRectElement, Node, Node>, d: Node) {
                d.fx = event.x;
                d.fy = event.y;
            }
            function dragended(event: d3.D3DragEvent<SVGRectElement, Node, Node>, d: Node) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            return d3.drag<SVGRectElement, Node>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }
        return () => {
            simulation.stop();
        };
    }, [nodes, edges, width, height, highlightedEdge, highlightedNode]);
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%', background: '#f8fafc', borderRadius: 12 }} />
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: tooltip.x + 10,
                    top: tooltip.y + 10,
                    background: 'rgba(34, 34, 34, 0.95)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 14,
                    pointerEvents: 'none',
                    zIndex: 10
                }}>{tooltip.content}</div>
            )}
        </div>
    );
};

export default ForceDirectedWordNetwork; 