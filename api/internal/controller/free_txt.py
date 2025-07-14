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
    WordNetworkRequest,
    WordNetworkResponse,
)
from internal.services.summarisation import Summarizer
from internal.services.word_tree import WordTree
from internal.services.meaning_analysis import MeaningAnalyzer
from internal.services.word_use_relationships import ConcordanceService
from internal.services.word_network import WordNetworkService


class FreeTxtController:
    summarizer: Summarizer
    wordtree: WordTree
    meaning_analyzer: MeaningAnalyzer
    word_network: WordNetworkService

    def __init__(self):
        self.summarizer = Summarizer()
        self.wordtree = WordTree()
        self.meaning_analyzer = MeaningAnalyzer()
        self.concordance_service = ConcordanceService()
        self.word_network = WordNetworkService()

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

    async def wordnetwork(
        self, word_network_request: WordNetworkRequest
    ) -> WordNetworkResponse:
        result = await self.word_network.build_network(
            word_network_request.text, word_network_request.threshold
        )
        return result
