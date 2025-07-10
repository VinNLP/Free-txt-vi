from fastapi import APIRouter

from internal.common.schemas.free_txt import (
    MeaningAnalysisResponse,
    SentimentChartResponse,
    SummarizationResponse,
    WordCloudResponse,
    WordTreeResponse,
    WordUseRelationshipsResponse,
)
from internal.handler.free_txt import FreeTxtHandler


class FreeTxtRoute:
    router: APIRouter
    handler: FreeTxtHandler

    def __init__(self, handler: FreeTxtHandler):
        self.router = APIRouter()
        self.handler = handler

        self.router.add_api_route(
            path="/meaning_analysis",
            endpoint=self.handler.meaning_analysis,
            methods=["POST"],
            response_model=MeaningAnalysisResponse,
            summary="Meaning Analysis",
            description="Analysis the meaning of sentences",
        )

        # self.router.add_api_route(
        #     path="/sentiment_chart",
        #     endpoint=self.handler.sentiment_chart,
        #     methods=["POST"],
        #     response_model=SentimentChartResponse,
        #     summary="Sentiment Chart",
        #     description="Create chart to view sentiment analysis",
        # )

        self.router.add_api_route(
            path="/summarization",
            endpoint=self.handler.summarization,
            methods=["POST"],
            response_model=SummarizationResponse,
            summary="Summarization",
            description="Sumarize the text input",
        )

        # self.router.add_api_route(
        #     path="/word_cloud",
        #     endpoint=self.handler.word_cloud,
        #     methods=["POST"],
        #     response_model=WordCloudResponse,
        #     summary="Word Cloud",
        #     description="Create Word Cloud",
        # )

        self.router.add_api_route(
            path="/word_tree",
            endpoint=self.handler.wordtree,
            methods=["POST"],
            response_model=WordTreeResponse,
            summary="Word Tree",
            description="Create Word Tree",
        )

        # self.router.add_api_route(
        #     path="/word_use_relationships",
        #     endpoint=self.handler.word_use_relationships,
        #     methods=["POST"],
        #     response_model=WordUseRelationshipsResponse,
        #     summary="Word Use and Relationships",
        #     description="Create Word Use and Relationships",
        # )
