import py_vncorenlp
from typing import List
from internal.common.schemas.free_txt import ConcordanceEntry
import string
import re
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


class ConcordanceService:
    def __init__(self):
        self.model = vncorenlp_model

    async def concordance(
        self, text: str, keyword: str, window_size: int
    ) -> List[ConcordanceEntry]:
        # Segment text and keyword using VnCoreNLP
        seg_text = self.model.word_segment(text.lower())
        seg_keyword = "".join(self.model.word_segment(keyword.lower()))

        # Clean the keyword
        seg_keyword = await clean_word(seg_keyword)

        tokens = " ".join(seg_text).split()
        results = []
        punctuation = set(string.punctuation)

        for i, token in enumerate(tokens):
            # Clean the token for comparison
            cleaned_token = await clean_word(token)
            if cleaned_token == seg_keyword:
                left_context = [
                    await clean_word(w)
                    for w in tokens[max(0, i - window_size) : i]
                    if w not in punctuation
                ]
                right_context = [
                    await clean_word(w)
                    for w in tokens[i + 1 : i + 1 + window_size]
                    if w not in punctuation
                ]

                # Filter out empty words after cleaning
                left_context = [w for w in left_context if w]
                right_context = [w for w in right_context if w]

                # Clean the final context strings to remove any remaining underscores
                left_context_str = " ".join(left_context).replace('_', ' ')
                left_context_str = re.sub(r'\s+', ' ', left_context_str).strip()

                right_context_str = " ".join(right_context).replace('_', ' ')
                right_context_str = re.sub(r'\s+', ' ', right_context_str).strip()

                results.append(
                    ConcordanceEntry(
                        left_context=left_context_str,
                        keyword=cleaned_token,
                        right_context=right_context_str,
                    )
                )
        return results
