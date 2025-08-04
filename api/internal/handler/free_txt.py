from io import BytesIO
import asyncio

from loguru import logger

from internal.common.schemas.free_txt import (
    SummarizationRequest,
    AspectDetectionRequest,
    WordTreeRequest,
    MeaningAnalysisRequest,
    ConcordanceRequest,
    WordSuggestionRequest,
    WordCloudRequest,
    MatplotlibWordCloudRequest,
)
from internal.controller.free_txt import FreeTxtController
from tools.uts_exception import exception_handler


class FreeTxtHandler:
    controller: FreeTxtController

    def __init__(self, controller: FreeTxtController):
        self.controller = controller

    @exception_handler
    async def aspect_detection(self, aspect_request: AspectDetectionRequest):
        return await self.controller.aspect_detection(aspect_request)

    @exception_handler
    async def summarization(self, sum_request: SummarizationRequest):
        return await self.controller.summarization(sum_request)

    @exception_handler
    async def wordtree(self, wordtree_request: WordTreeRequest):
        return await self.controller.gen_wordtree(wordtree_request)

    @exception_handler
    async def meaning_analysis(self, meaning_request: MeaningAnalysisRequest):
        return await self.controller.meaning_analysis(meaning_request)

    @exception_handler
    async def concordance(self, concordance_request: ConcordanceRequest):
        return await self.controller.concordance(concordance_request)

    @exception_handler
    async def word_suggestions(self, word_suggestion_request: WordSuggestionRequest):
        return await self.controller.word_suggestions(word_suggestion_request)

    @exception_handler
    async def word_cloud(self, word_cloud_request: WordCloudRequest):
        return await self.controller.word_cloud(word_cloud_request)

    @exception_handler
    async def matplotlib_word_cloud(self, matplotlib_wordcloud_request: MatplotlibWordCloudRequest):
        return await self.controller.matplotlib_word_cloud(matplotlib_wordcloud_request)
