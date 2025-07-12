# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Create `.env` in the root directory:
```env
PINECONE_API_KEY=your_pinecone_api_key_here
DIALOG360_API_KEY=your_360dialog_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_API_KEY=your_supabase_anon_key_here
PORT=3000
```

### 3. Setup Supabase
1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to SQL Editor
3. Run the SQL from `scripts/setup-supabase.sql`
4. Copy your URL and anon key from Settings > API

### 4. Setup Pinecone
1. Go to [pinecone.io](https://pinecone.io) and create an account
2. Create an index with these settings:
   - **Name**: rs-bhayangkara-faq
   - **Metric**: cosine
   - **Dimensions**: 1024
   - **Model**: multilingual-e5-large
3. Copy your API key from the dashboard

### 5. Test Your Setup
```bash
npm test
```

### 6. Start the Server
```bash
npm start
```

The server will automatically:
- Initialize the database
- Connect to Pinecone
- Preload 5 FAQs about RS Bhayangkara Brimob

### 7. Expose with ngrok
```bash
ngrok http 3000
```

### 8. Register Webhook
```bash
curl --request POST \
  --url https://waba-sandbox.360dialog.io/v1/configs/webhook \
  --header 'D360-API-KEY: YOUR_SANDBOX_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url": "https://your-ngrok-url.ngrok.io/webhook"}'
```

### 9. Test with WhatsApp
Send a message to your 360dialog WhatsApp number!

## 🎯 What Happens Next

1. **Send**: "Jam buka rumah sakit?"
2. **Bot responds** with FAQ answer from Pinecone
3. **Send**: "Apakah ada layanan UGD?"
4. **Bot responds** with another FAQ answer
5. **All conversations stored** in Supabase for tracking

## 🔧 Troubleshooting

- **"Missing env var"**: Check your `.env` file
- **"Table doesn't exist"**: Run the Supabase SQL script
- **"Messages not sending"**: Check 360dialog API key
- **"Pinecone index not found"**: Create the `rs-bhayangkara-faq` index
- **"Multiple calls"**: ✅ Fixed with deduplication

## 📱 API Endpoints

- `GET /` - Health check
- `GET /chat-history` - View all chat history
- `GET /chat-history/:wa_id` - View user chat history

## 🎉 You're Ready!

Your hospital FAQ chatbot is now running with:
- ✅ WhatsApp integration
- ✅ FAQ-based responses
- ✅ Multi-turn conversations
- ✅ Chat history tracking
- ✅ Database storage 