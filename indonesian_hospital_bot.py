#!/usr/bin/env python3
"""
Indonesian Hospital Chatbot Inference Script
"""

import json
import time
from llama_cpp import Llama

class IndonesianHospitalBot:
    def __init__(self, model_path="models/llama-2-7b-chat.gguf"):
        """Initialize the Indonesian hospital chatbot"""
        
        print("🔄 Loading Indonesian hospital chatbot...")
        
        # Load model
        self.llm = Llama(
            model_path=model_path,
            n_ctx=2048,
            n_threads=4,
            n_batch=512
        )
        
        # Load prompt template
        with open("models/indonesian-prompt-template.txt", "r", encoding="utf-8") as f:
            self.prompt_template = f.read()
        
        # Load config
        with open("models/indonesian-model-config.json", "r") as f:
            self.config = json.load(f)
        
        print("✅ Indonesian hospital chatbot loaded successfully")
    
    def generate_response(self, question, max_tokens=150):
        """Generate Indonesian response"""
        
        # Format prompt
        prompt = self.prompt_template.format(question=question)
        
        # Generate response
        start_time = time.time()
        
        response = self.llm(
            prompt,
            max_tokens=max_tokens,
            temperature=self.config["temperature"],
            stop=self.config["stop_tokens"],
            echo=False
        )
        
        end_time = time.time()
        
        # Extract response
        response_text = response["choices"][0]["text"].strip()
        
        return {
            "response": response_text,
            "response_time": end_time - start_time,
            "tokens_used": response["usage"]["total_tokens"]
        }
    
    def test_hospital_queries(self):
        """Test with hospital-specific queries"""
        
        test_queries = [
            "Jam buka rumah sakit?",
            "Apakah RS menerima BPJS?",
            "Bagaimana cara mendaftar online?",
            "Berapa biaya konsultasi dokter umum?",
            "Apakah ada dokter spesialis jantung?",
            "Bagaimana prosedur rawat inap?",
            "Apakah ada layanan gawat darurat 24 jam?",
            "Bagaimana cara membuat janji dengan dokter?"
        ]
        
        print("\n🧪 Testing Indonesian hospital chatbot...")
        print("=" * 60)
        
        for i, query in enumerate(test_queries, 1):
            print(f"\n📝 Test {i}: {query}")
            
            result = self.generate_response(query)
            
            print(f"🤖 Response: {result['response']}")
            print(f"⏱️  Time: {result['response_time']:.2f}s")
            print(f"🔢 Tokens: {result['tokens_used']}")
            print("-" * 40)

def main():
    """Main function"""
    
    # Initialize bot
    bot = IndonesianHospitalBot()
    
    # Test queries
    bot.test_hospital_queries()
    
    # Interactive mode
    print("\n💬 Interactive mode (type 'quit' to exit):")
    print("=" * 60)
    
    while True:
        try:
            user_input = input("\n👤 Anda: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'keluar']:
                print("👋 Terima kasih! Sampai jumpa!")
                break
            
            if not user_input:
                continue
            
            result = bot.generate_response(user_input)
            
            print(f"🤖 Bot: {result['response']}")
            print(f"⏱️  ({result['response_time']:.2f}s)")
            
        except KeyboardInterrupt:
            print("\n👋 Terima kasih! Sampai jumpa!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
