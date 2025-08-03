# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_python313.txt
```

### 2. Create Environment File
Create `.env` in the root directory:
```env
DIALOG360_API_KEY=your_360dialog_api_key_here
DIALOG360_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/webhook
PORT=8000
# (other variables as needed, see env.example)
```

### 3. (Optional) Supabase Setup
<!--
1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to SQL Editor
3. Run the SQL from `scripts/setup-supabase.sql`
4. Copy your URL and anon key from Settings > API
-->

### 4. Download Models
- Place your GGUF model in `models/` (see README for details)
- Make sure `data/faqs.json` and `models/faq_faiss.index` exist

### 5. Start the Server
```bash
python main.py
```

The server will automatically:
- Initialize the LLM and FAQ system
- Connect to WhatsApp via webhook
- Preload FAQs

### 6. Expose with ngrok
```bash
ngrok http 8000
```

### 7. Register Webhook
```bash
curl --request POST \
  --url https://waba-sandbox.360dialog.io/v1/configs/webhook \
  --header 'D360-API-KEY: YOUR_SANDBOX_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url": "https://your-ngrok-url.ngrok-free.app/webhook"}'
```

### 8. Test with WhatsApp
Send a message to your 360dialog WhatsApp number!

## 🎯 What Happens Next

1. **Send**: "Jam buka rumah sakit?"
2. **Bot responds** with FAQ answer from LLM
3. **Send**: "Apakah ada layanan UGD?"
4. **Bot responds** with another FAQ answer
5. **All conversations tracked in memory**

## 🔧 Troubleshooting

- **"Missing env var"**: Check your `.env` file
- **"Model not found"**: Check your `models/` directory
- **"Messages not sending"**: Check 360dialog API key
- **"Pinecone index not found"**: (Not used in this version)
- **"Multiple calls"**: ✅ Fixed with deduplication

## 📱 API Endpoints

- `GET /health` - Health check
- `POST /chat` - Direct chat (for testing)
- `POST /webhook` - WhatsApp webhook

## 🎉 You're Ready!

Your hospital FAQ chatbot is now running with:
- ✅ WhatsApp integration
- ✅ FAQ-based responses
- ✅ Multi-turn conversations
- ✅ In-memory chat history 