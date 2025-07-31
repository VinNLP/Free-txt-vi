from typing import Optional, List

from pydantic import BaseModel, Field

from internal.common.enums.free_txt import EnumSentimentLabel


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


class WordCloudWord(BaseModel):
    word: str = Field(description="Word")
    score: int = Field(description="Score to view")


class WordCloudResponse(BaseModel):
    words: List[WordCloudWord] = Field(description="Many words and their score")


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
