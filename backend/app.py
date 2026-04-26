import os
import re
import subprocess
import webbrowser
from typing import Generator, List

import requests
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("ALLOWED_ORIGIN", "*")}})

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
WAKE_WORD = os.getenv("WAKE_WORD", "jarvis").lower()

SITE_MAP = {
    "youtube": "https://youtube.com",
    "instagram": "https://instagram.com",
    "facebook": "https://facebook.com",
}

APP_MAP = {
    # Add machine specific app launch commands
    "capcut": ["capcut"],
}


def contains_wake_word(text: str) -> bool:
    return WAKE_WORD in text.lower()


def split_chunks(text: str, max_len: int = 120) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: List[str] = []
    buffer = ""

    for sentence in sentences:
        if not sentence:
            continue
        candidate = f"{buffer} {sentence}".strip()
        if len(candidate) <= max_len:
            buffer = candidate
        else:
            if buffer:
                chunks.append(buffer)
            buffer = sentence
    if buffer:
        chunks.append(buffer)
    return chunks


def call_groq(messages: list) -> str:
    if not GROQ_API_KEY:
        return "Groq API key is missing. Please set GROQ_API_KEY in backend/.env."

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json=payload,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def attempt_automation(text: str) -> str | None:
    lower = text.lower()

    for site, url in SITE_MAP.items():
        if f"open {site}" in lower:
            webbrowser.open(url)
            return f"Opening {site}."

    for app_name, cmd in APP_MAP.items():
        if f"open {app_name}" in lower:
            try:
                subprocess.Popen(cmd)
                return f"Launching {app_name}."
            except FileNotFoundError:
                return f"I could not find {app_name} on this system."

    return None


def event_stream(user_text: str) -> Generator[str, None, None]:
    automation_message = attempt_automation(user_text)
    if automation_message:
        for chunk in split_chunks(automation_message):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
        return

    try:
        final_answer = call_groq(
            [
                {
                    "role": "system",
                    "content": (
                        "You are Jarvis, a concise voice assistant. "
                        "Respond helpfully and briefly unless asked for depth."
                    ),
                },
                {"role": "user", "content": user_text},
            ]
        )

        for chunk in split_chunks(final_answer):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as exc:
        yield f"data: Error: {str(exc)}\n\n"
        yield "data: [DONE]\n\n"


@app.get("/api/health")
def health():
    return jsonify(
        {
            "online": True,
            "wake_word": WAKE_WORD,
            "groq_configured": bool(GROQ_API_KEY),
        }
    )


@app.post("/api/ask")
def ask():
    body = request.get_json(silent=True) or {}
    user_text = (body.get("text") or "").strip()

    if not user_text:
        return jsonify({"error": "text is required"}), 400

    if not contains_wake_word(user_text):
        return jsonify(
            {
                "ignored": True,
                "message": f"Wake word '{WAKE_WORD}' not detected.",
            }
        )

    return Response(event_stream(user_text), mimetype="text/event-stream")


@app.post("/api/tts")
def tts():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    voice = body.get("voice", "Ryan")

    if not text:
        return jsonify({"error": "text is required"}), 400

    # Optional HTTS usage (if installed and supported in your environment)
    try:
        import htts  # type: ignore

        output_path = os.path.join("/tmp", "jarvis_tts.wav")
        htts.synthesize(text=text, voice=voice, output_path=output_path)
        return jsonify({"ok": True, "path": output_path, "voice": voice})
    except Exception:
        return jsonify(
            {
                "ok": False,
                "message": "HTTS not available in runtime; use browser speech synthesis fallback.",
            }
        )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
