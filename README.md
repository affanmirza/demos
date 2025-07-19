# Hospital FAQ Chatbot with Gemini + Pinecone Hybrid Search

A Node.js Express backend that integrates WhatsApp (360dialog), Pinecone vector search, Supabase, and Gemini AI for intelligent FAQ matching in a hospital chatbot.

## Features

✅ **WhatsApp Integration**: Receives messages via 360dialog webhook  
✅ **Gemini AI Integration**: Uses Gemini for query understanding and FAQ selection  
✅ **Pinecone Vector Search**: Uses hash-based embeddings compatible with multilingual-e5-large  
✅ **Multi-turn Conversations**: Supports context-aware follow-up questions  
✅ **Preloaded FAQs**: 8 hospital-specific FAQs loaded at startup  
✅ **Chat History**: Stores all conversations in Supabase for tracking  
✅ **Message Deduplication**: Prevents duplicate processing of messages  
✅ **Error Handling**: Robust error handling with fallback responses  
✅ **Retry Logic**: Automatic retry for failed WhatsApp messages  
✅ **Hybrid Search**: Pinecone → Gemini → Keyword fallback  
✅ **No Hallucination**: Returns only preloaded answers, never generates new content  

## Flow

1. **Patient sends message** → WhatsApp webhook receives it
2. **Query Preprocessing** → Lowercase, expand abbreviations, remove punctuation
3. **Pinecone Vector Search** → Find similar FAQs using hash-based embeddings (threshold: 0.65)
4. **Gemini Selection** → Use Gemini to select the most relevant FAQ from candidates
5. **Multi-turn Context** → Consider previous conversation context for follow-up questions
6. **Keyword Fallback** → If vector search fails, use keyword matching
7. **Response Selection** → Return the exact preloaded answer (no hallucination)
8. **Chat Storage** → Store conversation in Supabase for history tracking

## Preloaded FAQs

The system comes with 8 preloaded FAQs about RS Bhayangkara Brimob:

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

6. **Q:** Apakah ada poliklinik gigi?  
   **A:** Ya, kami menyediakan layanan poliklinik gigi dengan jadwal Senin-Jumat pukul 08.00-12.00.

7. **Q:** Apakah ada poliklinik anak?  
   **A:** Ya, kami menyediakan layanan poliklinik anak dengan jadwal Senin-Jumat pukul 08.00-12.00.

8. **Q:** Berapa biaya pendaftaran poliklinik?  
   **A:** Biaya pendaftaran poliklinik bervariasi tergantung jenis poliklinik. Untuk informasi detail, silakan hubungi bagian administrasi.

## Prerequisites

- Node.js 18+ 
- ngrok (for webhook testing)
- 360dialog Sandbox account
- Supabase account
- Pinecone account
- Google AI Studio account (for Gemini API)

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
GEMINI_API_KEY=your_gemini_api_key_here

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
2. Use the existing index with these settings:
   - **Name**: rs-bhayangkara-faq
   - **Metric**: cosine
   - **Dimensions**: 1024 (multilingual-e5-large)
   - **Cloud**: aws
   - **Region**: us-east-1
3. Get your API key from the dashboard

### 5. API Keys Setup

1. **Google AI Studio**: Get Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 6. Preload FAQs (Optional)

You can customize the FAQs by editing `data/faqs.json` and running:

```bash
npm run preload-faqs
```

### 7. Start the Server

```bash
npm start
```

The server will automatically:
- Initialize the database
- Test Gemini connection
- Connect to Pinecone
- Preload the FAQs into Pinecone

### 8. Expose with ngrok

```bash
ngrok http 3000
```

### 9. Register Webhook

Register your webhook URL with 360dialog:

```bash
curl --request POST \
  --url https://waba-sandbox.360dialog.io/v1/configs/webhook \
  --header 'D360-API-KEY: YOUR_SANDBOX_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url": "https://your-ngrok-url.ngrok.io/webhook"}'
```

### 10. Test with WhatsApp

Send a message to your 360dialog WhatsApp number!

## Usage

### Test the Chatbot

1. Send a message to your 360dialog WhatsApp number
2. Try asking about:
   - Hospital operating hours
   - BPJS acceptance
   - Online registration
   - Patient registration location
   - Emergency services
   - Dental clinic
   - Pediatric clinic
   - Registration fees

### Multi-turn Conversations

The system supports context-aware conversations:

1. **User**: "Jam buka rumah sakit?"
2. **Bot**: "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00."
3. **User**: "Kalau poli gigi?" (follow-up question)
4. **Bot**: "Ya, kami menyediakan layanan poliklinik gigi dengan jadwal Senin-Jumat pukul 08.00-12.00."

### API Endpoints

- `GET /` - Health check and endpoint info
- `POST /webhook` - WhatsApp webhook (handled by 360dialog)
- `GET /chat-history` - View all chat history
- `GET /chat-history/:wa_id` - View chat history for specific user

### Configuration

You can adjust the system behavior by modifying these settings in `src/services/pinecone.ts`:

```typescript
const PINECONE_CONFIG = {
  indexName: 'rs-bhayangkara-faq',
  namespace: 'hospital-faqs',
  similarityThreshold: 0.65,  // Adjust this for stricter/looser matching
  topK: 5                     // Number of candidates to send to Gemini
};
```

### Example Conversation

1. **Patient**: "Jam buka rumah sakit?"
2. **Bot**: "Rumah Sakit buka Senin–Jumat pukul 08.00–14.00 dan Sabtu pukul 08.00–12.00."
3. **Patient**: "Ada UGD?"
4. **Bot**: "Ya, kami menyediakan layanan UGD yang beroperasi 24 jam."
5. **Patient**: "Terima BPJS?"
6. **Bot**: "Ya, kami menerima pasien BPJS sesuai prosedur Mobile JKN." 