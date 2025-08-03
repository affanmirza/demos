from typing import Dict, List, Any

class ContextManager:
    def __init__(self):
        self.memory = {}

    def get_context(self, user_id: str) -> Dict:
        return self.memory.get(user_id, {})

    def update_context(self, user_id: str, user_message: str, response: str, faq: Dict):
        if user_id not in self.memory:
            self.memory[user_id] = {}
        context = self.memory[user_id]
        context['last_topic'] = faq.get('keywords', ['general'])[0]
        context['last_faq_id'] = faq.get('id')
        context['last_user_message'] = user_message
        context['conversation_turn'] = context.get('conversation_turn', 0) + 1
        if 'history' not in context:
            context['history'] = []
        context['history'].append({'user': user_message, 'bot': response, 'faq_id': faq.get('id')})
        if len(context['history']) > 5:
            context['history'] = context['history'][-5:]
        self.memory[user_id] = context

    def clear_context(self, user_id: str):
        if user_id in self.memory:
            del self.memory[user_id] 