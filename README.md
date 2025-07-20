# Hospital FAQ Chatbot with FAISS + llama.cpp

A Python-based chatbot that combines FastAPI, FAISS vector search, and llama.cpp for intelligent hospital FAQ matching via WhatsApp.

## 🏗️ Architecture

```
User Query → Intent Classification → FAISS Vector Search → llama.cpp Response → WhatsApp
                ↓                        ↓                    ↓
            Custom ML Model         Sentence Embeddings    Local LLM
            (scikit-learn)         (sentence-transformers) (llama.cpp)
```

## 🚀 Features

✅ **FastAPI Web Framework**: Modern, fast web API  
✅ **Custom Intent Classification**: ML-based intent detection  
✅ **FAISS Vector Search**: Fast similarity search with sentence embeddings  
✅ **Local LLM Integration**: llama.cpp for response generation  
✅ **WhatsApp Integration**: 360dialog webhook support  
✅ **Redis Caching**: Session management and response caching  
✅ **Multi-turn Conversations**: Context-aware follow-up questions  
✅ **No Hallucination**: Returns only preloaded answers  
✅ **CPU-Optimized**: Runs entirely on CPU without GPU requirements  

## 📋 Prerequisites

- Python 3.13+
- Redis (optional, for caching)
- 360dialog Sandbox account (for WhatsApp testing)

## 🛠️ Installation

### 1. Clone and Setup

```bash
git clone <repository-url>
cd demos
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Download Models

```bash
# Create models directory
mkdir -p models

# Download a small GGUF model for llama.cpp (example)
# You can use models like:
# - TheBloke/Llama-2-7B-Chat-GGUF
# - TheBloke/Mistral-7B-Instruct-v0.2-GGUF
# - TheBloke/phi-2-GGUF
```

### 4. Start the Application

```bash
python main.py
```

The server will start on `http://localhost:8000`

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=8000
DEBUG=true

# WhatsApp (360dialog)
DIALOG360_API_KEY=your_api_key
DIALOG360_WEBHOOK_URL=https://your-domain.com/webhook

# Vector Search
FAISS_INDEX_PATH=./models/faiss_index
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
SIMILARITY_THRESHOLD=0.65
TOP_K_RESULTS=5

# Local LLM
LLAMA_MODEL_PATH=./models/llama-1b-indo-merged
LLAMA_CONTEXT_SIZE=2048
LLAMA_MAX_TOKENS=512
LLAMA_TEMPERATURE=0.7

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Intent Classification
INTENT_MODEL_PATH=./models/intent_classifier.pkl
CONFIDENCE_THRESHOLD=0.7
```

## 📁 Project Structure

```
demos/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── env.example            # Environment variables template
├── data/
│   └── faqs.json         # FAQ database
├── src/
│   ├── config.py         # Configuration management
│   ├── intent_classifier/ # Intent classification module
│   ├── vector_search/    # FAISS vector search module
│   ├── llm/             # llama.cpp integration
│   ├── whatsapp/        # WhatsApp webhook handling
│   └── utils/           # Utility functions
├── models/              # Model files (FAISS index, LLM, etc.)
├── logs/               # Application logs
└── tests/              # Test files
```

## 🔄 Development Phases

### Phase 1: Environment & Base Setup ✅
- [x] Python virtual environment
- [x] Dependencies installation
- [x] Basic FastAPI structure
- [x] Configuration management

### Phase 2: Knowledge Base & Retrieval
- [ ] FAQ data structure
- [ ] FAISS index creation
- [ ] Sentence embeddings
- [ ] Vector search implementation

### Phase 3: Intent Classification
- [ ] Training data preparation
- [ ] ML model training
- [ ] Intent classification service
- [ ] Confidence scoring

### Phase 4: Local LLM Integration
- [ ] llama.cpp setup
- [ ] Model loading
- [ ] Response generation
- [ ] Context management

### Phase 5: WhatsApp Integration
- [ ] 360dialog webhook
- [ ] Message processing
- [ ] Response formatting
- [ ] Error handling

### Phase 6: End-to-End Testing
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Error handling
- [ ] MVP delivery

### Phase 7: QA, Monitoring & Documentation
- [ ] Quality assurance
- [ ] Monitoring setup
- [ ] Documentation
- [ ] Deployment guide

## 🧪 Testing

```bash
# Run tests
pytest

# Test the API
curl http://localhost:8000/health

# Test WhatsApp webhook (with ngrok)
ngrok http 8000
```

## 📊 API Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /webhook` - WhatsApp webhook (360dialog)
- `POST /chat` - Direct chat endpoint
- `GET /faqs` - List all FAQs

## 🔍 FAQ Database

The system comes with 8 preloaded FAQs about RS Bhayangkara Brimob:

1. **Operating Hours**: Hospital operating schedule
2. **BPJS Acceptance**: Insurance coverage information
3. **Online Registration**: How to register online
4. **Registration Location**: Where to register for outpatient care
5. **Emergency Services**: 24-hour emergency department
6. **Dental Clinic**: Dental services availability
7. **Pediatric Clinic**: Children's services
8. **Registration Fees**: Cost information

## 🚀 Deployment

### Local Development
```bash
python main.py
```

### Production (with Gunicorn)
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Docker (coming soon)
```bash
docker build -t hospital-chatbot .
docker run -p 8000:8000 hospital-chatbot
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## 🔄 Migration from Node.js

This project replaces the previous Node.js implementation with:
- **Rasa** → **Custom Intent Classification** (scikit-learn)
- **Pinecone** → **FAISS** (local vector search)
- **Gemini** → **llama.cpp** (local LLM)
- **Express** → **FastAPI** (modern Python web framework)

Benefits:
- ✅ No external API dependencies
- ✅ Lower latency (local processing)
- ✅ Reduced costs
- ✅ Better privacy (no data sent to external services)
- ✅ CPU-only operation 