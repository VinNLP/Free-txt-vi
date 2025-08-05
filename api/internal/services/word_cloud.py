import io
import base64
import json
import math
from typing import List, Dict, Optional, Literal
import matplotlib.pyplot as plt
from wordcloud import WordCloud
import numpy as np
from PIL import Image
import py_vncorenlp
from collections import Counter
import string
import re
from stopwordsiso import stopwords
from langdetect import detect
from internal.services.vncorenlp_singleton import vncorenlp_model, process_text_with_vncorenlp, process_text_with_vncorenlp_safe


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
        self.vietnamese_corpus = None
        self.english_corpus = None
        self._load_corpus_data()

    def _load_corpus_data(self):
        """Load corpus data for loglikelihood calculations."""
        import os

        # Get the directory of this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        vietnamese_corpus_path = os.path.join(current_dir, 'corpus', 'vietnews_reference.json')
        english_corpus_path = os.path.join(current_dir, 'corpus', 'bnc_reference.json')

        try:
            with open(vietnamese_corpus_path, 'r', encoding='utf-8') as f:
                self.vietnamese_corpus = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load Vietnamese corpus: {e}")
            self.vietnamese_corpus = {}

        try:
            with open(english_corpus_path, 'r', encoding='utf-8') as f:
                self.english_corpus = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load English corpus: {e}")
            self.english_corpus = {}

    def _calculate_loglikelihood(self, word_freq: Dict[str, int], language: str) -> Dict[str, float]:
        """
        Calculate loglikelihood scores for words based on corpus comparison.

        Args:
            word_freq: Dictionary of word frequencies in the input text
            language: Language code ('vi' or 'en')

        Returns:
            Dictionary mapping words to their loglikelihood scores
        """
        if language == 'vi':
            corpus = self.vietnamese_corpus
        else:
            corpus = self.english_corpus

        if not corpus:
            return {word: freq for word, freq in word_freq.items()}

        # Calculate total frequencies
        total_corpus_freq = sum(corpus.values())
        total_text_freq = sum(word_freq.values())

        loglikelihood_scores = {}

        for word, text_freq in word_freq.items():
            corpus_freq = corpus.get(word, 0)

            # Calculate expected frequencies
            expected_text = (text_freq + corpus_freq) * total_text_freq / (total_text_freq + total_corpus_freq)
            expected_corpus = (text_freq + corpus_freq) * total_corpus_freq / (total_text_freq + total_corpus_freq)

            # Calculate loglikelihood
            if text_freq > 0 and expected_text > 0:
                ll_text = text_freq * math.log(text_freq / expected_text)
            else:
                ll_text = 0

            if corpus_freq > 0 and expected_corpus > 0:
                ll_corpus = corpus_freq * math.log(corpus_freq / expected_corpus)
            else:
                ll_corpus = 0

            loglikelihood = 2 * (ll_text + ll_corpus)
            loglikelihood_scores[word] = loglikelihood

        return loglikelihood_scores

    def _calculate_keyness(self, word_freq: Dict[str, int], language: str) -> Dict[str, float]:
        """
        Calculate keyness scores for words based on corpus comparison.
        Keyness is a measure of how unusually frequent a word is in the text compared to the reference corpus.

        Args:
            word_freq: Dictionary of word frequencies in the input text
            language: Language code ('vi' or 'en')

        Returns:
            Dictionary mapping words to their keyness scores
        """
        if language == 'vi':
            corpus = self.vietnamese_corpus
        else:
            corpus = self.english_corpus

        if not corpus:
            return {word: freq for word, freq in word_freq.items()}

        # Calculate total frequencies
        total_corpus_freq = sum(corpus.values())
        total_text_freq = sum(word_freq.values())

        keyness_scores = {}

        for word, text_freq in word_freq.items():
            corpus_freq = corpus.get(word, 0)

            # Calculate relative frequencies
            text_rel_freq = text_freq / total_text_freq if total_text_freq > 0 else 0
            corpus_rel_freq = corpus_freq / total_corpus_freq if total_corpus_freq > 0 else 0

            # Calculate keyness (log ratio of relative frequencies)
            if text_rel_freq > 0 and corpus_rel_freq > 0:
                keyness = math.log(text_rel_freq / corpus_rel_freq)
            elif text_rel_freq > 0 and corpus_rel_freq == 0:
                # Word exists in text but not in corpus - high keyness
                keyness = math.log(text_rel_freq * total_corpus_freq + 1)
            else:
                keyness = 0

            keyness_scores[word] = keyness

        return keyness_scores

    async def _process_text(self, text: str, min_word_length: int = 2) -> List[str]:
        """
        Process text to extract and clean words.

        Args:
            text: Input text to process
            min_word_length: Minimum word length to include

        Returns:
            List of cleaned words
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

        # Segment text using VnCoreNLP (handles large texts by splitting into chunks)
        seg_text = await process_text_with_vncorenlp_safe(text.lower())

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

        return cleaned_words

    async def generate_word_cloud(
        self,
        text: str,
        method: Literal["frequency", "loglikelihood", "keyness"] = "frequency",
        min_word_length: int = 2,
        max_words: int = 100
    ) -> List[Dict[str, any]]:
        """
        Generate word cloud data based on word frequency or loglikelihood.

        Args:
            text: Input text to analyze
            method: Analysis method - "frequency" or "loglikelihood"
            min_word_length: Minimum word length to include
            max_words: Maximum number of words to return

        Returns:
            List of dictionaries with word and score
        """
        # Process text to get cleaned words
        cleaned_words = await self._process_text(text, min_word_length)

        if not cleaned_words:
            return []

        # Count word frequencies
        word_freq = Counter(cleaned_words)

        if method == "frequency":
            # Get top words by frequency
            top_words = word_freq.most_common(max_words)
            result = []
            for word, frequency in top_words:
                result.append({
                    "word": word,
                    "score": frequency
                })
            return result

        elif method == "loglikelihood":
            # Detect language for corpus selection
            try:
                language = detect(text)
                if language == 'vi':
                    lang_code = 'vi'
                else:
                    lang_code = 'en'
            except:
                lang_code = 'en'

            # Calculate loglikelihood scores
            loglikelihood_scores = self._calculate_loglikelihood(word_freq, lang_code)

            # Sort by loglikelihood score (descending)
            sorted_words = sorted(loglikelihood_scores.items(), key=lambda x: x[1], reverse=True)

            # Take top words
            top_words = sorted_words[:max_words]

            result = []
            for word, score in top_words:
                result.append({
                    "word": word,
                    "score": score
                })
            return result

        elif method == "keyness":
            # Detect language for corpus selection
            try:
                language = detect(text)
                if language == 'vi':
                    lang_code = 'vi'
                else:
                    lang_code = 'en'
            except:
                lang_code = 'en'

            # Calculate keyness scores
            keyness_scores = self._calculate_keyness(word_freq, lang_code)

            # Sort by keyness score (descending)
            sorted_words = sorted(keyness_scores.items(), key=lambda x: x[1], reverse=True)

            # Take top words
            top_words = sorted_words[:max_words]

            result = []
            for word, score in top_words:
                result.append({
                    "word": word,
                    "score": score
                })
            return result

        else:
            raise ValueError("Method must be either 'frequency', 'loglikelihood', or 'keyness'")

    async def generate_word_cloud_image(
        self,
        text: str,
        method: Literal["frequency", "loglikelihood", "keyness"] = "frequency",
        min_word_length: int = 2,
        max_words: int = 100,
        width: int = 2400,
        height: int = 1800,
        background_color: str = 'white',
        colormap: str = 'viridis',
        contour_width: int = 0,
        contour_color: str = 'black',
        prefer_horizontal: float = 0.7,
        relative_scaling: float = 0.5,
        scale: float = 1.0,
        min_font_size: int = 4,
        max_font_size: Optional[int] = None,
        font_path: Optional[str] = None,
        mask: Optional[np.ndarray] = None,
        random_state: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Generate a wordcloud image using matplotlib and wordcloud.

        Args:
            text: Input text to analyze
            method: Analysis method - "frequency" or "loglikelihood"
            min_word_length: Minimum word length to include
            max_words: Maximum number of words to return
            width: Width of the generated image
            height: Height of the generated image
            background_color: Background color of the wordcloud
            colormap: Matplotlib colormap for word colors
            contour_width: Width of contour lines (0 for no contour)
            contour_color: Color of contour lines
            prefer_horizontal: Fraction of words to display horizontally
            relative_scaling: Relative scaling of word sizes
            scale: Scale factor for the image
            min_font_size: Minimum font size
            max_font_size: Maximum font size (None for auto)
            font_path: Path to custom font file
            mask: Custom mask for wordcloud shape
            random_state: Random seed for reproducibility

        Returns:
            Dictionary containing base64 encoded image and word data
        """
        # Get word data based on method
        word_data = await self.generate_word_cloud(text, method, min_word_length, max_words)

        if not word_data:
            return {
                "image": "",
                "words": [],
                "message": "No words found after filtering"
            }

        # Convert to dictionary for wordcloud
        word_freq_dict = {item["word"]: item["score"] for item in word_data}

        # Create wordcloud
        wordcloud = WordCloud(
            width=width,
            height=height,
            background_color=background_color,
            colormap=colormap,
            contour_width=contour_width,
            contour_color=contour_color,
            prefer_horizontal=prefer_horizontal,
            relative_scaling=relative_scaling,
            scale=scale,
            min_font_size=min_font_size,
            max_font_size=max_font_size,
            font_path=font_path,
            mask=mask,
            random_state=random_state
        )

        # Generate wordcloud
        wordcloud.generate_from_frequencies(word_freq_dict)

        # Create matplotlib figure with higher DPI for better resolution
        plt.figure(figsize=(width/100, height/100), dpi=400)
        plt.imshow(wordcloud, interpolation='bilinear')
        plt.axis('off')

        # Save to bytes with higher quality
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='PNG', bbox_inches='tight', pad_inches=0, dpi=400)
        img_buffer.seek(0)

        # Convert to base64
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')

        # Close matplotlib figure to free memory
        plt.close()

        return {
            "image": f"data:image/png;base64,{img_base64}",
            "words": word_data,
            "total_words": len(word_data),
            "most_frequent_word": word_data[0]["word"] if word_data else "",
            "most_frequent_count": word_data[0]["score"] if word_data else 0,
            "method": method
        }

    async def generate_word_cloud_with_shape(
        self,
        text: str,
        shape: str = 'circle',
        method: Literal["frequency", "loglikelihood", "keyness"] = "frequency",
        min_word_length: int = 2,
        max_words: int = 100,
        width: int = 800,
        height: int = 600,
        background_color: str = 'white',
        colormap: str = 'viridis'
    ) -> Dict[str, any]:
        """
        Generate wordcloud with specific shape using matplotlib.

        Args:
            text: Input text to analyze
            shape: Shape of the wordcloud ('circle', 'square', 'rectangle', 'triangle', 'star', 'heart')
            method: Analysis method - "frequency" or "loglikelihood"
            min_word_length: Minimum word length to include
            max_words: Maximum number of words to return
            width: Width of the generated image
            height: Height of the generated image
            background_color: Background color of the wordcloud
            colormap: Matplotlib colormap for word colors

        Returns:
            Dictionary containing base64 encoded image and word data
        """
        # Create mask based on shape
        mask = self._create_shape_mask(shape, width, height)

        return await self.generate_word_cloud_image(
            text=text,
            method=method,
            min_word_length=min_word_length,
            max_words=max_words,
            width=width,
            height=height,
            background_color=background_color,
            colormap=colormap,
            mask=mask
        )

    def _create_shape_mask(self, shape: str, width: int, height: int) -> np.ndarray:
        """
        Create a mask for the specified shape.
        Black areas (0) indicate where words CAN be placed.
        White areas (255) indicate where words CANNOT be placed.

        Args:
            shape: Shape type ('circle', 'square', 'rectangle', 'triangle', 'star', 'heart')
            width: Width of the mask
            height: Height of the mask

        Returns:
            Numpy array representing the mask
        """
        # Initialize mask with white (255) - no words allowed by default
        mask = np.full((height, width), 255, dtype=np.uint8)
        center_x, center_y = width // 2, height // 2

        if shape == 'circle':
            radius = min(width, height) // 2 - 20
            y, x = np.ogrid[:height, :width]
            # Set black (0) where words can be placed (inside circle)
            mask[(x - center_x)**2 + (y - center_y)**2 <= radius**2] = 0

        elif shape == 'square':
            size = min(width, height) // 2 - 20
            # Set black (0) where words can be placed (inside square)
            mask[center_y-size:center_y+size, center_x-size:center_x+size] = 0

        elif shape == 'rectangle':
            margin = 20
            # Set black (0) where words can be placed (inside rectangle)
            mask[margin:height-margin, margin:width-margin] = 0

        elif shape == 'triangle':
            # Create triangle mask
            triangle_height = min(width, height) // 2
            triangle_base = triangle_height * 2
            for y in range(height):
                for x in range(width):
                    rel_y = y - center_y + triangle_height // 2
                    rel_x = abs(x - center_x)
                    if (rel_y >= 0 and rel_y <= triangle_height and
                        rel_x <= (triangle_base // 2) * (1 - rel_y / triangle_height)):
                        # Set black (0) where words can be placed (inside triangle)
                        mask[y, x] = 0

        elif shape == 'star':
            # Create star mask (simplified 5-pointed star)
            radius = min(width, height) // 2 - 20
            y, x = np.ogrid[:height, :width]
            angle = np.arctan2(y - center_y, x - center_x)
            distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)

            # Create star shape
            star_angle = (angle + np.pi) % (2 * np.pi / 5)
            star_radius = radius * (0.5 + 0.5 * np.cos(star_angle * 5))
            # Set black (0) where words can be placed (inside star)
            mask[distance <= star_radius] = 0

        elif shape == 'heart':
            # Create heart mask (upside down)
            scale = min(width, height) // 3
            y, x = np.ogrid[:height, :width]
            heart_x = (x - center_x) / scale
            heart_y = -(y - center_y) / scale  # Invert y-coordinate to flip heart upside down

            # Heart formula - set black (0) where words can be placed (inside heart)
            heart_mask = ((heart_x**2 + heart_y**2 - 1)**3 - heart_x**2 * heart_y**3) <= 0
            mask[heart_mask] = 0

        else:
            # Default to rectangle
            margin = 20
            # Set black (0) where words can be placed (inside rectangle)
            mask[margin:height-margin, margin:width-margin] = 0

        return mask
