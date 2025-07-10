from nltk import sent_tokenize
from summa.summarizer import summarize as summa_summarizer
from transformers import pipeline
from transformers import AutoModelForCausalLM, AutoTokenizer
import nltk
import os


class Summarizer:
    def __init__(self):

        model_path = os.getenv("MODEL_SUM_PATH", "Qwen/Qwen2.5-0.5B-Instruct")

        self.sum_qwen_model = AutoModelForCausalLM.from_pretrained(
            model_path, torch_dtype="auto", device_map="auto"
        )
        self.sum_qwen_tokenizer = AutoTokenizer.from_pretrained(model_path)

    async def sum_qwen(self, input_text, chosen_ratio):
        # Calculate target word count based on chosen_ratio
        input_words = len(input_text.split())
        target_words = max(int(input_words * chosen_ratio), 10)

        messages = [
            {
                "role": "system",
                "content": f"Return the summary content in its language in approximately {target_words} words",
            },
            {"role": "user", "content": input_text},
        ]
        text = self.sum_qwen_tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        model_inputs = self.sum_qwen_tokenizer([text], return_tensors="pt").to(
            self.sum_qwen_model.device
        )

        max_new_tokens = min(target_words * 2, 10000)

        generated_ids = self.sum_qwen_model.generate(
            **model_inputs, max_new_tokens=max_new_tokens
        )
        generated_ids = [
            output_ids[len(input_ids) :]
            for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]

        response = self.sum_qwen_tokenizer.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]
        return response

    async def summarizer_summa(self, input_text, chosen_ratio):

        # Convert input_text to a string if it isn't already
        if not isinstance(input_text, str):
            input_text = " ".join(map(str, input_text))

        # Ensure the chosen_ratio is at least 0.1
        chosen_ratio = max(chosen_ratio, 0.1)

        # Get the summary using the text_rank_summarize function
        summary = summa_summarizer(input_text, chosen_ratio)

        # Tokenize input_text to sentences
        sentences = sent_tokenize(input_text)

        # Return the summary or fallback if the summary is empty
        if summary:
            return summary
        elif len(sentences) > 1:
            return sentences[0]
        else:
            return "Unable to summarize the input text."
