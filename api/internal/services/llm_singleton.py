import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import Optional


class LLMSingleton:
    _instance = None
    _model = None
    _tokenizer = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LLMSingleton, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._initialized = True

    async def initialize_model(self, model_path: Optional[str] = None):
        """
        Initialize the LLM model and tokenizer
        """
        if self._model is not None and self._tokenizer is not None:
            return  # Already initialized

        if model_path is None:
            model_path = os.getenv("MODEL_SUM_PATH", "Qwen/Qwen2.5-0.5B-Instruct")

        print(f"Initializing LLM model: {model_path}")

        # Initialize tokenizer
        self._tokenizer = AutoTokenizer.from_pretrained(model_path)

        # Optimize device mapping
        device = "cuda:4" if torch.cuda.is_available() else "cpu"

        # Initialize model
        self._model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype="auto",
            device_map=device,
            low_cpu_mem_usage=True
        )

        # Set model to evaluation mode for faster inference
        self._model.eval()

        print(f"LLM model initialized successfully on device: {device}")

    @property
    async def model(self):
        """Get the LLM model instance"""
        if self._model is None:
            await self.initialize_model()
        return self._model

    @property
    async def tokenizer(self):
        """Get the LLM tokenizer instance"""
        if self._tokenizer is None:
            await self.initialize_model()
        return self._tokenizer

    async def generate_text(self, messages, max_new_tokens=500, temperature=0.7, top_p=0.9):
        """
        Generate text using the LLM model
        """
        if self._model is None or self._tokenizer is None:
            await self.initialize_model()

        # Apply chat template
        text = self._tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )

        # Tokenize input
        model_inputs = self._tokenizer([text], return_tensors="pt").to(
            self._model.device
        )

        # Generate text
        with torch.no_grad():
            generated_ids = self._model.generate(
                **model_inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=temperature,
                top_p=top_p,
                pad_token_id=self._tokenizer.eos_token_id
            )
            generated_ids = [
                output_ids[len(input_ids) :]
                for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
            ]

        # Decode response
        response = self._tokenizer.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]

        return response

    async def cleanup(self):
        """
        Clean up model resources
        """
        if self._model is not None:
            del self._model
            self._model = None
        if self._tokenizer is not None:
            del self._tokenizer
            self._tokenizer = None
        self._initialized = False


# Global instance
llm_singleton = LLMSingleton()
