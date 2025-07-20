from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import json
import os
from llama_cpp import Llama

class ActionHospitalFAQ(Action):
    def __init__(self):
        super().__init__()
        # Load FAQ data
        self.faq_data = self.load_faq_data()
        
        # Initialize llama.cpp model (you'll need to specify the model path)
        # For now, we'll use a placeholder - you'll need to download a model
        self.llm = None
        self.initialize_llm()
    
    def initialize_llm(self):
        """Initialize the llama.cpp model"""
        model_path = os.getenv("LLAMA_MODEL_PATH", "models/llama-2-7b-chat.gguf")
        if os.path.exists(model_path):
            try:
                self.llm = Llama(
                    model_path=model_path,
                    n_ctx=1024,  # Reduced context for faster processing
                    n_threads=8,  # Increased threads for better performance
                    n_batch=512,  # Batch size for faster inference
                    verbose=False
                )
                print(f"✅ Llama.cpp model loaded from {model_path}")
            except Exception as e:
                print(f"❌ Failed to load llama.cpp model: {e}")
                self.llm = None
        else:
            print(f"⚠️  Model file not found at {model_path}")
            print("   You can download a model from Hugging Face or use a local GGUF file")
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
        return "action_hospital_faq"
    
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
            # Check if LLM is enabled via environment variable
            use_llm = os.getenv("USE_LLM", "false").lower() == "true"
            
            if use_llm and self.llm:
                try:
                    # Try LLM generation with timeout
                    import signal
                    
                    def timeout_handler(signum, frame):
                        raise TimeoutError("LLM generation timed out")
                    
                    # Set timeout for 30 seconds
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.alarm(30)
                    
                    response = self.generate_llm_response(user_message, relevant_faq)
                    signal.alarm(0)  # Cancel timeout
                    
                except (TimeoutError, Exception) as e:
                    print(f"⚠️  LLM generation failed or timed out: {e}")
                    # Fallback to predefined response
                    response = relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
            else:
                # Use predefined response (faster and more reliable)
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
    
    def generate_llm_response(self, user_message: str, faq: Dict) -> str:
        """Generate response using llama.cpp"""
        try:
            # Create a prompt for the LLM
            prompt = f"""<|im_start|>system
You are a helpful hospital assistant for RS Bhayangkara Brimob. Provide friendly, professional responses in Indonesian.
<|im_end|>
<|im_start|>user
Context: {faq.get('question', '')}
Answer: {faq.get('answer', '')}

User question: {user_message}

Please provide a helpful, friendly response in Indonesian based on the context and answer above. 
Keep it concise and professional.
<|im_end|>
<|im_start|>assistant
"""

            # Generate response with optimized settings for faster responses
            response = self.llm(
                prompt,
                max_tokens=150,  # Slightly increased for better responses
                temperature=0.3,  # Lower temperature for more focused responses
                stop=["<|im_end|>", "\n\n", "User:", "Assistant:"],
                top_p=0.9,
                top_k=40
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            # If response is empty, fallback to predefined answer
            if not generated_text:
                return faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
            
            return generated_text
            
        except Exception as e:
            print(f"❌ LLM generation failed: {e}")
            # Fallback to predefined answer
            return faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.') 