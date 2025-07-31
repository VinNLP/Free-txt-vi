from datetime import datetime, timedelta
from fastapi import Request
from loguru import logger
from core.settings import settings
from internal.common.schemas.free_txt import (
    SummarizationRequest,
    SummarizationResponse,
    WordTreeRequest,
    WordTreeResponse,
    MeaningAnalysisRequest,
    MeaningAnalysisResponse,
    ConcordanceRequest,
    ConcordanceResponse,
    WordSuggestionRequest,
    WordSuggestionResponse,
    WordSuggestionEntry,
)
from internal.services.summarisation import Summarizer
from internal.services.word_tree import WordTree
from internal.services.meaning_analysis import MeaningAnalyzer
from internal.services.word_use_relationships import ConcordanceService
from internal.services.word_suggestions import WordSuggestionService


class FreeTxtController:
    summarizer: Summarizer
    wordtree: WordTree
    meaning_analyzer: MeaningAnalyzer

    def __init__(self):
        self.summarizer = Summarizer()
        self.wordtree = WordTree()
        self.meaning_analyzer = MeaningAnalyzer()
        self.concordance_service = ConcordanceService()
        self.word_suggestion_service = WordSuggestionService()

    async def summarization(
        self, sum_request: SummarizationRequest
    ) -> SummarizationResponse:
        text = await self.summarizer.sum_qwen(sum_request.text, sum_request.ratio)
        return SummarizationResponse(summarize_text=text)

    async def gen_wordtree(self, wordtree_request: WordTreeRequest) -> WordTreeResponse:
        tree = await self.wordtree.build_word_tree(
            wordtree_request.text, wordtree_request.keyword
        )
        return WordTreeResponse(
            word=tree["word"], left=tree["left"], right=tree["right"]
        )

    async def meaning_analysis(
        self, meaning_analysis_request: MeaningAnalysisRequest
    ) -> MeaningAnalysisResponse:
        sentences = await self.meaning_analyzer.meaning_analyse(
            meaning_analysis_request.text
        )
        return MeaningAnalysisResponse(sentences=sentences)

    async def concordance(
        self, concordance_request: ConcordanceRequest
    ) -> ConcordanceResponse:
        results = await self.concordance_service.concordance(
            concordance_request.text,
            concordance_request.keyword,
            concordance_request.window_size,
        )
        return ConcordanceResponse(results=results)

    async def word_suggestions(
        self, word_suggestion_request: WordSuggestionRequest
    ) -> WordSuggestionResponse:
        # First get the concordance results
        concordance_results = await self.concordance_service.concordance(
            word_suggestion_request.text,
            word_suggestion_request.keyword,
            word_suggestion_request.window_size,
        )

        # For each concordance entry, generate suggestions
        suggestion_results = []
        for entry in concordance_results:
            suggestions = await self.word_suggestion_service.get_contextual_suggestions(
                entry.keyword,
                entry.left_context,
                entry.right_context,
                word_suggestion_request.num_suggestions
            )

            suggestion_results.append(
                WordSuggestionEntry(
                    left_context=entry.left_context,
                    keyword=entry.keyword,
                    right_context=entry.right_context,
                    suggestions=suggestions["suggestions"],
                    detected_language=suggestions["detected_language"]
                )
            )

        return WordSuggestionResponse(results=suggestion_results)
