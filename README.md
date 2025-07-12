# Hospital FAQ Chatbot

A Node.js Express backend that integrates WhatsApp (360dialog), Pinecone vector search, and Supabase for a hospital FAQ chatbot.

## Features

✅ **WhatsApp Integration**: Receives messages via 360dialog webhook  
✅ **FAQ-Based Responses**: Uses Pinecone vector search for intelligent responses  
✅ **Multi-turn Conversations**: Supports multiple questions in a single session  
✅ **Preloaded FAQs**: 5 hospital-specific FAQs loaded at startup  
✅ **Chat History**: Stores all conversations in Supabase for tracking  
✅ **Message Deduplication**: Prevents duplicate processing of messages  
✅ **Error Handling**: Robust error handling with fallback responses  
✅ **Retry Logic**: Automatic retry for failed WhatsApp messages  

## Flow

1. **Patient sends message** → WhatsApp webhook receives it
2. **Vector search** → Search Pinecone for similar FAQ questions
3. **Response selection** → Return the best matching answer (score > 0.7)
4. **Fallback response** → If no good match, send generic response
5. **Chat storage** → Store conversation in Supabase for history tracking

## Preloaded FAQs

The system comes with 5 preloaded FAQs about RS Bhayangkara Brimob:

1. **Q:** Apa jam operasional RS Bhayangkara Brimob?  
   **A:** Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00.

2. **Q:** Apakah RS menerima pasien BPJS?  
   **A:** Ya, kami menerima pasien BPJS sesuai prosedur Mobile JKN.

3. **Q:** Bagaimana cara mendaftar poliklinik secara online?  
   **A:** Anda bisa mendaftar melalui aplikasi Mobile JKN atau aplikasi RS Bhayangkara Brimob.

4. **Q:** Di mana lokasi pendaftaran pasien rawat jalan?  
   **A:** Loket pendaftaran pasien rawat jalan berada di Gedung Instalasi Rawat Jalan lantai 1.

5. **Q:** Apakah RS menyediakan layanan UGD 24 jam?  
   **A:** Ya, kami menyediakan layanan UGD yang beroperasi 24 jam.

## Prerequisites

- Node.js 18+ 
- ngrok (for webhook testing)
- 360dialog Sandbox account
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
PINECONE_API_KEY=your_pinecone_api_key_here
DIALOG360_API_KEY=your_360dialog_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_API_KEY=your_supabase_anon_key_here

# Server
PORT=3000
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Create the `chat_history` table:

```sql
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Get your Supabase URL and anon key from Settings > API

### 4. Pinecone Setup

1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. Create an index with these settings:
   - **Name**: rs-bhayangkara-faq
   - **Metric**: cosine
   - **Dimensions**: 1024
   - **Model**: multilingual-e5-large
3. Get your API key from the dashboard

### 5. 360dialog Setup

1. Create a 360dialog Sandbox account
2. Get your API key from the dashboard
3. Note your phone number ID for webhook registration

### 6. Start the Server

```bash
npm start
```

The server will automatically:
- Initialize the database
- Connect to Pinecone
- Preload the 5 FAQs into Pinecone

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
2. Try asking about:
   - Hospital operating hours
   - BPJS acceptance
   - Online registration
   - Patient registration location
   - Emergency services

### API Endpoints

- `GET /` - Health check and endpoint info
- `POST /webhook` - WhatsApp webhook (handled by 360dialog)
- `GET /chat-history` - View all chat history
- `GET /chat-history/:wa_id` - View chat history for specific user

### Example Conversation

1. **Patient**: "Jam buka rumah sakit?"
2. **Bot**: "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00."
3. **Patient**: "Terima kasih, apakah ada layanan UGD?"
4. **Bot**: "Ya, kami menyediakan layanan UGD yang beroperasi 24 jam."

## Project Structure

```
src/
├── config/
│   └── env.ts              # Environment configuration
├── routes/
│   └── webhook.ts          # WhatsApp webhook handler
├── services/
│   ├── supabase.ts         # Supabase database operations
│   ├── whatsapp.ts         # WhatsApp message sending
│   └── pinecone.ts         # Pinecone FAQ storage and search
└── utils/
    └── helpers.ts          # Utility functions
```

## Troubleshooting

### WhatsApp Messages Not Sending
- Check your `DIALOG360_API_KEY`
- Verify phone number format (should include country code)
- Check ngrok tunnel is active
- Review error logs for specific issues

### Supabase Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_API_KEY`
- Ensure `chat_history` table exists
- Check network connectivity

### Pinecone Connection Issues
- Verify `PINECONE_API_KEY`
- Ensure your Pinecone index exists and is accessible
- Check index name is `rs-bhayangkara-faq`
- Verify index dimensions match (768)

### FAQ Search Not Working
- Check Pinecone index exists and is accessible
- Verify FAQs were preloaded successfully (check startup logs)
- Ensure embedding generation is working

### Common Issues

1. **"Missing environment variable"**: Add missing variables to `.env`
2. **"Table doesn't exist"**: Create the `chat_history` table in Supabase
3. **"Webhook not receiving messages"**: Check ngrok URL and webhook registration
4. **"Messages not sending"**: Verify 360dialog API key and phone number format
5. **"Pinecone index not found"**: Create the `rs-bhayangkara-faq` index in Pinecone

## Development

```bash
# Development mode with auto-restart
npm run dev

# View logs
npm start

# Test endpoints
curl http://localhost:3000/
curl http://localhost:3000/chat-history
curl http://localhost:3000/chat-history/628123456789
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `PINECONE_API_KEY` | Pinecone API key | ✅ |
| `DIALOG360_API_KEY` | 360dialog WhatsApp API key | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_API_KEY` | Supabase anon/public key | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |

## License

MIT License - feel free to use this for your own projects! 