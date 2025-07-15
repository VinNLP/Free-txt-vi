import os
import torch
import string
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import Dict, List
from internal.common.schemas.free_txt import (
    WordNetworkResponse,
    WordNetworkNode,
    WordNetworkEdge,
)
import asyncio
from internal.services.vncorenlp_singleton import vncorenlp_model
import nltk
import stopwordsiso as stopwords


class WordNetworkService:
    def __init__(self):
        model_path = os.getenv("MODEL_EMBEDDING_PATH", "Qwen/Qwen3-Embedding-0.6B")
        self.model = SentenceTransformer(model_path).to("cuda:4" if torch.cuda.is_available() else "cpu")


    def extract_words(self, text: str) -> List[str]:
        # Use VnCoreNLP for word segmentation, then remove underscores and punctuation, and filter stopwords
        seg_sent = vncorenlp_model.word_segment(text.lower())
        words = []
        punctuation = set(string.punctuation)
        # Ensure NLTK stopwords are downloaded
        try:
            en_stopwords = set(nltk.corpus.stopwords.words("english"))
        except LookupError:
            nltk.download("stopwords")
            en_stopwords = set(nltk.corpus.stopwords.words("english"))
        vi_stopwords_set = set(stopwords.stopwords("vi"))
        sent = " ".join(seg_sent)
        seg_text = sent.split()
        for word in seg_text:
            clean_word = word.replace("_", " ")
            clean_word = "".join(
                ch for ch in clean_word if ch not in punctuation
            ).strip()
            # print(f"Processing word: {clean_word}")
            if (
                clean_word
                and clean_word not in en_stopwords
                and clean_word not in vi_stopwords_set
            ):
                words.append(clean_word)
        return list(set(words))  # Unique words only

    async def build_network(
        self, text: str, threshold: float = 0.9
    ) -> WordNetworkResponse:
        words = self.extract_words(text)
        if len(words) < 2:
            return WordNetworkResponse(
                nodes=[WordNetworkNode(id=w) for w in words], edges=[]
            )
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None, lambda: self.model.encode(words, normalize_embeddings=True)
        )
        nodes = [WordNetworkNode(id=w) for w in words]
        edges = []

        # Calculate similarity matrix using SentenceTransformer's built-in method
        similarity_matrix = await loop.run_in_executor(
            None, lambda: self.model.similarity(embeddings, embeddings)
        )
        for i in range(len(words)):
            for j in range(i + 1, len(words)):
                sim = float(similarity_matrix[i][j])
                if sim >= threshold:
                    edges.append(
                        WordNetworkEdge(source=words[i], target=words[j], weight=sim)
                    )
        return WordNetworkResponse(nodes=nodes, edges=edges)
