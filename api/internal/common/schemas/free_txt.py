from typing import Optional, List
import struct
import json
from io import BytesIO

from pydantic import BaseModel, Field

from internal.common.enums.free_txt import EnumSentimentLabel


# Bytes-based schemas for faster processing
class BytesRequest:
    """Base class for bytes-based requests"""

    @staticmethod
    def encode_text(text: str) -> bytes:
        """Encode text as bytes with length prefix"""
        text_bytes = text.encode('utf-8')
        length = len(text_bytes)
        return struct.pack('>I', length) + text_bytes

    @staticmethod
    def decode_text(data: bytes) -> tuple[str, bytes]:
        """Decode text from bytes with length prefix"""
        if len(data) < 4:
            raise ValueError("Insufficient data for length prefix")
        length = struct.unpack('>I', data[:4])[0]
        if len(data) < 4 + length:
            raise ValueError("Insufficient data for text")
        text = data[4:4+length].decode('utf-8')
        return text, data[4+length:]


class BytesResponse:
    """Base class for bytes-based responses"""

    @staticmethod
    def encode_json_response(data: dict) -> bytes:
        """Encode JSON response as bytes"""
        json_str = json.dumps(data, ensure_ascii=False)
        json_bytes = json_str.encode('utf-8')
        length = len(json_bytes)
        return struct.pack('>I', length) + json_bytes

    @staticmethod
    def decode_json_response(data: bytes) -> tuple[dict, bytes]:
        """Decode JSON response from bytes"""
        if len(data) < 4:
            raise ValueError("Insufficient data for length prefix")
        length = struct.unpack('>I', data[:4])[0]
        if len(data) < 4 + length:
            raise ValueError("Insufficient data for JSON")
        json_str = data[4:4+length].decode('utf-8')
        return json.loads(json_str), data[4+length:]


# Original JSON-based schemas (keeping for backward compatibility)
class MeaningAnalysisRequest(BaseModel):
    text: str = Field(description="Input text to analyze")


class Sentence(BaseModel):
    sentence: str = Field(description="Sentence to analyze")
    score: float = Field(description="Score of the sentence")
    label: EnumSentimentLabel = Field(description="Sentiment Label")


class MeaningAnalysisResponse(BaseModel):
    sentences: List[Sentence] = Field(description="Sentiment Info")


class SentimentChartWord(BaseModel):
    word: str = Field(description="Word to search")
    positive_frequency: int = Field(description="Positive Frequency")
    negative_neutral_frequency: int = Field(
        description="Negative and Neutral Frequency"
    )
    score: int = Field(description="Score sentiment")


class SentimentChartResponse(BaseModel):
    words: List[SentimentChartWord] = Field(description="List word to represent")


class AspectDetectionRequest(BaseModel):
    text: str = Field(description="Input text to analyze for aspects")


class AspectInfo(BaseModel):
    aspect: str = Field(description="Detected aspect name")
    confidence: float = Field(description="Confidence score for the aspect (0-1)")
    similarity_score: float = Field(description="Cosine similarity score")
    description: str = Field(description="Description of the aspect")
    language: str = Field(description="Language of the best matching description (en/vi)")


class AspectDetectionResponse(BaseModel):
    aspects: List[AspectInfo] = Field(description="List of detected aspects")


class SummarizationRequest(BaseModel):
    text: str = Field(description="Input text")
    ratio: float = Field(description="Ratio of summary", ge=0.1, le=0.5)
    aspect: Optional[str] = Field(default=None, description="Specific aspect to focus on in summary")


class SummarizationResponse(BaseModel):
    summarize_text: str = Field(description="Summarized Text")


class WordCloudRequest(BaseModel):
    text: str = Field(description="Input text to analyze")
    method: str = Field(default="frequency", description="Analysis method: 'frequency', 'loglikelihood', or 'keyness'")
    min_word_length: int = Field(default=2, description="Minimum word length to include")
    max_words: int = Field(default=100, description="Maximum number of words to return")


class WordCloudWord(BaseModel):
    word: str = Field(description="Word")
    score: float = Field(description="Score to view")


class WordCloudResponse(BaseModel):
    words: List[WordCloudWord] = Field(description="Many words and their score")


class MatplotlibWordCloudRequest(BaseModel):
    text: str = Field(description="Input text to analyze")
    method: str = Field(default="frequency", description="Analysis method: 'frequency', 'loglikelihood', or 'keyness'")
    min_word_length: int = Field(default=2, description="Minimum word length to include")
    max_words: int = Field(default=100, description="Maximum number of words to return")
    width: int = Field(default=1200, description="Width of the generated image")
    height: int = Field(default=900, description="Height of the generated image")
    background_color: str = Field(default="white", description="Background color of the wordcloud")
    colormap: str = Field(default="viridis", description="Matplotlib colormap for word colors")
    shape: str = Field(default="circle", description="Shape of the wordcloud")
    contour_width: int = Field(default=0, description="Width of contour lines (0 for no contour)")
    contour_color: str = Field(default="black", description="Color of contour lines")
    prefer_horizontal: float = Field(default=0.7, description="Fraction of words to display horizontally")
    relative_scaling: float = Field(default=0.5, description="Relative scaling of word sizes")
    scale: float = Field(default=1.0, description="Scale factor for the image")
    min_font_size: int = Field(default=4, description="Minimum font size")
    max_font_size: Optional[int] = Field(default=None, description="Maximum font size (None for auto)")
    random_state: Optional[int] = Field(default=None, description="Random seed for reproducibility")


class MatplotlibWordCloudResponse(BaseModel):
    image: str = Field(description="Base64 encoded PNG image")
    words: List[WordCloudWord] = Field(description="List of words and their frequencies")
    total_words: int = Field(description="Total number of words in the wordcloud")
    most_frequent_word: str = Field(description="Most frequent word")
    most_frequent_count: float = Field(description="Frequency/score of the most frequent word")
    method: str = Field(description="Analysis method used")
    message: Optional[str] = Field(default=None, description="Additional message or error")


class WordTreeRequest(BaseModel):
    text: str = Field(description="Input text")
    keyword: str = Field(description="Keyword in word tree")


class WordTreeResponse(BaseModel):
    word: str = Field(description="Keyword")
    left: dict = Field(description="Left side")
    right: dict = Field(description="Right side")


class SentenceEntry(BaseModel):
    left_context: str = Field(description="Left Context")
    keyword: str = Field(description="Keyword")
    right_context: str = Field(description="Right Context")


class WordEntry(BaseModel):
    word: str = Field(description="Word")
    frequency: int = Field(description="Frequency")
    mutual_information: float = Field(description="Mutual Information")
    log_likelihood: float = Field(description="Log Likelihood")


class WordUseRelationshipsResponse(BaseModel):
    sentences: List[SentenceEntry] = Field(description="Sentences")
    words: List[WordEntry] = Field(description="Words")


class ConcordanceRequest(BaseModel):
    text: str = Field(description="Input text to analyze")
    keyword: str = Field(description="Keyword to search for")
    window_size: int = Field(description="Number of words before and after the keyword")


class ConcordanceEntry(BaseModel):
    left_context: str = Field(description="Words before the keyword")
    keyword: str = Field(description="The keyword itself")
    right_context: str = Field(description="Words after the keyword")


class ConcordanceResponse(BaseModel):
    results: List[ConcordanceEntry] = Field(description="List of concordance results")


class WordSuggestionRequest(BaseModel):
    text: str = Field(description="Input text to analyze")
    keyword: str = Field(description="Keyword to search for")
    window_size: int = Field(description="Number of words before and after the keyword")
    num_suggestions: int = Field(default=5, description="Number of word suggestions to generate")


class WordSuggestionEntry(BaseModel):
    left_context: str = Field(description="Words before the keyword")
    keyword: str = Field(description="The keyword itself")
    right_context: str = Field(description="Words after the keyword")
    suggestions: List[str] = Field(description="Suggested similar words")
    detected_language: str = Field(description="Detected language of the context")


class WordSuggestionResponse(BaseModel):
    results: List[WordSuggestionEntry] = Field(description="List of concordance results with word suggestions")
