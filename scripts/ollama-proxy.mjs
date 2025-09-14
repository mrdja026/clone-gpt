#!/usr/bin/env node
import http from 'http';

const TARGET_HOST = process.env.WINDOWS_OLLAMA_HOST_IP || process.env.OLLAMA_TARGET_HOST || '192.168.128.1';
const TARGET_PORT = Number(process.env.OLLAMA_TARGET_PORT || 11434);
const LISTEN_HOST = process.env.OLLAMA_LISTEN_HOST || '127.0.0.1';
const LISTEN_PORT = Number(process.env.OLLAMA_LISTEN_PORT || 11434);

const server = http.createServer((req, res) => {
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    method: req.method,
    path: req.url,
    headers: req.headers,
  };

  const upstream = http.request(options, (upRes) => {
    // Forward status and headers
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    // Pipe response stream
    upRes.pipe(res);
  });

  upstream.on('error', (err) => {
    console.error('[ollama-proxy] upstream error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  // Pipe request body
  req.pipe(upstream);
});

server.on('error', (err) => {
  console.error('[ollama-proxy] server error:', err.message);
  process.exit(1);
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`[ollama-proxy] listening on http://${LISTEN_HOST}:${LISTEN_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
});

