# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Create `.env` in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
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

### 4. Test Your Setup
```bash
npm test
```

### 5. Start the Server
```bash
npm start
```

### 6. Expose with ngrok
```bash
ngrok http 3000
```

### 7. Register Webhook
```bash
curl --request POST \
  --url https://waba-sandbox.360dialog.io/v1/configs/webhook \
  --header 'D360-API-KEY: YOUR_SANDBOX_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url": "https://your-ngrok-url.ngrok.io/webhook"}'
```

### 8. Test with WhatsApp
Send a message to your 360dialog WhatsApp number!

## 🎯 What Happens Next

1. **Send**: "Saya mau tanya jadwal dokter"
2. **Bot responds** with Gemini AI
3. **After 15 seconds**: Registration confirmation
4. **After 5 seconds**: Review request
5. **You reply** with feedback
6. **Review stored** in Supabase

## 🔧 Troubleshooting

- **"Missing env var"**: Check your `.env` file
- **"Table doesn't exist"**: Run the Supabase SQL script
- **"Messages not sending"**: Check 360dialog API key
- **"Multiple calls"**: ✅ Fixed with deduplication

## 📱 API Endpoints

- `GET /` - Health check
- `GET /reviews` - View all reviews
- `POST /seed` - Add sample data

## 🎉 You're Ready!

Your hospital chatbot is now running with:
- ✅ WhatsApp integration
- ✅ AI-powered responses
- ✅ Registration simulation
- ✅ Review collection
- ✅ Database storage 