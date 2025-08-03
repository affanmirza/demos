from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import json
import random

class SimpleConversationalAction(Action):
    def __init__(self):
        super().__init__()
        # Load FAQ data
        self.faq_data = self.load_faq_data()
        
        # Predefined responses for different scenarios
        self.greeting_responses = [
            "Halo! Saya adalah asisten RS Bhayangkara Brimob. Ada yang bisa saya bantu?",
            "Selamat datang di RS Bhayangkara Brimob! Ada yang bisa saya bantu?",
            "Halo! Saya siap membantu Anda dengan informasi RS Bhayangkara Brimob.",
            "Selamat datang! Ada yang bisa saya bantu terkait layanan RS Bhayangkara Brimob?"
        ]
        
        self.goodbye_responses = [
            "Terima kasih telah menghubungi RS Bhayangkara Brimob. Semoga hari Anda menyenangkan!",
            "Terima kasih! Jika ada pertanyaan lain, jangan ragu untuk menghubungi kami lagi.",
            "Sampai jumpa! Semoga informasi yang saya berikan bermanfaat.",
            "Terima kasih telah menggunakan layanan kami. Semoga sehat selalu!"
        ]
        
        self.casual_responses = [
            "Baik, terima kasih! Ada yang bisa saya bantu terkait layanan RS?",
            "Senang mendengarnya! Ada pertanyaan tentang layanan RS Bhayangkara Brimob?",
            "Bagus! Jika ada yang ingin ditanyakan tentang RS, saya siap membantu.",
            "Alhamdulillah! Ada yang bisa saya bantu terkait informasi RS?"
        ]
    
    def load_faq_data(self):
        """Load FAQ data from JSON file"""
        try:
            with open("data/faqs.json", "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Failed to load FAQ data: {e}")
            return []
    
    def name(self) -> Text:
        return "action_simple_conversational"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Get the detected intent
        intent = tracker.latest_message.get('intent', {}).get('name')
        
        # Get the user message
        user_message = tracker.latest_message.get('text', '')
        
        # Get conversation context
        previous_intent = self.get_previous_intent(tracker)
        
        # Handle different types of interactions
        if intent == 'greet':
            response = self.handle_greeting(user_message, previous_intent)
        elif intent == 'goodbye':
            response = self.handle_goodbye(user_message, previous_intent)
        elif intent.startswith('faq_'):
            response = self.handle_faq_question(user_message, intent, previous_intent)
        else:
            response = self.handle_casual_conversation(user_message, previous_intent)
        
        dispatcher.utter_message(text=response)
        return []
    
    def get_previous_intent(self, tracker: Tracker) -> str:
        """Get the previous intent for context"""
        events = tracker.events
        
        # Look for the most recent user intent (excluding current)
        for event in reversed(events[:-1]):  # Exclude current event
            if event.get('event') == 'user':
                intent_data = event.get('parse_data', {}).get('intent', {})
                return intent_data.get('name', '')
        
        return ''
    
    def handle_greeting(self, user_message: str, previous_intent: str) -> str:
        """Handle greetings with context awareness"""
        # Check if this is a follow-up greeting
        if previous_intent and previous_intent != 'greet':
            return "Halo lagi! Ada yang bisa saya bantu lebih lanjut?"
        
        # Random greeting response
        return random.choice(self.greeting_responses)
    
    def handle_goodbye(self, user_message: str, previous_intent: str) -> str:
        """Handle goodbyes with context awareness"""
        # Check if user got helpful information
        if previous_intent.startswith('faq_'):
            return "Senang bisa membantu! Terima kasih telah menghubungi RS Bhayangkara Brimob."
        
        return random.choice(self.goodbye_responses)
    
    def handle_casual_conversation(self, user_message: str, previous_intent: str) -> str:
        """Handle casual conversation with context awareness"""
        # Check for common casual phrases
        user_lower = user_message.lower()
        
        if any(word in user_lower for word in ['apa kabar', 'bagaimana kabar', 'selamat pagi', 'selamat siang', 'selamat malam']):
            return random.choice(self.casual_responses)
        
        # If previous intent was FAQ, provide helpful follow-up
        if previous_intent.startswith('faq_'):
            return "Ada yang ingin ditanyakan lebih lanjut tentang layanan RS Bhayangkara Brimob?"
        
        # Default response
        return "Maaf, saya tidak dapat membantu dengan pertanyaan tersebut. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
    
    def handle_faq_question(self, user_message: str, intent: str, previous_intent: str) -> str:
        """Handle FAQ questions with context awareness"""
        # Find relevant FAQ
        relevant_faq = self.find_relevant_faq(intent, user_message)
        
        if not relevant_faq:
            return self.handle_casual_conversation(user_message, previous_intent)
        
        # Get the base answer
        base_answer = relevant_faq.get('answer', 'Maaf, saya tidak dapat membantu dengan pertanyaan tersebut.')
        
        # Add context-aware follow-up
        if previous_intent.startswith('faq_'):
            # This is a follow-up question
            follow_ups = [
                " Ada yang ingin ditanyakan lebih lanjut?",
                " Ada informasi lain yang Anda butuhkan?",
                " Ada yang bisa saya bantu lagi?"
            ]
            return base_answer + random.choice(follow_ups)
        else:
            # This is a new question
            return base_answer
    
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