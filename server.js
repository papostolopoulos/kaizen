const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/analyze', async (req, res) => {
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
