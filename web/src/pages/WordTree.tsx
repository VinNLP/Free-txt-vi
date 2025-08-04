import React, { useState, useRef, useMemo, useEffect } from 'react';
import { TreePine, Loader2, Search, Download, BarChart3 } from 'lucide-react';
import { apiService, type WordTreeResponse } from '../services/api';
import TidyTree from '../components/TidyTree';
import { useInputText } from '../components/useInputText';
import FileUploadToInputText from '../components/FileUploadToInputText';
import { downloadWordTree, downloadSVGAsSVG } from '../utils/downloadUtils';

// Convert backend nested dict to react-d3-tree format
interface D3TreeNode {
    name: string;
    attributes?: { count?: number };
    children?: D3TreeNode[];
}
function convertToD3Tree(node: unknown, maxLevel = 3, level = 0): D3TreeNode[] {
    if (!node || typeof node !== 'object' || level > maxLevel) return [];
    const nodeObj = node as Record<string, unknown>;
    const children: D3TreeNode[] = [];
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

// Helper function to format word display (remove underscores)
function formatWordDisplay(word: string): string {
    return word.replace(/_/g, ' ');
}

export function WordTree() {
    const WORD_LIMIT = 1000;
    const { inputText: text, setInputText: setText } = useInputText();
    const [keyword, setKeyword] = useState('');
    const [treeData, setTreeData] = useState<WordTreeResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const tidyTreeRef = useRef<HTMLDivElement>(null);

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const words = e.target.value.split(/\s+/).filter(Boolean);
        if (words.length > WORD_LIMIT) {
            return;
        }
        setText(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            // Only adjust height if word count is 500 or less
            if (words.length <= 500) {
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            } else {
                // Set a maximum height for texts with more than 500 words
                textareaRef.current.style.height = '300px';
                textareaRef.current.style.overflowY = 'auto';
            }
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            const words = text.split(/\s+/).filter(Boolean);
            textareaRef.current.style.height = 'auto';
            // Only adjust height if word count is 500 or less
            if (words.length <= 500) {
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            } else {
                // Set a maximum height for texts with more than 500 words
                textareaRef.current.style.height = '300px';
                textareaRef.current.style.overflowY = 'auto';
            }
        }
    }, [text]);

    const handleGenerateTree = async (newKeyword?: string) => {
        const targetKeyword = newKeyword || keyword;
        if (!text.trim()) {
            setError('Please enter some text');
            return;
        }
        if (!targetKeyword.trim()) {
            setError('Please enter a keyword');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await apiService.createWordTree(text, targetKeyword);
            setTreeData(response);
            if (newKeyword) {
                setKeyword(newKeyword);
            }
        } catch (err) {
            setError('Failed to generate word tree. Please try again.');
            console.error('Word tree error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNodeClick = async (clickedWord: string) => {
        if (clickedWord === keyword) {
            return; // Don't regenerate if clicking the same keyword
        }
        // Format the clicked word to remove underscores for display and API call
        const formattedWord = formatWordDisplay(clickedWord);
        await handleGenerateTree(formattedWord);
        // Set the formatted word in the input field
        setKeyword(formattedWord);
    };

    const handleDownloadJSON = () => {
        if (treeData) {
            downloadWordTree(treeData, text);
        }
    };

    const handleDownloadTidyTreeSVG = () => {
        if (tidyTreeRef.current) {
            const svg = tidyTreeRef.current.querySelector('svg');
            if (svg) {
                downloadSVGAsSVG(svg, 'word-tree-tidy');
            }
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

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <TreePine className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Word Tree</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <FileUploadToInputText setInputText={setText} />
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
                                Enter your text
                            </label>
                            <span className="text-xs text-gray-500">
                                {text.split(/\s+/).filter(Boolean).length} / {WORD_LIMIT} words
                            </span>
                        </div>
                        <textarea
                            id="text"
                            ref={textareaRef}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Enter Vietnamese text here..."
                            value={text}
                            onChange={handleTextareaInput}
                            onInput={handleTextareaInput}
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
                        onClick={() => handleGenerateTree()}
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
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Word Tree for "{treeData.word}"
                        </h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleDownloadJSON}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download JSON
                            </button>
                            <button
                                onClick={handleDownloadTidyTreeSVG}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Download Tidy Tree SVG
                            </button>
                        </div>
                    </div>
                    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-indigo-800">Color Legend & Tips</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div className="flex items-center p-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                <div className="w-5 h-5 rounded-md bg-blue-500 border-2 border-blue-600 mr-3 shadow-sm"></div>
                                <div>
                                    <p className="text-xs font-medium text-gray-900">Root Keyword</p>
                                    <p className="text-xs text-gray-500">Center of the tree</p>
                                </div>
                            </div>

                            <div className="flex items-center p-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                <div className="w-5 h-5 rounded-md bg-yellow-200 border-2 border-yellow-400 mr-3 shadow-sm"></div>
                                <div>
                                    <p className="text-xs font-medium text-gray-900">Left Context</p>
                                    <p className="text-xs text-gray-500">Words before keyword</p>
                                </div>
                            </div>

                            <div className="flex items-center p-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                <div className="w-5 h-5 rounded-md bg-green-200 border-2 border-green-400 mr-3 shadow-sm"></div>
                                <div>
                                    <p className="text-xs font-medium text-gray-900">Right Context</p>
                                    <p className="text-xs text-gray-500">Words after keyword</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
                                    </svg>
                                </div>
                                <p className="text-xs text-blue-800">
                                    <strong>Interactive:</strong> Click on any word in the tree to explore its context and generate a new tree with that word as the keyword
                                </p>
                            </div>

                            <div className="flex items-center p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center mr-2">
                                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <p className="text-xs text-amber-800">
                                    <strong>Size:</strong> Larger boxes indicate higher word frequency in the context
                                </p>
                            </div>
                        </div>
                    </div>
                    <div ref={tidyTreeRef} style={{ width: '100%', height: '800px' }}>
                        <h3 className="text-lg font-semibold mb-2">Tidy Tree Layout</h3>
                        <TidyTree
                            data={d3TreeData}
                            width={1000}
                            height={800}
                            onNodeClick={handleNodeClick}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
