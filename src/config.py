"""
Configuration management for the Hospital FAQ Chatbot
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for the chatbot"""
    
    # Server Configuration
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # WhatsApp Integration
    DIALOG360_API_KEY: Optional[str] = os.getenv("DIALOG360_API_KEY")
    DIALOG360_WEBHOOK_URL: Optional[str] = os.getenv("DIALOG360_WEBHOOK_URL")
    
    # Vector Search Configuration
    FAISS_INDEX_PATH: str = os.getenv("FAISS_INDEX_PATH", "./models/faiss_index")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", 0.65))
    TOP_K_RESULTS: int = int(os.getenv("TOP_K_RESULTS", 5))
    
    # Local LLM Configuration
    LLAMA_MODEL_PATH: Optional[str] = os.getenv("LLAMA_MODEL_PATH")
    LLAMA_CONTEXT_SIZE: int = int(os.getenv("LLAMA_CONTEXT_SIZE", 2048))
    LLAMA_MAX_TOKENS: int = int(os.getenv("LLAMA_MAX_TOKENS", 512))
    LLAMA_TEMPERATURE: float = float(os.getenv("LLAMA_TEMPERATURE", 0.7))
    
    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_DB: int = int(os.getenv("REDIS_DB", 0))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    
    # Intent Classification
    INTENT_MODEL_PATH: str = os.getenv("INTENT_MODEL_PATH", "./models/intent_classifier.pkl")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", 0.7))
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "./logs/chatbot.log")

# Global config instance
config = Config() 