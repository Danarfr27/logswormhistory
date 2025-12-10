'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const es = new EventSource('/api/logs');
    es.onmessage = e => {
      const log = JSON.parse(e.data);
      setLogs(prev => [...prev, log]);
    };
    return () => es.close();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <h1 className="text-5xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600">
        Realtime Logs Firdhan AI
      </h1>
      <div className="max-w-6xl mx-auto space-y-5">
        {logs.length === 0 && <p className="text-center text-gray-400 text-xl">Menunggu user pertama...</p>}
        {logs.map(l => (
          <div key={l.id} className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-700 shadow-xl">
            <div className="flex justify-between text-sm opacity-80">
              <span>{l.time}</span>
              <span>{l.ip} • {l.city}, {l.country}</span>
            </div>
            <div className="mt-4">
              <div className="text-green-400 font-medium mb-2">User:</div>
              <p className="bg-gray-900/80 rounded-lg p-4 text-gray-200">{l.question}</p>
            </div>
            <div className="mt-4">
              <div className="text-purple-400 font-medium mb-2">Gemini:</div>
              <p className="bg-gray-900/80 rounded-lg p-4 text-gray-200">{l.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
