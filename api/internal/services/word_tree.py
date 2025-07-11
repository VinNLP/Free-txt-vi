import py_vncorenlp
from collections import defaultdict
from typing import List, Dict
import string


class WordTreeNode:

    def __init__(self):
        self.children = defaultdict(WordTreeNode)
        self.count = 0

    def insert(self, words: List[str]):
        node = self
        for word in words:
            node = node.children[word]
            node.count += 1

    def to_dict(self):
        def build(node):
            out = {}
            for word, child in node.children.items():
                out[word] = build(child)
                out[word]["count"] = child.count
            return out

        return build(self)


class WordTree:
    def __init__(self):
        self.model = py_vncorenlp.VnCoreNLP(
            save_dir="/api/internal/services/pyvncorenlp"
        )

    async def build_word_tree(self, text: str, keyword: str, window: int = 5):
        seg_text = self.model.word_segment(text.lower())
        seg_keyword = "".join(self.model.word_segment(keyword.lower()))
        mod_text = " ".join(seg_text)
        tokens = mod_text.split()
        left_tree = WordTreeNode()
        right_tree = WordTreeNode()
        punctuation = set(string.punctuation)

        for i, token in enumerate(tokens):
            if token == seg_keyword:
                left_context = tokens[max(0, i - window) : i][::-1]
                right_context = tokens[i + 1 : i + 1 + window]

                # Remove punctuation from context
                left_context = [w for w in left_context if w not in punctuation]
                right_context = [w for w in right_context if w not in punctuation]

                if left_context:
                    left_tree.insert(left_context)
                if right_context:
                    right_tree.insert(right_context)

        return {
            "word": seg_keyword,
            "left": left_tree.to_dict(),
            "right": right_tree.to_dict(),
        }
