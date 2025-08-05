from io import BytesIO
import asyncio
import struct
import json

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
    BytesRequest,
    BytesResponse,
)
from internal.controller.free_txt import FreeTxtController
from tools.uts_exception import exception_handler


class FreeTxtHandler:
    controller: FreeTxtController

    def __init__(self, controller: FreeTxtController):
        self.controller = controller

    # Bytes-based methods for fast processing
    @exception_handler
    async def aspect_detection(self, data: bytes):
        """Bytes-based aspect detection endpoint"""
        try:
            # Decode request data
            text, remaining = BytesRequest.decode_text(data)
            if remaining:
                logger.warning(f"Extra data in aspect detection request: {len(remaining)} bytes")

            # Create request object
            aspect_request = AspectDetectionRequest(text=text)

            # Process request
            result = await self.controller.aspect_detection(aspect_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in aspect_detection: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)

    @exception_handler
    async def summarization(self, data: bytes):
        """Bytes-based summarization endpoint"""
        try:
            # Decode request data: text, ratio, aspect
            text, remaining = BytesRequest.decode_text(data)
            if len(remaining) < 8:  # 4 bytes for ratio + 4 bytes for aspect length
                raise ValueError("Insufficient data for ratio and aspect")

            ratio_bytes = remaining[:4]
            ratio = struct.unpack('>f', ratio_bytes)[0]
            remaining = remaining[4:]

            aspect_length = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]

            aspect = None
            if aspect_length > 0:
                if len(remaining) < aspect_length:
                    raise ValueError("Insufficient data for aspect")
                aspect = remaining[:aspect_length].decode('utf-8')

            # Create request object
            sum_request = SummarizationRequest(text=text, ratio=ratio, aspect=aspect)

            # Process request
            result = await self.controller.summarization(sum_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in summarization: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)

    @exception_handler
    async def meaning_analysis(self, data: bytes):
        """Bytes-based meaning analysis endpoint"""
        try:
            # Decode request data
            text, remaining = BytesRequest.decode_text(data)
            if remaining:
                logger.warning(f"Extra data in meaning analysis request: {len(remaining)} bytes")

            # Create request object
            meaning_request = MeaningAnalysisRequest(text=text)

            # Process request
            result = await self.controller.meaning_analysis(meaning_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in meaning_analysis: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)

    @exception_handler
    async def concordance(self, data: bytes):
        """Bytes-based concordance endpoint"""
        try:
            # Decode request data: text, keyword, window_size
            text, remaining = BytesRequest.decode_text(data)
            keyword, remaining = BytesRequest.decode_text(remaining)

            if len(remaining) < 4:
                raise ValueError("Insufficient data for window_size")
            window_size = struct.unpack('>I', remaining[:4])[0]

            # Create request object
            concordance_request = ConcordanceRequest(
                text=text,
                keyword=keyword,
                window_size=window_size
            )

            # Process request
            result = await self.controller.concordance(concordance_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in concordance: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)

    @exception_handler
    async def word_suggestions(self, data: bytes):
        """Bytes-based word suggestions endpoint"""
        try:
            # Decode request data: text, keyword, window_size, num_suggestions
            text, remaining = BytesRequest.decode_text(data)
            keyword, remaining = BytesRequest.decode_text(remaining)

            if len(remaining) < 8:  # 4 bytes for window_size + 4 bytes for num_suggestions
                raise ValueError("Insufficient data for window_size and num_suggestions")

            window_size = struct.unpack('>I', remaining[:4])[0]
            num_suggestions = struct.unpack('>I', remaining[4:8])[0]

            # Create request object
            word_suggestion_request = WordSuggestionRequest(
                text=text,
                keyword=keyword,
                window_size=window_size,
                num_suggestions=num_suggestions
            )

            # Process request
            result = await self.controller.word_suggestions(word_suggestion_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in word_suggestions: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)

    @exception_handler
    async def wordtree(self, data: bytes):
        """Bytes-based word tree endpoint"""
        try:
            # Decode request data: text, keyword
            text, remaining = BytesRequest.decode_text(data)
            keyword, remaining = BytesRequest.decode_text(remaining)

            if remaining:
                logger.warning(f"Extra data in word tree request: {len(remaining)} bytes")

            # Create request object
            wordtree_request = WordTreeRequest(text=text, keyword=keyword)

            # Process request
            result = await self.controller.gen_wordtree(wordtree_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in wordtree: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)

    @exception_handler
    async def word_cloud(self, data: bytes):
        """Bytes-based word cloud endpoint"""
        try:
            # Decode request data: text, method, min_word_length, max_words
            text, remaining = BytesRequest.decode_text(data)

            if len(remaining) < 12:  # 4 bytes for method length + 4 bytes for min_word_length + 4 bytes for max_words
                raise ValueError("Insufficient data for method, min_word_length and max_words")

            # Extract method parameter
            method_length = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            if len(remaining) < method_length:
                raise ValueError("Insufficient data for method text")
            method = remaining[:method_length].decode('utf-8')
            remaining = remaining[method_length:]

            if len(remaining) < 8:  # 4 bytes for min_word_length + 4 bytes for max_words
                raise ValueError("Insufficient data for min_word_length and max_words")

            min_word_length = struct.unpack('>I', remaining[:4])[0]
            max_words = struct.unpack('>I', remaining[4:8])[0]

            # Create request object
            word_cloud_request = WordCloudRequest(
                text=text,
                method=method,
                min_word_length=min_word_length,
                max_words=max_words
            )

            # Process request
            result = await self.controller.word_cloud(word_cloud_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in word_cloud: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)

    @exception_handler
    async def matplotlib_word_cloud(self, data: bytes):
        """Bytes-based matplotlib word cloud endpoint"""
        try:
            # Decode request data: text, method, min_word_length, max_words, width, height, shape, background_color, colormap, contour_width, contour_color, prefer_horizontal, relative_scaling, scale, min_font_size, max_font_size, random_state
            text, remaining = BytesRequest.decode_text(data)

            if len(remaining) < 20:  # Minimum required fields including method
                raise ValueError("Insufficient data for matplotlib word cloud parameters")

            # Extract method parameter
            method_length = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            if len(remaining) < method_length:
                raise ValueError("Insufficient data for method text")
            method = remaining[:method_length].decode('utf-8')
            remaining = remaining[method_length:]

            # Extract basic parameters
            min_word_length = struct.unpack('>I', remaining[:4])[0]
            max_words = struct.unpack('>I', remaining[4:8])[0]
            width = struct.unpack('>I', remaining[8:12])[0]
            height = struct.unpack('>I', remaining[12:16])[0]
            remaining = remaining[16:]

            # Extract shape parameter
            if len(remaining) < 4:
                raise ValueError("Insufficient data for shape parameter")
            shape_length = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            if len(remaining) < shape_length:
                raise ValueError("Insufficient data for shape text")
            shape = remaining[:shape_length].decode('utf-8')
            remaining = remaining[shape_length:]

            # Extract background_color parameter
            if len(remaining) < 4:
                raise ValueError("Insufficient data for background_color parameter")
            bg_color_length = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            if len(remaining) < bg_color_length:
                raise ValueError("Insufficient data for background_color text")
            background_color = remaining[:bg_color_length].decode('utf-8')
            remaining = remaining[bg_color_length:]

            # Extract colormap parameter
            if len(remaining) < 4:
                raise ValueError("Insufficient data for colormap parameter")
            colormap_length = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            if len(remaining) < colormap_length:
                raise ValueError("Insufficient data for colormap text")
            colormap = remaining[:colormap_length].decode('utf-8')
            remaining = remaining[colormap_length:]

            # Extract remaining numeric parameters
            if len(remaining) < 32:  # 8 parameters * 4 bytes each
                raise ValueError("Insufficient data for remaining parameters")

            contour_width = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]

            # Extract contour_color parameter
            contour_color_length = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            if len(remaining) < contour_color_length:
                raise ValueError("Insufficient data for contour_color text")
            contour_color = remaining[:contour_color_length].decode('utf-8')
            remaining = remaining[contour_color_length:]

            # Extract float parameters
            prefer_horizontal = struct.unpack('>f', remaining[:4])[0]
            remaining = remaining[4:]
            relative_scaling = struct.unpack('>f', remaining[:4])[0]
            remaining = remaining[4:]
            scale = struct.unpack('>f', remaining[:4])[0]
            remaining = remaining[4:]

            # Extract remaining integer parameters
            min_font_size = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            max_font_size = struct.unpack('>I', remaining[:4])[0]
            remaining = remaining[4:]
            random_state = struct.unpack('>I', remaining[:4])[0]

            # Create request object with all parameters
            matplotlib_wordcloud_request = MatplotlibWordCloudRequest(
                text=text,
                method=method,
                min_word_length=min_word_length,
                max_words=max_words,
                width=width,
                height=height,
                shape=shape,
                background_color=background_color,
                colormap=colormap,
                contour_width=contour_width,
                contour_color=contour_color,
                prefer_horizontal=prefer_horizontal,
                relative_scaling=relative_scaling,
                scale=scale,
                min_font_size=min_font_size,
                max_font_size=max_font_size if max_font_size > 0 else None,
                random_state=random_state if random_state > 0 else None
            )

            # Process request
            result = await self.controller.matplotlib_word_cloud(matplotlib_wordcloud_request)

            # Encode response
            response_data = result.model_dump()
            return BytesResponse.encode_json_response(response_data)

        except Exception as e:
            logger.error(f"Error in matplotlib_word_cloud: {e}")
            error_response = {"error": str(e)}
            return BytesResponse.encode_json_response(error_response)
