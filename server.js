// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(bodyParser.json());

// Mock in-memory store
let latestSummary = "";

app.post('/api/summary', async (req, res) => {
  try {
    const { text } = req.body;

    const response = await axios({
      method: 'POST',
      url: 'http://localhost:11434/api/chat',
      data: {
        model: 'meditron',
        messages: [{ role: "user", content: text }],
        stream: true
      },
      responseType: 'stream'
    });

    let fullResponse = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const content = parsed?.message?.content;
          if (content) fullResponse += content;
        } catch (err) {
          console.error('Failed to parse line:', line);
        }
      }
    });

    response.data.on('end', () => {
      latestSummary = fullResponse;
      res.json({ text: fullResponse });
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).json({ error: 'Error while streaming AI response.' });
    });

  } catch (error) {
    console.error('Error in /api/summary:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});



// GET /api/video - Generate Tavus video from summary
// app.post('/api/video', async (req, res) => {
//   const { summary } = req.body;

//   if (!summary) {
//     return res.status(400).json({ error: 'Summary is required' });
//   }

//   try {
//     const tavusRes = await axios.post('https://tavusapi.com/v2/videos', {
//       script: summary,
//       replica_id: process.env.TAVUS_REPLICA_ID,
//       video_name: 'AI Medical Video',
//     }, {
//       headers: {
//         'x-api-key': process.env.TAVUS_API_KEY,
//         'Content-Type': 'application/json',
//       }
//     });

//     res.json({ videoURL: tavusRes.data.hosted_url });
//   } catch (error) {
//     console.error('Error in /api/video:', error?.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to generate video.' });
//   }
// });

app.post('/api/video', async (req, res) => {
  const { summary } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'Summary is required' });
  }

  try {
    const tavusRes = await axios.post('https://tavusapi.com/v2/videos', {
      script: summary,
      replica_id: process.env.TAVUS_REPLICA_ID,
      video_name: 'AI Medical Video',
    }, {
      headers: {
        'x-api-key': process.env.TAVUS_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    console.log('🔍 Full Tavus Response:', tavusRes.data);

    const videoId = tavusRes.data.video_id;

    if (!videoId) {
      throw new Error('Failed to retrieve video ID from Tavus response');
    }

    console.log(`🕒 Video requested. ID: ${videoId}`);

    res.status(200).json({ videoId });

  } catch (error) {
    console.error('❌ Error in /api/video:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate video.' });
  }
});

// GET /api/video-status/:videoId
app.get('/api/video-status/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const statusRes = await axios.get(`https://tavusapi.com/v2/videos/${videoId}`, {
      headers: {
        'x-api-key': process.env.TAVUS_API_KEY,
      }
    });

    res.status(200).json(statusRes.data);
  } catch (error) {
    console.error('❌ Error polling Tavus video status:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch video status' });
  }
});





app.post('/api/chat-voice', async (req, res) => {
  try {
    const { message, context } = req.body;

    const chatRes = await axios.post('http://localhost:11434/api/chat', {
      model: 'meditron',
      stream: false,
      messages: [
        { role: 'system', content: context || "You are a helpful medical assistant." },
        { role: 'user', content: message }
      ]
    });

    const reply = chatRes.data.message?.content || chatRes.data.reply || chatRes.data.text;
    if (!reply) throw new Error("Empty response from Meditron");

    console.log("AI Reply:", reply);

    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
      return res.status(500).json({ error: 'ElevenLabs API key or voice ID not configured' });
    }

    const voiceRes = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
      timeout: 30000,
      data: {
        text: reply,
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75
        }
      },
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

    const audioBase64 = Buffer.from(voiceRes.data).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    res.json({ text: reply, audioUrl });

} catch (error) {
  let errData;

  // If it's a buffer from ElevenLabs, try to decode it
  if (error.response?.data instanceof Buffer) {
    try {
      const json = JSON.parse(error.response.data.toString('utf8'));
      errData = json;
    } catch (parseErr) {
      errData = error.response.data.toString('utf8');
    }
  } else {
    errData = error.response?.data || error.message;
  }

  console.error('Chat-Voice Error:', errData);
  res.status(500).json({ error: 'Failed to generate voice reply.', details: errData });
}
});

app.get('/', (req, res) => {
  res.send('<h1>Server is running on port ' + PORT + '</h1>');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // console.log(`💡 Make sure Ollama/Meditron is running on http://localhost:11434`)
  // console.log(`🎥 Tavus API key: ${process.env.TAVUS_API_KEY}`)
  // console.log(`🔊 ElevenLabs API key: ${process.env.ELEVENLABS_API_KEY}`)
  // console.log(`🗂️ Latest summary will be stored in memory (reset on server restart)`)
  // console.log(`📂 Use /api/video to generate Tavus video from latest summary`
  // );
});
