import React, { useState } from 'react';
import { apiService } from '../services/api';

interface BytesApiExampleProps {
  title?: string;
}

export const BytesApiExample: React.FC<BytesApiExampleProps> = ({
  title = "Fast Bytes-Based API Example"
}) => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ data: unknown; duration: string; apiType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeSentiment = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const startTime = performance.now();
      const response = await apiService.analyzeSentiment(text);
      const endTime = performance.now();
      const duration = endTime - startTime;

      setResult({
        data: response,
        duration: `${duration.toFixed(2)}ms`,
        apiType: 'BYTES'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectAspects = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const startTime = performance.now();
      const response = await apiService.detectAspects(text);
      const endTime = performance.now();
      const duration = endTime - startTime;

      setResult({
        data: response,
        duration: `${duration.toFixed(2)}ms`,
        apiType: 'BYTES'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const startTime = performance.now();
      const response = await apiService.summarizeText(text, 0.3);
      const endTime = performance.now();
      const duration = endTime - startTime;

      setResult({
        data: response,
        duration: `${duration.toFixed(2)}ms`,
        apiType: 'BYTES'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>

      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
        <h4 className="font-semibold text-green-800 mb-2">Fast Bytes-Based API</h4>
        <p className="text-sm text-green-700">
          This application now uses a high-performance bytes-based API for faster processing.
          All data is transmitted as binary for optimal performance.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Input Text
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text here..."
          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleAnalyzeSentiment}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Analyze Sentiment'}
        </button>
        <button
          onClick={handleDetectAspects}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Detect Aspects'}
        </button>
        <button
          onClick={handleSummarize}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Summarize'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-gray-200 rounded-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Results</h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">API Type:</span> {result.apiType} |
              <span className="font-medium ml-2">Duration:</span> {result.duration}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="font-semibold text-blue-800 mb-2">Performance Benefits</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Binary data transmission for faster processing</li>
          <li>• Reduced network overhead and latency</li>
          <li>• Optimized for large text data</li>
          <li>• Efficient encoding/decoding with length prefixes</li>
        </ul>
      </div>
    </div>
  );
};
