import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import { Share2 } from 'lucide-react';
import ForceDirectedWordNetwork from '../components/ForceDirectedWordNetwork.tsx';
import { useInputText } from '../components/useInputText';
import FileUploadToInputText from '../components/FileUploadToInputText';

interface Node {
    id: string;
}

interface Edge {
    source: string;
    target: string;
    weight: number;
}

interface WordNetworkResponse {
    nodes: Node[];
    edges: Edge[];
}

const WordNetwork: React.FC = () => {
    const WORD_LIMIT = 1000;
    const { inputText: text, setInputText: setText } = useInputText();
    const [network, setNetwork] = useState<WordNetworkResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleGenerateNetwork = async () => {
        if (!text.trim()) {
            setError('Please enter some text');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await apiService.wordNetwork({ text, threshold: 0.7 });
            setNetwork(res);
        } catch (err) {
            setError('Failed to generate word network. Please try again.');
            console.error('Word network error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const words = e.target.value.split(/\s+/).filter(Boolean);
        if (words.length > WORD_LIMIT) {
            return;
        }
        setText(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [text]);

    // Limit the number of nodes and edges for clarity
    const NODE_LIMIT = 30;
    let filteredNetwork = network;
    if (network) {
        // Count node degrees
        const degreeMap: Record<string, number> = {};
        network.edges.forEach(e => {
            degreeMap[e.source as string] = (degreeMap[e.source as string] || 0) + 1;
            degreeMap[e.target as string] = (degreeMap[e.target as string] || 0) + 1;
        });
        // Sort nodes by degree and take top NODE_LIMIT
        const topNodes = network.nodes
            .map(n => ({ ...n, degree: degreeMap[n.id] || 0 }))
            .sort((a, b) => b.degree - a.degree)
            .slice(0, NODE_LIMIT)
            .map(n => n.id);
        // Filter nodes and edges
        const nodes = network.nodes.filter(n => topNodes.includes(n.id));
        const edges = network.edges.filter(e => topNodes.includes(e.source as string) && topNodes.includes(e.target as string));
        filteredNetwork = { nodes, edges };
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <Share2 className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Word Network</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <FileUploadToInputText setInputText={setText} />
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
                                Enter your text to generate the word network
                            </label>
                            <span className="text-xs text-gray-500">
                                {text.split(/\s+/).filter(Boolean).length} / 1000 words
                            </span>
                        </div>
                        <textarea
                            id="text"
                            ref={textareaRef}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Enter text here..."
                            value={text}
                            onChange={handleTextareaInput}
                            onInput={handleTextareaInput}
                        />
                    </div>
                    <button
                        onClick={handleGenerateNetwork}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : 'Generate Word Network'}
                    </button>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {filteredNetwork && filteredNetwork.nodes.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-blue-700 mb-4">Network Graph (Top {NODE_LIMIT} nodes)</h2>
                    <div className="w-full h-[600px]">
                        <ForceDirectedWordNetwork nodes={filteredNetwork.nodes} edges={filteredNetwork.edges} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordNetwork; 