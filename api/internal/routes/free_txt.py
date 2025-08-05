from fastapi import APIRouter, Request
from fastapi.responses import Response

from internal.common.schemas.free_txt import (
    MeaningAnalysisResponse,
    SentimentChartResponse,
    SummarizationResponse,
    AspectDetectionResponse,
    WordCloudResponse,
    MatplotlibWordCloudResponse,
    WordTreeResponse,
    WordUseRelationshipsResponse,
    ConcordanceResponse,
    WordSuggestionResponse,
)
from internal.handler.free_txt import FreeTxtHandler


class FreeTxtRoute:
    router: APIRouter
    handler: FreeTxtHandler

    def __init__(self, handler: FreeTxtHandler):
        self.router = APIRouter()
        self.handler = handler

        # Bytes-based routes for fast processing
        async def aspect_detection_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.aspect_detection(data)
            return Response(content=result, media_type="application/octet-stream")

        async def summarization_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.summarization(data)
            return Response(content=result, media_type="application/octet-stream")

        async def meaning_analysis_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.meaning_analysis(data)
            return Response(content=result, media_type="application/octet-stream")

        async def concordance_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.concordance(data)
            return Response(content=result, media_type="application/octet-stream")

        async def word_suggestions_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.word_suggestions(data)
            return Response(content=result, media_type="application/octet-stream")

        async def word_tree_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.wordtree(data)
            return Response(content=result, media_type="application/octet-stream")

        async def word_cloud_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.word_cloud(data)
            return Response(content=result, media_type="application/octet-stream")

        async def matplotlib_word_cloud_endpoint(request: Request):
            data = await request.body()
            result = await self.handler.matplotlib_word_cloud(data)
            return Response(content=result, media_type="application/octet-stream")

        # Register bytes-based routes
        self.router.add_api_route(
            path="/aspect_detection",
            endpoint=aspect_detection_endpoint,
            methods=["POST"],
            summary="Aspect Detection",
            description="Detect aspects in the input text using bytes for fast processing",
        )

        self.router.add_api_route(
            path="/summarization",
            endpoint=summarization_endpoint,
            methods=["POST"],
            summary="Summarization",
            description="Summarize the text input using bytes for fast processing",
        )

        self.router.add_api_route(
            path="/meaning_analysis",
            endpoint=meaning_analysis_endpoint,
            methods=["POST"],
            summary="Meaning Analysis",
            description="Analysis the meaning of sentences using bytes for fast processing",
        )

        self.router.add_api_route(
            path="/concordance",
            endpoint=concordance_endpoint,
            methods=["POST"],
            summary="Text Concordance",
            description="Return keyword with N words before and after for each occurrence using bytes for fast processing",
        )

        self.router.add_api_route(
            path="/word_suggestions",
            endpoint=word_suggestions_endpoint,
            methods=["POST"],
            summary="Word Suggestions",
            description="Return keyword concordance with AI-generated similar word suggestions using bytes for fast processing",
        )

        self.router.add_api_route(
            path="/word_tree",
            endpoint=word_tree_endpoint,
            methods=["POST"],
            summary="Word Tree",
            description="Create Word Tree using bytes for fast processing",
        )

        self.router.add_api_route(
            path="/word_cloud",
            endpoint=word_cloud_endpoint,
            methods=["POST"],
            summary="Word Cloud",
            description="Create Word Cloud based on word frequency using bytes for fast processing",
        )

        self.router.add_api_route(
            path="/matplotlib_word_cloud",
            endpoint=matplotlib_word_cloud_endpoint,
            methods=["POST"],
            summary="Matplotlib Word Cloud",
            description="Create traditional wordcloud image using matplotlib with bytes for fast processing",
        )
