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

// Chart download utilities
export const downloadChartAsPNG = (chartRef: React.RefObject<HTMLCanvasElement | null>, filename: string) => {
  if (!chartRef.current) return;
  
  const canvas = chartRef.current;
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// SVG to PNG download utility
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