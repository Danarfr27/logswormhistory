// api/logs/stream.js
// A serverless-friendly one-shot SSE endpoint: returns current logs as a single event and closes.

const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;
const LIST_KEY = process.env.LOGS_REDIS_KEY || 'wormgpt:logs';
const MAX_LOGS = parseInt(process.env.LOGS_MAX || '500', 10);

async function upstashLRange() {
  const url = `${UPSTASH_URL}/lrange/${encodeURIComponent(LIST_KEY)}/0/${String(MAX_LOGS - 1)}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` } });
  if (!res.ok) throw new Error('Upstash LRANGE failed: ' + res.status);
  const j = await res.json();
  const arr = j.result || j;
  return (arr || []).map(s => {
    try { return JSON.parse(s); } catch (e) { return { raw: s }; }
  });
}

export default async function handler(req, res) {
  try {
    let logs = [];
    if (UPSTASH_URL && UPSTASH_TOKEN) {
      logs = await upstashLRange();
    } else {
      // no persistent store; return empty set
      logs = [];
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const payload = JSON.stringify(logs || []);
    res.write(`event: logs\ndata: ${payload}\n\n`);
    res.end();
  } catch (e) {
    console.error('stream error', e);
    res.status(500).end('stream error');
  }
}
