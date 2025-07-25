// Utility functions for downloading analysis results

export const downloadAsJSON = (data: unknown, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadAsCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadAsTXT = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Chart download utilities - Fixed to properly convert canvas to SVG
export const downloadChartAsSVG = (chartRef: React.RefObject<HTMLCanvasElement | null>, filename: string) => {
  if (!chartRef.current) return;

  const canvas = chartRef.current;
  const svgData = canvasToSVG(canvas);
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper function to convert canvas to SVG with proper embedding
const canvasToSVG = (canvas: HTMLCanvasElement): string => {
  const width = canvas.width;
  const height = canvas.height;

  // Convert canvas to data URL
  const dataURL = canvas.toDataURL('image/png');

  // Create SVG with embedded PNG image
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="${dataURL}"/>
</svg>`;
};

// Interactive SVG download function for Chart.js
export const downloadChartAsInteractiveSVG = (chartRef: React.RefObject<{ current: any }>, filename: string) => {
  if (!chartRef.current) return;

  const chart = chartRef.current as any;
  const canvas = chart.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Get chart data and configuration
  const chartData = chart.data;
  const chartOptions = chart.options;
  const chartType = chart.config.type;

  let svgContent = '';

  if (chartData.datasets && chartData.datasets.length > 0) {
    const dataset = chartData.datasets[0];

    if (dataset.data && Array.isArray(dataset.data)) {
      // Create interactive SVG based on chart type
      if (chartType === 'pie' || chartType === 'doughnut') {
        svgContent = createInteractivePieChartSVG(chartData, chartOptions, width, height);
      } else if (chartType === 'bar') {
        svgContent = createInteractiveBarChartSVG(chartData, chartOptions, width, height);
      }
    }
  }

  if (svgContent) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Create interactive pie chart SVG
const createInteractivePieChartSVG = (data: any, options: any, width: number, height: number): string => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  // Helper function to escape XML entities
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Helper function to escape JavaScript content
  const escapeJs = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  };

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .slice {
        transition: all 0.3s ease;
        cursor: pointer;
        transform-origin: center;
      }
      .slice:hover {
        transform: scale(1.05) translate(2px, -2px);
        filter: brightness(1.2);
        stroke-width: 3;
      }
      .slice.active {
        transform: scale(1.1) translate(3px, -3px);
        filter: brightness(1.3);
        stroke-width: 4;
      }
      .label {
        font-family: Arial, sans-serif;
        font-size: 12px;
        fill: #333;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      .value {
        font-family: Arial, sans-serif;
        font-size: 10px;
        fill: #666;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      .legend-item {
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .legend-item:hover {
        opacity: 0.7;
        transform: translateX(2px);
      }
      .legend-item.active {
        opacity: 1;
        transform: translateX(4px);
      }
      .legend-text {
        font-family: Arial, sans-serif;
        font-size: 11px;
        fill: #333;
        transition: all 0.3s ease;
      }
      .tooltip {
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .tooltip.show {
        opacity: 1;
      }
      .tooltip-bg {
        fill: rgba(0, 0, 0, 0.8);
        stroke: #fff;
        stroke-width: 1;
        rx: 4;
        ry: 4;
      }
      .tooltip-text {
        font-family: Arial, sans-serif;
        font-size: 12px;
        fill: #fff;
        text-anchor: middle;
      }
      .tooltip-value {
        font-family: Arial, sans-serif;
        font-size: 10px;
        fill: #ccc;
        text-anchor: middle;
      }
    </style>
  </defs>`;

  const total = data.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);
  let currentAngle = -Math.PI / 2; // Start from top

  // Create pie slices
  data.labels.forEach((label: string, index: number) => {
    const value = data.datasets[0].data[index];
    const percentage = (value / total) * 100;
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;

    // Create pie slice path
    const x1 = centerX + radius * Math.cos(currentAngle);
    const y1 = centerY + radius * Math.sin(currentAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const color = data.datasets[0].backgroundColor?.[index] || '#cccccc';
    const escapedLabel = escapeXml(label);

    svg += `
  <g class="slice" id="slice-${index}" data-index="${index}" data-label="${escapedLabel}" data-value="${value}" data-percentage="${percentage.toFixed(1)}">
    <path d="${pathData}" fill="${color}" stroke="#fff" stroke-width="2"/>
  </g>`;

    // Add label (hidden by default, shown on hover)
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    svg += `
  <text x="${labelX}" y="${labelY}" class="label" text-anchor="middle" dominant-baseline="middle" id="label-${index}" style="opacity: 0;">${escapedLabel}</text>
  <text x="${labelX}" y="${labelY + 15}" class="value" text-anchor="middle" dominant-baseline="middle" id="value-${index}" style="opacity: 0;">${percentage.toFixed(1)}%</text>`;

    currentAngle = endAngle;
  });

  // Add legend
  const legendY = height - 60;
  const legendItemWidth = 120;
  const itemsPerRow = Math.floor(width / legendItemWidth);

  data.labels.forEach((label: string, index: number) => {
    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;
    const x = 20 + col * legendItemWidth;
    const y = legendY + row * 20;
    const color = data.datasets[0].backgroundColor?.[index] || '#cccccc';
    const value = data.datasets[0].data[index];
    const percentage = ((value / total) * 100).toFixed(1);
    const escapedLabel = escapeXml(label);

    svg += `
  <g class="legend-item" id="legend-${index}" data-index="${index}">
    <rect x="${x}" y="${y - 8}" width="12" height="12" fill="${color}" stroke="#ccc" stroke-width="1"/>
    <text x="${x + 18}" y="${y}" class="legend-text">${escapedLabel} (${percentage}%)</text>
  </g>`;
  });

  // Add tooltip
  svg += `
  <g class="tooltip" id="tooltip">
    <rect class="tooltip-bg" width="120" height="50" x="0" y="0"/>
    <text class="tooltip-text" x="60" y="20" id="tooltip-label"></text>
    <text class="tooltip-value" x="60" y="35" id="tooltip-value"></text>
  </g>`;

  // Add JavaScript for enhanced interactivity (with proper escaping)
  const jsCode = `
    let activeSlice = null;
    let tooltip = null;
    let tooltipLabel = null;
    let tooltipValue = null;

    function init() {
      tooltip = document.getElementById('tooltip');
      tooltipLabel = document.getElementById('tooltip-label');
      tooltipValue = document.getElementById('tooltip-value');

      // Add event listeners to slices
      document.querySelectorAll('.slice').forEach((slice, index) => {
        slice.addEventListener('mouseenter', function(e) {
          showTooltip(e, this);
          highlightSlice(index);
        });

        slice.addEventListener('mouseleave', function() {
          hideTooltip();
          if (!activeSlice) {
            resetAllSlices();
          }
        });

        slice.addEventListener('click', function() {
          toggleActiveSlice(index);
        });
      });

      // Add event listeners to legend
      document.querySelectorAll('.legend-item').forEach((item, index) => {
        item.addEventListener('mouseenter', function() {
          highlightSlice(index);
        });

        item.addEventListener('mouseleave', function() {
          if (!activeSlice) {
            resetAllSlices();
          }
        });

        item.addEventListener('click', function() {
          toggleActiveSlice(index);
        });
      });

      // Add mouse move for tooltip
      document.addEventListener('mousemove', function(e) {
        if (tooltip && tooltip.classList.contains('show')) {
          updateTooltipPosition(e);
        }
      });
    }

    function showTooltip(e, element) {
      const label = element.getAttribute('data-label');
      const value = element.getAttribute('data-value');
      const percentage = element.getAttribute('data-percentage');

      tooltipLabel.textContent = label;
      tooltipValue.textContent = value + ' (' + percentage + '%)';

      updateTooltipPosition(e);
      tooltip.classList.add('show');
    }

    function hideTooltip() {
      tooltip.classList.remove('show');
    }

    function updateTooltipPosition(e) {
      const rect = document.documentElement.getBoundingClientRect();
      const x = e.clientX - rect.left + 10;
      const y = e.clientY - rect.top - 60;

      tooltip.setAttribute('transform', 'translate(' + x + ', ' + y + ')');
    }

    function highlightSlice(index) {
      resetAllSlices();

      const slice = document.getElementById('slice-' + index);
      const legend = document.getElementById('legend-' + index);
      const label = document.getElementById('label-' + index);
      const value = document.getElementById('value-' + index);

      if (slice) slice.classList.add('active');
      if (legend) legend.classList.add('active');
      if (label) {
        label.style.fontWeight = 'bold';
        label.style.opacity = '1';
      }
      if (value) {
        value.style.fontWeight = 'bold';
        value.style.opacity = '1';
      }
    }

    function resetAllSlices() {
      document.querySelectorAll('.slice').forEach(slice => {
        slice.classList.remove('active');
      });

      document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('active');
      });

      document.querySelectorAll('.label, .value').forEach(text => {
        text.style.fontWeight = 'normal';
        text.style.opacity = '0';
      });
    }

    function toggleActiveSlice(index) {
      if (activeSlice === index) {
        activeSlice = null;
        resetAllSlices();
      } else {
        activeSlice = index;
        highlightSlice(index);
      }
    }

    // Initialize when SVG loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }`;

  svg += `
  <script type="text/javascript"><![CDATA[${jsCode}]]></script>`;

  svg += '</svg>';
  return svg;
};

// Create interactive bar chart SVG
const createInteractiveBarChartSVG = (data: any, options: any, width: number, height: number): string => {
  const margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxValue = Math.max(...data.datasets[0].data);
  const barWidth = chartWidth / data.labels.length * 0.8;
  const barSpacing = chartWidth / data.labels.length * 0.2;

  // Helper function to escape XML entities
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .bar {
        transition: all 0.3s ease;
        cursor: pointer;
        transform-origin: bottom;
      }
      .bar:hover {
        opacity: 0.8;
        filter: brightness(1.1);
        transform: scaleY(1.02);
      }
      .bar.active {
        opacity: 0.9;
        filter: brightness(1.2);
        transform: scaleY(1.05);
        stroke-width: 2;
      }
      .label {
        font-family: Arial, sans-serif;
        font-size: 12px;
        fill: #333;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      .value {
        font-family: Arial, sans-serif;
        font-size: 10px;
        fill: #666;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      .axis {
        stroke: #ccc;
        stroke-width: 1;
      }
      .title {
        font-family: Arial, sans-serif;
        font-size: 16px;
        font-weight: bold;
        fill: #333;
        pointer-events: none;
      }
      .grid-line {
        stroke: #eee;
        stroke-width: 1;
        stroke-dasharray: 2,2;
      }
      .tooltip {
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .tooltip.show {
        opacity: 1;
      }
      .tooltip-bg {
        fill: rgba(0, 0, 0, 0.8);
        stroke: #fff;
        stroke-width: 1;
        rx: 4;
        ry: 4;
      }
      .tooltip-text {
        font-family: Arial, sans-serif;
        font-size: 12px;
        fill: #fff;
        text-anchor: middle;
      }
      .tooltip-value {
        font-family: Arial, sans-serif;
        font-size: 10px;
        fill: #ccc;
        text-anchor: middle;
      }
    </style>
  </defs>`;

  // Add title
  if (options.plugins?.title?.text) {
    const escapedTitle = escapeXml(options.plugins.title.text);
    svg += `
  <text x="${width / 2}" y="20" class="title" text-anchor="middle">${escapedTitle}</text>`;
  }

  // Add grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = margin.top + (chartHeight / gridLines) * i;
    svg += `
  <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="grid-line"/>`;
  }

  // Add bars
  data.labels.forEach((label: string, index: number) => {
    const value = data.datasets[0].data[index];
    const barHeight = (value / maxValue) * chartHeight;
    const x = margin.left + index * (barWidth + barSpacing) + barSpacing / 2;
    const y = margin.top + chartHeight - barHeight;

    const color = data.datasets[0].backgroundColor?.[index] || '#cccccc';
    const escapedLabel = escapeXml(label);

    svg += `
  <g class="bar" id="bar-${index}" data-index="${index}" data-label="${escapedLabel}" data-value="${value}">
    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" stroke="#fff" stroke-width="1"/>
  </g>`;

    // Add value label
    svg += `
  <text x="${x + barWidth / 2}" y="${y - 5}" class="value" text-anchor="middle" id="value-${index}">${value}</text>`;

    // Add x-axis label
    svg += `
  <text x="${x + barWidth / 2}" y="${height - 10}" class="label" text-anchor="middle" id="label-${index}">${escapedLabel}</text>`;
  });

  // Add axes
  svg += `
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" class="axis"/>
  <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" class="axis"/>`;

  // Add tooltip
  svg += `
  <g class="tooltip" id="tooltip">
    <rect class="tooltip-bg" width="100" height="40" x="0" y="0"/>
    <text class="tooltip-text" x="50" y="18" id="tooltip-label"></text>
    <text class="tooltip-value" x="50" y="32" id="tooltip-value"></text>
  </g>`;

  // Add JavaScript for enhanced interactivity (with CDATA)
  const jsCode = `
    let activeBar = null;
    let tooltip = null;
    let tooltipLabel = null;
    let tooltipValue = null;

    function init() {
      tooltip = document.getElementById('tooltip');
      tooltipLabel = document.getElementById('tooltip-label');
      tooltipValue = document.getElementById('tooltip-value');

      // Add event listeners to bars
      document.querySelectorAll('.bar').forEach((bar, index) => {
        bar.addEventListener('mouseenter', function(e) {
          showTooltip(e, this);
          highlightBar(index);
        });

        bar.addEventListener('mouseleave', function() {
          hideTooltip();
          if (!activeBar) {
            resetAllBars();
          }
        });

        bar.addEventListener('click', function() {
          toggleActiveBar(index);
        });
      });

      // Add mouse move for tooltip
      document.addEventListener('mousemove', function(e) {
        if (tooltip && tooltip.classList.contains('show')) {
          updateTooltipPosition(e);
        }
      });
    }

    function showTooltip(e, element) {
      const label = element.getAttribute('data-label');
      const value = element.getAttribute('data-value');

      tooltipLabel.textContent = label;
      tooltipValue.textContent = 'Value: ' + value;

      updateTooltipPosition(e);
      tooltip.classList.add('show');
    }

    function hideTooltip() {
      tooltip.classList.remove('show');
    }

    function updateTooltipPosition(e) {
      const rect = document.documentElement.getBoundingClientRect();
      const x = e.clientX - rect.left + 10;
      const y = e.clientY - rect.top - 50;

      tooltip.setAttribute('transform', 'translate(' + x + ', ' + y + ')');
    }

    function highlightBar(index) {
      resetAllBars();

      const bar = document.getElementById('bar-' + index);
      const label = document.getElementById('label-' + index);
      const value = document.getElementById('value-' + index);

      if (bar) bar.classList.add('active');
      if (label) label.style.fontWeight = 'bold';
      if (value) value.style.fontWeight = 'bold';
    }

    function resetAllBars() {
      document.querySelectorAll('.bar').forEach(bar => {
        bar.classList.remove('active');
      });

      document.querySelectorAll('.label, .value').forEach(text => {
        text.style.fontWeight = 'normal';
      });
    }

    function toggleActiveBar(index) {
      if (activeBar === index) {
        activeBar = null;
        resetAllBars();
      } else {
        activeBar = index;
        highlightBar(index);
      }
    }

    // Initialize when SVG loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }`;

  svg += `
  <script type="text/javascript"><![CDATA[${jsCode}]]></script>`;

  svg += '</svg>';
  return svg;
};

// SVG download utility - Direct SVG download (for WordTree/WordNetwork)
export const downloadSVGAsSVG = (svgElement: SVGSVGElement, filename: string, networkData?: any) => {
  console.log('🚀 downloadSVGAsSVG function called!');
  console.log('=== downloadSVGAsSVG Debug ===');
  console.log('networkData received:', networkData);
  console.log('networkData type:', typeof networkData);

  if (networkData) {
    console.log('networkData.nodes:', networkData.nodes);
    console.log('networkData.edges:', networkData.edges);
    console.log('Number of edges:', networkData.edges?.length || 0);
  }

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // The edges should already have data-weight, data-source, and data-target attributes
  // from the D3.js component, so we don't need to do complex matching
  console.log('Checking for existing data attributes on edges...');
  const svgEdges = clonedSvg.querySelectorAll('line, path');
  console.log(`Found ${svgEdges.length} SVG edges`);

  svgEdges.forEach((edge, index) => {
    const weight = edge.getAttribute('data-weight');
    const source = edge.getAttribute('data-source');
    const target = edge.getAttribute('data-target');

    console.log(`Edge ${index}: weight=${weight}, source=${source}, target=${target}`);

    if (!weight || !source || !target) {
      console.log(`⚠️ Edge ${index} missing data attributes`);
    }
  });

  // Add interactive styles
  const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleElement.textContent = `
    svg {
      cursor: grab;
      background: #f8fafc;
      border-radius: 12px;
    }
    svg:active {
      cursor: grabbing;
    }
    .node {
      transition: all 0.3s ease;
      cursor: pointer;
      pointer-events: all;
    }
    .node:hover {
      transform: scale(1.05);
      filter: brightness(1.1);
      stroke-width: 3;
    }
    .node.active {
      transform: scale(1.1);
      filter: brightness(1.2);
      stroke-width: 4;
    }
    .node.connected {
      fill: #2563eb !important;
      stroke-width: 3;
    }
    .link {
      transition: all 0.3s ease;
      cursor: pointer;
      pointer-events: all;
    }
    .link:hover {
      stroke-width: 3;
      opacity: 1;
    }
    .link.active {
      stroke-width: 4;
      opacity: 1;
      stroke: #2563eb !important;
    }
    .link.connected {
      stroke-opacity: 1;
      stroke: #2563eb !important;
    }
    .link.unconnected {
      stroke-opacity: 0.3;
    }
    .text {
      transition: all 0.3s ease;
      pointer-events: none;
    }
    .text.active {
      font-weight: bold;
      font-size: 1.1em;
      fill: #fff;
    }
    .text.connected {
      font-weight: bold;
      fill: #fff;
    }
    .tooltip {
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    .tooltip.show {
      opacity: 1;
    }
    .tooltip-bg {
      fill: rgba(34, 34, 34, 0.95);
      stroke: #fff;
      stroke-width: 1;
      rx: 6;
      ry: 6;
    }
    .tooltip-text {
      font-family: Inter,Roboto,Arial,Helvetica,sans-serif;
      font-size: 14px;
      fill: #fff;
      text-anchor: middle;
    }
    .tooltip-value {
      font-family: Inter,Roboto,Arial,Helvetica,sans-serif;
      font-size: 12px;
      fill: #ccc;
      text-anchor: middle;
    }
    .zoom-controls {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .zoom-btn {
      background: #60a5fa;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      margin: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    .zoom-btn:hover {
      background: #2563eb;
    }
  `;

  // Insert style at the beginning
  const defs = clonedSvg.querySelector('defs');
  if (defs) {
    defs.appendChild(styleElement);
  } else {
    const newDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    newDefs.appendChild(styleElement);
    clonedSvg.insertBefore(newDefs, clonedSvg.firstChild);
  }

  // Add tooltip element
  const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  tooltip.setAttribute('class', 'tooltip');
  tooltip.setAttribute('id', 'tooltip');

  const tooltipBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  tooltipBg.setAttribute('class', 'tooltip-bg');
  tooltipBg.setAttribute('width', '150');
  tooltipBg.setAttribute('height', '60');
  tooltipBg.setAttribute('x', '0');
  tooltipBg.setAttribute('y', '0');

  const tooltipText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tooltipText.setAttribute('class', 'tooltip-text');
  tooltipText.setAttribute('x', '75');
  tooltipText.setAttribute('y', '20');
  tooltipText.setAttribute('id', 'tooltip-label');

  const tooltipValue = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tooltipValue.setAttribute('class', 'tooltip-value');
  tooltipValue.setAttribute('x', '75');
  tooltipValue.setAttribute('y', '40');
  tooltipValue.setAttribute('id', 'tooltip-value');

  tooltip.appendChild(tooltipBg);
  tooltip.appendChild(tooltipText);
  tooltip.appendChild(tooltipValue);
  clonedSvg.appendChild(tooltip);

  // Add interactive JavaScript with zoom/pan and drag functionality
  const script = document.createElementNS('http://www.w3.org/2000/svg', 'script');
  script.setAttribute('type', 'text/javascript');

  const jsCode = `
    let activeElement = null;
    let highlightedNode = null;
    let highlightedEdge = null;
    let tooltip = null;
    let tooltipLabel = null;
    let tooltipValue = null;
    let isDragging = false;
    let dragTarget = null;
    let transform = { x: 0, y: 0, k: 1 };
    let isZooming = false;
    let zoomStart = { x: 0, y: 0 };

    function init() {
      tooltip = document.getElementById('tooltip');
      tooltipLabel = document.getElementById('tooltip-label');
      tooltipValue = document.getElementById('tooltip-value');

      // Add zoom/pan functionality
      const svg = document.querySelector('svg');
      if (svg) {
        svg.addEventListener('mousedown', startPan);
        svg.addEventListener('mousemove', pan);
        svg.addEventListener('mouseup', endPan);
        svg.addEventListener('wheel', handleZoom);
        svg.addEventListener('mouseleave', endPan);
      }

      // Add event listeners to nodes (rectangles, circles, etc.)
      document.querySelectorAll('rect, circle, ellipse').forEach((node, index) => {
        node.addEventListener('mouseenter', function(e) {
          if (!isDragging) {
            showTooltip(e, this);
            highlightNode(this);
          }
        });

        node.addEventListener('mouseleave', function() {
          if (!highlightedNode) {
            hideTooltip();
            resetAllElements();
          }
        });

        node.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleActiveNode(this);
        });

        // Add drag functionality
        node.addEventListener('mousedown', startDrag);
        node.addEventListener('mousemove', drag);
        node.addEventListener('mouseup', endDrag);
      });

      // Add event listeners to links (lines, paths)
      document.querySelectorAll('line, path').forEach((link, index) => {
        link.addEventListener('mouseenter', function(e) {
          if (!isDragging) {
            showTooltip(e, this);
            highlightEdge(this, index);
          }
        });

        link.addEventListener('mouseleave', function() {
          if (!highlightedEdge) {
            hideTooltip();
            resetAllElements();
          }
        });

        link.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleActiveEdge(this, index);
        });
      });

      // Add mouse move for tooltip
      document.addEventListener('mousemove', function(e) {
        if (tooltip && tooltip.classList.contains('show')) {
          updateTooltipPosition(e);
        }
      });
    }

    // Zoom and Pan functionality
    function startPan(e) {
      if (e.target.tagName === 'svg') {
        isZooming = true;
        zoomStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        e.preventDefault();
      }
    }

    function pan(e) {
      if (isZooming) {
        transform.x = e.clientX - zoomStart.x;
        transform.y = e.clientY - zoomStart.y;
        updateTransform();
      }
    }

    function endPan() {
      isZooming = false;
    }

    function handleZoom(e) {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.2, Math.min(4, transform.k * scale));

      // Zoom towards mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      transform.x = x - (x - transform.x) * (newScale / transform.k);
      transform.y = y - (y - transform.y) * (newScale / transform.k);
      transform.k = newScale;

      updateTransform();
    }

    function updateTransform() {
      const g = document.querySelector('svg > g');
      if (g) {
        g.setAttribute('transform', 'translate(' + transform.x + ',' + transform.y + ') scale(' + transform.k + ')');
      }
    }

    // Drag functionality
    function startDrag(e) {
      isDragging = true;
      dragTarget = e.target;
      e.stopPropagation();
    }

    function drag(e) {
      if (isDragging && dragTarget) {
        // Get current transform
        const g = document.querySelector('svg > g');
        if (g) {
          const currentTransform = g.getAttribute('transform');
          const matrix = new DOMMatrix(currentTransform);

          // Calculate new position
          const dx = e.movementX / matrix.a;
          const dy = e.movementY / matrix.d;

          // Update node position
          let x, y;
          if (dragTarget.tagName === 'rect') {
            x = parseFloat(dragTarget.getAttribute('x') || '0') + dx;
            y = parseFloat(dragTarget.getAttribute('y') || '0') + dy;
            dragTarget.setAttribute('x', x);
            dragTarget.setAttribute('y', y);
          } else if (dragTarget.tagName === 'circle' || dragTarget.tagName === 'ellipse') {
            x = parseFloat(dragTarget.getAttribute('cx') || '0') + dx;
            y = parseFloat(dragTarget.getAttribute('cy') || '0') + dy;
            dragTarget.setAttribute('cx', x);
            dragTarget.setAttribute('cy', y);
          }

          // Update connected text - try multiple methods to find the text
          const nodeId = dragTarget.getAttribute('id');
          if (nodeId) {
            // Method 1: Look for text with data-node attribute
            let text = document.querySelector('text[data-node="' + nodeId + '"]');

            // Method 2: Look for text with matching id
            if (!text) {
              text = document.querySelector('text[id="' + nodeId + '"]');
            }

            // Method 3: Look for text that contains the node's text content
            if (!text) {
              const nodeText = dragTarget.textContent || nodeId;
              const allTexts = document.querySelectorAll('text');
              for (let t of allTexts) {
                if (t.textContent && t.textContent.trim() === nodeText.trim()) {
                  text = t;
                  break;
                }
              }
            }

            // Method 4: Look for text at the same position (within tolerance)
            if (!text && x !== undefined && y !== undefined) {
              const allTexts = document.querySelectorAll('text');
              const tolerance = 5;
              for (let t of allTexts) {
                const textX = parseFloat(t.getAttribute('x') || '0');
                const textY = parseFloat(t.getAttribute('y') || '0');
                if (Math.abs(textX - x) < tolerance && Math.abs(textY - y) < tolerance) {
                  text = t;
                  break;
                }
              }
            }

            // Method 5: Look for text in the same group as the node
            if (!text) {
              const nodeGroup = dragTarget.closest('g');
              if (nodeGroup) {
                const groupTexts = nodeGroup.querySelectorAll('text');
                if (groupTexts.length === 1) {
                  text = groupTexts[0];
                }
              }
            }

            // Update the found text
            if (text) {
              if (dragTarget.tagName === 'rect') {
                // For rectangles, center the text in the rectangle
                const rectWidth = parseFloat(dragTarget.getAttribute('width') || '0');
                const rectHeight = parseFloat(dragTarget.getAttribute('height') || '0');
                text.setAttribute('x', x + rectWidth / 2);
                text.setAttribute('y', y + rectHeight / 2);
              } else {
                // For circles/ellipses, use the center
                text.setAttribute('x', x);
                text.setAttribute('y', y);
              }
            }
          }
        }
      }
    }

    function endDrag() {
      isDragging = false;
      dragTarget = null;
    }

    function showTooltip(e, element) {
      let label = '';
      let value = '';

      // Try to get data from various attributes
      if (element.getAttribute('data-label')) {
        label = element.getAttribute('data-label');
      } else if (element.getAttribute('title')) {
        label = element.getAttribute('title');
      } else if (element.textContent) {
        label = element.textContent.trim();
      } else if (element.getAttribute('id')) {
        label = element.getAttribute('id');
      }

      // Special handling for edges/links
      if (element.tagName === 'line' || element.tagName === 'path') {
        const sourceId = element.getAttribute('data-source');
        const targetId = element.getAttribute('data-target');

        // Get the weight from data-weight attribute (this should be the actual similarity score)
        let weight = element.getAttribute('data-weight');

        // Only use stroke-width as fallback if no data-weight is available
        if (!weight) {
          console.log('No data-weight found, using stroke-width fallback');
          weight = element.getAttribute('stroke-width');
        }

        if (!weight) {
          // Default weight if none found
          weight = '0.7';
        }

        if (sourceId && targetId) {
          label = 'Edge: ' + sourceId + ' → ' + targetId;
          value = 'Similarity: ' + weight;
        } else {
          label = 'Connection';
          value = 'Similarity: ' + weight;
        }
      } else {
        // For nodes
        if (element.getAttribute('data-value')) {
          value = element.getAttribute('data-value');
        } else if (element.getAttribute('r')) {
          value = 'Radius: ' + element.getAttribute('r');
        } else if (element.getAttribute('width') && element.getAttribute('height')) {
          value = 'Size: ' + element.getAttribute('width') + 'x' + element.getAttribute('height');
        }

        // For Word Network nodes, show degree information
        if (element.tagName === 'rect' && element.getAttribute('id')) {
          const nodeId = element.getAttribute('id');
          const connectedEdges = document.querySelectorAll('line[data-source="' + nodeId + '"], line[data-target="' + nodeId + '"], path[data-source="' + nodeId + '"], path[data-target="' + nodeId + '"]');
          if (connectedEdges.length > 0) {
            value = 'Degree: ' + connectedEdges.length;
          }
        }
      }

      if (!label) {
        label = element.tagName + ' ' + (element.getAttribute('id') || '');
      }

      tooltipLabel.textContent = label;
      tooltipValue.textContent = value;

      updateTooltipPosition(e);
      tooltip.classList.add('show');
    }

    function hideTooltip() {
      tooltip.classList.remove('show');
    }

    function updateTooltipPosition(e) {
      const rect = document.documentElement.getBoundingClientRect();
      const x = e.clientX - rect.left + 10;
      const y = e.clientY - rect.top - 60;

      tooltip.setAttribute('transform', 'translate(' + x + ', ' + y + ')');
    }

    function highlightNode(node) {
      resetAllElements();
      highlightedNode = node;

      node.classList.add('active');

      // Highlight connected edges
      const nodeId = node.getAttribute('id');
      if (nodeId) {
        document.querySelectorAll('line, path').forEach((link, index) => {
          const sourceId = link.getAttribute('data-source');
          const targetId = link.getAttribute('data-target');
          if (sourceId === nodeId || targetId === nodeId) {
            link.classList.add('connected');
          } else {
            link.classList.add('unconnected');
          }
        });
      }

      // Highlight related text
      const relatedText = document.querySelector('text[data-node="' + nodeId + '"]');
      if (relatedText) {
        relatedText.classList.add('active');
      }
    }

    function highlightEdge(edge, index) {
      resetAllElements();
      highlightedEdge = index;

      edge.classList.add('active');

      // Highlight connected nodes
      const sourceId = edge.getAttribute('data-source');
      const targetId = edge.getAttribute('data-target');

      if (sourceId) {
        const sourceNode = document.querySelector('rect[id="' + sourceId + '"], circle[id="' + sourceId + '"], ellipse[id="' + sourceId + '"]');
        if (sourceNode) {
          sourceNode.classList.add('connected');
        }
        const sourceText = document.querySelector('text[data-node="' + sourceId + '"]');
        if (sourceText) {
          sourceText.classList.add('connected');
        }
      }

      if (targetId) {
        const targetNode = document.querySelector('rect[id="' + targetId + '"], circle[id="' + targetId + '"], ellipse[id="' + targetId + '"]');
        if (targetNode) {
          targetNode.classList.add('connected');
        }
        const targetText = document.querySelector('text[data-node="' + targetId + '"]');
        if (targetText) {
          targetText.classList.add('connected');
        }
      }
    }

    function resetAllElements() {
      document.querySelectorAll('rect, circle, ellipse, line, path, text').forEach(el => {
        el.classList.remove('active', 'connected', 'unconnected');
      });
      highlightedNode = null;
      highlightedEdge = null;
    }

    function toggleActiveNode(node) {
      if (activeElement === node) {
        activeElement = null;
        resetAllElements();
      } else {
        activeElement = node;
        highlightNode(node);
      }
    }

    function toggleActiveEdge(edge, index) {
      if (activeElement === edge) {
        activeElement = null;
        resetAllElements();
      } else {
        activeElement = edge;
        highlightEdge(edge, index);
      }
    }

    // Initialize when SVG loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }`;

  script.textContent = jsCode;
  clonedSvg.appendChild(script);

  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const fullSvgData = `<?xml version="1.0" encoding="UTF-8"?>\n${svgData}`;
  const blob = new Blob([fullSvgData], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Keep the PNG version for backward compatibility but rename it
export const downloadSVGAsPNG = (svgElement: SVGSVGElement, filename: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Get SVG dimensions
  const svgRect = svgElement.getBoundingClientRect();
  canvas.width = svgRect.width;
  canvas.height = svgRect.height;

  // Create a new image from SVG
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    // Download the PNG
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.src = url;
};

// Specific download functions for each feature
export const downloadSentimentResults = (results: unknown[], originalText: string) => {
  const data = {
    originalText,
    analysisDate: new Date().toISOString(),
    results: results.map(sentence => ({
      text: (sentence as { text: string }).text,
      sentiment: (sentence as { label: string }).label,
      confidence: (sentence as { confidence: number }).confidence
    }))
  };
  downloadAsJSON(data, 'sentiment-analysis-results');
};

export const downloadSentimentResultsCSV = (results: unknown[]) => {
  const csvData = results.map(sentence => ({
    sentence: (sentence as { sentence: string }).sentence,
    label: (sentence as { label: string }).label,
    confidence_score: (sentence as { score: number }).score
  }));
  downloadAsCSV(csvData, 'sentiment-analysis-results');
};

export const downloadSummary = (summary: string, originalText: string, ratio: number) => {
  const data = {
    originalText,
    summary,
    summaryRatio: ratio,
    analysisDate: new Date().toISOString()
  };
  downloadAsJSON(data, 'text-summary');
};

export const downloadConcordanceResults = (results: unknown[], keyword: string, windowSize: number, originalText: string) => {
  const data = {
    originalText,
    keyword,
    windowSize,
    analysisDate: new Date().toISOString(),
    results: results.map(entry => ({
      left_context: (entry as { left_context: string }).left_context,
      keyword: (entry as { keyword: string }).keyword,
      right_context: (entry as { right_context: string }).right_context
    }))
  };
  downloadAsJSON(data, 'concordance-results');
};

export const downloadConcordanceResultsCSV = (results: unknown[]) => {
  const csvData = results.map(entry => ({
    left_context: (entry as { left_context: string }).left_context,
    keyword: (entry as { keyword: string }).keyword,
    right_context: (entry as { right_context: string }).right_context
  }));
  downloadAsCSV(csvData, 'concordance-results');
};

export const downloadWordNetwork = (network: unknown, originalText: string) => {
  const data = {
    originalText,
    analysisDate: new Date().toISOString(),
    nodes: (network as { nodes: unknown }).nodes,
    edges: (network as { edges: unknown }).edges
  };
  downloadAsJSON(data, 'word-network');
};

export const downloadWordTree = (treeData: unknown, originalText: string) => {
  const data = {
    originalText,
    analysisDate: new Date().toISOString(),
    tree: treeData
  };
  downloadAsJSON(data, 'word-tree');
};
