import os
from typing import List, Dict, Any
from llama_cpp import Llama

class LLMResponseGenerator:
    def __init__(self, model_path: str = "models/llama-1b-indo.gguf"):
        self.model_path = model_path
        self.llm = None
        self.load_llm()

    def load_llm(self):
        if self.llm is None and os.path.exists(self.model_path):
            self.llm = Llama(
                model_path=self.model_path,
                n_ctx=1024,
                n_threads=6,
                n_batch=256,
                n_gpu_layers=0,
                verbose=False,
                use_mmap=True,
                use_mlock=False,
                seed=42
            )

    def generate_response(self, user_message: str, faqs: List[Dict], context: Dict, confidence: float, multi_question: bool = False, timeout: int = 10) -> str:
        if not self.llm:
            return faqs[0].get('answer', 'Maaf, saya tidak dapat membantu.')
        try:
            if multi_question:
                prompt = self.multi_question_prompt(user_message, faqs, context)
            elif confidence >= 0.8:
                prompt = self.high_conf_prompt(user_message, faqs[0], context)
            elif confidence >= 0.4:
                prompt = self.medium_conf_prompt(user_message, faqs[0], context)
            else:
                return self.low_conf_fallback(user_message, faqs, context)
            response = self.llm(
                prompt,
                max_tokens=180,
                temperature=0.2,
                top_p=0.9,
                top_k=40,
                repeat_penalty=1.1,
                stop=["\n\n", "User:", "FAQ:", "Context:"]
            )
            text = response['choices'][0]['text'].strip()
            if self.validate_response_quality(text, faqs, user_message):
                return text
            return faqs[0].get('answer', 'Maaf, saya tidak dapat membantu.')
        except Exception as e:
            return faqs[0].get('answer', 'Maaf, saya tidak dapat membantu.')

    def high_conf_prompt(self, user_message, faq, context):
        return f"""Anda adalah asisten RS Bhayangkara Brimob. Jawab pertanyaan berikut dengan sopan dan ringkas, berdasarkan FAQ:
Pertanyaan: {faq.get('question')}
Jawaban: {faq.get('answer')}
User: {user_message}
Jawaban:"""

    def medium_conf_prompt(self, user_message, faq, context):
        return f"""Anda adalah asisten RS Bhayangkara Brimob. Rephrase jawaban FAQ agar sesuai gaya pertanyaan user:
Pertanyaan: {faq.get('question')}
Jawaban: {faq.get('answer')}
User: {user_message}
Jawaban:"""

    def multi_question_prompt(self, user_message, faqs, context):
        faq_str = "\n".join([f"Q: {f.get('question')}\nA: {f.get('answer')}" for f in faqs])
        return f"""User bertanya beberapa hal sekaligus. Gabungkan jawaban FAQ berikut secara natural:
{faq_str}
User: {user_message}
Jawaban gabungan (maksimal 3 kalimat):"""

    def low_conf_fallback(self, user_message, faqs, context):
        alt = "\n".join([f"- {f.get('question')}" for f in faqs])
        return f"Maaf, saya tidak yakin dengan jawaban. Mungkin Anda mencari informasi tentang:\n{alt}\nSilakan pilih atau tanyakan lebih spesifik."

    def validate_response_quality(self, response: str, faqs: List[Dict], user_message: str) -> bool:
        if not response or len(response.strip()) < 10:
            return False
        # Anti-hallucination: must not add info outside FAQ
        for faq in faqs:
            if faq.get('answer') in response:
                return True
        return False 