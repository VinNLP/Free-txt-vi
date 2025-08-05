import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + "/api/v1/free_txt";

// Bytes-based API client
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/octet-stream',
    },
    responseType: 'arraybuffer',
});

// Bytes encoding/decoding utilities
class BytesEncoder {
    static encodeText(text: string): Uint8Array {
        const textEncoder = new TextEncoder();
        const textBytes = textEncoder.encode(text);
        const length = textBytes.length;
        const lengthBuffer = new ArrayBuffer(4);
        const lengthView = new DataView(lengthBuffer);
        lengthView.setUint32(0, length, false); // Big-endian

        const result = new Uint8Array(4 + textBytes.length);
        result.set(new Uint8Array(lengthBuffer), 0);
        result.set(textBytes, 4);
        return result;
    }

    static encodeFloat(value: number): Uint8Array {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value, false); // Big-endian
        return new Uint8Array(buffer);
    }

    static encodeUint32(value: number): Uint8Array {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setUint32(0, value, false); // Big-endian
        return new Uint8Array(buffer);
    }

    static decodeResponse(response: ArrayBuffer): Record<string, unknown> {
        const data = new Uint8Array(response);
        if (data.length < 4) {
            throw new Error("Insufficient data for length prefix");
        }

        const lengthView = new DataView(data.buffer, 0, 4);
        const length = lengthView.getUint32(0, false); // Big-endian

        if (data.length < 4 + length) {
            throw new Error("Insufficient data for JSON");
        }

        const jsonBytes = data.slice(4, 4 + length);
        const textDecoder = new TextDecoder();
        const jsonStr = textDecoder.decode(jsonBytes);
        return JSON.parse(jsonStr);
    }
}

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

export interface WordCloudWord {
    word: string;
    score: number;
}

export interface MatplotlibWordCloudRequest {
    text: string;
    method?: string;
    min_word_length?: number;
    max_words?: number;
    width?: number;
    height?: number;
    background_color?: string;
    colormap?: string;
    shape?: string;
    contour_width?: number;
    contour_color?: string;
    prefer_horizontal?: number;
    relative_scaling?: number;
    scale?: number;
    min_font_size?: number;
    max_font_size?: number;
    random_state?: number;
}

export interface MatplotlibWordCloudResponse {
    image: string;
    words: WordCloudWord[];
    total_words: number;
    most_frequent_word: string;
    most_frequent_count: number;
    method: string;
    message?: string;
}


export const apiService = {
    // Bytes-based methods for fast processing
    // Sentiment Analysis
    async analyzeSentiment(text: string): Promise<MeaningAnalysisResponse> {
        const data = BytesEncoder.encodeText(text);
        const response = await api.post('/meaning_analysis', data);
        return BytesEncoder.decodeResponse(response.data) as MeaningAnalysisResponse;
    },

    // Aspect Detection
    async detectAspects(text: string): Promise<AspectDetectionResponse> {
        const data = BytesEncoder.encodeText(text);
        const response = await api.post('/aspect_detection', data);
        return BytesEncoder.decodeResponse(response.data) as AspectDetectionResponse;
    },

    // Summarization
    async summarizeText(text: string, ratio: number = 0.3, aspect?: string): Promise<SummarizationResponse> {
        const textData = BytesEncoder.encodeText(text);
        const ratioData = BytesEncoder.encodeFloat(ratio);

        let aspectData: Uint8Array;
        if (aspect) {
            const aspectTextData = BytesEncoder.encodeText(aspect);
            aspectData = new Uint8Array(4 + aspectTextData.length);
            aspectData.set(BytesEncoder.encodeUint32(aspectTextData.length), 0);
            aspectData.set(aspectTextData, 4);
        } else {
            aspectData = new Uint8Array(4);
            aspectData.set(BytesEncoder.encodeUint32(0), 0);
        }

        const data = new Uint8Array(textData.length + ratioData.length + aspectData.length);
        data.set(textData, 0);
        data.set(ratioData, textData.length);
        data.set(aspectData, textData.length + ratioData.length);

        const response = await api.post('/summarization', data);
        return BytesEncoder.decodeResponse(response.data) as SummarizationResponse;
    },

    // Word Tree
    async createWordTree(text: string, keyword: string): Promise<WordTreeResponse> {
        const textData = BytesEncoder.encodeText(text);
        const keywordData = BytesEncoder.encodeText(keyword);

        const data = new Uint8Array(textData.length + keywordData.length);
        data.set(textData, 0);
        data.set(keywordData, textData.length);

        const response = await api.post('/word_tree', data);
        return BytesEncoder.decodeResponse(response.data) as WordTreeResponse;
    },

    // Concordance
    async concordance(request: ConcordanceRequest): Promise<ConcordanceResponse> {
        const textData = BytesEncoder.encodeText(request.text);
        const keywordData = BytesEncoder.encodeText(request.keyword);
        const windowSizeData = BytesEncoder.encodeUint32(request.window_size);

        const data = new Uint8Array(textData.length + keywordData.length + windowSizeData.length);
        data.set(textData, 0);
        data.set(keywordData, textData.length);
        data.set(windowSizeData, textData.length + keywordData.length);

        const response = await api.post('/concordance', data);
        return BytesEncoder.decodeResponse(response.data) as ConcordanceResponse;
    },

    // Word Suggestions
    async wordSuggestions(request: WordSuggestionRequest): Promise<WordSuggestionResponse> {
        const textData = BytesEncoder.encodeText(request.text);
        const keywordData = BytesEncoder.encodeText(request.keyword);
        const windowSizeData = BytesEncoder.encodeUint32(request.window_size);
        const numSuggestionsData = BytesEncoder.encodeUint32(request.num_suggestions || 5);

        const data = new Uint8Array(textData.length + keywordData.length + windowSizeData.length + numSuggestionsData.length);
        data.set(textData, 0);
        data.set(keywordData, textData.length);
        data.set(windowSizeData, textData.length + keywordData.length);
        data.set(numSuggestionsData, textData.length + keywordData.length + windowSizeData.length);

        const response = await api.post('/word_suggestions', data);
        return BytesEncoder.decodeResponse(response.data) as WordSuggestionResponse;
    },

    // Word Cloud
    async createWordCloud(text: string, method: string = 'frequency', minWordLength: number = 2, maxWords: number = 100): Promise<{ words: WordCloudWord[] }> {
        const textData = BytesEncoder.encodeText(text);
        const methodData = BytesEncoder.encodeText(method);
        const minWordLengthData = BytesEncoder.encodeUint32(minWordLength);
        const maxWordsData = BytesEncoder.encodeUint32(maxWords);

        const data = new Uint8Array(textData.length + methodData.length + minWordLengthData.length + maxWordsData.length);
        data.set(textData, 0);
        data.set(methodData, textData.length);
        data.set(minWordLengthData, textData.length + methodData.length);
        data.set(maxWordsData, textData.length + methodData.length + minWordLengthData.length);

        const response = await api.post('/word_cloud', data);
        return BytesEncoder.decodeResponse(response.data) as { words: WordCloudWord[] };
    },

    // Matplotlib Word Cloud
    async createMatplotlibWordCloud(request: MatplotlibWordCloudRequest): Promise<MatplotlibWordCloudResponse> {
        const textData = BytesEncoder.encodeText(request.text);
        const methodData = BytesEncoder.encodeText(request.method || 'frequency');
        const minWordLengthData = BytesEncoder.encodeUint32(request.min_word_length || 2);
        const maxWordsData = BytesEncoder.encodeUint32(request.max_words || 100);
        const widthData = BytesEncoder.encodeUint32(request.width || 2400);
        const heightData = BytesEncoder.encodeUint32(request.height || 1800);

        // Encode shape parameter
        const shapeData = BytesEncoder.encodeText(request.shape || 'circle');

        // Encode other parameters
        const backgroundColorData = BytesEncoder.encodeText(request.background_color || 'white');
        const colormapData = BytesEncoder.encodeText(request.colormap || 'viridis');
        const contourWidthData = BytesEncoder.encodeUint32(request.contour_width || 0);
        const contourColorData = BytesEncoder.encodeText(request.contour_color || 'black');
        const preferHorizontalData = BytesEncoder.encodeFloat(request.prefer_horizontal || 0.7);
        const relativeScalingData = BytesEncoder.encodeFloat(request.relative_scaling || 0.5);
        const scaleData = BytesEncoder.encodeFloat(request.scale || 1.0);
        const minFontSizeData = BytesEncoder.encodeUint32(request.min_font_size || 4);
        const maxFontSizeData = BytesEncoder.encodeUint32(request.max_font_size || 0); // 0 means None
        const randomStateData = BytesEncoder.encodeUint32(request.random_state || 0); // 0 means None

        const data = new Uint8Array(
            textData.length +
            methodData.length +
            minWordLengthData.length +
            maxWordsData.length +
            widthData.length +
            heightData.length +
            shapeData.length +
            backgroundColorData.length +
            colormapData.length +
            contourWidthData.length +
            contourColorData.length +
            preferHorizontalData.length +
            relativeScalingData.length +
            scaleData.length +
            minFontSizeData.length +
            maxFontSizeData.length +
            randomStateData.length
        );

        let offset = 0;
        data.set(textData, offset); offset += textData.length;
        data.set(methodData, offset); offset += methodData.length;
        data.set(minWordLengthData, offset); offset += minWordLengthData.length;
        data.set(maxWordsData, offset); offset += maxWordsData.length;
        data.set(widthData, offset); offset += widthData.length;
        data.set(heightData, offset); offset += heightData.length;
        data.set(shapeData, offset); offset += shapeData.length;
        data.set(backgroundColorData, offset); offset += backgroundColorData.length;
        data.set(colormapData, offset); offset += colormapData.length;
        data.set(contourWidthData, offset); offset += contourWidthData.length;
        data.set(contourColorData, offset); offset += contourColorData.length;
        data.set(preferHorizontalData, offset); offset += preferHorizontalData.length;
        data.set(relativeScalingData, offset); offset += relativeScalingData.length;
        data.set(scaleData, offset); offset += scaleData.length;
        data.set(minFontSizeData, offset); offset += minFontSizeData.length;
        data.set(maxFontSizeData, offset); offset += maxFontSizeData.length;
        data.set(randomStateData, offset);

        const response = await api.post('/matplotlib_word_cloud', data);
        return BytesEncoder.decodeResponse(response.data) as MatplotlibWordCloudResponse;
    },
};
