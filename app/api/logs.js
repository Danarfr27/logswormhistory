// api/logs.js for logswormhistory
// GET: return recent logs
// POST: accept a log JSON { timestamp, ip, lat, lon, question, answer }
// Storage: Upstash Redis (REST) if configured, otherwise in-memory (dev-only)

const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;
const LIST_KEY = process.env.LOGS_REDIS_KEY || 'wormgpt:logs';
const MAX_LOGS = parseInt(process.env.LOGS_MAX || '500', 10);

let memoryLogs = [];

async function upstashLPushTrim(item) {
  const body = { commands: [['LPUSH', LIST_KEY, JSON.stringify(item)], ['LTRIM', LIST_KEY, '0', String(MAX_LOGS - 1)]] };
  const res = await fetch(UPSTASH_URL + '/multi', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Upstash LPUSH failed: ' + res.status + ' ' + t);
  }
}

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
  // Optional write auth
  const expectedKey = process.env.LOGS_WRITE_KEY;
  if (expectedKey && req.method === 'POST') {
    const provided = req.headers['x-log-key'] || req.headers['x_log_key'] || '';
    if (provided !== expectedKey) {
      console.warn('Unauthorized POST attempt to /api/logs');
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  if (req.method === 'GET') {
    try {
      let logs = [];
      if (UPSTASH_URL && UPSTASH_TOKEN) {
        logs = await upstashLRange();
      } else {
        logs = memoryLogs.slice(0, MAX_LOGS);
      }
      return res.status(200).json(logs);
    } catch (e) {
      console.error('GET /api/logs error', e);
      return res.status(500).json({ error: 'Failed to read logs', detail: String(e) });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const log = {
        timestamp: payload.timestamp || new Date().toISOString(),
        ip: payload.ip || payload.clientIp || null,
        lat: payload.lat || payload.latitude || null,
        lon: payload.lon || payload.longitude || null,
        city: payload.city || null,
        region: payload.region || null,
        country: payload.country || null,
        question: payload.question || payload.contents || null,
        answer: payload.answer || payload.response || null,
        raw: payload
      };

      if (UPSTASH_URL && UPSTASH_TOKEN) {
        await upstashLPushTrim(log);
      } else {
        memoryLogs.unshift(log);
        if (memoryLogs.length > MAX_LOGS) memoryLogs.length = MAX_LOGS;
      }

      // Optional forward to another webhook
      const forward = process.env.WEBHOOK_FORWARD;
      if (forward) {
        fetch(forward, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(log) })
          .then(r => { if (!r.ok) console.warn('Forward failed', r.status); })
          .catch(err => console.error('Forward error', err));
      }

      return res.status(201).json({ ok: true });
    } catch (e) {
      console.error('POST /api/logs error', e);
      return res.status(500).json({ error: 'Failed to store log', detail: String(e) });
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method not allowed');
}
