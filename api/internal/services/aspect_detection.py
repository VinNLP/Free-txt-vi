import re
from typing import List, Dict, Any
from transformers import pipeline, AutoTokenizer, AutoModel
import torch
import os
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from langdetect import detect, DetectorFactory
import logging

# Set seed for consistent language detection
DetectorFactory.seed = 0

logger = logging.getLogger(__name__)


class AspectDetector:
    def __init__(self):
        # Initialize Qwen embedding model for aspect detection
        # Using Qwen/Qwen3-Embedding-0.6B for high-quality semantic embeddings
        model_path = os.getenv("EMBEDDING_MODEL_PATH", "Qwen/Qwen3-Embedding-0.6B")
        self.embedding_tokenizer = AutoTokenizer.from_pretrained(model_path)

        # Optimize device mapping
        device = "cuda:4" if torch.cuda.is_available() else "cpu"
        self.embedding_model = AutoModel.from_pretrained(
            model_path,
            device_map=device,
            low_cpu_mem_usage=True
        )

        # Set model to evaluation mode for faster inference
        self.embedding_model.eval()

        # Pre-compute aspect embeddings for faster detection
        self._aspect_embeddings = None
        self._aspect_info = None

        # Define aspect descriptions for embedding comparison (English and Vietnamese)
        self.aspect_descriptions = {
            'technical': {
                'en': 'technical details, specifications, implementation, software, hardware, algorithms, coding, programming, systems, technology, development, engineering, technical solutions',
                'vi': 'chi tiết kỹ thuật, thông số kỹ thuật, triển khai, phần mềm, phần cứng, thuật toán, lập trình, mã nguồn, hệ thống, công nghệ, phát triển, kỹ thuật, giải pháp kỹ thuật'
            },
            'business': {
                'en': 'business implications, market analysis, commercial aspects, profit, revenue, strategy, management, company, industry, enterprise, business model, market research, corporate',
                'vi': 'tác động kinh doanh, phân tích thị trường, khía cạnh thương mại, lợi nhuận, doanh thu, chiến lược, quản lý, công ty, ngành công nghiệp, doanh nghiệp, mô hình kinh doanh, nghiên cứu thị trường, doanh nghiệp'
            },
            'academic': {
                'en': 'research findings, methodology, scholarly contributions, study, analysis, theory, academic, publication, research, scholarly, academic research, scientific study, educational',
                'vi': 'kết quả nghiên cứu, phương pháp luận, đóng góp học thuật, nghiên cứu, phân tích, lý thuyết, học thuật, xuất bản, nghiên cứu khoa học, học thuật, nghiên cứu học thuật, nghiên cứu khoa học, giáo dục'
            },
            'medical': {
                'en': 'medical information, health implications, clinical aspects, treatment, patient, diagnosis, symptoms, medicine, healthcare, clinical, medical treatment, health care, medical research',
                'vi': 'thông tin y tế, tác động sức khỏe, khía cạnh lâm sàng, điều trị, bệnh nhân, chẩn đoán, triệu chứng, thuốc, chăm sóc sức khỏe, lâm sàng, điều trị y tế, chăm sóc sức khỏe, nghiên cứu y tế'
            },
            'legal': {
                'en': 'legal implications, regulatory aspects, compliance issues, law, regulation, policy, contract, court, jurisdiction, legal, legal framework, legal requirements, legal system',
                'vi': 'tác động pháp lý, khía cạnh quy định, vấn đề tuân thủ, luật pháp, quy định, chính sách, hợp đồng, tòa án, thẩm quyền, pháp lý, khung pháp lý, yêu cầu pháp lý, hệ thống pháp lý'
            },
            'financial': {
                'en': 'financial implications, costs, economic aspects, money, investment, banking, economy, finance, budget, cost, financial analysis, economic impact, financial planning',
                'vi': 'tác động tài chính, chi phí, khía cạnh kinh tế, tiền bạc, đầu tư, ngân hàng, kinh tế, tài chính, ngân sách, chi phí, phân tích tài chính, tác động kinh tế, lập kế hoạch tài chính'
            },
            'social': {
                'en': 'social implications, community impact, human aspects, people, society, culture, relationship, interaction, community, social issues, social impact, social development',
                'vi': 'tác động xã hội, tác động cộng đồng, khía cạnh con người, con người, xã hội, văn hóa, mối quan hệ, tương tác, cộng đồng, vấn đề xã hội, tác động xã hội, phát triển xã hội'
            },
            'environmental': {
                'en': 'environmental impact, sustainability, ecological aspects, environment, climate, pollution, conservation, green, eco-friendly, environmental protection, climate change, environmental issues',
                'vi': 'tác động môi trường, bền vững, khía cạnh sinh thái, môi trường, khí hậu, ô nhiễm, bảo tồn, xanh, thân thiện môi trường, bảo vệ môi trường, biến đổi khí hậu, vấn đề môi trường'
            },
            'political': {
                'en': 'political implications, policy aspects, governance, government, policy, election, democracy, administration, politics, political system, political analysis, political impact',
                'vi': 'tác động chính trị, khía cạnh chính sách, quản trị, chính phủ, chính sách, bầu cử, dân chủ, hành chính, chính trị, hệ thống chính trị, phân tích chính trị, tác động chính trị'
            },
            'scientific': {
                'en': 'scientific findings, research implications, experimental aspects, science, experiment, discovery, innovation, laboratory, research, scientific method, scientific analysis, scientific impact',
                'vi': 'phát hiện khoa học, tác động nghiên cứu, khía cạnh thực nghiệm, khoa học, thí nghiệm, khám phá, đổi mới, phòng thí nghiệm, nghiên cứu, phương pháp khoa học, phân tích khoa học, tác động khoa học'
            }
        }

    def detect_language(self, text: str) -> str:
        """
        Detect the language of the input text using langdetect
        Returns language code (e.g., 'en', 'vi', 'fr', etc.)
        """
        try:
            # Clean the text for better language detection
            cleaned_text = re.sub(r'[^\w\s]', '', text.strip())

            # Need at least some text for detection
            if len(cleaned_text) < 10:
                logger.warning("Text too short for reliable language detection, defaulting to English")
                return 'en'

            detected_lang = detect(cleaned_text)
            logger.info(f"Detected language: {detected_lang} for text: {text[:50]}...")
            return detected_lang

        except Exception as e:
            logger.error(f"Language detection failed: {e}, defaulting to English")
            return 'en'

    async def _initialize_aspect_embeddings(self, language: str = 'en'):
        """Initialize aspect embeddings for a specific language for faster detection"""
        if self._aspect_embeddings is None or language not in getattr(self, '_aspect_embeddings_by_lang', {}):
            aspect_texts = []
            aspect_info = []

            for aspect_name, descriptions in self.aspect_descriptions.items():
                # Use the detected language, fallback to English if not available
                lang_to_use = language if language in descriptions else 'en'
                description = descriptions[lang_to_use]

                aspect_texts.append(description)
                aspect_info.append((aspect_name, lang_to_use, description))

            embeddings = await self.get_embeddings(aspect_texts)

            # Store embeddings by language
            if not hasattr(self, '_aspect_embeddings_by_lang'):
                self._aspect_embeddings_by_lang = {}
            self._aspect_embeddings_by_lang[language] = embeddings
            self._aspect_info_by_lang = aspect_info

    async def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts using Qwen embedding model
        """
        embeddings = []

        # Process texts in batches for better performance
        batch_size = 4
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]

            # Tokenize batch
            inputs = self.embedding_tokenizer(
                batch_texts,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            ).to(self.embedding_model.device)

            with torch.no_grad():
                outputs = self.embedding_model(**inputs)
                # For Qwen embedding model, use the last hidden state
                # The embedding is typically the mean of the last hidden state
                batch_embeddings = torch.mean(outputs.last_hidden_state, dim=1)
                embeddings.extend(batch_embeddings.cpu().numpy())

        return np.vstack(embeddings)

    async def detect_aspects(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect aspects in the given text using embedding similarity
        First detects the language, then uses language-specific aspect descriptions
        Returns a list of detected aspects with their confidence scores
        """
        # Detect language first
        detected_language = self.detect_language(text)
        logger.info(f"Processing aspect detection for language: {detected_language}")

        # Initialize aspect embeddings for the detected language
        await self._initialize_aspect_embeddings(detected_language)

        # Get embeddings for the detected language
        aspect_embeddings = self._aspect_embeddings_by_lang[detected_language]
        aspect_info = self._aspect_info_by_lang

        # Generate embedding for input text
        text_embedding = await self.get_embeddings([text])

        detected_aspects = []

        # Calculate cosine similarity between text and each aspect description
        similarities = cosine_similarity(text_embedding, aspect_embeddings)[0]

        # Create aspect results with confidence scores
        for i, (aspect_name, lang, description) in enumerate(aspect_info):
            confidence = float(similarities[i])

            # Only include aspects with confidence > 0.3
            if confidence > 0.3:
                detected_aspects.append({
                    'aspect': aspect_name,
                    'confidence': confidence,
                    'similarity_score': confidence,
                    'description': description,
                    'language': lang
                })

        # Sort by confidence score (highest first)
        detected_aspects.sort(key=lambda x: x['confidence'], reverse=True)

        logger.info(f"Detected {len(detected_aspects)} aspects for language {detected_language}")
        return detected_aspects

    async def get_aspect_summary_prompt(self, text: str, aspect: str, target_words: int) -> str:
        """
        Generate a prompt for aspect-based summarization with strict language requirements
        """
        # Detect language for the prompt
        detected_language = self.detect_language(text)

        aspect_descriptions = {
            'technical': {
                'en': 'technical details, specifications, and implementation',
                'vi': 'chi tiết kỹ thuật, thông số kỹ thuật và triển khai'
            },
            'business': {
                'en': 'business implications, market analysis, and commercial aspects',
                'vi': 'tác động kinh doanh, phân tích thị trường và khía cạnh thương mại'
            },
            'academic': {
                'en': 'research findings, methodology, and scholarly contributions',
                'vi': 'kết quả nghiên cứu, phương pháp luận và đóng góp học thuật'
            },
            'medical': {
                'en': 'medical information, health implications, and clinical aspects',
                'vi': 'thông tin y tế, tác động sức khỏe và khía cạnh lâm sàng'
            },
            'legal': {
                'en': 'legal implications, regulatory aspects, and compliance issues',
                'vi': 'tác động pháp lý, khía cạnh quy định và vấn đề tuân thủ'
            },
            'financial': {
                'en': 'financial implications, costs, and economic aspects',
                'vi': 'tác động tài chính, chi phí và khía cạnh kinh tế'
            },
            'social': {
                'en': 'social implications, community impact, and human aspects',
                'vi': 'tác động xã hội, tác động cộng đồng và khía cạnh con người'
            },
            'environmental': {
                'en': 'environmental impact, sustainability, and ecological aspects',
                'vi': 'tác động môi trường, bền vững và khía cạnh sinh thái'
            },
            'political': {
                'en': 'political implications, policy aspects, and governance',
                'vi': 'tác động chính trị, khía cạnh chính sách và quản trị'
            },
            'scientific': {
                'en': 'scientific findings, research implications, and experimental aspects',
                'vi': 'phát hiện khoa học, tác động nghiên cứu và khía cạnh thực nghiệm'
            }
        }

        # Get aspect description in the detected language
        aspect_desc = aspect_descriptions.get(aspect, {}).get(detected_language, aspect)

        # Create language-specific prompt
        if detected_language == 'vi':
            return f"""Bạn là trợ lý tóm tắt văn bản tập trung vào khía cạnh cụ thể. Nhiệm vụ của bạn là tóm tắt văn bản đã cho tập trung vào một khía cạnh cụ thể.

QUY TẮC NGÔN NGỮ QUAN TRỌNG:
- Bạn PHẢI trả về tóm tắt bằng ĐÚNG NGÔN NGỮ như văn bản đầu vào
- Nếu đầu vào là tiếng Việt, chỉ trả lời bằng tiếng Việt
- KHÔNG BAO GIỜ dịch hoặc thay đổi ngôn ngữ của câu trả lời

TẬP TRUNG VÀO KHÍA CẠNH:
- Tập trung cụ thể vào {aspect_desc}
- Trích xuất và tóm tắt chỉ thông tin liên quan đến khía cạnh này
- Bỏ qua nội dung không liên quan đến khía cạnh này
- Duy trì ngôn ngữ gốc trong suốt

NHIỆM VỤ:
- Tóm tắt văn bản tập trung vào {aspect_desc}
- Nhắm đến khoảng {target_words} từ
- Duy trì ngôn ngữ gốc của văn bản đầu vào
- Giữ tóm tắt mạch lạc và có cấu trúc tốt

Văn bản đầu vào: {text}

Nhớ: Trả lời bằng ĐÚNG NGÔN NGỮ như văn bản đầu vào. Chỉ tập trung vào {aspect_desc}."""
        else:
            return f"""You are an aspect-focused text summarization assistant. Your task is to summarize the given text focusing on a specific aspect.

IMPORTANT LANGUAGE RULES:
- You MUST return the summary in the EXACT SAME LANGUAGE as the input text
- If the input is in Vietnamese, respond ONLY in Vietnamese
- If the input is in English, respond ONLY in English
- If the input is in any other language, respond in that same language
- NEVER translate or change the language of your response

ASPECT FOCUS:
- Focus specifically on {aspect_desc}
- Extract and summarize only information related to this aspect
- Ignore content that is not relevant to this aspect
- Maintain the original language throughout

TASK:
- Summarize the text focusing on {aspect_desc}
- Target approximately {target_words} words
- Maintain the original language of the input text
- Keep the summary coherent and well-structured

Input text: {text}

Remember: Respond in the SAME LANGUAGE as the input text. Focus ONLY on {aspect_desc}."""

    async def summarize_by_aspect(self, text: str, aspect: str, ratio: float = 0.3) -> str:
        """
        Generate a summary focused on a specific aspect
        """
        # Calculate target word count
        input_words = len(text.split())
        target_words = max(int(input_words * ratio), 10)

        # Generate aspect-specific prompt
        prompt = await self.get_aspect_summary_prompt(text, aspect, target_words)

        # For now, we'll use a simple approach
        # In production, you could use the same Qwen model as the main summarizer
        # but with aspect-specific prompts

        # This is a placeholder - in practice, you'd want to use the actual model
        # For now, we'll return a simple aspect-focused summary
        return f"Summary focused on {aspect} aspects: {text[:100]}..."
