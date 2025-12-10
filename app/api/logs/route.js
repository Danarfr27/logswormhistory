// app/api/logs/route.js  ← PASTIKAN PATH-NYA EXACT INI!!

let logs = [];
const clients = new Set();

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      logs.forEach(log => controller.enqueue(`data: ${JSON.stringify(log)}\n\n`));
      clients.add(controller);
      controller.signal.addEventListener('abort', () => clients.delete(controller));
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function POST(req) {
  const body = await req.json();

  const newLog = {
    id: Date.now(),
    time: new Date().toLocaleString('id-ID'),
    session: body.sessionId || 'anonymous',
    user: body.userMessage,
    ai: body.aiResponse,
  };

  logs.push(newLog);
  if (logs.length > 200) logs = logs.slice(-200);

  clients.forEach(c => c.enqueue(`data: ${JSON.stringify(newLog)}\n\n`));

  return Response.json({ success: true });
}