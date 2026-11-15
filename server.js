'use strict';
// Stronghold Mini: Webseite + Warteschlange (WebSocket) in einer Datei, ohne externe Pakete.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT_INDEX = path.join(__dirname, 'index.html'); // index.html liegt entweder direkt neben server.js oder im Ordner public
const INDEX = process.env.INDEX_FILE || (fs.existsSync(ROOT_INDEX) ? ROOT_INDEX : path.join(__dirname, 'public', 'index.html'));
const TEST_DELAY = Number(process.env.RELAY_DELAY_MS || 0); // nur für Tests: künstliche Verzögerung
const MAX_MSG = 512 * 1024; // grösste erlaubte Nachricht
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// ---------- Webseite ----------
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/' || url === '/index.html') {
    fs.readFile(INDEX, 'utf8', (err, html) => {
      if (err) { res.writeHead(500); res.end('Fehler'); return; }
      html = html.replace('/*ONLINE*/false', '/*ONLINE*/true'); // schaltet den Online-Knopf frei
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Nicht gefunden');
});

// ---------- Minimaler WebSocket ----------
function frame(opcode, payload) {
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, payload]);
}

class Client {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.frags = [];
    this.alive = true;
    this.pong = true;
    this.peer = null;   // Gegner in einer laufenden Partie
    this.queued = false;
    this.msgs = 0;      // einfache Begrenzung
    socket.on('data', (d) => this.onData(d));
    socket.on('close', () => this.onClose());
    socket.on('error', () => this.onClose());
  }
  send(obj) {
    if (!this.alive) return;
    const s = this.socket;
    if (s.writableLength > 2 * 1024 * 1024) return; // Verbindung zu langsam: Nachricht verwerfen
    try { s.write(frame(1, Buffer.from(JSON.stringify(obj)))); } catch (e) { /* egal */ }
  }
  sendRaw(text) {
    if (!this.alive) return;
    const s = this.socket;
    if (s.writableLength > 2 * 1024 * 1024) return;
    try { s.write(frame(1, Buffer.from(text))); } catch (e) { /* egal */ }
  }
  close() { if (this.alive) { try { this.socket.write(frame(8, Buffer.alloc(0))); this.socket.end(); } catch (e) { /* egal */ } } }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (len > MAX_MSG || !masked) { this.socket.destroy(); return; }
      if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4);
      const data = Buffer.from(b.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      if (op === 8) { this.close(); return; }
      if (op === 9) { try { this.socket.write(frame(10, data)); } catch (e) { /* egal */ } continue; }
      if (op === 10) { this.pong = true; continue; }
      if (op === 0 || op === 1) {
        this.frags.push(data);
        if (this.frags.reduce((a, x) => a + x.length, 0) > MAX_MSG) { this.socket.destroy(); return; }
        if (fin) { const text = Buffer.concat(this.frags).toString('utf8'); this.frags = []; this.onMessage(text); }
      }
    }
  }
  onMessage(text) {
    this.msgs++;
    let m;
    try { m = JSON.parse(text); } catch (e) { return; }
    if (!m || typeof m.k !== 'string') return;
    if (m.k === 'queue') { enqueue(this); return; }
    if (m.k === 'cancel') { dequeue(this); return; }
    if (this.peer && m.k === 't') { // Spielschritt-Nachrichten 1:1 weitergeben
      const peer = this.peer;
      if (TEST_DELAY > 0) setTimeout(() => peer.sendRaw(text), TEST_DELAY); else peer.sendRaw(text);
    }
  }
  onClose() {
    if (!this.alive) return;
    this.alive = false;
    dequeue(this);
    const p = this.peer;
    this.peer = null;
    if (p) { p.peer = null; p.send({ k: 'left' }); }
    clients.delete(this);
    broadcastInfo();
  }
}

const clients = new Set();
let queue = [];

function enqueue(c) {
  if (c.peer || c.queued) return;
  c.queued = true;
  queue.push(c);
  tryMatch();
  broadcastInfo();
}
function dequeue(c) {
  c.queued = false;
  queue = queue.filter((x) => x !== c);
  broadcastInfo();
}
function tryMatch() {
  while (queue.length >= 2) {
    const a = queue.shift(), b = queue.shift();
    a.queued = b.queued = false;
    if (!a.alive || !b.alive) { if (a.alive) { a.queued = true; queue.unshift(a); } if (b.alive) { b.queued = true; queue.unshift(b); } continue; }
    a.peer = b; b.peer = a;
    const seed = crypto.randomInt(1, 2147483647); // gemeinsamer Zufalls-Startwert: beide Browser rechnen dieselbe Partie
    a.send({ k: 'match', me: 0, seed });
    b.send({ k: 'match', me: 1, seed });
  }
}
function broadcastInfo() {
  const info = { k: 'info', online: clients.size, queued: queue.length };
  for (const c of clients) if (c.queued || !c.peer) c.send(info);
}

server.on('upgrade', (req, socket) => {
  const url = (req.url || '').split('?')[0];
  const key = req.headers['sec-websocket-key'];
  if (url !== '/ws' || !key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = new Client(socket);
  clients.add(c);
  c.send({ k: 'hello' });
  broadcastInfo();
});

// Verbindungen regelmässig prüfen (hält auch den Gratis-Server wach, solange jemand spielt)
setInterval(() => {
  for (const c of clients) {
    if (!c.pong) { c.socket.destroy(); continue; }
    c.pong = false;
    try { c.socket.write(frame(9, Buffer.alloc(0))); } catch (e) { /* egal */ }
  }
}, 20000);

server.listen(PORT, () => console.log('Stronghold Mini läuft auf Port ' + PORT));
module.exports = { server };
