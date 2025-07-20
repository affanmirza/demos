#!/usr/bin/env python3
"""
Rasa Integration for Indonesian Hospital Bot
"""

import json
import time
import os
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from llama_cpp import Llama

class ActionIndonesianResponse(Action):
    """Custom action for Indonesian LLM responses"""
    
    def __init__(self):
        """Initialize the action"""
        super().__init__()
        
        # Load FAQ data
        self.faq_data = self.load_faq_data()
        
        # Load model
        try:
            self.llm = Llama(
                model_path="models/llama-1b-indo.gguf",
                n_ctx=1024,
                n_threads=6,
                n_batch=256,
                n_gpu_layers=0,
                verbose=False,
                use_mmap=True,
                use_mlock=False,
                seed=42
            )
            print("✅ Indonesian LLM model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load LLM model: {e}")
            self.llm = None
        
        # Load prompt template
        try:
            with open("models/indonesian-prompt-template.txt", "r", encoding="utf-8") as f:
                self.prompt_template = f.read()
            print("✅ Prompt template loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load prompt template: {e}")
            self.prompt_template = None
    
    def load_faq_data(self):
        """Load FAQ data from JSON file"""
        try:
            with open("data/faqs.json", "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Failed to load FAQ data: {e}")
            return []
    
    def find_relevant_context(self, user_message: str) -> str:
        """Find relevant FAQ context for the user message"""
        user_message_lower = user_message.lower()
        
        # Search for relevant FAQs
        relevant_faqs = []
        for faq in self.faq_data:
            # Check keywords
            keywords = faq.get('keywords', [])
            for keyword in keywords:
                if keyword.lower() in user_message_lower:
                    relevant_faqs.append(faq)
                    break
            
            # Check question content
            question = faq.get('question', '').lower()
            if any(word in question for word in user_message_lower.split()):
                if faq not in relevant_faqs:
                    relevant_faqs.append(faq)
        
        # Build context string
        if relevant_faqs:
            context_parts = []
            for faq in relevant_faqs[:3]:  # Limit to 3 most relevant
                context_parts.append(f"Pertanyaan: {faq.get('question', '')}")
                context_parts.append(f"Jawaban: {faq.get('answer', '')}")
                context_parts.append("")
            
            return "\n".join(context_parts)
        else:
            return "Tidak ada informasi spesifik yang tersedia untuk pertanyaan ini."
    
    def name(self) -> Text:
        """Return the name of the action"""
        return "action_indonesian_response"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        """Run the action"""
        
        # Get user message
        user_message = tracker.latest_message.get('text', '')
        
        # Check if LLM and template are available
        if not self.llm or not self.prompt_template:
            response = "Maaf, layanan AI sedang tidak tersedia. Silakan hubungi bagian administrasi untuk bantuan."
            dispatcher.utter_message(text=response)
            return []
        
        try:
            # Find relevant context
            context = self.find_relevant_context(user_message)
            
            # Generate Indonesian response
            prompt = self.prompt_template.format(
                context=context,
                question=user_message
            )
            
            # Generate response with strict parameters
            response = self.llm(
                prompt,
                max_tokens=150,
                temperature=0.1,  # Very low temperature for accuracy
                top_p=0.8,
                top_k=20,
                repeat_penalty=1.1,
                stop=["\n\n", "Instruksi:", "Konteks:", "Pertanyaan:"]
            )
            
            generated_text = response['choices'][0]['text'].strip()
            
            # If response is empty or too short, use fallback
            if not generated_text or len(generated_text) < 10:
                generated_text = "Maaf, saya tidak dapat memberikan jawaban yang tepat. Silakan hubungi bagian administrasi untuk informasi lebih lanjut."
            
            dispatcher.utter_message(text=generated_text)
            
        except Exception as e:
            print(f"❌ Error generating response: {e}")
            response = "Maaf, terjadi kesalahan dalam memproses pertanyaan Anda. Silakan hubungi bagian administrasi."
            dispatcher.utter_message(text=response)
        
        return []
