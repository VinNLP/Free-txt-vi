from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os
from typing import List, Dict
import re
import langdetect


class WordSuggestionService:
    def __init__(self):
        model_path = os.getenv("MODEL_SUM_PATH", "Qwen/Qwen2.5-0.5B-Instruct")
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path, torch_dtype="auto", device_map="cuda:4" if torch.cuda.is_available() else "cpu"
        )

    def _detect_language(self, text: str) -> str:
        """
        Detect the language of the input text
        """
        try:
            # Use a sample of the text for language detection
            sample_text = text[:1000] if len(text) > 1000 else text
            detected_lang = langdetect.detect(sample_text)
            return detected_lang
        except:
            # Default to Vietnamese if detection fails
            return 'vi'

    def _get_language_prompt(self, language: str, keyword: str, context: str, num_suggestions: int) -> tuple:
        """
        Get language-specific prompt and system message
        """
        # Clean the context to remove any underscores
        cleaned_context = context.replace('_', ' ')
        cleaned_context = re.sub(r'\s+', ' ', cleaned_context).strip()

        language_configs = {
            'vi': {
                'system': "You are a Vietnamese language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} Vietnamese words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            },
            'en': {
                'system': "You are an English language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} English words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            },
            'fr': {
                'system': "You are a French language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} French words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            },
            'de': {
                'system': "You are a German language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} German words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            },
            'es': {
                'system': "You are a Spanish language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} Spanish words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            },
            'zh': {
                'system': "You are a Chinese language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} Chinese words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            },
            'ja': {
                'system': "You are a Japanese language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} Japanese words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            },
            'ko': {
                'system': "You are a Korean language expert. Provide only the requested words separated by commas.",
                'prompt': f"""Given the keyword "{keyword}" and its context: "{cleaned_context}",
                suggest {num_suggestions} Korean words that are semantically similar or related to "{keyword}"
                in this context. Return only the words separated by commas, no explanations.

                Similar words:"""
            }
        }

        # Default to Vietnamese if language not supported
        config = language_configs.get(language, language_configs['vi'])
        return config['system'], config['prompt']

    async def suggest_similar_words(self, keyword: str, context: str, num_suggestions: int = 5) -> List[str]:
        """
        Generate similar word suggestions based on keyword and context using language model
        """
        # Detect the language of the context
        detected_language = self._detect_language(context)

        # Get language-specific prompt and system message
        system_message, prompt = self._get_language_prompt(detected_language, keyword, context, num_suggestions)

        messages = [
            {
                "role": "system",
                "content": system_message
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

        text = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )

        model_inputs = self.tokenizer([text], return_tensors="pt").to(
            self.model.device
        )

        # Generate suggestions with reasonable token limit
        max_new_tokens = min(num_suggestions * 10, 100)

        generated_ids = self.model.generate(
            **model_inputs,
            max_new_tokens=max_new_tokens,
            temperature=0.7,
            do_sample=True
        )

        generated_ids = [
            output_ids[len(input_ids):]
            for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]

        response = self.tokenizer.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]

        # Parse the response to extract words
        suggestions = self._parse_suggestions(response, num_suggestions, detected_language)
        return suggestions

    def _parse_suggestions(self, response: str, num_suggestions: int, language: str = 'vi') -> List[str]:
        """
        Parse the model response to extract word suggestions
        """
        # Clean the response and split by commas
        response = response.strip()

        # Remove common prefixes that the model might add
        prefixes_to_remove = [
            "Similar words:", "Các từ tương tự:", "Từ gợi ý:",
            "Suggestions:", "Words:", "Từ:"
        ]

        for prefix in prefixes_to_remove:
            if response.startswith(prefix):
                response = response[len(prefix):].strip()

        # Split by commas and clean each word
        words = [word.strip() for word in response.split(',')]

        # Filter out empty strings and limit to requested number
        suggestions = []
        for word in words:
            if word and len(suggestions) < num_suggestions:
                # Comprehensive cleaning of the word
                cleaned_word = self._clean_suggestion_word(word)
                if cleaned_word and len(cleaned_word) > 1:
                    suggestions.append(cleaned_word)

        # If we don't have enough suggestions, add some fallback words
        if len(suggestions) < num_suggestions:
            fallback_words = self._get_fallback_suggestions(num_suggestions - len(suggestions), language)
            suggestions.extend(fallback_words)

        return suggestions[:num_suggestions]

    def _clean_suggestion_word(self, word: str) -> str:
        """
        Clean a suggestion word by removing unwanted characters and formatting
        """
        # Remove various types of quotes and apostrophes (similar to concordance service)
        word = re.sub(r'[\'′`´]', '', word)
        word = re.sub(r'[""″]', '', word)
        word = re.sub(r'[‛‟]', '', word)
        word = re.sub(r'[''‹›]', '', word)
        word = re.sub(r'[«»]', '', word)
        word = re.sub(r'[„"]', '', word)
        word = re.sub(r'[\u2018\u2019]', '', word)

        # Remove underscores and replace with spaces
        word = word.replace('_', ' ')

        # Remove any remaining punctuation except spaces
        word = re.sub(r'[^\w\s]', '', word)

        # Remove extra spaces and normalize
        word = re.sub(r'\s+', ' ', word).strip()

        return word

    def _get_fallback_suggestions(self, count: int, language: str = 'vi') -> List[str]:
        """
        Provide fallback suggestions when the model doesn't generate enough
        """
        # Language-specific fallback words
        fallback_words_by_language = {
            'vi': ["từ", "này", "đó", "ấy", "kia", "nọ", "đây", "đấy", "kìa"],
            'en': ["word", "this", "that", "here", "there", "thing", "item", "one"],
            'fr': ["mot", "ceci", "cela", "ici", "là", "chose", "objet", "un"],
            'de': ["Wort", "dies", "das", "hier", "dort", "Ding", "Objekt", "eins"],
            'es': ["palabra", "esto", "eso", "aquí", "allí", "cosa", "objeto", "uno"],
            'zh': ["词", "这个", "那个", "这里", "那里", "东西", "物品", "一个"],
            'ja': ["言葉", "これ", "それ", "ここ", "そこ", "もの", "品物", "一つ"],
            'ko': ["단어", "이것", "저것", "여기", "저기", "것", "물건", "하나"]
        }

        # Default to Vietnamese if language not supported
        fallback_words = fallback_words_by_language.get(language, fallback_words_by_language['vi'])
        return fallback_words[:count]

    async def get_contextual_suggestions(self, keyword: str, left_context: str, right_context: str, num_suggestions: int = 5) -> Dict[str, any]:
        """
        Get suggestions based on both left and right context
        """
        # Combine contexts for better understanding
        full_context = f"{left_context} {keyword} {right_context}".strip()

        # Detect language for this context
        detected_language = self._detect_language(full_context)

        suggestions = await self.suggest_similar_words(keyword, full_context, num_suggestions)

        return {
            "keyword": keyword,
            "suggestions": suggestions,
            "context": full_context,
            "detected_language": detected_language
        }
