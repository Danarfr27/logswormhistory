// In-memory storage (hilang saat redeploy, tapi realtime langsung muncul)
let logs = [];
const clients = new Set();

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Kirim semua logs yang sudah ada
      logs.forEach(log => controller.enqueue(`data: ${JSON.stringify(log)}\n\n`));
      
      // Simpan client SSE
      clients.add(controller);
      
      // Hapus client saat tab ditutup
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
  if (logs.length > 200) logs = logs.slice(-200); // batas 200 chat terakhir

  // Kirim realtime ke semua yang buka halaman logs
  clients.forEach(client => {
    client.enqueue(`data: ${JSON.stringify(newLog)}\n\n`);
  });

  return Response.json({ success: true });
}
