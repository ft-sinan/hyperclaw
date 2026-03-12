#!/usr/bin/env node
/**
 * .pi/ — Pi agent runtime
 * Lightweight gateway for Raspberry Pi and embedded devices.
 * Usage: node .pi/index.js
 */
const http = require('http');
const port = process.env.HYPERCLAW_GATEWAY_PORT || 18789;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    ok: true,
    service: 'hyperclaw-pi',
    version: '0.1.0',
    message: 'Pi runtime — point to main gateway for full features'
  }));
});

server.listen(port, () => {
  console.log(`HyperClaw Pi runtime on port ${port}`);
});
