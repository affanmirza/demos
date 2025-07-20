from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import json
import os
import time
import hashlib
import pickle
from llama_cpp import Llama

class OptimizedConversationalAction(Action):
    def __init__(self):
        super().__init__()
        # Load FAQ data
        self.faq_data = self.load_faq_data()
        
        # Initialize llama.cpp model with optimizations
        self.llm = None
        self.cache = {}  # Simple in-memory cache
        self.initialize_llm()
        self.warm_up_model()
    
    def initialize_llm(self):
        """Initialize the llama.cpp model with optimizations"""
        model_paths = [
            "models/phi-2.gguf",  # Primary choice for speed
            "models/llama-2-7b-chat.gguf"  # Fallback to larger model
        ]
        
        for model_path in model_paths:
            if os.path.exists(model_path):
                try:
                    print(f"🔄 Loading optimized model: {model_path}")
                    
                    # Optimized configuration based on the article
                    self.llm = Llama(
                        model_path=model_path,
                        n_ctx=1024,        # Reduced from 2048 for speed
                        n_threads=8,       # Optimized for M2
                        n_batch=512,       # Larger batch for efficiency
                        n_gpu_layers=0,    # CPU only
                        verbose=False,
                        use_mmap=True,     # Memory mapping
                        use_mlock=False,   # Don't lock memory
                        seed=42,           # Deterministic
                        f16_kv=True,       # Use f16 for key/value cache
                        vocab_only=False,
                        embedding=False,
                        rope_freq_base=10000.0,
                        rope_freq_scale=1.0
                    )
                    
                    print(f"✅ Optimized model loaded: {model_path}")
                    print(f"📊 Model size: {os.path.getsize(model_path) / (1024**3):.2f} GB")
                    return
                    
                except Exception as e:
                    print(f"❌ Failed to load {model_path}: {e}")
                    continue
        
        print("⚠️  No models found. Will use predefined responses only.")
        self.llm = None
    
    def warm_up_model(self):
        """Warm up the model to reduce first request latency"""
        if self.llm:
            print("🔥 Warming up model...")
            try:
                # Quick warm-up with minimal tokens
                _ = self.llm(
                    "Hello",
                    max_tokens=5,
                    temperature=0.1,
                    top_p=0.9,
                    top_k=20,
                    repeat_penalty=1.1
                )
                print("✅ Model warmed up successfully!")
            except Exception as e:
                print(f"⚠️  Warm-up failed: {e}")
    
    def get_cache_key(self, user_message: str, intent: str) -> str:
        """Generate cache key for user message"""
        content = f"{user_message}:{intent}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def get_cached_response(self, cache_key: str) -> str:
        """Get cached response if available"""
        return self.cache.get(cache_key)
    
    def cache_response(self, cache_key: str, response: str):
        """Cache response (simple in-memory cache)"""
        # Keep cache size manageable (max 100 entries)
        if len(self.cache) > 100:
            # Remove oldest entries
            oldest_keys = list(self.cache.keys())[:20]
            for key in oldest_keys:
                del self.cache[key]
        
        self.cache[cache_key] = response
    
    def load_faq_data(self):
        """Load FAQ data from JSON file"""
        try:
            with open("data/faqs.json", "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Failed to load FAQ data: {e}")
            return []
    
    def name(self) -> Text:
        return "action_optimized_conversational"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get the detected intent
        intent = tracker.latest_message.get('intent', {}).get('name')
        
        # Get the user message
        user_message = tracker.latest_message.get('text', '')
        
        # Check cache first
        cache_key = self.get_cache_key(user_message, intent)
        cached_response = self.get_cached_response(cache_key)
        
        if cached_response:
            print(f"⚡ Using cached response for: {user_message[:30]}...")
            dispatcher.utter_message(text=cached_response)
            return []
        
        # Get conversation history (last 4 messages for context)
        conversation_history = self.get_conversation_history(tracker)
        
        # Handle different types of interactions
        if intent == 'greet':
            response = self.handle_greeting(user_message, conversation_history)
        elif intent == 'goodbye':
            response = self.handle_goodbye(user_message, conversation_history)
        elif intent.startswith('faq_'):
            response = self.handle_faq_question(user_message, intent, conversation_history)
        else:
            response = self.handle_casual_conversation(user_message, conversation_history)
        
        # Cache the response
        self.cache_response(cache_key, response)
        
        dispatcher.utter_message(text=response)
        return []
    
    def get_conversation_history(self, tracker: Tracker) -> List[Dict]:
        """Get recent conversation history for context"""
        history = []
        
        # Get last 4 messages (excluding current one)
        events = tracker.events
        messages = []
        
        for event in events:
            if event.get('event') == 'user':
                messages.append({
                    'type': 'user',
                    'text': event.get('text', ''),
                    'intent': event.get('parse_data', {}).get('intent', {}).get('name', '')
                })
            elif event.get('event') == 'bot':
                messages.append({
                    'type': 'bot',
                    'text': event.get('text', '')
                })
        
        # Return last 4 exchanges (8 messages max)
        return messages[-8:] if len(messages) > 8 else messages
    
    def handle_greeting(self, user_message: str, history: List[Dict]) -> str:
        """Handle greetings with optimized generation"""
        if not self.llm:
            return "Halo! Saya adalah asisten RS Bhayangkara Brimob. Ada yang bisa saya bantu?"
        
        try:
            # Short, focused prompt
            prompt = f"""<s>[INST] Kamu adalah asisten RS Bhayangkara Brimob yang ramah. User berkata: "{user_message}"

Jawab dengan ramah dalam bahasa Indonesia. Singkat dan natural. Jangan gunakan emoji atau bahasa Inggris. [/INST]"""

            response = self.llm(
                prompt,
                max_tokens=60,      # Shorter for speed
                temperature=0.7,    # Balanced creativity
                top_p=0.9,
                top_k=40,
                repeat_penalty=1.1,
                stop=["</s>", "\n\n", "[INST]"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            if not generated_text or len(generated_text) < 5:
                return "Halo! Saya adalah asisten RS Bhayangkara Brimob. Ada yang bisa saya bantu?"
            
            return generated_text
            
        except Exception as e:
            print(f"❌ Greeting generation failed: {e}")
            return "Halo! Saya adalah asisten RS Bhayangkara Brimob. Ada yang bisa saya bantu?"
    
    def handle_goodbye(self, user_message: str, history: List[Dict]) -> str:
        """Handle goodbyes with optimized generation"""
        if not self.llm:
            return "Terima kasih telah menghubungi RS Bhayangkara Brimob. Semoga hari Anda menyenangkan!"
        
        try:
            prompt = f"""<s>[INST] Kamu adalah asisten RS Bhayangkara Brimob. User berkata: "{user_message}"

Jawab dengan ramah untuk mengucapkan selamat tinggal dalam bahasa Indonesia. Singkat. Jangan gunakan emoji atau bahasa Inggris. [/INST]"""

            response = self.llm(
                prompt,
                max_tokens=50,
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                repeat_penalty=1.1,
                stop=["</s>", "\n\n", "[INST]"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            if not generated_text or len(generated_text) < 5:
                return "Terima kasih telah menghubungi RS Bhayangkara Brimob. Semoga hari Anda menyenangkan!"
            
            return generated_text
            
        except Exception as e:
            print(f"❌ Goodbye generation failed: {e}")
            return "Terima kasih telah menghubungi RS Bhayangkara Brimob. Semoga hari Anda menyenangkan!"
    
    def handle_casual_conversation(self, user_message: str, history: List[Dict]) -> str:
        """Handle casual conversation with optimized generation"""
        if not self.llm:
            return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
        
        try:
            # Check if it's a casual question
            if any(word in user_message.lower() for word in ['apa kabar', 'bagaimana kabar', 'selamat pagi', 'selamat siang', 'selamat malam']):
                prompt = f"""<s>[INST] Kamu adalah asisten RS Bhayangkara Brimob yang ramah. User bertanya: "{user_message}"

Jawab dengan ramah dan natural dalam bahasa Indonesia. Singkat. Jangan gunakan emoji atau bahasa Inggris. [/INST]"""
            else:
                prompt = f"""<s>[INST] Kamu adalah asisten RS Bhayangkara Brimob. User berkata: "{user_message}"

Jawab dengan ramah dalam bahasa Indonesia. Jika tentang layanan RS, bantu dengan informasi yang ada. Jika percakapan santai, jawab dengan hangat. Jangan gunakan emoji atau bahasa Inggris. [/INST]"""

            response = self.llm(
                prompt,
                max_tokens=80,
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                repeat_penalty=1.1,
                stop=["</s>", "\n\n", "[INST]"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            if not generated_text or len(generated_text) < 5:
                return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
            
            return generated_text
            
        except Exception as e:
            print(f"❌ Casual conversation generation failed: {e}")
            return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
    
    def handle_faq_question(self, user_message: str, intent: str, history: List[Dict]) -> str:
        """Handle FAQ questions with optimized generation"""
        # Find relevant FAQ
        relevant_faq = self.find_relevant_faq(intent, user_message)
        
        if not relevant_faq:
            return self.handle_casual_conversation(user_message, history)
        
        if not self.llm:
            return relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
        
        try:
            # Optimized prompt for FAQ responses
            prompt = f"""<s>[INST] Kamu adalah asisten RS Bhayangkara Brimob. User bertanya: "{user_message}"

Informasi RS: {relevant_faq.get('answer', '')}

Jawab dengan natural dalam bahasa Indonesia menggunakan informasi di atas. Ramah dan membantu. Jangan gunakan emoji atau bahasa Inggris. [/INST]"""

            response = self.llm(
                prompt,
                max_tokens=100,
                temperature=0.6,    # Lower temperature for more focused responses
                top_p=0.9,
                top_k=40,
                repeat_penalty=1.1,
                stop=["</s>", "\n\n", "[INST]"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            if not generated_text or len(generated_text) < 10:
                return relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
            
            return generated_text
            
        except Exception as e:
            print(f"❌ FAQ generation failed: {e}")
            return relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
    
    def find_relevant_faq(self, intent: str, user_message: str) -> Dict:
        """Find relevant FAQ based on intent and user message"""
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
        
        if intent in intent_to_faq:
            faq_id = intent_to_faq[intent]
            for faq in self.faq_data:
                if faq.get('id') == faq_id:
                    return faq
        
        return {}
    
    def format_history(self, history: List[Dict]) -> str:
        """Format conversation history for the prompt"""
        if not history:
            return "No previous conversation."
        
        formatted = []
        for msg in history:
            if msg['type'] == 'user':
                formatted.append(f"User: {msg['text']}")
            else:
                formatted.append(f"Assistant: {msg['text']}")
        
        return "\n".join(formatted) 