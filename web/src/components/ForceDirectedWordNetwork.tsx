import React, { useRef, useEffect } from 'react';
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

    useEffect(() => {
        if (!nodes.length || !svgRef.current) return;
        // Remove previous svg content
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current as SVGSVGElement)
            .attr('width', width)
            .attr('height', height)
            .style('cursor', 'grab');

        const g = svg.append('g');

        // Set up zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 4])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                g.attr('transform', event.transform.toString());
            });
        (svg as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(zoom);

        // Calculate rectangle dimensions based on word length
        const getRectangleDimensions = (word: string) => {
            const baseWidth = Math.max(word.length * 8, 40); // Minimum width of 40
            const baseHeight = 30; // Fixed height
            return { width: baseWidth, height: baseHeight };
        };

        // Set up simulation with dynamic collision radius
        const simulation = d3.forceSimulation<Node>(nodes)
            .force('link', d3.forceLink<Node, Edge>(edges).id((d: Node) => d.id).distance(120).strength(1))
            .force('charge', d3.forceManyBody<Node>().strength(-350))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide<Node>((d) => {
                const dims = getRectangleDimensions(d.id);
                return Math.max(dims.width, dims.height) / 2 + 10; // Add padding
            }));

        // Draw links
        const link = g.append('g')
            .attr('stroke', '#aaa')
            .attr('stroke-width', 2)
            .selectAll<SVGLineElement, Edge>('line')
            .data(edges)
            .join('line')
            .attr('stroke-opacity', 0.7)
            .attr('marker-end', 'url(#arrow)');

        // Draw nodes as rectangles
        const node = g.append('g')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .selectAll<SVGRectElement, Node>('rect')
            .data(nodes)
            .join('rect')
            .attr('fill', '#60a5fa')
            .attr('rx', 6) // Rounded corners
            .attr('ry', 6)
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

        // Arrowhead marker
        svg.append('defs').append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 18)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#aaa');

        simulation.on('tick', () => {
            link
                .attr('x1', (d) => (typeof d.source === 'string' ? 0 : d.source.x ?? 0))
                .attr('y1', (d) => (typeof d.source === 'string' ? 0 : d.source.y ?? 0))
                .attr('x2', (d) => (typeof d.target === 'string' ? 0 : d.target.x ?? 0))
                .attr('y2', (d) => (typeof d.target === 'string' ? 0 : d.target.y ?? 0));

            node.each(function (d) {
                const dims = getRectangleDimensions(d.id);
                const rect = d3.select(this);
                rect
                    .attr('x', (d.x ?? 0) - dims.width / 2)
                    .attr('y', (d.y ?? 0) - dims.height / 2)
                    .attr('width', dims.width)
                    .attr('height', dims.height);
            });

            label
                .attr('x', (d) => d.x ?? 0)
                .attr('y', (d) => d.y ?? 0);
        });

        // Drag behavior
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

        // Clean up on unmount
        return () => {
            simulation.stop();
        };
    }, [nodes, edges, width, height]);

    return (
        <svg ref={svgRef} style={{ width: '100%', height: '100%', background: '#f8fafc', borderRadius: 12 }} />
    );
};

export default ForceDirectedWordNetwork; 