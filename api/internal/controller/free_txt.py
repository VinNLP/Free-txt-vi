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
)
from internal.services.summarisation import Summarizer
from internal.services.word_tree import WordTree
from internal.services.meaning_analysis import MeaningAnalyzer


class FreeTxtController:
    summarizer: Summarizer
    wordtree: WordTree
    meaning_analyzer: MeaningAnalyzer

    def __init__(self):
        self.summarizer = Summarizer()
        self.wordtree = WordTree()
        self.meaning_analyzer = MeaningAnalyzer()

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
