import py_vncorenlp
from collections import defaultdict
from typing import List, Dict
import string
import re
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

    async def build_word_tree(self, text: str, keyword: str, window: int = 5):
        seg_text = await process_text_with_vncorenlp_safe(text.lower())
        # For keywords, we can use direct word_segment since they're typically short
        seg_keyword = "".join(self.model.word_segment(keyword.lower()))

        # Clean the keyword
        seg_keyword = await clean_word(seg_keyword)

        mod_text = " ".join(seg_text)
        tokens = mod_text.split()
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
