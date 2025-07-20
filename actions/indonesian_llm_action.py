#!/usr/bin/env python3
"""
Rasa Integration for Indonesian Hospital Bot
"""

import json
import time
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from llama_cpp import Llama

class ActionIndonesianResponse(Action):
    """Custom action for Indonesian LLM responses"""
    
    def __init__(self):
        """Initialize the action"""
        super().__init__()
        
        # Load model
        self.llm = Llama(
            model_path="models/llama-2-7b-chat.gguf",
            n_ctx=2048,
            n_threads=4,
            n_batch=512
        )
        
        # Load prompt template
        with open("models/indonesian-prompt-template.txt", "r", encoding="utf-8") as f:
            self.prompt_template = f.read()
    
    def name(self) -> Text:
        """Return the name of the action"""
        return "action_indonesian_response"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        """Run the action"""
        
        # Get user message
        user_message = tracker.latest_message.get('text', '')
        
        # Check if we should use Indonesian LLM
        # You can add logic here to determine when to use LLM vs predefined responses
        
        try:
            # Generate Indonesian response
            prompt = self.prompt_template.format(question=user_message)
            
            response = self.llm(
                prompt,
                max_tokens=150,
                temperature=0.7,
                stop=["</s>", "\n\n", "Pertanyaan:", "Question:"],
                echo=False
            )
            
            llm_response = response["choices"][0]["text"].strip()
            
            # Send response
            dispatcher.utter_message(text=llm_response)
            
        except Exception as e:
            # Fallback to predefined response
            fallback_response = "Maaf, saya sedang mengalami gangguan teknis. Silakan coba lagi nanti atau hubungi kami langsung."
            dispatcher.utter_message(text=fallback_response)
        
        return []
