// app/page.jsx

'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const es = new EventSource('/api/logs');
    es.onmessage = (e) => {
      const log = JSON.parse(e.data);
      setLogs(prev => [...prev, log]);
    };
    return () => es.close();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Realtime Logs Gemini Chatbot</h1>
      <div className="max-w-4xl mx-auto space-y-6">
        {logs.length === 0 && <p className="text-center text-gray-400">Menunggu chat pertama...</p>}
        {logs.map(l => (
          <div key={l.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-sm text-cyan-400 mb-2">{l.time} — {l.session}</div>
            <div className="text-green-400 font-medium">User: {l.user}</div>
            <div className="text-purple-400 mt-2">Gemini: {l.ai}</div>
          </div>
        ))}
      </div>
    </div>
  );
}