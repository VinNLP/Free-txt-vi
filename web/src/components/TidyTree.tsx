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
    onNodeClick?: (word: string) => void;
}

const LEFT_COLOR = '#fde68a'; // light orange
const RIGHT_COLOR = '#bbf7d0'; // light green
const ROOT_COLOR = '#60a5fa'; // blue

const TidyTree: React.FC<TidyTreeProps> = ({ data, width = 1000, height = 800, onNodeClick }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!data || !svgRef.current) return;
        d3.select(svgRef.current).selectAll('*').remove();

        // Helper function to format word display
        function formatWordDisplay(word: string): string {
            return word.replace(/_/g, ' ');
        }

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

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3]) // Min zoom 0.1x, max zoom 3x
            .on('zoom', (event) => {
                g.attr('transform', `translate(${event.transform.x + xOffset},${event.transform.y + yOffset}) scale(${event.transform.k})`);
            });

        svg.call(zoom);

        // Helper to get node count/frequency
        function getNodeCount(d: d3.HierarchyPointNode<TidyTreeNode>): number {
            const count = d.data.attributes?.count;
            return typeof count === 'number' ? count : 1;
        }

        // Helper to calculate node dimensions based on count
        function getNodeDimensions(d: d3.HierarchyPointNode<TidyTreeNode>) {
            const count = getNodeCount(d);
            const displayWord = formatWordDisplay(d.data.name);
            const baseWidth = Math.max(displayWord.length * 8, 40);
            const baseHeight = 36;

            // Scale factor based on count (logarithmic scaling to prevent extreme sizes)
            const scaleFactor = Math.min(1 + Math.log(count + 1) * 0.3, 2.5);

            return {
                width: baseWidth * scaleFactor,
                height: baseHeight * scaleFactor,
                fontSize: Math.min(16 * scaleFactor, 24) // Cap font size at 24
            };
        }

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

        // Create tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '14px')
            .style('font-family', 'Inter,Roboto,Arial,Helvetica,sans-serif')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('opacity', 0);

        // Draw nodes as rectangles
        const node = g.append('g')
            .selectAll('g')
            .data(treeRoot.descendants())
            .join('g')
            .attr('transform', d => `translate(${d.y ?? 0},${d.x ?? 0})`);

        node.append('rect')
            .attr('x', d => -getNodeDimensions(d).width / 2)
            .attr('y', d => -getNodeDimensions(d).height / 2)
            .attr('width', d => getNodeDimensions(d).width)
            .attr('height', d => getNodeDimensions(d).height)
            .attr('rx', 6)
            .attr('ry', 6)
            .attr('fill', getNodeColor)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                const count = getNodeCount(d);
                const displayWord = formatWordDisplay(d.data.name);
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                tooltip.html(`<strong>${displayWord}</strong><br/>Frequency: ${count}<br/><em>Click to explore this word</em>`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            })
            .on('click', function(event, d) {
                event.stopPropagation();
                if (onNodeClick) {
                    onNodeClick(d.data.name);
                }
            });

        node.append('text')
            .text(d => formatWordDisplay(d.data.name))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', d => getNodeDimensions(d).fontSize)
            .attr('font-family', 'Inter,Roboto,Arial,Helvetica,sans-serif')
            .attr('fill', '#222')
            .style('pointer-events', 'none');

        // Add cursor style to indicate interactivity
        svg.style('cursor', 'grab');
        svg.on('mousedown', () => svg.style('cursor', 'grabbing'));
        svg.on('mouseup', () => svg.style('cursor', 'grab'));
        svg.on('mouseleave', () => svg.style('cursor', 'grab'));

        // Cleanup function
        return () => {
            svg.on('mousedown', null);
            svg.on('mouseup', null);
            svg.on('mouseleave', null);
            tooltip.remove();
        };
    }, [data, width, height, onNodeClick]);

    return <svg ref={svgRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />;
};

export default TidyTree;
