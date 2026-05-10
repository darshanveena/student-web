const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ---- Config ----
const PORT = process.env.PORT || 3000;

// Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM;

// OpenAI (optional, used only to generate message text)
const openAiKey = process.env.OPENAI_API_KEY;

let twilio;
try {
  if (accountSid && authToken) {
    // eslint-disable-next-line global-require
    const twilioClient = require('twilio');
    twilio = twilioClient(accountSid, authToken);
  }
} catch (e) {
  // ignore - validate later on usage
}

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing env var ${name}`);
}

function sanitizePhone(phone) {
  // Keep digits and leading +
  const p = String(phone || '').trim();
  if (!p) return '';
  // If already has +, keep it; otherwise digits only.
  const hasPlus = p.startsWith('+');
  const digits = p.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

function buildAiPrompt({ student, slot }) {
  const { usn, phone, college } = student || {};
  const { name, day, start, end, alert, desc } = slot || {};

  return `You are an assistant that writes short, polite SMS reminders for students in India.

Write a single SMS message (max 1600 chars) for this timetable slot.
Tone: friendly, clear.

Student:
- USN: ${usn || '-'}
- College: ${college || '-'}
- Phone: ${phone || '-'}

Class slot:
- Subject: ${name || '-'}
- Day: ${day || '-'}
- Time: ${start || '-'} to ${end || '-'}
- Alert (if provided): ${alert || 'none'}
- Description (if provided): ${desc || 'none'}

Constraints:
- If alert is provided, include it.
- If alert is not provided, include a reminder to be prepared.
- Do not include any URLs.
- Output ONLY the message text, nothing else.`;
}

async function generateMessageWithAi({ student, slot }) {
  requireEnv('OPENAI_API_KEY', openAiKey);

  // Use OpenAI SDK if installed; otherwise fallback to fetch.
  // Prefer SDK if available.
  try {
    // eslint-disable-next-line global-require
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: openAiKey });

    const prompt = buildAiPrompt({ student, slot });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You write SMS reminder text for Indian students.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4
    });

    const text = completion?.choices?.[0]?.message?.content || '';
    return String(text).trim();
  } catch (e) {
    // fallback via fetch if openai SDK not installed
    const prompt = buildAiPrompt({ student, slot });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You write SMS reminder text for Indian students.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4
      })
    });

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return String(text).trim();
  }
}

function generateMessageFallback({ slot }) {
  const name = slot?.name || 'your class';
  const day = slot?.day || '';
  const start = slot?.start || '';
  const end = slot?.end || '';
  const alert = slot?.alert;

  if (alert && String(alert).trim()) {
    return `Reminder: ${name} (${day}) ${start} - ${end}. ${alert}`.trim();
  }
  return `Reminder: ${name} (${day}) ${start} - ${end}. Please be prepared.`.trim();
}

app.post('/api/send-sms', async (req, res) => {
  try {
    const missingTwilio = [];
    if (!accountSid) missingTwilio.push('TWILIO_ACCOUNT_SID');
    if (!authToken) missingTwilio.push('TWILIO_AUTH_TOKEN');
    if (!twilioFrom) missingTwilio.push('TWILIO_FROM');

    const { to, student, slot, useAi = true } = req.body || {};

    const toSan = sanitizePhone(to);
    if (!toSan) return res.status(400).json({ ok: false, error: 'Missing recipient phone' });

    // Always generate message text (AI if possible, else fallback)
    let messageText = '';

    if (useAi && openAiKey) {
      try {
        messageText = await generateMessageWithAi({ student, slot });
      } catch (e) {
        messageText = generateMessageFallback({ slot });
      }
    } else {
      messageText = generateMessageFallback({ slot });
    }

    if (!messageText) messageText = generateMessageFallback({ slot });

    // Demo mode: if Twilio env vars are missing, do not fail the request.
    if (missingTwilio.length) {
      return res.json({
        ok: true,
        sid: 'demo',
        message: messageText,
        demo: true,
        missingTwilio
      });
    }

    // Twilio configured
    requireEnv('TWILIO_ACCOUNT_SID', accountSid);
    requireEnv('TWILIO_AUTH_TOKEN', authToken);
    requireEnv('TWILIO_FROM', twilioFrom);

    if (!twilio) {
      // Try require now
      // eslint-disable-next-line global-require
      const twilioClient = require('twilio');
      twilio = twilioClient(accountSid, authToken);
    }

    const msg = await twilio.messages.create({
      to: toSan,
      from: twilioFrom,
      body: messageText
    });


    return res.json({ ok: true, sid: msg.sid, message: messageText });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Reminder SMS server listening on port ${PORT}`);
});

