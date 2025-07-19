#!/usr/bin/env python3
"""
Test script to verify the Hospital FAQ Chatbot setup
"""

import sys
import importlib

def test_imports():
    """Test that all required packages can be imported"""
    packages = [
        'fastapi',
        'uvicorn',
        'faiss',
        'sentence_transformers',
        'llama_cpp',
        'redis',
        'requests',
        'python_dotenv',
        'pandas',
        'numpy',
        'scikit_learn',
        'nltk'
    ]
    
    print("Testing package imports...")
    failed_imports = []
    
    for package in packages:
        try:
            importlib.import_module(package)
            print(f"✅ {package}")
        except ImportError as e:
            print(f"❌ {package}: {e}")
            failed_imports.append(package)
    
    return len(failed_imports) == 0

def test_faiss():
    """Test FAISS functionality"""
    try:
        import faiss
        import numpy as np
        
        # Create a simple FAISS index
        dimension = 128
        index = faiss.IndexFlatL2(dimension)
        
        # Add some vectors
        vectors = np.random.random((10, dimension)).astype('float32')
        index.add(vectors)
        
        # Search
        query = np.random.random((1, dimension)).astype('float32')
        distances, indices = index.search(query, 3)
        
        print("✅ FAISS: Index creation and search working")
        return True
    except Exception as e:
        print(f"❌ FAISS: {e}")
        return False

def test_sentence_transformers():
    """Test sentence transformers"""
    try:
        from sentence_transformers import SentenceTransformer
        
        # Load a small model
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Test encoding
        sentences = ["Hello world", "This is a test"]
        embeddings = model.encode(sentences)
        
        print("✅ Sentence Transformers: Model loading and encoding working")
        return True
    except Exception as e:
        print(f"❌ Sentence Transformers: {e}")
        return False

def test_llama_cpp():
    """Test llama.cpp (without loading a model)"""
    try:
        from llama_cpp import Llama
        
        print("✅ llama.cpp: Package imported successfully")
        print("   Note: Model loading test skipped (requires GGUF file)")
        return True
    except Exception as e:
        print(f"❌ llama.cpp: {e}")
        return False

def test_redis():
    """Test Redis connection"""
    try:
        import redis
        
        # Try to connect to Redis (will fail if Redis is not running, but that's OK)
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis: Connection successful")
        return True
    except redis.ConnectionError:
        print("⚠️  Redis: Connection failed (Redis may not be running)")
        print("   This is OK for development - Redis is optional")
        return True
    except Exception as e:
        print(f"❌ Redis: {e}")
        return False

def test_fastapi():
    """Test FastAPI"""
    try:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        
        app = FastAPI()
        
        @app.get("/")
        def read_root():
            return {"Hello": "World"}
        
        client = TestClient(app)
        response = client.get("/")
        
        if response.status_code == 200:
            print("✅ FastAPI: Basic functionality working")
            return True
        else:
            print(f"❌ FastAPI: Unexpected status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FastAPI: {e}")
        return False

def main():
    """Run all tests"""
    print("🏥 Hospital FAQ Chatbot Setup Test")
    print("=" * 50)
    
    tests = [
        ("Package Imports", test_imports),
        ("FAISS", test_faiss),
        ("Sentence Transformers", test_sentence_transformers),
        ("llama.cpp", test_llama_cpp),
        ("Redis", test_redis),
        ("FastAPI", test_fastapi)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        result = test_func()
        results.append((test_name, result))
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your setup is ready for development.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 