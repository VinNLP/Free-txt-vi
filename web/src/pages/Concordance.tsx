import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Loader2, Search, Download, FileSpreadsheet, Lightbulb } from 'lucide-react';
import { apiService } from '../services/api';
import { useInputText } from '../components/useInputText';
import FileUploadToInputText from '../components/FileUploadToInputText';
import { downloadConcordanceResults, downloadConcordanceResultsCSV, downloadWordSuggestionResults, downloadWordSuggestionResultsCSV } from '../utils/downloadUtils';

interface ConcordanceEntry {
    left_context: string;
    keyword: string;
    right_context: string;
}

interface ConcordanceEntryWithSuggestions extends ConcordanceEntry {
    suggestions?: string[];
    detected_language?: string;
}

export function Concordance() {
    const WORD_LIMIT = 1000;
    const { inputText: text, setInputText: setText } = useInputText();
    const [keyword, setKeyword] = useState('');
    const [windowSize, setWindowSize] = useState(5);
    const [enableAISuggestions, setEnableAISuggestions] = useState(false);
    const [numSuggestions, setNumSuggestions] = useState(5);
    const [results, setResults] = useState<ConcordanceEntryWithSuggestions[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            if (enableAISuggestions) {
                const res = await apiService.wordSuggestions({
                    text,
                    keyword,
                    window_size: windowSize,
                    num_suggestions: numSuggestions,
                });
                setResults(res.results);
            } else {
                const res = await apiService.concordance({
                    text,
                    keyword,
                    window_size: windowSize,
                });
                setResults(res.results);
            }
        } catch (err) {
            setError('Failed to fetch concordance results. Please try again.');
            console.error('Concordance error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadJSON = () => {
        if (enableAISuggestions) {
            downloadWordSuggestionResults(results, keyword, windowSize, text, numSuggestions);
        } else {
            downloadConcordanceResults(results, keyword, windowSize, text);
        }
    };

    const handleDownloadCSV = () => {
        if (enableAISuggestions) {
            downloadWordSuggestionResultsCSV(results);
        } else {
            downloadConcordanceResultsCSV(results);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Concordance</h1>
                    <p className="text-sm text-gray-600">Find keyword occurrences with optional AI-powered word suggestions</p>
                </div>
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
                            placeholder="Enter text to analyze..."
                            value={text}
                            onChange={handleTextareaInput}
                            onInput={handleTextareaInput}
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

                    <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                            <input
                                id="enableAI"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                checked={enableAISuggestions}
                                onChange={e => setEnableAISuggestions(e.target.checked)}
                            />
                            <label htmlFor="enableAI" className="ml-2 flex items-center text-sm font-medium text-gray-700">
                                <Lightbulb className="h-4 w-4 mr-1" />
                                Enable AI Suggestions
                            </label>
                        </div>
                    </div>

                    {enableAISuggestions && (
                        <div>
                            <label htmlFor="numSuggestions" className="block text-sm font-medium text-gray-700 mb-2">
                                Number of AI Suggestions
                            </label>
                            <input
                                id="numSuggestions"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                type="number"
                                min={1}
                                max={10}
                                value={numSuggestions}
                                onChange={e => setNumSuggestions(Number(e.target.value))}
                                placeholder="Number of suggestions"
                            />
                        </div>
                    )}
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
                            enableAISuggestions ? 'Analyze with AI' : 'Analyze'
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
                    {enableAISuggestions && results.length > 0 && results[0].detected_language && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                                <strong>Detected Language:</strong> {results[0].detected_language.toUpperCase()}
                            </p>
                        </div>
                    )}
                    <table className="w-full border text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-2 py-1">Left Context</th>
                                <th className="border px-2 py-1">Keyword</th>
                                <th className="border px-2 py-1">Right Context</th>
                                {enableAISuggestions && (
                                    <th className="border px-2 py-1">AI Suggestions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((entry, idx) => (
                                <tr key={idx}>
                                    <td className="border px-2 py-1">{entry.left_context}</td>
                                    <td className="border px-2 py-1 font-bold text-blue-700">{entry.keyword}</td>
                                    <td className="border px-2 py-1">{entry.right_context}</td>
                                    {enableAISuggestions && (
                                        <td className="border px-2 py-1">
                                            {entry.suggestions && entry.suggestions.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {entry.suggestions.map((suggestion, suggestionIdx) => (
                                                        <span
                                                            key={suggestionIdx}
                                                            className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                                                        >
                                                            {suggestion}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">No suggestions</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex flex-col sm:flex-row items-center justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                        <button
                            onClick={handleDownloadJSON}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download JSON
                        </button>
                        <button
                            onClick={handleDownloadCSV}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Download CSV
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Concordance;
