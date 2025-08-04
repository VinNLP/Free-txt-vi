import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Loader2, Download, Settings } from 'lucide-react';
import { apiService, type MatplotlibWordCloudResponse } from '../services/api';
import { useInputText } from '../components/useInputText';
import FileUploadToInputText from '../components/FileUploadToInputText';

export function WordCloud() {
    const WORD_LIMIT = 1000;
    const { inputText: text, setInputText: setText } = useInputText();
    const [matplotlibWordCloudData, setMatplotlibWordCloudData] = useState<MatplotlibWordCloudResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cloudShape, setCloudShape] = useState('circle');


    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const handleGenerateWordCloud = async () => {
        if (!text.trim()) {
            setError('Please enter some text');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await apiService.createMatplotlibWordCloud({
                text,
                min_word_length: 2, // Default to 2
                max_words: 100, // Default to 100
                shape: cloudShape,
                width: 2400,  // Increased resolution
                height: 1800,  // Increased resolution
                background_color: 'white',
                colormap: 'viridis'
            });
            setMatplotlibWordCloudData(response);
        } catch (err) {
            setError('Failed to generate word cloud. Please try again.');
            console.error('Word cloud error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadJSON = () => {
        if (!matplotlibWordCloudData) return;

        const dataStr = JSON.stringify(matplotlibWordCloudData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'word_cloud_data.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPNG = () => {
        if (!matplotlibWordCloudData) return;

        // Create a temporary link to download the PNG image
        const link = document.createElement('a');
        link.href = matplotlibWordCloudData.image;
        link.download = 'word_cloud.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-3">
                <Cloud className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Word Cloud</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                    <FileUploadToInputText setInputText={setText} />
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
                                Enter your text to generate word cloud
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

                    {/* Settings Section */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Settings className="h-5 w-5 text-green-600" />
                                <h3 className="text-lg font-medium text-gray-900">Word Cloud Settings</h3>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cloud Shape
                                </label>
                                <select
                                    value={cloudShape}
                                    onChange={(e) => setCloudShape(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="circle">Circle</option>
                                    <option value="square">Square</option>
                                    <option value="rectangle">Rectangle</option>
                                    <option value="triangle">Triangle</option>
                                    <option value="star">Star</option>
                                    <option value="heart">Heart</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateWordCloud}
                        disabled={loading || !text.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Generating Word Cloud...
                            </>
                        ) : (
                            <>
                                <Cloud className="h-4 w-4 mr-2" />
                                Generate Word Cloud
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            {matplotlibWordCloudData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-semibold text-gray-900">Word Cloud</h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {cloudShape.charAt(0).toUpperCase() + cloudShape.slice(1)} Shape
                            </span>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleDownloadJSON}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Download JSON
                            </button>
                            <button
                                onClick={handleDownloadPNG}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Download PNG
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col items-center">
                            <img
                                src={matplotlibWordCloudData.image}
                                alt="Word Cloud"
                                className="max-w-full h-auto rounded-lg border border-gray-200"
                                style={{ maxHeight: '600px' }}
                            />
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">Total Words:</span>
                                    <span className="ml-2 text-gray-900">{matplotlibWordCloudData.total_words}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Most Frequent:</span>
                                    <span className="ml-2 text-gray-900">{matplotlibWordCloudData.most_frequent_word}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Frequency:</span>
                                    <span className="ml-2 text-gray-900">{matplotlibWordCloudData.most_frequent_count} occurrences</span>
                                </div>
                            </div>
                            <p className="text-green-600 mt-3 text-sm">
                                💡 High-quality traditional word cloud with all words displayed in {cloudShape} shape.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
