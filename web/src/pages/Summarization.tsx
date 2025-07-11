import { useState } from 'react';
import { FileText, Loader2, Copy, Check } from 'lucide-react';
import { apiService } from '../services/api';

export function Summarization() {
    const [text, setText] = useState('');
    const [ratio, setRatio] = useState(0.3);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSummarize = async () => {
        if (!text.trim()) {
            setError('Please enter some text to summarize');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiService.summarizeText(text, ratio);
            setSummary(response.summarize_text);
        } catch (err) {
            setError('Failed to summarize text. Please try again.');
            console.error('Summarization error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Text Summarization</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                            Enter your text to summarize
                        </label>
                        <textarea
                            id="text"
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter text here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="ratio" className="block text-sm font-medium text-gray-700 mb-2">
                            Summary Ratio: {Math.round(ratio * 100)}%
                        </label>
                        <input
                            id="ratio"
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.1"
                            value={ratio}
                            onChange={(e) => setRatio(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>10%</span>
                            <span>50%</span>
                            <span>90%</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSummarize}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Summarizing...
                            </>
                        ) : (
                            'Generate Summary'
                        )}
                    </button>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {summary && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
                        <button
                            onClick={handleCopy}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-1 text-green-500" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 leading-relaxed">{summary}</p>
                    </div>
                </div>
            )}
        </div>
    );
} 