import React, { useState } from 'react';
import { BookOpen, Loader2, Search } from 'lucide-react';
import { apiService } from '../services/api';

interface ConcordanceEntry {
    left_context: string;
    keyword: string;
    right_context: string;
}

export function Concordance() {
    const [text, setText] = useState('');
    const [keyword, setKeyword] = useState('');
    const [windowSize, setWindowSize] = useState(5);
    const [results, setResults] = useState<ConcordanceEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
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
            const res = await apiService.concordance({
                text,
                keyword,
                window_size: windowSize,
            });
            setResults(res.results);
        } catch (err) {
            setError('Failed to fetch concordance results. Please try again.');
            console.error('Concordance error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Concordance</h1>
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
                            placeholder="Enter text to analyze..."
                            value={text}
                            onChange={e => setText(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
                            Keyword
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                id="keyword"
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                placeholder="Keyword"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="windowSize" className="block text-sm font-medium text-gray-700 mb-2">
                            Window size
                        </label>
                        <input
                            id="windowSize"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                            min={1}
                            value={windowSize}
                            onChange={e => setWindowSize(Number(e.target.value))}
                            placeholder="Window size"
                        />
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Analyzing...
                            </>
                        ) : (
                            'Analyze'
                        )}
                    </button>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {results.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-2">Results</h2>
                    <table className="w-full border text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-2 py-1">Left Context</th>
                                <th className="border px-2 py-1">Keyword</th>
                                <th className="border px-2 py-1">Right Context</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((entry, idx) => (
                                <tr key={idx}>
                                    <td className="border px-2 py-1">{entry.left_context}</td>
                                    <td className="border px-2 py-1 font-bold text-blue-700">{entry.keyword}</td>
                                    <td className="border px-2 py-1">{entry.right_context}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Concordance; 