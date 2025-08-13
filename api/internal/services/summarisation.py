from nltk import sent_tokenize
from summa.summarizer import summarize as summa_summarizer
from transformers import pipeline
import torch
import nltk
import os
import asyncio
from .aspect_detection import AspectDetector
from .llm_singleton import llm_singleton


class Summarizer:
    def __init__(self):
        # Use the LLM singleton instead of loading our own model
        self.aspect_detector = AspectDetector()

    async def sum_qwen(self, input_text, chosen_ratio, aspect=None):
        # Enforce ratio constraints: between 10% and 50%
        chosen_ratio = max(0.1, min(0.5, chosen_ratio))

        # Calculate target word count based on chosen_ratio
        input_words = len(input_text.split())
        target_words = max(int(input_words * chosen_ratio), 10)

        if aspect:
            # Use aspect-specific prompt
            prompt = await self.aspect_detector.get_aspect_summary_prompt(input_text, aspect, target_words)
            messages = [
                {
                    "role": "system",
                    "content": prompt,
                },
            ]
        else:
            # Detect the language of the input text
            detected_language = self.aspect_detector.detect_language(input_text)

            # Use language-specific general summarization prompt
            if detected_language == 'vi':
                prompt = f"""Bạn là trợ lý tóm tắt văn bản. Nhiệm vụ của bạn là tóm tắt văn bản đã cho.

QUY TẮC NGÔN NGỮ QUAN TRỌNG:
- Bạn PHẢI trả về tóm tắt bằng tiếng Việt
- KHÔNG BAO GIỜ dịch sang tiếng Anh hoặc ngôn ngữ khác
- Giữ nguyên ngôn ngữ tiếng Việt trong suốt câu trả lời

NHIỆM VỤ:
- Tóm tắt văn bản sau đây trong khoảng {target_words} từ
- Tập trung vào thông tin quan trọng nhất
- Giữ tóm tắt mạch lạc và có cấu trúc tốt
- Sử dụng tiếng Việt tự nhiên và dễ hiểu

Văn bản đầu vào: {input_text}

Nhớ: Trả lời bằng tiếng Việt. Không dịch sang ngôn ngữ khác."""
            else:
                prompt = f"""You are a text summarization assistant. Your task is to summarize the given text.

IMPORTANT LANGUAGE RULES:
- You MUST return the summary in the EXACT SAME LANGUAGE as the input text
- If the input is in Vietnamese, respond ONLY in Vietnamese
- If the input is in English, respond ONLY in English
- If the input is in any other language, respond in that same language
- NEVER translate or change the language of your response

TASK:
- Summarize the following text in approximately {target_words} words
- Maintain the original language of the input text
- Focus on the most important information
- Keep the summary coherent and well-structured

Input text: {input_text}

Remember: Respond in the SAME LANGUAGE as the input text. Do not translate."""

            messages = [
                {
                    "role": "system",
                    "content": prompt,
                },
            ]

        # Use the LLM singleton to generate text
        response = await llm_singleton.generate_text(
            messages=messages,
            max_new_tokens=min(target_words, 500),
            temperature=0.7,
            top_p=0.9
        )

        return response

    async def detect_aspects(self, input_text):
        """
        Detect aspects in the input text
        """
        return await self.aspect_detector.detect_aspects(input_text)

    async def summarizer_summa(self, input_text, chosen_ratio):
        """
        Fast extractive summarization using TextRank
        """
        # Convert input_text to a string if it isn't already
        if not isinstance(input_text, str):
            input_text = " ".join(map(str, input_text))

        # Enforce ratio constraints: between 10% and 50%
        chosen_ratio = max(0.1, min(0.5, chosen_ratio))

        # Get the summary using the text_rank_summarize function
        summary = summa_summarizer(input_text, chosen_ratio)

        # Tokenize input_text to sentences
        sentences = sent_tokenize(input_text)

        # Return the summary or fallback if the summary is empty
        if summary:
            return summary
        elif len(sentences) > 1:
            return sentences[0]
        else:
            return "Unable to summarize the input text."

    async def fast_summarize(self, input_text, chosen_ratio, aspect=None):
        """
        Fast summarization using extractive method for better performance
        """
        # Use extractive summarization for speed
        return await self.summarizer_summa(input_text, chosen_ratio)
