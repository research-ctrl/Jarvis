# Jarvis (React + Python)

A real-life inspired Jarvis assistant with a futuristic React UI and a Python backend.

## Architecture

- **Frontend (React + Vite)**
  - Liquid glass style UI
  - Draggable widgets with persisted positions
  - Live microphone-driven blob animation
  - Browser Web Speech API (webkit speech recognition compatible) for Hindi + English STT
  - Terminal transcript panel + status indicators
- **Backend (Flask)**
  - Groq Llama model chat endpoint
  - Wake-word gating (`Jarvis`) before model invocation
  - Chunked response streaming to reduce perceived latency
  - Automation tools: open websites/apps from voice commands
  - Optional HTTS integration for low-latency TTS

## Quick start

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add GROQ_API_KEY in .env
python app.py
```

Backend runs on `http://localhost:5000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Environment variables

`backend/.env`:

- `GROQ_API_KEY=...`
- `GROQ_MODEL=llama-3.1-8b-instant` (or any Groq chat model)
- `WAKE_WORD=jarvis`
- `ALLOWED_ORIGIN=http://localhost:3000`

## Notes

- If microphone appears busy, close other recording applications and refresh browser permissions.
- Web Speech API support is browser-dependent (Chrome-based browsers generally best).
- The included TTS endpoint attempts HTTS if installed; otherwise it gracefully falls back.
