from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import json
import os
import time
from llama_cpp import Llama

class ActionHospitalFAQOptimized(Action):
    def __init__(self):
        super().__init__()
        # Load FAQ data
        self.faq_data = self.load_faq_data()
        
        # Initialize llama.cpp model with M2 optimizations
        self.llm = None
        self.initialize_llm()
    
    def initialize_llm(self):
        """Initialize the llama.cpp model with Apple Silicon M2 optimizations"""
        # Use Indonesian LLaMA model
        model_paths = [
            "models/llama-1b-indo.gguf"  # Indonesian fine-tuned LLaMA model
        ]
        
        for model_path in model_paths:
            if os.path.exists(model_path):
                try:
                    print(f"🔄 Loading model: {model_path}")
                    
                    # Apple Silicon M2 optimizations
                    self.llm = Llama(
                        model_path=model_path,
                        n_ctx=512,        # Very small context for speed
                        n_threads=6,      # Optimized for M2 (not too many threads)
                        n_batch=256,      # Smaller batch size for memory
                        n_gpu_layers=0,   # CPU only (more stable)
                        verbose=False,
                        use_mmap=True,    # Memory mapping for efficiency
                        use_mlock=False,  # Don't lock memory (saves RAM)
                        seed=42           # Deterministic for testing
                    )
                    
                    print(f"✅ Model loaded successfully: {model_path}")
                    print(f"📊 Model size: {os.path.getsize(model_path) / (1024**3):.2f} GB")
                    return
                    
                except Exception as e:
                    print(f"❌ Failed to load {model_path}: {e}")
                    continue
        
        print("⚠️  No models found or loaded. Will use predefined responses only.")
        self.llm = None
    
    def load_faq_data(self):
        """Load FAQ data from JSON file"""
        try:
            with open("data/faqs.json", "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Failed to load FAQ data: {e}")
            return []
    
    def name(self) -> Text:
        return "action_hospital_faq_optimized"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get the detected intent
        intent = tracker.latest_message.get('intent', {}).get('name')
        
        # Get the user message
        user_message = tracker.latest_message.get('text', '')
        
        # Find relevant FAQ based on intent
        relevant_faq = self.find_relevant_faq(intent, user_message)
        
        if relevant_faq:
            # Check if LLM is enabled and available
            use_llm = os.getenv("USE_LLM", "false").lower() == "true"
            
            if use_llm and self.llm:
                try:
                    # Quick LLM generation with strict timeout
                    start_time = time.time()
                    response = self.generate_llm_response_fast(user_message, relevant_faq)
                    generation_time = time.time() - start_time
                    
                    print(f"⚡ LLM generation took: {generation_time:.2f}s")
                    
                    # If generation took too long, fallback to predefined
                    if generation_time > 10.0:  # 10 second timeout
                        print("⚠️  LLM generation too slow, using fallback")
                        response = relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
                    
                except Exception as e:
                    print(f"❌ LLM generation failed: {e}")
                    response = relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
            else:
                # Use predefined response (fastest option)
                response = relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
        else:
            response = "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
        
        dispatcher.utter_message(text=response)
        return []
    
    def find_relevant_faq(self, intent: str, user_message: str) -> Dict:
        """Find relevant FAQ based on intent and user message"""
        # Map intents to FAQ IDs
        intent_to_faq = {
            'faq_operating_hours': 1,
            'faq_bpjs': 2,
            'faq_online_registration': 3,
            'faq_registration_location': 4,
            'faq_emergency': 5,
            'faq_dental': 6,
            'faq_pediatric': 7,
            'faq_fees': 8
        }
        
        # Try to find FAQ by intent first
        if intent in intent_to_faq:
            faq_id = intent_to_faq[intent]
            for faq in self.faq_data:
                if faq.get('id') == faq_id:
                    return faq
        
        # If not found by intent, try keyword matching
        return self.find_faq_by_keywords(user_message)
    
    def find_faq_by_keywords(self, user_message: str) -> Dict:
        """Find FAQ by keyword matching"""
        user_message_lower = user_message.lower()
        
        for faq in self.faq_data:
            keywords = faq.get('keywords', [])
            for keyword in keywords:
                if keyword.lower() in user_message_lower:
                    return faq
        
        return {}
    
    def generate_llm_response_fast(self, user_message: str, faq: Dict) -> str:
        """Generate response using llama.cpp with optimized settings for speed and accuracy"""
        try:
            # Load the prompt template
            try:
                with open("models/indonesian-prompt-template.txt", "r", encoding="utf-8") as f:
                    prompt_template = f.read()
            except:
                # Fallback template if file not found
                prompt_template = """Anda adalah asisten rumah sakit yang membantu pasien dengan informasi yang akurat dan terpercaya.

PENTING: 
- JANGAN BERHALUSINASI atau memberikan informasi yang tidak ada dalam data yang diberikan
- HANYA gunakan informasi yang tersedia dalam konteks yang diberikan
- Jika informasi tidak tersedia, katakan "Maaf, saya tidak memiliki informasi tersebut"
- Berikan jawaban yang singkat, jelas, dan dalam bahasa Indonesia yang sopan

Konteks Informasi Rumah Sakit:
{context}

Pertanyaan Pasien: {question}

Jawaban:"""

            # Create context from FAQ data
            context = f"Pertanyaan: {faq.get('question', '')}\nJawaban: {faq.get('answer', '')}"
            
            # Format prompt with context and question
            prompt = prompt_template.format(
                context=context,
                question=user_message
            )

            # Ultra-fast generation settings with strict accuracy
            response = self.llm(
                prompt,
                max_tokens=100,      # Short responses for speed
                temperature=0.1,     # Very low temperature for accuracy (no hallucinations)
                top_p=0.8,           # Lower top_p for focused responses
                top_k=20,            # Lower top_k for accuracy
                repeat_penalty=1.1,  # Prevent repetition
                stop=["\n\n", "Instruksi:", "Konteks:", "Pertanyaan:", "Question:", "Context:"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            # If response is empty or too short, fallback to FAQ answer
            if not generated_text or len(generated_text) < 10:
                return faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
            
            # Check if response contains hallucinated information
            # If it's too different from the FAQ answer, use the FAQ answer
            faq_answer = faq.get('answer', '').lower()
            generated_lower = generated_text.lower()
            
            # Enhanced hallucination detection
            hallucination_indicators = [
                len(generated_text) > len(faq_answer) * 1.5,  # Too long
                "informasi yang tersedia" in generated_lower and len(generated_text) > 50,  # Generic long response
                "untuk mendaftar" in generated_lower and "bpjs" in user_message.lower(),  # BPJS registration hallucination
                "sentimeter" in generated_lower,  # Nonsensical units
                "per jam" in generated_lower and "biaya" in user_message.lower(),  # Wrong pricing format
            ]
            
            if any(hallucination_indicators):
                print(f"⚠️  Hallucination detected, using FAQ answer")
                return faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
            
            # Check if response contains key information from FAQ
            faq_keywords = faq.get('keywords', [])
            if faq_keywords:
                found_keywords = [kw for kw in faq_keywords if kw.lower() in generated_lower]
                if not found_keywords and len(generated_text) > 20:
                    print(f"⚠️  No FAQ keywords found in response, using FAQ answer")
                    return faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
            
            return generated_text
            
        except Exception as e:
            print(f"❌ Fast LLM generation failed: {e}")
            # Fallback to predefined answer
            return faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.') 