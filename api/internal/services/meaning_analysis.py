import torch
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from internal.common.schemas.free_txt import Sentence


class MeaningAnalyzer:
    def __init__(self):
        model_path = os.getenv(
            "MODEL_SENTIMENT_PATH", "tabularisai/multilingual-sentiment-analysis"
        )
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)

    async def meaning_analyse(self, input_text: str):
        texts = input_text.split(".")
        texts = [text.strip() for text in texts if text.strip()]

        if not texts:
            return []

        inputs = self.tokenizer(
            texts, return_tensors="pt", truncation=True, padding=True, max_length=512
        )
        with torch.no_grad():
            outputs = self.model(**inputs)
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
        sentiment_map = {
            0: "VERY_NEGATIVE",
            1: "NEGATIVE",
            2: "NEUTRAL",
            3: "POSITIVE",
            4: "VERY_POSITIVE",
        }

        predicted_classes = torch.argmax(probabilities, dim=-1)
        confidences = torch.max(probabilities, dim=-1).values

        results = []
        for i in range(len(texts)):
            sentiment = sentiment_map[predicted_classes[i].item()]
            confidence = confidences[i].item()
            sentence = Sentence(sentence=texts[i], score=confidence, label=sentiment)
            results.append(sentence)
        return results
