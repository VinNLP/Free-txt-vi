import py_vncorenlp
from collections import Counter
from typing import List, Dict
import string
import re
from stopwordsiso import stopwords
from langdetect import detect
from internal.services.vncorenlp_singleton import vncorenlp_model


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


class WordCloudService:
    def __init__(self):
        self.model = vncorenlp_model

    async def generate_word_cloud(self, text: str, min_word_length: int = 2, max_words: int = 100) -> List[Dict[str, any]]:
        """
        Generate word cloud data based on word frequency.

        Args:
            text: Input text to analyze
            min_word_length: Minimum word length to include
            max_words: Maximum number of words to return

        Returns:
            List of dictionaries with word and frequency
        """
        # Detect language
        try:
            language = detect(text)
            # Map language codes to stopwordsiso codes
            if language == 'vi':
                stop_words = set(stopwords('vi'))
            else:
                stop_words = set(stopwords('en'))
        except:
            # Default to English if language detection fails
            stop_words = set(stopwords('en'))

        # Segment text using VnCoreNLP
        seg_text = self.model.word_segment(text.lower())

        # Join segmented text and split into tokens
        tokens = " ".join(seg_text).split()

        # Clean and filter words
        cleaned_words = []
        punctuation = set(string.punctuation)

        for token in tokens:
            # Clean the token
            cleaned_token = await clean_word(token)

            # Skip if token is empty, too short, or is punctuation
            if (not cleaned_token or
                len(cleaned_token) < min_word_length or
                cleaned_token in punctuation or
                cleaned_token in stop_words):
                continue

            # Skip if token contains only digits
            if cleaned_token.isdigit():
                continue

            cleaned_words.append(cleaned_token)

        # Count word frequencies
        word_freq = Counter(cleaned_words)

        # Get top words by frequency
        top_words = word_freq.most_common(max_words)

        # Convert to list of dictionaries
        result = []
        for word, frequency in top_words:
            result.append({
                "word": word,
                "score": frequency
            })

        return result
