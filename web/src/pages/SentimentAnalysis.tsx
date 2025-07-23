import { useState, useMemo, useRef } from 'react';
import { Brain, Loader2, TrendingUp, TrendingDown, Minus, BarChart3, FileSpreadsheet } from 'lucide-react';
import { apiService, type Sentence } from '../services/api';
import { Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { useInputText } from '../components/useInputText';
import FileUploadToInputText from '../components/FileUploadToInputText';
import { downloadSentimentResults, downloadSentimentResultsCSV } from '../utils/downloadUtils';
import React from 'react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const SENTIMENT_CLASSES = [
    'VERY_POSITIVE',
    'POSITIVE',
    'NEUTRAL',
    'NEGATIVE',
    'VERY_NEGATIVE',
] as const;
type SentimentClass = typeof SENTIMENT_CLASSES[number];
const SENTIMENT_LABELS: Record<SentimentClass, string> = {
    VERY_POSITIVE: 'Very Positive',
    POSITIVE: 'Positive',
    NEUTRAL: 'Neutral',
    NEGATIVE: 'Negative',
    VERY_NEGATIVE: 'Very Negative',
};
const SENTIMENT_COLORS: Record<SentimentClass, string> = {
    VERY_POSITIVE: '#34d399', // emerald-400
    POSITIVE: '#4ade80',     // green-400
    NEUTRAL: '#9ca3af',      // gray-400
    NEGATIVE: '#f87171',     // red-400
    VERY_NEGATIVE: '#f472b6',// pink-400
};

export function SentimentAnalysis() {
    const WORD_LIMIT = 1000;
    const { inputText: text, setInputText: setText } = useInputText();
    const [results, setResults] = useState<Sentence[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pieChartRef = useRef<ChartJS<'pie'>>(null);
    const barChartRef = useRef<ChartJS<'bar'>>(null);

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

    // Adjust height when text is set programmatically
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [text]);

    const handleAnalyze = async () => {
        if (!text.trim()) {
            setError('Please enter some text to analyze');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiService.analyzeSentiment(text);
            setResults(response.sentences);
        } catch (err) {
            setError('Failed to analyze sentiment. Please try again.');
            console.error('Sentiment analysis error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadJSON = () => {
        downloadSentimentResults(results, text);
    };

    const handleDownloadCSV = () => {
        downloadSentimentResultsCSV(results);
    };

    const handleDownloadPieChart = () => {
        if (pieChartRef.current) {
            const canvas = pieChartRef.current.canvas;
            const link = document.createElement('a');
            link.download = 'sentiment-pie-chart.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadBarChart = () => {
        if (barChartRef.current) {
            const canvas = barChartRef.current.canvas;
            const link = document.createElement('a');
            link.download = 'sentiment-bar-chart.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Count sentiment classes
    const sentimentCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const cls of SENTIMENT_CLASSES) counts[cls] = 0;
        for (const s of results) {
            if (counts[s.label] !== undefined) counts[s.label]++;
        }
        return counts;
    }, [results]);

    // Pie chart data
    const pieData = useMemo(() => ({
        labels: SENTIMENT_CLASSES.map((c) => SENTIMENT_LABELS[c]),
        datasets: [
            {
                data: SENTIMENT_CLASSES.map((c) => sentimentCounts[c]),
                backgroundColor: SENTIMENT_CLASSES.map((c) => SENTIMENT_COLORS[c]),
                borderWidth: 1,
            },
        ],
    }), [sentimentCounts]);

    // Pie chart options with percentage in tooltip
    const pieOptions = useMemo(() => ({
        plugins: {
            tooltip: {
                callbacks: {
                    label: function (context: TooltipItem<'pie'>) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const data = context.chart.data.datasets[0].data as number[];
                        const total = data.reduce((sum: number, v: number) => sum + v, 0);
                        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return `${label}: ${value} (${percent}%)`;
                    }
                }
            },
            legend: { display: true },
            title: { display: false },
        },
    }), [sentimentCounts]);

    // Bar chart data
    const barData = useMemo(() => ({
        labels: SENTIMENT_CLASSES.map((c) => SENTIMENT_LABELS[c]),
        datasets: [
            {
                label: 'Count',
                data: SENTIMENT_CLASSES.map((c) => sentimentCounts[c]),
                backgroundColor: SENTIMENT_CLASSES.map((c) => SENTIMENT_COLORS[c]),
            },
        ],
    }), [sentimentCounts]);

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Sentiment Class Counts' },
        },
        scales: {
            y: { beginAtZero: true, precision: 0 },
        },
    };

    const getSentimentIcon = (label: string) => {
        switch (label) {
            case 'VERY_POSITIVE':
                return <span title="Very Positive"><TrendingUp className="h-5 w-5 text-emerald-500" /></span>;
            case 'POSITIVE':
                return <span title="Positive"><TrendingUp className="h-5 w-5 text-green-500" /></span>;
            case 'VERY_NEGATIVE':
                return <span title="Very Negative"><TrendingDown className="h-5 w-5 text-pink-500" /></span>;
            case 'NEGATIVE':
                return <span title="Negative"><TrendingDown className="h-5 w-5 text-red-500" /></span>;
            default:
                return <span title="Neutral"><Minus className="h-5 w-5 text-gray-500" /></span>;
        }
    };

    const getSentimentColor = (label: string) => {
        switch (label) {
            case 'VERY_POSITIVE':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'POSITIVE':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'VERY_NEGATIVE':
                return 'bg-pink-50 text-pink-700 border-pink-200';
            case 'NEGATIVE':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getSentimentLabel = (label: string) => {
        switch (label) {
            case 'VERY_POSITIVE':
                return 'Very Positive';
            case 'POSITIVE':
                return 'Positive';
            case 'VERY_NEGATIVE':
                return 'Very Negative';
            case 'NEGATIVE':
                return 'Negative';
            default:
                return 'Neutral';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <Brain className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Sentiment Analysis</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <FileUploadToInputText setInputText={setText} />
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
                                Enter your text to analyze
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
                            placeholder="Enter text here..."
                            value={text}
                            onChange={handleTextareaInput}
                            onInput={handleTextareaInput}
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
                            'Analyze Sentiment'
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
                <>
                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center">
                            <h3 className="text-lg font-semibold mb-2">Sentiment Distribution (Pie)</h3>
                            <div className="w-full max-w-xs">
                                <Pie ref={pieChartRef} data={pieData} options={pieOptions} />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center">
                            <h3 className="text-lg font-semibold mb-2">Sentiment Counts (Bar)</h3>
                            <div className="w-full max-w-xs">
                                <Bar ref={barChartRef} data={barData} options={barOptions} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleDownloadJSON}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Download JSON
                                </button>
                                <button
                                    onClick={handleDownloadCSV}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Download CSV
                                </button>
                                <button
                                    onClick={handleDownloadPieChart}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Download Pie Chart
                                </button>
                                <button
                                    onClick={handleDownloadBarChart}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Download Bar Chart
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {results.map((sentence, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-lg border ${getSentimentColor(sentence.label)}`}
                                >
                                    <div className="flex items-start space-x-3">
                                        {getSentimentIcon(sentence.label)}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium mb-1">{sentence.sentence}</p>
                                            <div className="flex items-center space-x-4 text-xs">
                                                <span className="capitalize">{getSentimentLabel(sentence.label)}</span>
                                                <span>Score: {sentence.score.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
