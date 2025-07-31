import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + "/api/v1/free_txt";

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

export interface AspectInfo {
    aspect: string;
    confidence: number;
    similarity_score: number;
    description: string;
    language: string;
}

export interface AspectDetectionResponse {
    aspects: AspectInfo[];
}

export interface SummarizationRequest {
    text: string;
    ratio: number; // Must be between 0.1 (10%) and 0.5 (50%)
    aspect?: string;
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

export interface ConcordanceRequest {
    text: string;
    keyword: string;
    window_size: number;
}

export interface ConcordanceEntry {
    left_context: string;
    keyword: string;
    right_context: string;
}

export interface ConcordanceResponse {
    results: ConcordanceEntry[];
}

export interface WordSuggestionRequest {
    text: string;
    keyword: string;
    window_size: number;
    num_suggestions?: number;
}

export interface WordSuggestionEntry {
    left_context: string;
    keyword: string;
    right_context: string;
    suggestions: string[];
    detected_language: string;
}

export interface WordSuggestionResponse {
    results: WordSuggestionEntry[];
}



export const apiService = {
    // Sentiment Analysis
    async analyzeSentiment(text: string): Promise<MeaningAnalysisResponse> {
        const response = await api.post('/meaning_analysis', { text });
        return response.data;
    },

    // Aspect Detection
    async detectAspects(text: string): Promise<AspectDetectionResponse> {
        const response = await api.post('/aspect_detection', { text });
        return response.data;
    },

    // Summarization
    async summarizeText(text: string, ratio: number = 0.3, aspect?: string): Promise<SummarizationResponse> {
        const request: SummarizationRequest = { text, ratio };
        if (aspect) {
            request.aspect = aspect;
        }
        const response = await api.post('/summarization', request);
        return response.data;
    },

    // Word Tree
    async createWordTree(text: string, keyword: string): Promise<WordTreeResponse> {
        const response = await api.post('/word_tree', { text, keyword });
        return response.data;
    },

    // Concordance
    async concordance(request: ConcordanceRequest): Promise<ConcordanceResponse> {
        const response = await api.post('/concordance', request);
        return response.data;
    },

    // Word Suggestions
    async wordSuggestions(request: WordSuggestionRequest): Promise<WordSuggestionResponse> {
        const response = await api.post('/word_suggestions', request);
        return response.data;
    },


};
