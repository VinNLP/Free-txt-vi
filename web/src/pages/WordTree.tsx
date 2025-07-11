import { useState, useMemo } from 'react';
import { TreePine, Loader2, Search } from 'lucide-react';
import { apiService, type WordTreeResponse } from '../services/api';
import Tree from 'react-d3-tree';

// Convert backend nested dict to react-d3-tree format
function convertToD3Tree(node: unknown, maxLevel = 3, level = 0): any[] {
    if (!node || typeof node !== 'object' || level > maxLevel) return [];
    const nodeObj = node as Record<string, unknown>;
    const children: any[] = [];
    for (const [key, value] of Object.entries(nodeObj)) {
        if (key === 'count') continue;
        let count = 1;
        if (typeof value === 'object' && value !== null && 'count' in value && typeof (value as Record<string, unknown>).count === 'number') {
            count = (value as Record<string, unknown>).count as number;
        }
        children.push({
            name: key,
            attributes: { count },
            children: convertToD3Tree(value, maxLevel, level + 1),
        });
    }
    return children;
}

export function WordTree() {
    const [text, setText] = useState('');
    const [keyword, setKeyword] = useState('');
    const [treeData, setTreeData] = useState<WordTreeResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

    const handleGenerateTree = async () => {
        if (!text.trim()) {
            setError('Please enter some text');
            return;
        }
        if (!keyword.trim()) {
            setError('Please enter a keyword');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await apiService.createWordTree(text, keyword);
            setTreeData(response);
        } catch (err) {
            setError('Failed to generate word tree. Please try again.');
            console.error('Word tree error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Prepare unified D3 tree data
    const d3TreeData = useMemo(() => {
        if (!treeData) return null;
        const leftChildren = convertToD3Tree(treeData.left);
        const rightChildren = convertToD3Tree(treeData.right);
        return [{
            name: treeData.word,
            attributes: {},
            children: [...leftChildren, ...rightChildren],
        }];
    }, [treeData]);

    // Find min/max count for scaling
    function getAllCountsD3(node: any): number[] {
        if (!node) return [];
        let counts: number[] = [];
        if (node.attributes && typeof node.attributes.count === 'number') {
            counts.push(node.attributes.count);
        }
        if (node.children) {
            for (const child of node.children) {
                counts = counts.concat(getAllCountsD3(child));
            }
        }
        return counts;
    }
    const allCounts = d3TreeData ? getAllCountsD3(d3TreeData[0]) : [];
    const minCount = allCounts.length > 0 ? Math.min(...allCounts) : 1;
    const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 1;
    function getFontSize(count: number) {
        const minFont = 14, maxFont = 32;
        if (maxCount === minCount) return `${maxFont}px`;
        return `${minFont + ((count - minCount) / (maxCount - minFont)) * (maxFont - minFont)}px`;
    }

    // Custom node rendering with tooltip
    const renderCustomNode = ({ nodeDatum, hierarchyPointNode }: any) => {
        const count = nodeDatum.attributes?.count;
        return (
            <g
                onMouseEnter={() => {
                    if (count)
                        setTooltip({
                            x: hierarchyPointNode.x,
                            y: hierarchyPointNode.y,
                            text: `${nodeDatum.name} (${count})`,
                        });
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}
            >
                <text
                    textAnchor="middle"
                    fontWeight="300"
                    fontFamily="Inter,Roboto,Arial,Helvetica,sans-serif"
                    fontSize={getFontSize(count || 1)}
                    fill="#222"
                    dy={0}
                >
                    {nodeDatum.name}
                </text>
                {count ? (
                    <text
                        textAnchor="middle"
                        fontSize={12}
                        fill="#888"
                        dy={18}
                        fontFamily="Inter,Roboto,Arial,Helvetica,sans-serif"
                    >
                        ({count})
                    </text>
                ) : null}
            </g>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <TreePine className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Word Tree</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                            Enter your text
                        </label>
                        <textarea
                            id="text"
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter Vietnamese text here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
                            Enter keyword to analyze
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                id="keyword"
                                type="text"
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                placeholder="Enter keyword..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateTree}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Generating Tree...
                            </>
                        ) : (
                            'Generate Word Tree'
                        )}
                    </button>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {treeData && d3TreeData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ position: 'relative' }}>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Word Tree for "{treeData.word}"
                    </h2>
                    <div style={{ width: '100%', height: '800px' }}>
                        <Tree
                            data={d3TreeData}
                            orientation="horizontal"
                            translate={{ x: 500, y: 400 }}
                            pathFunc="diagonal"
                            renderCustomNodeElement={renderCustomNode}
                            collapsible={false}
                            zoomable={true}
                            separation={{ siblings: 2.5, nonSiblings: 3 }}
                            enableLegacyTransitions={true}
                        />
                        {tooltip && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: tooltip.x + 520,
                                    top: tooltip.y + 120,
                                    background: 'rgba(0,0,0,0.8)',
                                    color: '#fff',
                                    padding: '4px 10px',
                                    borderRadius: 4,
                                    pointerEvents: 'none',
                                    fontSize: 14,
                                    zIndex: 10,
                                }}
                            >
                                {tooltip.text}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 