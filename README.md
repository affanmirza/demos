# WhatsApp LLM Webhook Demo

This project is a minimal, production-ready Express server that connects WhatsApp (via 360dialog Sandbox) to an AI model (OpenAI GPT-3.5/4) for demo and prototyping purposes.

## Features
- Receives WhatsApp messages via 360dialog webhook
- Processes user messages with OpenAI LLM
- Sends AI-generated replies back to WhatsApp
- Ready for local development and extensibility

## Prerequisites
- Node.js (v16+ recommended)
- 360dialog Sandbox account and WhatsApp number registered
- OpenAI API key

## Setup

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a `.env` file in the project root:**
   ```env
   OPENAI_API_KEY=your_openai_key_here
   DIALOG360_API_KEY=your_360dialog_sandbox_key_here
   PORT=3000 # optional, defaults to 3000
   ```

4. **Run the server**
   ```bash
   npm run start # or: npx ts-node index.ts
   ```

5. **Expose your server to the internet (for webhook)**
   - Use [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/) to expose your local server:
   ```bash
   ngrok http 3000
   ```
   - Copy the HTTPS URL provided by ngrok.

6. **Register your webhook with 360dialog Sandbox**
   ```bash
   curl --request POST \
     --url https://waba-sandbox.360dialog.io/v1/configs/webhook \
     --header 'D360-API-KEY: YOUR_360DIALOG_SANDBOX_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"url": "https://<your-ngrok-url>/webhook"}'
   ```

7. **Test the bot**
   - Send a message to your WhatsApp sandbox number.
   - You should receive an AI-generated reply.

## File Structure

- `index.ts` — Main server entry point
- `src/config/env.ts` — Loads and validates environment variables
- `src/routes/webhook.ts` — Handles WhatsApp webhook and LLM logic

## Notes
- This is a demo/prototype. For production, add authentication, logging, and more robust error handling.
- You can extend the webhook logic for notifications, reminders, and more.

## License
MIT 