import py_vncorenlp
from collections import defaultdict
from typing import List, Dict
import string
import re
from langdetect import detect
import nltk
from internal.services.vncorenlp_singleton import vncorenlp_model, process_text_with_vncorenlp, process_text_with_vncorenlp_safe

# Download required NLTK data if not already present
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab')


async def clean_word(word: str) -> str:
    """
    Clean a word by removing apostrophes, quotes, underscores, and other unwanted characters.
    """
    # Remove various types of quotes and apostrophes
    word = re.sub(r'[\'′`´]', '', word)  # Remove apostrophes and similar characters
    word = re.sub(r'[""″]', '', word)    # Remove quotes and similar characters
    word = re.sub(r'[‛‟]', '', word)     # Remove curly quotes
    word = re.sub(r'[''‹›]', '', word)   # Remove angle quotes
    word = re.sub(r'[«»]', '', word)     # Remove guillemets
    word = re.sub(r'[„"]', '', word)     # Remove double quotes
    word = re.sub(r'[\u2018\u2019]', '', word)  # Remove single quotes (left and right)

    # Remove underscores and replace with spaces
    word = word.replace('_', ' ')

    # Remove extra spaces and normalize
    word = re.sub(r'\s+', ' ', word).strip()

    return word


class WordTreeNode:

    def __init__(self):
        self.children = defaultdict(WordTreeNode)
        self.count = 0

    async def insert(self, words: List[str]):
        node = self
        for word in words:
            node = node.children[word]
            node.count += 1

    async def to_dict(self):
        def build(node):
            out = {}
            for word, child in node.children.items():
                out[word] = build(child)
                out[word]["count"] = child.count
            return out

        return build(self)


class WordTree:
    def __init__(self):
        self.model = vncorenlp_model

    async def _detect_language(self, text: str) -> str:
        """
        Detect the language of the input text.
        Returns 'vi' for Vietnamese, 'en' for English, or 'vi' as default.
        """
        try:
            # Use a sample of the text for language detection
            sample_text = text[:1000] if len(text) > 1000 else text
            detected_lang = detect(sample_text)

            # Map common language codes
            if detected_lang in ['en']:
                return 'en'
            elif detected_lang in ['vi']:
                return 'vi'
            else:
                # Default to Vietnamese for other languages since VnCoreNLP is available
                return 'vi'
        except:
            # Default to Vietnamese if detection fails
            return 'vi'

    async def _process_english_text(self, text: str) -> List[str]:
        """
        Process English text using NLTK tokenization instead of VnCoreNLP.
        """
        # Use NLTK word tokenization for English
        tokens = nltk.word_tokenize(text.lower())
        return tokens

    async def _process_vietnamese_text(self, text: str) -> List[str]:
        """
        Process Vietnamese text using VnCoreNLP.
        """
        return await process_text_with_vncorenlp_safe(text.lower())

    async def build_word_tree(self, text: str, keyword: str, window: int = 5):
        # Detect language
        language = await self._detect_language(text)

        # Process text based on detected language
        if language == 'en':
            # Use NLTK for English text processing
            tokens = await self._process_english_text(text)
            # For English, just clean the keyword without VnCoreNLP segmentation
            seg_keyword = await clean_word(keyword.lower())
        else:
            # Use VnCoreNLP for Vietnamese and other languages
            seg_text = await self._process_vietnamese_text(text)
            tokens = " ".join(seg_text).split()
            # For keywords, we can use direct word_segment since they're typically short
            seg_keyword = "".join(self.model.word_segment(keyword.lower()))
            # Clean the keyword
            seg_keyword = await clean_word(seg_keyword)

        left_tree = WordTreeNode()
        right_tree = WordTreeNode()
        punctuation = set(string.punctuation)

        for i, token in enumerate(tokens):
            # Clean the token for comparison
            cleaned_token = await clean_word(token)
            if cleaned_token == seg_keyword:
                left_context = tokens[max(0, i - window) : i][::-1]
                right_context = tokens[i + 1 : i + 1 + window]

                # Remove punctuation and clean words from context
                left_context = [await clean_word(w) for w in left_context if w not in punctuation]
                right_context = [await clean_word(w) for w in right_context if w not in punctuation]

                # Filter out empty words after cleaning
                left_context = [w for w in left_context if w]
                right_context = [w for w in right_context if w]

                if left_context:
                    await left_tree.insert(left_context)
                if right_context:
                    await right_tree.insert(right_context)

        return {
            "word": seg_keyword,
            "left": await left_tree.to_dict(),
            "right": await right_tree.to_dict(),
        }
