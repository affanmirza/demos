import os
import uuid
import requests
from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import Dict, Any
from actions.optimized_conversational_action import OptimizedConversationalAction
import logging

app = FastAPI()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("webhook-debug")

# In-memory context per user (mimics Rasa shell)
user_contexts: Dict[str, Dict[str, Any]] = {}

# Instantiate the conversational engine
engine = OptimizedConversationalAction()

RASA_NLU_URL = os.getenv("RASA_NLU_URL", "http://localhost:5005/model/parse")

def get_intent_from_rasa(user_message: str) -> str:
    try:
        resp = requests.post(RASA_NLU_URL, json={"text": user_message}, timeout=2)
        if resp.status_code == 200:
            data = resp.json()
            intent = data.get("intent", {}).get("name", "faq_general")
            logger.info(f"[Intent] Rasa NLU returned intent: {intent} for message: {user_message}")
            return intent
        else:
            logger.warning(f"[Intent] Rasa NLU returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"[Intent] Rasa NLU call failed: {e}")
    return "faq_general"

def send_whatsapp_message(to: str, body: str) -> bool:
    api_key = os.getenv("DIALOG360_API_KEY", "1Qy85e_sandbox")
    url = "https://waba-sandbox.360dialog.io/v1/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body}
    }
    headers = {
        "D360-API-KEY": api_key,
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        logger.info(f"[360Dialog] Sent to {to}: {body}")
        logger.info(f"[360Dialog] Status: {resp.status_code}, Response: {resp.text}")
        if resp.status_code in (200, 202):
            return True
        else:
            return False
    except Exception as e:
        logger.error(f"[360Dialog] Exception: {e}")
        return False

class ChatRequest(BaseModel):
    user_id: str
    message: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
def chat(req: ChatRequest):
    user_id = req.user_id or str(uuid.uuid4())
    user_message = req.message
    # Build a fake tracker/events for context
    context = user_contexts.setdefault(user_id, {"events": []})
    # Get intent from Rasa NLU
    intent = get_intent_from_rasa(user_message)
    # Build a fake tracker
    tracker = type("Tracker", (), {})()
    tracker.latest_message = {"text": user_message, "intent": {"name": intent}}
    tracker.events = context["events"] + [{"event": "user", "text": user_message, "parse_data": {"intent": {"name": intent}}}]
    # Run the engine
    class DummyDispatcher:
        def __init__(self):
            self.messages = []
        def utter_message(self, text=None, **kwargs):
            self.messages.append(text)
    dispatcher = DummyDispatcher()
    engine.run(dispatcher, tracker, domain={})
    # Update context
    context["events"] = tracker.events + [{"event": "bot", "text": dispatcher.messages[-1]}]
    user_contexts[user_id] = context
    return {"response": dispatcher.messages[-1], "user_id": user_id}

@app.post("/webhook")
async def webhook(request: Request):
    try:
        data = await request.json()
        headers = dict(request.headers)
        logger.info(f"[Webhook] Incoming data: {data}")
        logger.info(f"[Webhook] Incoming headers: {headers}")
        user_id = None
        user_message = None
        # WhatsApp/360Dialog nested payload
        if (
            isinstance(data, dict)
            and "entry" in data
            and data["entry"]
            and "changes" in data["entry"][0]
            and data["entry"][0]["changes"]
        ):
            value = data["entry"][0]["changes"][0].get("value", {})
            # Extract user_id
            if value.get("contacts") and value["contacts"][0].get("wa_id"):
                user_id = value["contacts"][0]["wa_id"]
            # Extract user_message
            if (
                value.get("messages")
                and value["messages"][0].get("text")
                and value["messages"][0]["text"].get("body")
            ):
                user_message = value["messages"][0]["text"]["body"]
            logger.info(f"[Webhook] (WhatsApp) user_id: {user_id}, user_message: {user_message}")
        # Fallback: flat payload (for testing)
        if not user_message:
            user_id = data.get("wa_id") or data.get("user_id") or str(uuid.uuid4())
            user_message = data.get("text") or data.get("message")
            logger.info(f"[Webhook] (Fallback) user_id: {user_id}, user_message: {user_message}")
        if not user_message:
            logger.warning("[Webhook] No user_message found in payload.")
            return {"status": "ignored"}
        # Build a fake tracker/events for context
        context = user_contexts.setdefault(user_id, {"events": []})
        # Get intent from Rasa NLU
        intent = get_intent_from_rasa(user_message)
        logger.info(f"[Webhook] Detected intent: {intent}")
        # Build a fake tracker
        tracker = type("Tracker", (), {})()
        tracker.latest_message = {"text": user_message, "intent": {"name": intent}}
        tracker.events = context["events"] + [{"event": "user", "text": user_message, "parse_data": {"intent": {"name": intent}}}]
        # Run the engine
        class DummyDispatcher:
            def __init__(self):
                self.messages = []
            def utter_message(self, text=None, **kwargs):
                self.messages.append(text)
        dispatcher = DummyDispatcher()
        engine.run(dispatcher, tracker, domain={})
        # Update context
        context["events"] = tracker.events + [{"event": "bot", "text": dispatcher.messages[-1]}]
        user_contexts[user_id] = context
        # Send WhatsApp reply via 360Dialog API
        send_whatsapp_message(user_id, dispatcher.messages[-1])
        logger.info(f"[Webhook] Sent WhatsApp reply to {user_id}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"[Webhook] Exception: {e}")
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 