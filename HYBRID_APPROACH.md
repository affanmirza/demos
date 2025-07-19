# Gemini + Pinecone Hybrid Search Approach

This document explains the new hybrid search approach that combines Gemini AI, Pinecone vector search, and keyword fallback for intelligent FAQ matching.

## Architecture Overview

```
User Query → Preprocessing → Pinecone Vector Search → Gemini Selection → Response
                ↓                    ↓                    ↓
            Expand abbrev.      Find top 5 FAQs      Select best match
            Remove punct.       (threshold 0.65)     (confidence > 0.5)
            Lowercase           OpenAI embeddings    Multi-turn context
                ↓                    ↓                    ↓
            Keyword Fallback ← No results found ← Low confidence
```

## Components

### 1. Query Preprocessing (`src/services/gemini.ts`)

- **Lowercase conversion**: Standardizes text
- **Abbreviation expansion**: "rs" → "rumah sakit", "poli" → "poliklinik"
- **Punctuation removal**: Removes special characters but preserves spaces
- **Whitespace normalization**: Removes extra spaces

### 2. Pinecone Vector Search (`src/services/pinecone.ts`)

- **Embedding generation**: Uses OpenAI's `text-embedding-3-small` (1536 dimensions)
- **Similarity threshold**: 0.65 (configurable)
- **Top-K retrieval**: Returns top 5 most similar FAQs
- **Namespace**: `hospital-faqs` for organization

### 3. Gemini AI Selection (`src/services/gemini.ts`)

- **Model**: `gemini-1.5-flash` for fast inference
- **Context-aware**: Considers previous conversation
- **Structured output**: Returns JSON with selected FAQ ID and confidence
- **Reasoning**: Provides explanation for selection

### 4. Multi-turn Context

- **Per-user storage**: Maps phone numbers to conversation context
- **Timeout**: 5 minutes for context expiration
- **Context injection**: Includes previous query and selected FAQ in prompt

### 5. Keyword Fallback (`src/services/pinecone.ts`)

- **Enhanced matching**: Exact phrase + word-level matching
- **Flexible scoring**: Accepts single strong keyword matches
- **Predefined keywords**: Each FAQ has relevant keywords

## Configuration

### Pinecone Settings (`src/services/pinecone.ts`)

```typescript
const PINECONE_CONFIG = {
  indexName: 'rs-bhayangkara-faq',
  namespace: 'hospital-faqs',
  similarityThreshold: 0.65,  // Adjust for stricter/looser matching
  topK: 5                     // Number of candidates for Gemini
};
```

### Gemini Prompt Template

The system uses a structured prompt that includes:

1. **Task description**: Clear instructions for FAQ selection
2. **User query**: The current question
3. **Conversation context**: Previous query and selected FAQ (if any)
4. **FAQ candidates**: List of potential matches with scores
5. **Instructions**: Guidelines for selection
6. **Output format**: JSON structure for parsing

### Environment Variables

```env
# Required
PINECONE_API_KEY=your_pinecone_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
DIALOG360_API_KEY=your_360dialog_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_API_KEY=your_supabase_key

# Optional
PORT=3000
```

## FAQ Management

### Adding New FAQs

1. **Edit `data/faqs.json`**:
```json
{
  "id": "faq_new_service",
  "question": "Apakah ada layanan baru?",
  "answer": "Ya, kami menyediakan layanan baru dengan jadwal tertentu.",
  "keywords": ["layanan", "baru", "ada", "tersedia"]
}
```

2. **Preload to Pinecone**:
```bash
npm run preload-faqs
```

### Updating Existing FAQs

1. **Modify the FAQ in `data/faqs.json`**
2. **Run preload script** to update Pinecone
3. **The system will automatically use the new version**

### FAQ Structure

Each FAQ includes:
- **ID**: Unique identifier (e.g., `faq_operating_hours`)
- **Question**: The FAQ question
- **Answer**: The exact response (no hallucination)
- **Keywords**: Relevant terms for fallback matching

## Search Flow Details

### Step 1: Query Preprocessing

```typescript
// Input: "ada ugd?"
// Output: "ada ugd"
const preprocessedQuery = preprocessQuery(userQuery);
```

### Step 2: Vector Search

```typescript
// Generate embedding
const queryEmbedding = await generateEmbedding(preprocessedQuery);

// Search Pinecone
const queryResponse = await index.query({
  vector: queryEmbedding,
  topK: 5,
  includeMetadata: true
});

// Filter by threshold
const pineconeResults = queryResponse.matches
  .filter(match => match.score >= 0.65)
  .map(match => ({
    question: match.metadata?.question,
    answer: match.metadata?.answer,
    score: match.score,
    faqId: match.id
  }));
```

### Step 3: Gemini Selection

```typescript
// Prepare candidates
const faqCandidates = pineconeResults.map(result => ({
  id: result.faqId,
  question: result.question,
  answer: result.answer,
  score: result.score
}));

// Get conversation context
const context = getConversationContext(phoneNumber);

// Send to Gemini
const geminiResponse = await selectBestFAQ(userQuery, faqCandidates, phoneNumber);

// Check confidence
if (geminiResponse.selectedFAQId && geminiResponse.confidence > 0.5) {
  // Use Gemini selection
  return selectedFAQ;
}
```

### Step 4: Keyword Fallback

```typescript
// If no Gemini selection, try keyword matching
const keywordResult = keywordSearch(userQuery);
if (keywordResult) {
  return keywordResult;
}
```

## Multi-turn Conversation Support

### Context Storage

```typescript
const conversationContext = new Map<string, {
  lastQuery: string;
  lastFAQId: string | null;
  timestamp: number;
}>();
```

### Context Usage

When a user asks a follow-up question like "Kalau poli gigi?" after asking about operating hours, the system:

1. **Retrieves context**: Previous query and selected FAQ
2. **Injects context**: Includes in Gemini prompt
3. **Enables disambiguation**: Helps Gemini understand the reference

### Example Multi-turn Flow

1. **User**: "Jam buka rumah sakit?"
2. **System**: Selects operating hours FAQ
3. **Context stored**: `{ lastQuery: "Jam buka rumah sakit?", lastFAQId: "faq_operating_hours" }`
4. **User**: "Kalau poli gigi?"
5. **System**: Uses context to understand this is about dental clinic hours
6. **Response**: Dental clinic operating hours

## Performance Optimization

### Caching

- **Embedding cache**: Consider caching embeddings for common queries
- **FAQ cache**: Cache frequently accessed FAQs in memory
- **Context cache**: Already implemented with timeout

### Batch Operations

- **Bulk FAQ loading**: Preload all FAQs at startup
- **Batch embeddings**: Generate embeddings for all FAQs once

### Error Handling

- **Graceful degradation**: Falls back to keyword search on API failures
- **Retry logic**: Automatic retries for transient failures
- **Timeout handling**: Configurable timeouts for API calls

## Monitoring and Logging

### Key Metrics

- **Search success rate**: Percentage of queries that find matches
- **Gemini confidence**: Average confidence scores
- **Fallback usage**: How often keyword fallback is used
- **Response time**: End-to-end query processing time

### Logging

The system logs:
- Query preprocessing results
- Pinecone search results and scores
- Gemini selection reasoning
- Fallback usage
- Error conditions

### Example Logs

```
🔍 Searching for: "ada ugd?" -> preprocessed: "ada ugd"
🔍 Found 2 similar FAQs above threshold 0.65
🤖 Using Gemini to select best FAQ from Pinecone results...
✅ Gemini selected FAQ: "Apakah RS menyediakan layanan UGD 24 jam?" (confidence: 0.892)
🤖 Reasoning: User is asking about UGD availability, which matches the emergency services FAQ
```

## Troubleshooting

### Common Issues

1. **"No Pinecone results"**: Check similarity threshold, try lowering it
2. **"Gemini low confidence"**: Review FAQ keywords, improve question variety
3. **"Embedding errors"**: Verify OpenAI API key and quota
4. **"Context not working"**: Check phone number format and context timeout

### Debug Mode

Enable detailed logging by setting environment variables:
```env
DEBUG=true
LOG_LEVEL=debug
```

### Testing

Use the test script to verify functionality:
```bash
npm run test-hybrid
```

## Future Enhancements

### Potential Improvements

1. **Semantic caching**: Cache similar queries and their results
2. **Dynamic thresholds**: Adjust similarity threshold based on query type
3. **FAQ clustering**: Group similar FAQs for better organization
4. **User feedback**: Incorporate user feedback to improve matching
5. **A/B testing**: Test different prompt templates and thresholds

### Scalability Considerations

1. **FAQ volume**: System can handle thousands of FAQs
2. **Concurrent users**: Context storage scales with user count
3. **API limits**: Monitor OpenAI and Gemini rate limits
4. **Cost optimization**: Consider embedding caching and batch operations

## Security Considerations

1. **API key protection**: Store keys securely in environment variables
2. **Input sanitization**: Preprocessing removes potentially harmful content
3. **Rate limiting**: Implement rate limiting for API calls
4. **Data privacy**: No user data is stored in external AI services
5. **Audit logging**: Log all queries for security monitoring 