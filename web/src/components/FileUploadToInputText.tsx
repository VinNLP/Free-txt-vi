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

interface ColumnData {
  columns: string[];
  data: string[][];
  fileType: 'csv' | 'excel';
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
  const [columnData, setColumnData] = useState<ColumnData | null>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileChange called');
    const selectedFile = e.target.files?.[0] || null;
    setSelectedFile(selectedFile);
    setError(null);
    setColumnData(null);
    setSelectedColumns([]);
    setShowColumnSelector(false);
    e.target.value = '';
  };

  const processFileData = async (file: File): Promise<ColumnData> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          complete: (results: ParseResult<unknown>) => {
            const data = results.data as string[][];
            if (data.length === 0) {
              reject(new Error('CSV file is empty'));
              return;
            }

            const columns = data[0];
            const rows = data.slice(1);

            resolve({
              columns,
              data: rows,
              fileType: 'csv'
            });
          },
          error: () => {
            reject(new Error('Failed to parse CSV file'));
          },
        });
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      const columns = jsonData[0];
      const rows = jsonData.slice(1);

      return {
        columns,
        data: rows,
        fileType: 'excel'
      };
    } else {
      throw new Error('Unsupported file type for column selection');
    }
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
      } else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        // CSV/Excel parsing with column selection
        const data = await processFileData(selectedFile);
        setColumnData(data);
        setShowColumnSelector(true);
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

  const handleColumnSelection = () => {
    if (!columnData || selectedColumns.length === 0) {
      setError('Please select at least one column.');
      return;
    }

    // Extract data from selected columns
    const selectedColumnIndices = selectedColumns.map(col => columnData.columns.indexOf(col));
    const extractedData = columnData.data.map(row =>
      selectedColumnIndices.map(index => row[index] || '').join(' ')
    ).join('\n');

    const processedText = splitTextIntoSentences(extractedData.trim());
    const { truncatedText, message } = truncateText(processedText, 1000);
    setInputText(truncatedText);
    setError(message);

    // Close the column selector
    setShowColumnSelector(false);
    setColumnData(null);
    setSelectedColumns([]);
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    setColumnData(null);
    setSelectedColumns([]);
    setShowColumnSelector(false);
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

      {/* Column Selection Modal */}
      {showColumnSelector && columnData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Select Columns to Load</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose which columns you want to include in the text analysis:
            </p>

            <div className="space-y-2 mb-4">
              {columnData.columns.map((column, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => handleColumnToggle(column)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{column || `Column ${index + 1}`}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowColumnSelector(false);
                  setColumnData(null);
                  setSelectedColumns([]);
                }}
                className="px-4 py-2 rounded bg-gray-500 text-white text-sm font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleColumnSelection}
                disabled={selectedColumns.length === 0}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load Selected Columns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadToInputText;
