from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import json
import os
import time
from llama_cpp import Llama

class ConversationalAction(Action):
    def __init__(self):
        super().__init__()
        # Load FAQ data
        self.faq_data = self.load_faq_data()
        
        # Initialize llama.cpp model
        self.llm = None
        self.initialize_llm()
    
    def initialize_llm(self):
        """Initialize the llama.cpp model"""
        model_paths = [
            "models/llama-2-7b-chat.gguf",  # Better instruction following
            "models/phi-2.gguf"  # Fallback to smaller model
        ]
        
        for model_path in model_paths:
            if os.path.exists(model_path):
                try:
                    print(f"🔄 Loading conversational model: {model_path}")
                    
                    self.llm = Llama(
                        model_path=model_path,
                        n_ctx=512,
                        n_threads=6,
                        n_batch=256,
                        n_gpu_layers=0,
                        verbose=False,
                        use_mmap=True,
                        use_mlock=False,
                        seed=42
                    )
                    
                    print(f"✅ Conversational model loaded: {model_path}")
                    return
                    
                except Exception as e:
                    print(f"❌ Failed to load {model_path}: {e}")
                    continue
        
        print("⚠️  No models found. Will use predefined responses only.")
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
        return "action_conversational"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get the detected intent
        intent = tracker.latest_message.get('intent', {}).get('name')
        
        # Get the user message
        user_message = tracker.latest_message.get('text', '')
        
        # Get conversation history (last 3 messages for context)
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
        
        dispatcher.utter_message(text=response)
        return []
    
    def get_conversation_history(self, tracker: Tracker) -> List[Dict]:
        """Get recent conversation history for context"""
        history = []
        
        # Get last 3 messages (excluding current one)
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
        
        # Return last 3 exchanges (6 messages max)
        return messages[-6:] if len(messages) > 6 else messages
    
    def handle_greeting(self, user_message: str, history: List[Dict]) -> str:
        """Handle greetings with personality"""
        if not self.llm:
            return "Halo! Saya adalah asisten RS Bhayangkara Brimob. Ada yang bisa saya bantu?"
        
        try:
            # Create a conversational greeting prompt
            prompt = f"""You are a friendly and helpful hospital assistant for RS Bhayangkara Brimob. 
You speak Indonesian and are warm, professional, and eager to help.

Recent conversation:
{self.format_history(history)}

User just said: "{user_message}"

Respond naturally as a helpful hospital assistant. Be warm, friendly, and ask how you can help.
Keep it short (1-2 sentences) and in Indonesian:"""

            response = self.llm(
                prompt,
                max_tokens=100,
                temperature=0.7,  # Higher temperature for more personality
                top_p=0.9,
                top_k=40,
                stop=["\n\n", "User:", "Assistant:"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            if not generated_text or len(generated_text) < 10:
                return "Halo! Saya adalah asisten RS Bhayangkara Brimob. Ada yang bisa saya bantu?"
            
            return generated_text
            
        except Exception as e:
            print(f"❌ Greeting generation failed: {e}")
            return "Halo! Saya adalah asisten RS Bhayangkara Brimob. Ada yang bisa saya bantu?"
    
    def handle_goodbye(self, user_message: str, history: List[Dict]) -> str:
        """Handle goodbyes with personality"""
        if not self.llm:
            return "Terima kasih telah menghubungi RS Bhayangkara Brimob. Semoga hari Anda menyenangkan!"
        
        try:
            prompt = f"""You are a friendly hospital assistant for RS Bhayangkara Brimob.

Recent conversation:
{self.format_history(history)}

User just said: "{user_message}"

Respond naturally to say goodbye. Be warm and professional.
Keep it short (1-2 sentences) and in Indonesian:"""

            response = self.llm(
                prompt,
                max_tokens=80,
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                stop=["\n\n", "User:", "Assistant:"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            if not generated_text or len(generated_text) < 10:
                return "Terima kasih telah menghubungi RS Bhayangkara Brimob. Semoga hari Anda menyenangkan!"
            
            return generated_text
            
        except Exception as e:
            print(f"❌ Goodbye generation failed: {e}")
            return "Terima kasih telah menghubungi RS Bhayangkara Brimob. Semoga hari Anda menyenangkan!"
    
    def handle_casual_conversation(self, user_message: str, history: List[Dict]) -> str:
        """Handle casual conversation and questions"""
        if not self.llm:
            return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
        
        try:
            # Check if it's a casual question like "apa kabar?"
            if any(word in user_message.lower() for word in ['apa kabar', 'bagaimana kabar', 'selamat pagi', 'selamat siang', 'selamat malam']):
                prompt = f"""You are a friendly hospital assistant. The user asked: "{user_message}"

Respond naturally and warmly in Indonesian. Be conversational and friendly.
Keep it short and natural:"""
            else:
                prompt = f"""You are a friendly hospital assistant for RS Bhayangkara Brimob.

User said: "{user_message}"

Respond naturally in Indonesian. If it's about hospital services, be helpful.
If it's casual conversation, be warm and friendly.
Keep it conversational:"""

            response = self.llm(
                prompt,
                max_tokens=100,
                temperature=0.8,  # Higher temperature for more personality
                top_p=0.9,
                top_k=40,
                stop=["\n\n", "User:", "Assistant:"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            if not generated_text or len(generated_text) < 5:
                return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
            
            return generated_text
            
        except Exception as e:
            print(f"❌ Casual conversation generation failed: {e}")
            return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
    
    def handle_faq_question(self, user_message: str, intent: str, history: List[Dict]) -> str:
        """Handle FAQ questions with context awareness"""
        # Find relevant FAQ
        relevant_faq = self.find_relevant_faq(intent, user_message)
        
        if not relevant_faq:
            return self.handle_casual_conversation(user_message, history)
        
        if not self.llm:
            return relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
        
        try:
            # Create a more natural prompt
            prompt = f"""You are a helpful hospital assistant. The user asked: "{user_message}"

Here's the information: {relevant_faq.get('answer', '')}

Respond naturally in Indonesian using this information. Be friendly and helpful.
Make it sound conversational, not like reading from a manual:"""

            response = self.llm(
                prompt,
                max_tokens=100,
                temperature=0.7,  # Higher temperature for more natural responses
                top_p=0.9,
                top_k=40,
                stop=["\n\n", "User:", "Assistant:"]
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