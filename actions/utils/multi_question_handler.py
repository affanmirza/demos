import re
from typing import List, Tuple

class MultiQuestionHandler:
    MULTI_QUESTION_PATTERNS = [
        r"(.+?\?)\s*(.+?\?)",  # Two questions separated by '?'
        r"(.+? dan .+?\?)",      # 'and' conjunction
        r"(.+?\?.+?\?)",        # Two questions, no separator
    ]

    @staticmethod
    def detect_multi_questions(user_message: str) -> bool:
        for pattern in MultiQuestionHandler.MULTI_QUESTION_PATTERNS:
            if re.search(pattern, user_message, re.IGNORECASE):
                return True
        return False

    @staticmethod
    def split_questions_with_context(user_message: str) -> List[str]:
        # Split by '?', keep context
        questions = [q.strip() + '?' for q in user_message.split('?') if q.strip()]
        return questions 