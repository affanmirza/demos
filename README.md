# Hospital Chatbot Demo

A Node.js Express backend that integrates WhatsApp (360dialog), Google Gemini AI, and Supabase for a hospital chatbot demo.

## Features

✅ **WhatsApp Integration**: Receives messages via 360dialog webhook  
✅ **AI-Powered Responses**: Uses Google Gemini for intelligent responses  
✅ **Doctor Inquiry Flow**: Detects doctor-related questions and provides responses  
✅ **Registration Simulation**: Automatically schedules appointments after 15 seconds  
✅ **Review Collection**: Collects and stores patient feedback in Supabase  
✅ **FAQ System**: Stores Q&A pairs in Pinecone for faster responses  
✅ **Message Deduplication**: Prevents duplicate processing of messages  
✅ **Error Handling**: Robust error handling with fallback responses  
✅ **Retry Logic**: Automatic retry for failed WhatsApp messages  

## Flow

1. **Patient sends message** → WhatsApp webhook receives it
2. **Message classification** → Determines if it's a doctor inquiry, review, or general message
3. **FAQ search** → Check Pinecone for similar questions first
4. **AI response** → Use cached answer or call Gemini for new responses
5. **Store new Q&A** → Save new questions and answers to Pinecone for future use
6. **Registration simulation** → For doctor inquiries, schedules appointment after 15 seconds
7. **Feedback collection** → Asks for review and stores in Supabase

## Prerequisites

- Node.js 18+ 
- ngrok (for webhook testing)
- 360dialog Sandbox account
- Google AI Studio API key
- Supabase account
- Pinecone account

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
DIALOG360_API_KEY=your_360dialog_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_API_KEY=your_supabase_anon_key_here
PINECONE_API_KEY=your_pinecone_api_key_here

# Server
PORT=3000
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Create the `reviews` table:

```sql
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT NOT NULL,
  review TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Get your Supabase URL and anon key from Settings > API

### 4. Pinecone Setup

1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. Create an index with these settings:
   - **Metric**: cosine
   - **Dimensions**: 768
   - **Model**: llama-text-embed-v2
3. Get your API key from the dashboard

### 5. 360dialog Setup

1. Create a 360dialog Sandbox account
2. Get your API key from the dashboard
3. Note your phone number ID for webhook registration

### 6. Start the Server

```bash
npm start
```

### 7. Expose with ngrok

```bash
ngrok http 3000
```

### 8. Register Webhook

Register your webhook URL with 360dialog:

```bash
curl --request POST \
  --url https://waba-sandbox.360dialog.io/v1/configs/webhook \
  --header 'D360-API-KEY: YOUR_SANDBOX_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url": "https://your-ngrok-url.ngrok.io/webhook"}'
```

## Usage

### Test the Chatbot

1. Send a message to your 360dialog WhatsApp number
2. Try different types of messages:
   - **Doctor inquiry**: "Saya mau tanya jadwal dokter"
   - **General question**: "Halo, apa kabar?"
   - **Review**: "Pelayanan sangat baik"

### API Endpoints

- `GET /` - Health check and endpoint info
- `POST /webhook` - WhatsApp webhook (handled by 360dialog)
- `GET /reviews` - View all stored reviews
- `POST /seed` - Seed sample reviews
- `POST /seed-faqs` - Seed sample FAQs in Pinecone

### Example Flow

1. **Patient**: "Saya mau tanya jadwal dokter"
2. **Bot**: *Gemini response about doctor schedules*
3. **Bot** (after 15s): "Registrasi berhasil untuk kontrol dengan Dr. Sulaiman jam 09.00."
4. **Bot** (after 5s): "Silakan isi review pelayanan kami."
5. **Patient**: "Pelayanan sangat baik, dokter ramah"
6. **Bot**: "Terima kasih atas review Anda! Feedback ini sangat berharga..."

## Project Structure

```
src/
├── config/
│   └── env.ts              # Environment configuration
├── routes/
│   └── webhook.ts          # WhatsApp webhook handler
├── services/
│   ├── gemini.ts           # Gemini AI integration
│   ├── supabase.ts         # Supabase database operations
│   ├── whatsapp.ts         # WhatsApp message sending
│   └── pinecone.ts         # Pinecone FAQ storage and search
└── utils/
    └── helpers.ts          # Utility functions
```

## Troubleshooting

### Multiple Gemini Calls
- ✅ Fixed with message deduplication
- Messages are tracked by ID to prevent duplicates

### WhatsApp Messages Not Sending
- Check your `DIALOG360_API_KEY`
- Verify phone number format (should include country code)
- Check ngrok tunnel is active
- Review error logs for specific issues

### Supabase Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_API_KEY`
- Ensure `reviews` table exists
- Check network connectivity

### Pinecone Connection Issues
- Verify `PINECONE_API_KEY`
- Ensure your Pinecone index exists and is accessible
- Check index dimensions match (768)

### Common Issues

1. **"Missing environment variable"**: Add missing variables to `.env`
2. **"Table doesn't exist"**: Create the `reviews` table in Supabase
3. **"Webhook not receiving messages"**: Check ngrok URL and webhook registration
4. **"Messages not sending"**: Verify 360dialog API key and phone number format

## Development

```bash
# Development mode with auto-restart
npm run dev

# View logs
npm start

# Test endpoints
curl http://localhost:3000/
curl http://localhost:3000/reviews
curl -X POST http://localhost:3000/seed
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google AI Studio API key | ✅ |
| `DIALOG360_API_KEY` | 360dialog WhatsApp API key | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_API_KEY` | Supabase anon/public key | ✅ |
| `PINECONE_API_KEY` | Pinecone API key | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |

## License

MIT License - feel free to use this for your own projects! 