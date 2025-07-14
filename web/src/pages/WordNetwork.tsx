import React, { useState } from 'react';
import { apiService } from '../services/api';
import { Share2 } from 'lucide-react';
import ForceDirectedWordNetwork from '../components/ForceDirectedWordNetwork.tsx';

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
    const [text, setText] = useState('');
    const [network, setNetwork] = useState<WordNetworkResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <Share2 className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Word Network</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                            Enter your text to generate the word network
                        </label>
                        <textarea
                            id="text"
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter text here..."
                            value={text}
                            onChange={e => setText(e.target.value)}
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

            {network && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-blue-700 mb-4">Network Graph</h2>
                    <div className="w-full h-[600px]">
                        <ForceDirectedWordNetwork nodes={network.nodes} edges={network.edges} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordNetwork; 