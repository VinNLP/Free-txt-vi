from io import BytesIO
import asyncio

from loguru import logger

from internal.common.schemas.free_txt import (
    SummarizationRequest,
    WordTreeRequest,
    MeaningAnalysisRequest,
)
from internal.controller.free_txt import FreeTxtController
from tools.uts_exception import exception_handler


class FreeTxtHandler:
    controller: FreeTxtController

    def __init__(self, controller: FreeTxtController):
        self.controller = controller

    @exception_handler
    async def summarization(self, sum_request: SummarizationRequest):
        return await self.controller.summarization(sum_request)

    @exception_handler
    async def wordtree(self, wordtree_request: WordTreeRequest):
        return await self.controller.gen_wordtree(wordtree_request)

    @exception_handler
    async def meaning_analysis(self, meaning_request: MeaningAnalysisRequest):
        return await self.controller.meaning_analysis(meaning_request)
