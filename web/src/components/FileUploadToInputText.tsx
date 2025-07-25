import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { ParseResult } from 'papaparse';
import { useInputText } from './useInputText';

// Use a local worker file for Vite compatibility
GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface FileUploadToInputTextProps {
  setInputText: (text: string) => void;
}

function splitTextIntoSentences(text: string): string {
  // Replace bullet points with a period to ensure they are treated as sentences.
  const textWithBulletsAsPeriods = text.replace(/•/g, '.');

  // Split on period, exclamation, or question mark followed by one or more spaces/newlines, but keep the delimiter.
  return textWithBulletsAsPeriods
    .replace(/([.!?])(?=\s+|$)/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .join('\n');
}

function truncateText(text: string, wordLimit: number): { truncatedText: string, message: string | null } {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > wordLimit) {
        return {
            truncatedText: words.slice(0, wordLimit).join(' '),
            message: `Text truncated to ${wordLimit} words.`,
        };
    }
    return { truncatedText: text, message: null };
}

const FileUploadToInputText: React.FC<FileUploadToInputTextProps> = ({ setInputText }) => {
  const { selectedFile, setSelectedFile } = useInputText();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileChange called');
    const selectedFile = e.target.files?.[0] || null;
    setSelectedFile(selectedFile);
    setError(null);
    e.target.value = '';
  };

  const handleProcessFile = async () => {
    console.log('handleProcessFile called, file:', selectedFile);
    if (!selectedFile) {
      console.log('No file to process!');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      console.log('Processing file:', selectedFile.name, 'type:', ext);
      if (!ext) throw new Error('Unknown file type');
      if (ext === 'txt') {
        // Text file parsing
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result);
          };
          reader.onerror = () => reject(new Error('Failed to read text file'));
          reader.readAsText(selectedFile);
        });
        console.log('TXT parsed text:', text);
        const processedText = splitTextIntoSentences(text.trim());
        const { truncatedText, message } = truncateText(processedText, 1000);
        setInputText(truncatedText);
        setError(message);
      } else if (ext === 'pdf') {
        // PDF parsing
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += (content.items as { str: string }[]).map((item) => item.str).join(' ') + '\n';
        }
        console.log('PDF parsed text:', text);
        const processedText = splitTextIntoSentences(text.trim());
        const { truncatedText, message } = truncateText(processedText, 1000);
        setInputText(truncatedText);
        setError(message);
      } else if (ext === 'csv') {
        // CSV parsing
        await new Promise<void>((resolve, reject) => {
          Papa.parse(selectedFile, {
            complete: (results: ParseResult<unknown>) => {
              const text = (results.data as string[][]).map((row) => (Array.isArray(row) ? row.join(',') : String(row))).join('\n');
              console.log('CSV parsed text:', text);
              const processedText = splitTextIntoSentences(text);
              const { truncatedText, message } = truncateText(processedText, 1000);
              setInputText(truncatedText);
              setError(message);
              resolve();
            },
            error: (err) => {
              setError('Failed to parse CSV file.');
              console.error('CSV parse error:', err);
              reject(err);
            },
          });
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Excel parsing
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let text = '';
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          text += csv + '\n';
        });
        console.log('Excel parsed text:', text);
        const processedText = splitTextIntoSentences(text.trim());
        const { truncatedText, message } = truncateText(processedText, 1000);
        setInputText(truncatedText);
        setError(message);
      } else {
        setError('Unsupported file type. Please upload PDF, CSV, Excel, or TXT files.');
        console.error('Unsupported file type:', ext);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to process file.');
        console.error('File processing error:', err.message);
      } else {
        setError('Failed to process file.');
        console.error('File processing error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  // Debug: log file state before rendering button
  console.log('File state before render:', selectedFile);

  return (
    <div className="mb-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF, CSV, Excel, or TXT file</label>
      <input
        type="file"
        accept=".pdf,.csv,.xlsx,.xls,.txt"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      <div className="mt-1 text-xs text-gray-600">File state: {selectedFile ? selectedFile.name : 'none'}</div>
      {selectedFile && (
        <div className="mt-1 text-xs text-gray-600">Selected file: {selectedFile.name}</div>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleProcessFile}
          disabled={!selectedFile || loading}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Load File Content'}
        </button>
        {selectedFile && (
          <button
            type="button"
            onClick={handleClearFile}
            className="px-4 py-2 rounded bg-gray-500 text-white text-sm font-medium hover:bg-gray-600"
          >
            Clear File
          </button>
        )}
      </div>
      {error && <div className="mt-1 text-xs text-yellow-600">{error}</div>}
    </div>
  );
};

export default FileUploadToInputText;
