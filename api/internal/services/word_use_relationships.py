import py_vncorenlp
from typing import List
from internal.common.schemas.free_txt import ConcordanceEntry
import string
from internal.services.vncorenlp_singleton import vncorenlp_model


class ConcordanceService:
    def __init__(self):
        self.model = vncorenlp_model

    async def concordance(
        self, text: str, keyword: str, window_size: int
    ) -> List[ConcordanceEntry]:
        # Segment text and keyword using VnCoreNLP
        seg_text = self.model.word_segment(text.lower())
        seg_keyword = "".join(self.model.word_segment(keyword.lower()))
        tokens = " ".join(seg_text).split()
        results = []
        punctuation = set(string.punctuation)
        for i, token in enumerate(tokens):
            if token == seg_keyword:
                left_context = [
                    w
                    for w in tokens[max(0, i - window_size) : i]
                    if w not in punctuation
                ]
                right_context = [
                    w
                    for w in tokens[i + 1 : i + 1 + window_size]
                    if w not in punctuation
                ]
                results.append(
                    ConcordanceEntry(
                        left_context=" ".join(left_context),
                        keyword=token,
                        right_context=" ".join(right_context),
                    )
                )
        return results
