import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export interface TidyTreeNode {
    name: string;
    attributes?: Record<string, unknown>;
    children?: TidyTreeNode[];
}

interface TidyTreeProps {
    data: TidyTreeNode[];
    width?: number;
    height?: number;
}

const LEFT_COLOR = '#fde68a'; // light orange
const RIGHT_COLOR = '#bbf7d0'; // light green
const ROOT_COLOR = '#60a5fa'; // blue

const TidyTree: React.FC<TidyTreeProps> = ({ data, width = 1000, height = 800 }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!data || !svgRef.current) return;
        d3.select(svgRef.current).selectAll('*').remove();

        // Convert data to d3.hierarchy
        const root = d3.hierarchy<TidyTreeNode>(data[0]);
        const treeLayout = d3.tree<TidyTreeNode>().nodeSize([60, 120]);
        const treeRoot = treeLayout(root);

        // Find extents for centering
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        treeRoot.each((d: d3.HierarchyPointNode<TidyTreeNode>) => {
            const x = d.x ?? 0;
            const y = d.y ?? 0;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
        const xOffset = (width - (maxY - minY)) / 2 - minY;
        const yOffset = (height - (maxX - minX)) / 2 - minX;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .style('background', '#f8fafc');

        const g = svg.append('g')
            .attr('transform', `translate(${xOffset},${yOffset})`);

        // Draw links
        g.append('g')
            .selectAll('path')
            .data(treeRoot.links())
            .join('path')
            .attr('fill', 'none')
            .attr('stroke', '#aaa')
            .attr('stroke-width', 2)
            .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<TidyTreeNode>, d3.HierarchyPointNode<TidyTreeNode>>()
                .x((d) => (d.y ?? 0))
                .y((d) => (d.x ?? 0))
            );

        // Helper to determine node color
        function getNodeColor(d: d3.HierarchyPointNode<TidyTreeNode>): string {
            if (!d.parent) return ROOT_COLOR;
            // If direct child of root, use index to determine left/right
            if (d.parent.depth === 0) {
                // Assume left children come first, then right children
                const leftCount = Math.floor((d.parent.children?.length ?? 0) / 2);
                const idx = d.parent.children?.indexOf(d) ?? 0;
                if (idx < leftCount) return LEFT_COLOR;
                return RIGHT_COLOR;
            }
            // Otherwise, inherit from parent
            return getNodeColor(d.parent);
        }

        // Draw nodes as rectangles
        const node = g.append('g')
            .selectAll('g')
            .data(treeRoot.descendants())
            .join('g')
            .attr('transform', d => `translate(${d.y ?? 0},${d.x ?? 0})`);

        node.append('rect')
            .attr('x', d => -Math.max((d.data.name.length * 8), 40) / 2)
            .attr('y', -18)
            .attr('width', d => Math.max((d.data.name.length * 8), 40))
            .attr('height', 36)
            .attr('rx', 6)
            .attr('ry', 6)
            .attr('fill', getNodeColor);

        node.append('text')
            .text(d => d.data.name)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', 16)
            .attr('font-family', 'Inter,Roboto,Arial,Helvetica,sans-serif')
            .attr('fill', '#222');
    }, [data, width, height]);

    return <svg ref={svgRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />;
};

export default TidyTree; 