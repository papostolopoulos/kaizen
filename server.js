const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const DEFAULT_PORT = 3000;
const FALLBACK_PORT = 3001;
let port = Number(process.env.PORT || DEFAULT_PORT);

app.use(express.json({ limit: '1mb' }));

app.post('/api/analyze', async (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });

  try {
    const { model, max_tokens, temperature, systemPrompt, userPrompt } = req.body;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!openAiKey) {
      return res.status(400).json({ error: 'Missing OpenAI API key. Set OPENAI_API_KEY in the local .env file.' });
    }

    const payload = {
      model: model || 'gpt-4o',
      max_tokens: max_tokens || 1800,
      temperature: temperature ?? 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : { error: await response.text() };

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || data });
    }

    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Server error while proxying to OpenAI.' });
  }
});

app.options('/api/analyze', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.sendStatus(204);
});

app.all('/api/analyze', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.status(405).json({ error: 'Method not allowed. Use POST to /api/analyze.' });
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function startServer(listenPort, isFallback = false) {
  const serverInstance = app.listen(listenPort, () => {
    console.log(`Server running at http://localhost:${listenPort}`);
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (!isFallback && listenPort === DEFAULT_PORT) {
        console.warn(`Port ${DEFAULT_PORT} is in use, attempting fallback port ${FALLBACK_PORT}...`);
        startServer(FALLBACK_PORT, true);
      } else {
        console.error(`Port ${listenPort} is in use. Please free the port or set PORT to a different value.`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(port);
