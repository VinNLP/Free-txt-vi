import React, { useState, useRef, useEffect } from 'react';
import { FileText, Loader2, Copy, Check, Download, FileSpreadsheet, Target, Eye } from 'lucide-react';
import { apiService } from '../services/api';
import type { AspectInfo } from '../services/api';
import { useInputText } from '../components/useInputText';
import FileUploadToInputText from '../components/FileUploadToInputText';
import { downloadSummary, downloadAsTXT } from '../utils/downloadUtils';

export function Summarization() {
    const WORD_LIMIT = 1000;
    const { inputText: text, setInputText: setText } = useInputText();
    const [ratio, setRatio] = useState(0.3);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    // Aspect detection states
    const [aspects, setAspects] = useState<AspectInfo[]>([]);
    const [selectedAspect, setSelectedAspect] = useState<string>('');
    const [detectingAspects, setDetectingAspects] = useState(false);
    const [showAspectSelection, setShowAspectSelection] = useState(false);

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

    const handleDetectAspects = async () => {
        if (!text.trim()) {
            setError('Please enter some text to detect aspects');
            return;
        }

        setDetectingAspects(true);
        setError('');

        try {
            const response = await apiService.detectAspects(text);
            setAspects(response.aspects);
            setShowAspectSelection(true);
            if (response.aspects.length > 0) {
                setSelectedAspect(response.aspects[0].aspect);
            }
        } catch (err) {
            setError('Failed to detect aspects. Please try again.');
            console.error('Aspect detection error:', err);
        } finally {
            setDetectingAspects(false);
        }
    };

    const handleSummarize = async () => {
        if (!text.trim()) {
            setError('Please enter some text to summarize');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiService.summarizeText(text, ratio, selectedAspect || undefined);
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

    const handleDownloadJSON = () => {
        downloadSummary(summary, text, ratio);
    };

    const handleDownloadTXT = () => {
        downloadAsTXT(summary, 'text-summary');
    };

    const getAspectDisplayName = (aspect: string) => {
        const displayNames: { [key: string]: string } = {
            'technical': 'Technical',
            'business': 'Business',
            'academic': 'Academic',
            'medical': 'Medical',
            'legal': 'Legal',
            'financial': 'Financial',
            'social': 'Social',
            'environmental': 'Environmental',
            'political': 'Political',
            'scientific': 'Scientific'
        };
        return displayNames[aspect] || aspect;
    };

    const getAspectDisplayNameVi = (aspect: string) => {
        const displayNamesVi: { [key: string]: string } = {
            'technical': 'Kỹ thuật',
            'business': 'Kinh doanh',
            'academic': 'Học thuật',
            'medical': 'Y tế',
            'legal': 'Pháp lý',
            'financial': 'Tài chính',
            'social': 'Xã hội',
            'environmental': 'Môi trường',
            'political': 'Chính trị',
            'scientific': 'Khoa học'
        };
        return displayNamesVi[aspect] || aspect;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Text Summarization</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <FileUploadToInputText setInputText={setText} />
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
                                Enter your text to summarize
                            </label>
                            <span className="text-xs text-gray-500">
                                {text.split(/\s+/).filter(Boolean).length} / {WORD_LIMIT} words
                            </span>
                        </div>
                        <textarea
                            id="text"
                            ref={textareaRef}
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Enter text here..."
                            value={text}
                            onChange={handleTextareaInput}
                            onInput={handleTextareaInput}
                        />
                    </div>

                    {/* Aspect Detection Section */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Target className="h-5 w-5 text-green-600" />
                                <h3 className="text-lg font-medium text-gray-900">Aspect Detection</h3>
                            </div>
                            <button
                                onClick={handleDetectAspects}
                                disabled={detectingAspects || !text.trim()}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {detectingAspects ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        Detecting...
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-1" />
                                        Detect Aspects
                                    </>
                                )}
                            </button>
                        </div>

                        {showAspectSelection && aspects.length > 0 && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Select an aspect to focus on (optional):
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                    <button
                                        onClick={() => setSelectedAspect('')}
                                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                                            selectedAspect === ''
                                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        General
                                    </button>
                                    {aspects.map((aspect) => (
                                        <button
                                            key={aspect.aspect}
                                            onClick={() => setSelectedAspect(aspect.aspect)}
                                            className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                                                selectedAspect === aspect.aspect
                                                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="font-medium">
                                                    {aspect.language === 'vi' ? getAspectDisplayNameVi(aspect.aspect) : getAspectDisplayName(aspect.aspect)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {Math.round(aspect.confidence * 100)}% confidence
                                                </div>
                                                <div className="text-xs text-blue-500">
                                                    {aspect.language === 'vi' ? 'Tiếng Việt' : 'English'}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="ratio" className="block text-sm font-medium text-gray-700 mb-2">
                            Summary Ratio: {Math.round(ratio * 100)}%
                        </label>
                        <input
                            id="ratio"
                            type="range"
                            min="0.1"
                            max="0.5"
                            step="0.05"
                            value={ratio}
                            onChange={(e) => setRatio(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>10%</span>
                            <span>20%</span>
                            <span>30%</span>
                            <span>40%</span>
                            <span>50%</span>
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
                        <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
                            {selectedAspect && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {getAspectDisplayName(selectedAspect)} Focus
                                </span>
                            )}
                        </div>
                        <div className="flex space-x-2">
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
                            <button
                                onClick={handleDownloadJSON}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Download JSON
                            </button>
                            <button
                                onClick={handleDownloadTXT}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-1" />
                                Download TXT
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 leading-relaxed">{summary}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
