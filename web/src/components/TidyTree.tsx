import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export interface TidyTreeNode {
    name: string;
    attributes?: { count?: number; contextType?: string; [key: string]: unknown };
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

        // Find extents for centering and scaling
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        treeRoot.each((d: d3.HierarchyPointNode<TidyTreeNode>) => {
            const x = d.x ?? 0;
            const y = d.y ?? 0;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        // Calculate tree dimensions
        const treeWidth = maxY - minY;
        const treeHeight = maxX - minX;

        // Calculate scale to fit within container with padding
        const padding = 40;
        const availableWidth = Math.max(width - padding * 2, 100);
        const availableHeight = Math.max(height - padding * 2, 100);

        const scaleX = treeWidth > 0 ? availableWidth / treeWidth : 1;
        const scaleY = treeHeight > 0 ? availableHeight / treeHeight : 1;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

        // Calculate offsets for centering
        const xOffset = (width - treeWidth * scale) / 2 - minY * scale;
        const yOffset = (height - treeHeight * scale) / 2 - minX * scale;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .style('background', '#f8fafc');

        const g = svg.append('g')
            .attr('transform', `translate(${xOffset},${yOffset}) scale(${scale})`);

        // Add zoom behavior with initial scale
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3]) // Min zoom 0.1x, max zoom 3x
            .on('zoom', (event) => {
                g.attr('transform', `translate(${event.transform.x + xOffset},${event.transform.y + yOffset}) scale(${scale * event.transform.k})`);
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

            // Enhanced scaling for frequency > 1
            let scaleFactor = 1;
            if (count > 1) {
                // More aggressive scaling for words with frequency > 1
                scaleFactor = Math.min(1 + (count - 1) * 0.4, 3.0); // Linear scaling with cap at 3x
            }

            return {
                width: baseWidth * scaleFactor,
                height: baseHeight * scaleFactor,
                fontSize: Math.min(16 * scaleFactor, 28) // Cap font size at 28
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
            const contextType = d.data.attributes?.contextType;

            if (contextType === 'root') return ROOT_COLOR;
            if (contextType === 'left') return LEFT_COLOR;
            if (contextType === 'right') return RIGHT_COLOR;

            // Fallback: if no contextType, inherit from parent
            if (d.parent) {
                return getNodeColor(d.parent);
            }

            return ROOT_COLOR; // Default fallback
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
            .attr('stroke', '#374151')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                const count = getNodeCount(d);
                const displayWord = formatWordDisplay(d.data.name);
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);

                const frequencyText = count > 1 ?
                    `<span style="color: #dc2626; font-weight: bold;">Frequency: ${count}</span>` :
                    `Frequency: ${count}`;

                tooltip.html(`<strong>${displayWord}</strong><br/>${frequencyText}<br/><em>Click to explore this word</em>`)
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
