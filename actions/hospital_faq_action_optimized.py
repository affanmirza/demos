from typing import Any, Text, Dict, List, Optional
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
import os
from actions.utils.vector_search import VectorSearchManager
from actions.utils.multi_question_handler import MultiQuestionHandler
from actions.utils.context_manager import ContextManager
from actions.utils.llm_response_generator import LLMResponseGenerator

class ActionHospitalFAQOptimized(Action):
    def __init__(self):
        super().__init__()
        self.vector_search = VectorSearchManager()
        self.context_manager = ContextManager()
        self.llm_generator = LLMResponseGenerator()
        self.multi_handler = MultiQuestionHandler()

    def name(self) -> Text:
        return "action_hospital_faq_optimized"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        user_message = tracker.latest_message.get('text', '')
        user_id = tracker.sender_id
        intent = tracker.latest_message.get('intent', {}).get('name')
        confidence = tracker.latest_message.get('intent', {}).get('confidence', 0.0)
        context = self.context_manager.get_context(user_id)

        # Multi-question detection
        is_multi = self.multi_handler.detect_multi_questions(user_message)
        if is_multi:
            questions = self.multi_handler.split_questions_with_context(user_message)
            faqs = []
            for q in questions:
                results = self.vector_search.hybrid_search(q, context, top_k=1)
                if results:
                    faqs.append(results[0])
            if not faqs:
                response = "Maaf, saya tidak dapat menemukan jawaban untuk pertanyaan-pertanyaan Anda. Mohon perjelas pertanyaan Anda."
            else:
                response = self.llm_generator.generate_response(user_message, faqs, context, confidence, multi_question=True)
            # Update context with the last FAQ
            if faqs:
                self.context_manager.update_context(user_id, user_message, response, faqs[-1])
            dispatcher.utter_message(text=response)
            return []

        # Single question flow
        faqs = self.vector_search.hybrid_search(user_message, context, top_k=3)
        if not faqs:
            response = "Maaf, saya tidak dapat menemukan informasi yang relevan. Silakan tanyakan dengan cara lain atau hubungi administrasi."
            dispatcher.utter_message(text=response)
            return []

        # Confidence-based LLM integration
        best_faq = faqs[0]
        sim_score = best_faq.get('similarity_score', 0.0)
        use_llm = os.getenv("USE_LLM", "true").lower() == "true"
        if use_llm:
            if sim_score >= 0.8:
                response = self.llm_generator.generate_response(user_message, [best_faq], context, sim_score)
            elif sim_score >= 0.4:
                response = self.llm_generator.generate_response(user_message, [best_faq], context, sim_score)
            else:
                response = self.llm_generator.generate_response(user_message, faqs, context, sim_score)
        else:
            response = best_faq.get('answer', 'Maaf, saya tidak dapat membantu.')

        self.context_manager.update_context(user_id, user_message, response, best_faq)
        dispatcher.utter_message(text=response)
        return []