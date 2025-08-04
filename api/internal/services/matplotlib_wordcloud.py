import io
import base64
from typing import List, Dict, Optional
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


class MatplotlibWordCloudService:
    def __init__(self):
        self.model = vncorenlp_model

    async def generate_word_cloud_image(
        self,
        text: str,
        min_word_length: int = 2,
        max_words: int = 100,
        width: int = 2400,  # Increased from 1600
        height: int = 1800,  # Increased from 1200
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
        Generate a traditional wordcloud image using matplotlib and wordcloud.

        Args:
            text: Input text to analyze
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

        # Count word frequencies
        word_freq = Counter(cleaned_words)

        # Get top words by frequency
        top_words = word_freq.most_common(max_words)

        # Convert to dictionary for wordcloud
        word_freq_dict = dict(top_words)

        if not word_freq_dict:
            # Return empty result if no words found
            return {
                "image": "",
                "words": [],
                "message": "No words found after filtering"
            }

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
            mask=mask,  # The mask should be white (255) where words can be placed
            random_state=random_state
        )

        # Generate wordcloud
        wordcloud.generate_from_frequencies(word_freq_dict)

        # Create matplotlib figure with higher DPI for better resolution
        plt.figure(figsize=(width/100, height/100), dpi=400)  # Increased DPI from 300 to 400
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

        # Convert to list of dictionaries for consistency with existing API
        result_words = []
        for word, frequency in top_words:
            result_words.append({
                "word": word,
                "score": frequency
            })

        return {
            "image": f"data:image/png;base64,{img_base64}",
            "words": result_words,
            "total_words": len(result_words),
            "most_frequent_word": result_words[0]["word"] if result_words else "",
            "most_frequent_count": result_words[0]["score"] if result_words else 0
        }

    async def generate_word_cloud_with_shape(
        self,
        text: str,
        shape: str = 'circle',
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
        This is the inverse of what you might expect, but it's how the wordcloud library works.

        Args:
            shape: Shape type ('circle', 'square', 'rectangle', 'triangle', 'star', 'heart')
            width: Width of the mask
            height: Height of the mask

        Returns:
            Numpy array representing the mask (0 for areas where words can be placed, 255 for areas where they cannot)
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
