from pathlib import Path

# Create README.md content for the backend
readme_content = """
# 🧠 MediBot Backend

This is the backend service powering **MediBot AI**, a healthcare assistant that summarizes patient data, generates AI videos, and adds voice narration for doctors.

## 🚀 Features

- Summarizes patient visit data using the **Meditron AI model** via Ollama
- Generates a summary video using **Tavus API**
- Adds realistic voiceover with **ElevenLabs**
- Exposes endpoints for the frontend to trigger summaries, video generation, and chat

## 🧩 Tech Stack

- Node.js + Express
- Ollama (running locally with `meditron` model)
- Tavus API (video generation)
- ElevenLabs API (voice synthesis)
- Dotenv for configuration

## 📦 Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/medibot-backend.git
cd medibot-backend

npm install 

#create your .env file
PORT=5000
OLLAMA_URL=http://127.0.0.1:11434
TAVUS_API_KEY=your_tavus_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key


Make sure your Ollama server is running locally with the meditron model:

Copy
ollama run meditron
4. Start the backend server
bash
Always show details

Copy
npm start
Server should run on http://localhost:5050.
