import axios from 'axios';

const API_BASE_URL = 'http://localhost:58016/api/v1/free_txt';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Sentence {
    sentence: string;
    score: number;
    label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface MeaningAnalysisResponse {
    sentences: Sentence[];
}

export interface SummarizationRequest {
    text: string;
    ratio: number;
}

export interface SummarizationResponse {
    summarize_text: string;
}

export interface WordTreeRequest {
    text: string;
    keyword: string;
}

export interface WordTreeNode {
    [key: string]: string | number | WordTreeNode;
}

export interface WordTreeResponse {
    word: string;
    left: WordTreeNode;
    right: WordTreeNode;
}

export const apiService = {
    // Sentiment Analysis
    async analyzeSentiment(text: string): Promise<MeaningAnalysisResponse> {
        const response = await api.post('/meaning_analysis', { text });
        return response.data;
    },

    // Summarization
    async summarizeText(text: string, ratio: number = 0.3): Promise<SummarizationResponse> {
        const response = await api.post('/summarization', { text, ratio });
        return response.data;
    },

    // Word Tree
    async createWordTree(text: string, keyword: string): Promise<WordTreeResponse> {
        const response = await api.post('/word_tree', { text, keyword });
        return response.data;
    },
}; 