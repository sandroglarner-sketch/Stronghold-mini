'use strict';
// Stronghold Mini: Webseite + Warteschlange (WebSocket) in einer Datei, ohne externe Pakete.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const PORT = process.env.PORT || 3000;
const ROOT_INDEX = path.join(__dirname, 'index.html'); // index.html liegt entweder direkt neben server.js oder im Ordner public
const INDEX = process.env.INDEX_FILE || (fs.existsSync(ROOT_INDEX) ? ROOT_INDEX : path.join(__dirname, 'public', 'index.html'));
// Version des ausgelieferten Spiels (steht in index.html): Spieler mit älterem Stand werden nicht gepaart, ihre Seite lädt neu
let SPIEL_V = '';
try { const mv = /var VERSION = '([a-z0-9]+)'/.exec(fs.readFileSync(INDEX, 'utf8')); SPIEL_V = mv ? mv[1] : ''; } catch (e) { /* egal */ }
const TEST_DELAY = Number(process.env.RELAY_DELAY_MS || 0); // nur für Tests: künstliche Verzögerung
const MAX_MSG = 512 * 1024; // grösste erlaubte Nachricht
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
// Konto (Supabase): dieselben öffentlichen Werte wie im Spiel (daten/konto.js). Über Umgebungsvariablen änderbar.
const KONTO_URL = process.env.SUPABASE_URL || 'https://odxpdyrwtvgicntbjlrh.supabase.co';
const KONTO_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_Ac8mgh1vdjKVNDMn2Zy1lQ_jz8cGmgn';
// Geheimer Schlüssel (Secret Key) nur als Umgebungsvariable auf Render, NIE im Code: damit liest/schreibt der Server Einladungen und Freischaltungen
const KONTO_SECRET = process.env.SUPABASE_SECRET_KEY || '';
function mitZeit(ms, p) { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms); return p(ctrl.signal).finally(() => clearTimeout(t)); }
// Prüft ein Zugangs-Token bei Supabase: liefert { id, email } oder null
function kontoUser(token) {
  if (!token || typeof token !== 'string' || token.length > 4096 || !KONTO_URL || typeof fetch !== 'function') return Promise.resolve(null);
  return mitZeit(5000, (signal) => fetch(KONTO_URL + '/auth/v1/user', { headers: { apikey: KONTO_KEY, Authorization: 'Bearer ' + token }, signal })
    .then((r) => r.ok ? r.json().then((u) => (u && u.id ? { id: u.id, email: u.email } : null)) : null)).catch(() => null);
}
function kontoPruefen(token) { return kontoUser(token).then((u) => !!u); }
// Datenbank (Supabase REST) mit dem geheimen Schlüssel
function db(method, pfad, body, prefer) {
  if (!KONTO_SECRET) return Promise.reject(new Error('kein Secret Key'));
  const headers = { apikey: KONTO_SECRET, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  return mitZeit(6000, (signal) => fetch(KONTO_URL + '/rest/v1/' + pfad, { method, headers, body: body ? JSON.stringify(body) : undefined, signal })
    .then((r) => r.text().then((t) => { if (!r.ok) { const e = new Error('DB ' + r.status + ' ' + t); e.status = r.status; throw e; } return t ? JSON.parse(t) : null; })));
}
function freischaltungenTabelle(userId) { return db('GET', 'freischaltungen?select=einheit&user_id=eq.' + encodeURIComponent(userId)).then((l) => (l || []).map((x) => x.einheit)); } // von Hand vergebene (und alte) Freischaltungen
// Regeln aus daten/freischalten.js (dieselbe Datei wie im Spiel) und Story-Reihenfolge aus daten/botdatenbank.js
let FREI = { einheiten: {}, story: { kontoAb: '', gegner: {} } }, STORY_IDS = [], STORY_NR = {}, STORY_ALT = { 1: [] };
// spieler.story: besiegte Story-Gegner als 1000 + Bitmaske über die festen Nummern (BOT_DB nr, höchstens 30): 1000 + Summe 2^(nr-1);
// alte Werte (nur Anzahl): 1–99 = Version 1, ab 100 = Version*100 + Anzahl -> die ersten n Gegner der damaligen Reihenfolge (STORY_ALT)
function storyAus(s) {
  s = s | 0;
  if (s >= 1000) { const m = s - 1000; return Object.keys(STORY_NR).filter((id) => m & (1 << (STORY_NR[id] - 1))); }
  const v = s >= 100 ? Math.floor(s / 100) : 1, n = s >= 100 ? s % 100 : s;
  return (STORY_ALT[v] || STORY_ALT[1] || []).slice(0, n);
}
function storyEin(ids) { let m = 0; (ids || []).forEach((id) => { if (STORY_NR[id]) m |= 1 << (STORY_NR[id] - 1); }); return m ? 1000 + m : 0; }
// Spalte spieler.besiegt (Text, ids mit Komma, ohne Grenze). Fehlt sie noch (SQL nicht ausgeführt), bleibt es bei der Bitmaske in spieler.story.
let SPALTE_BESIEGT = true;
async function besiegtLesen(userId, mitName) {
  const sel = 'name,story' + (SPALTE_BESIEGT ? ',besiegt' : '');
  let l;
  try { l = await db('GET', 'spieler?select=' + sel + '&user_id=eq.' + encodeURIComponent(userId)); }
  catch (e) { if (SPALTE_BESIEGT && e.status === 400) { SPALTE_BESIEGT = false; return besiegtLesen(userId, mitName); } throw e; }
  if (!l || !l.length) return null;
  const b = storyAus(l[0].story);
  String(l[0].besiegt || '').split(',').forEach((id) => { if (id && b.indexOf(id) < 0) b.push(id); });
  return { name: l[0].name, story: l[0].story | 0, besiegt: b, liste: String(l[0].besiegt || '') };
}
async function besiegtSchreiben(userId, ids) {
  const body = { story: storyEin(ids) };
  if (SPALTE_BESIEGT) body.besiegt = ids.join(',');
  try { await db('PATCH', 'spieler?user_id=eq.' + encodeURIComponent(userId), body); }
  catch (e) { if (SPALTE_BESIEGT && e.status === 400) { SPALTE_BESIEGT = false; return besiegtSchreiben(userId, ids); } throw e; }
}
function storyIds(l) { return Array.isArray(l) ? l.filter((id) => typeof id === 'string' && STORY_IDS.indexOf(id) >= 0) : []; } // nur bekannte Story-Gegner
try {
  const ctx = { CONFIG: {} }; vm.createContext(ctx);
  vm.runInContext(['daten/freischalten.js', 'daten/botdatenbank.js'].map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n') + '\nthis.__BOT = BOT_DB;', ctx);
  FREI = ctx.CONFIG.FREI;
  STORY_IDS = ctx.__BOT.filter((b) => b.platz && b.logik).sort((a, b) => a.platz - b.platz).map((b) => b.id);
  ctx.__BOT.forEach((b) => { if (b.nr && b.nr <= 30) STORY_NR[b.id] = b.nr; });
  STORY_ALT = ctx.STORY_ALT || STORY_ALT;
} catch (e) { console.error('Freischaltungen nicht geladen:', e.message); }
function regelOk(r, st) { // st = { konto, freunde, besiegt: [ids] }
  if (r.entwicklung) return false;
  if ((r.konto || r.freunde) && !st.konto) return false;
  if (r.freunde && st.freunde < r.freunde) return false;
  if (r.besiegt && STORY_IDS.indexOf(r.besiegt) >= 0 && st.besiegt.indexOf(r.besiegt) < 0) return false;
  return true;
}
// Freigeschaltete Karten eines Spielers: alle Regeln aus daten/freischalten.js, die er erfüllt, plus Einträge der Tabelle freischaltungen
function freiGast(besiegt) { // ohne Konto: nur Regeln mit Story-Siegen (der Browser meldet seine besiegten Gegner)
  const st = { konto: false, freunde: 0, besiegt: storyIds(besiegt) };
  return Object.keys(FREI.einheiten || {}).filter((t) => regelOk(FREI.einheiten[t], st));
}
async function freischaltungen(userId, besiegtGemeldet) {
  const [ein, sp, tab] = await Promise.all([
    db('GET', 'einladungen?select=code&user_id=eq.' + encodeURIComponent(userId)).catch(() => []),
    besiegtLesen(userId).catch(() => null),
    freischaltungenTabelle(userId).catch(() => [])]);
  let freunde = 0;
  if (ein && ein.length) { const b = await db('GET', 'einladung_besuche?select=geraet&code=eq.' + ein[0].code).catch(() => []); freunde = (b || []).length; }
  const b = sp ? sp.besiegt.slice() : [];
  storyIds(besiegtGemeldet).forEach((id) => { if (b.indexOf(id) < 0) b.push(id); });
  const st = { konto: true, freunde, besiegt: b };
  const l = Object.keys(FREI.einheiten || {}).filter((t) => regelOk(FREI.einheiten[t], st));
  (tab || []).forEach((t) => { if (l.indexOf(t) < 0) l.push(t); });
  return l;
}
const CODE_ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function neuerCode() { let c = ''; for (let i = 0; i < 6; i++) c += CODE_ZEICHEN[crypto.randomInt(CODE_ZEICHEN.length)]; return c; }
async function eigenerCode(userId) {
  const l = await db('GET', 'einladungen?select=code&user_id=eq.' + encodeURIComponent(userId));
  if (l && l.length) return l[0].code;
  for (let v = 0; v < 5; v++) {
    const code = neuerCode();
    try { await db('POST', 'einladungen', { code, user_id: userId }); return code; } catch (e) { if (e.status !== 409) throw e; }
  }
  throw new Error('kein Code');
}
// einfache Bremse gegen Missbrauch: höchstens n Anfragen pro Stunde und IP
const bremse = new Map();
function zuViel(ip, n) { const now = Date.now(), b = bremse.get(ip) || { t: now, n: 0 }; if (now - b.t > 3600000) { b.t = now; b.n = 0; } b.n++; bremse.set(ip, b); return b.n > n; }
function lesen(req) { return new Promise((ok) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 8192) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { ok({}); } }); }); }
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function bearer(req) { const a = req.headers.authorization || ''; return a.startsWith('Bearer ') ? a.slice(7) : ''; }
// /api/konto: eigener Einladungscode, Anzahl Freunde, freigeschaltete Einheiten
async function apiKonto(req, res) {
  const u = await kontoUser(bearer(req));
  if (!u) return json(res, 401, { fehler: 'nicht angemeldet' });
  if (!KONTO_SECRET) return json(res, 503, { fehler: 'Einladungen noch nicht eingerichtet' });
  const code = await eigenerCode(u.id);
  const [besuche, einheiten] = await Promise.all([db('GET', 'einladung_besuche?select=geraet&code=eq.' + code), freischaltungen(u.id)]);
  json(res, 200, { code, freunde: (besuche || []).length, einheiten });
}
// /api/besuch: ein Freund hat über einen Einladungslink eine Partie gespielt -> zählt als eingeladener Freund (Freischaltungen: daten/freischalten.js)
async function apiBesuch(req, res) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (zuViel(ip, 10)) return json(res, 429, { fehler: 'zu viele Anfragen' });
  if (!KONTO_SECRET) return json(res, 503, { fehler: 'Einladungen noch nicht eingerichtet' });
  const b = await lesen(req), code = String(b.code || '').toUpperCase(), geraet = String(b.geraet || '');
  if (!/^[A-Z0-9]{6}$/.test(code) || !/^[a-z0-9]{8,40}$/.test(geraet)) return json(res, 400, { fehler: 'ungültig' });
  const l = await db('GET', 'einladungen?select=user_id&code=eq.' + code);
  if (!l || !l.length) return json(res, 404, { fehler: 'unbekannter Code' });
  const besitzer = l[0].user_id, ich = await kontoUser(bearer(req));
  if (ich && ich.id === besitzer) return json(res, 200, { ok: false, grund: 'selbst' }); // sich selbst einladen zählt nicht
  await db('POST', 'einladung_besuche', { code, geraet }, 'resolution=ignore-duplicates');
  json(res, 200, { ok: true });
}

// ---------- Webseite ----------
const BILDER = {
  '/apple-touch-icon.png': ['apple-touch-icon.png', 'image/png'],
  '/apple-touch-icon-precomposed.png': ['apple-touch-icon.png', 'image/png'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
  '/favicon-32.png': ['favicon-32.png', 'image/png'],
  '/favicon.ico': ['favicon-32.png', 'image/png'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
};
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  if (req.method === 'POST' && (url === '/api/konto' || url === '/api/besuch')) {
    (url === '/api/konto' ? apiKonto : apiBesuch)(req, res).catch((e) => { console.error(url, e.message); json(res, 500, { fehler: 'Serverfehler: ' + String(e.message).slice(0, 160) }); });
    return;
  }
  if (url === '/' || url === '/index.html') {
    fs.readFile(INDEX, 'utf8', (err, html) => {
      if (err) { res.writeHead(500); res.end('Fehler'); return; }
      html = html.replace('/*ONLINE*/false', '/*ONLINE*/true'); // schaltet den Online-Knopf frei
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    });
    return;
  }
  const bild = BILDER[url]; // Symbol für den Startbildschirm, Browser-Tab und App-Beschreibung (Ordner bilder/)
  if (bild) {
    fs.readFile(path.join(__dirname, 'bilder', bild[0]), (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': bild[1], 'Cache-Control': 'public, max-age=86400' });
      res.end(data);
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
    this.acc = false;   // hat ein (von Supabase bestätigtes) Konto
    this.user = null;   // { id, name } nach 'hallo' mit gültigem Token
    this.status = 'menu'; this.info = ''; // was der Spieler gerade macht (Menü, Story, Tutorial; Online-Partie kennt der Server selbst)
    this.match = null;  // laufende Online-Partie (für Zuschauer)
    this.schaut = null; // Partie, der dieser Client zuschaut
    this.botma = null;  // laufende Partie gegen einen Bot (Story/Einzelspiel), der Freunde zuschauen können
    this.v = '';        // Spielversion
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
    if (m.k === 'queue' && SPIEL_V && m.v !== SPIEL_V) { this.send({ k: 'alt', v: SPIEL_V }); return; } // veraltete Seite: nicht paaren (würde auseinanderlaufen)
    if (m.k === 'queue') { // mit Konto-Token: erst prüfen, dann in die Warteschlange
      this.koenig = koenigId(m.koenig);
      if (typeof m.token === 'string' && m.token.length < 4096) {
        kontoUser(m.token).then((u) => { this.acc = !!u; return u && KONTO_SECRET ? freischaltungen(u.id, m.besiegt).catch(() => freiGast(m.besiegt)) : freiGast(m.besiegt); })
          .then((frei) => { this.frei = frei; if (this.alive) enqueue(this); });
      } else { this.acc = false; this.frei = freiGast(m.besiegt); enqueue(this); }
      return;
    }
    if (m.k === 'cancel') { dequeue(this); return; }
    if (this.peer && m.k === 't') { // Spielschritt-Nachrichten 1:1 weitergeben
      const peer = this.peer;
      if (TEST_DELAY > 0) setTimeout(() => peer.sendRaw(text), TEST_DELAY); else peer.sendRaw(text);
      const ma = this.match; // Zuschauer: mitschreiben und weitergeben
      if (ma && typeof m.t === 'number') {
        const team = ma.a === this ? 0 : 1, c = Array.isArray(m.c) ? m.c.slice(0, 6) : [];
        ma.log.push([team, m.t, c]);
        if (ma.zuschauer.size) { const z = JSON.stringify({ k: 'zt', p: team, t: m.t, c }); for (const s of ma.zuschauer) s.sendRaw(z); }
      }
      return;
    }
    if (m.k === 'bstart' || m.k === 'bt' || m.k === 'bende') { botLive(this, m); return; } // Bot-Partie mit Zuschauern (der Spieler wartet nie auf den Server)
    sozial(this, m).catch((e) => { console.error('sozial', m.k, e.message); if (['freund', 'freunde', 'fordern', 'zuschauen'].includes(m.k)) this.send({ k: 'sozialfehler', text: 'Serverfehler (' + (e.status || e.message) + '). Ist die Datenbank eingerichtet (schema.sql)?' }); });
  }
  onClose() {
    if (!this.alive) return;
    this.alive = false;
    dequeue(this);
    const p = this.peer;
    this.peer = null;
    if (p) { p.peer = null; p.send({ k: 'left' }); }
    matchAus(this.match);
    botAus(this, 'verlassen');
    if (this.schaut) zuschauenAus(this);
    if (this.user) { const set = online.get(this.user.id); if (set) { set.delete(this); if (!set.size) online.delete(this.user.id); } }
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
    starteMatch(a, b);
  }
}
// Eine Online-Partie starten (Zufallsgegner oder Herausforderung): beide bekommen denselben Startwert
function starteMatch(a, b) {
  a.queued = b.queued = false; queue = queue.filter((x) => x !== a && x !== b);
  a.peer = b; b.peer = a;
  const seed = crypto.randomInt(1, 2147483647); // gemeinsamer Zufalls-Startwert: beide Browser rechnen dieselbe Partie
  const acc = [!!a.acc, !!b.acc]; // wer ein Konto hat (für Konto-Einheiten), beide bekommen dieselbe Liste
  const frei = [a.frei || [], b.frei || []]; // freigeschaltete Karten nach daten/freischalten.js
  const namen = [a.user ? a.user.name : 'Gast', b.user ? b.user.name : 'Gast'];
  const koenige = [a.koenig || 'standard', b.koenig || 'standard']; // Aussehen der Könige (nur Optik)
  const ma = { a, b, seed, acc, frei, namen, koenige, log: [], zuschauer: new Set(), start: Date.now() };
  a.match = b.match = ma;
  a.send({ k: 'match', me: 0, seed, acc, frei, namen, koenige });
  b.send({ k: 'match', me: 1, seed, acc, frei, namen, koenige });
  broadcastInfo();
}
// ---------- Freunde, Herausfordern, Zuschauen, Story ----------
const online = new Map(); // user_id -> Set der Verbindungen dieses Spielers
const forderungen = new Map(); // id -> { von: Client, an: user_id, timer }
function nameAus(email) { return String(email || 'Spieler').split('@')[0].slice(0, 24) || 'Spieler'; }
function zuschauerMelden(ma) { const n = { k: 'zuschauer', n: ma.zuschauer.size }; [ma.a, ma.b].forEach((c) => c && c.alive && c.send(n)); for (const s of ma.zuschauer) s.send(n); }
function matchAus(ma) {
  if (!ma || ma.aus) return;
  if (ma.a.alive && ma.a.match === ma && ma.b.alive && ma.b.match === ma) return; // läuft noch
  ma.aus = true;
  for (const s of ma.zuschauer) { s.schaut = null; s.send({ k: 'zende' }); }
  ma.zuschauer.clear();
}
// ---------- Bot-Partien zum Zuschauen ----------
// Der Spieler meldet Startwert und Bot (bstart) und danach seine Käufe je Spielschritt (bt, mindestens 1x pro Sekunde, ab und zu mit Prüfsumme h).
// Zuschauer bekommen das wie bei Online-Partien ('zuschau' mit allen bisherigen Käufen, dann 'zt'); ihr Browser rechnet die Partie samt Bot selbst nach.
function botAus(c, grund) {
  const ma = c.botma; if (!ma) return;
  c.botma = null; ma.aus = true;
  for (const s of ma.zuschauer) { s.schaut = null; s.send({ k: 'zende', bot: true, grund }); }
  ma.zuschauer.clear();
}
function botLive(c, m) {
  if (m.k === 'bstart') {
    botAus(c, 'verlassen');
    if (!c.user || (SPIEL_V && m.v !== SPIEL_V)) return; // nur mit Konto (Freunde) und aktueller Spielversion
    const bot = String(m.bot || ''), seed = m.seed | 0;
    if (!/^[a-z0-9_]{1,40}$/.test(bot) || !seed) return;
    const koenige = Array.isArray(m.koenige) ? [koenigId(m.koenige[0]), koenigId(m.koenige[1])] : ['standard', 'standard'];
    c.botma = { a: c, b: null, bot, seed, art: m.art === 'story' ? 'story' : '', namen: [c.user.name, String(m.gegner || 'Bot').slice(0, 40)], koenige, log: [], letzte: -1, zuschauer: new Set(), start: Date.now() };
    return;
  }
  const ma = c.botma; if (!ma) return;
  if (m.k === 'bende') return botAus(c, m.grund === 'aufgegeben' ? 'aufgegeben' : m.grund === 'fertig' ? 'fertig' : 'verlassen');
  if (typeof m.t !== 'number' || m.t < ma.letzte || ma.log.length > 20000) return;
  const cmds = Array.isArray(m.c) ? m.c.filter((x) => typeof x === 'string' && x.length < 30).slice(0, 6) : [];
  ma.letzte = m.t;
  if (cmds.length || typeof m.h === 'number') ma.log.push([0, m.t, cmds, typeof m.h === 'number' ? m.h : undefined]);
  if (ma.zuschauer.size) { const z = JSON.stringify({ k: 'zt', p: 0, t: m.t, c: cmds, h: typeof m.h === 'number' ? m.h : undefined }); for (const s of ma.zuschauer) s.sendRaw(z); }
}
function zuschauenAus(c) { const ma = c.schaut; c.schaut = null; if (ma) { ma.zuschauer.delete(c); zuschauerMelden(ma); } }
async function sindFreunde(a, b) { if (!KONTO_SECRET) return false; const l = await db('GET', 'freunde?select=freund_id&user_id=eq.' + a + '&freund_id=eq.' + b); return !!(l && l.length); }
function verbindung(userId) { const set = online.get(userId); if (!set) return null; for (const c of set) if (c.alive) return c; return null; }
async function freundesliste(c) {
  if (!c.user || !KONTO_SECRET) return c.send({ k: 'freunde', liste: [], code: '' });
  const [rows, code] = await Promise.all([db('GET', 'freunde?select=freund_id&user_id=eq.' + c.user.id), eigenerCode(c.user.id).catch(() => '')]);
  const ids = (rows || []).map((r) => r.freund_id);
  const profile = ids.length ? await db('GET', 'spieler?select=user_id,name,gesehen&user_id=in.(' + ids.join(',') + ')') : [];
  const liste = ids.map((id) => {
    const p = (profile || []).find((x) => x.user_id === id) || {}, v = verbindung(id), e = { id, name: p.name || 'Spieler', gesehen: p.gesehen || null, status: 'offline' };
    if (v) {
      const ma = v.match && !v.match.aus && v.peer ? v.match : null;
      if (ma) { const ich = ma.a === v ? 0 : 1; e.status = 'pvp'; e.info = 'gegen ' + ma.namen[1 - ich]; e.seit = ma.start; e.zuschauer = ma.zuschauer.size; }
      else if (v.botma && !v.botma.aus) { e.status = 'pvp'; e.info = (v.botma.art === 'story' ? 'Story gegen ' : 'gegen ') + v.botma.namen[1]; e.seit = v.botma.start; e.zuschauer = v.botma.zuschauer.size; } // Bot-Partie: auch zuschaubar
      else if (v.status === 'story' || v.status === 'tutorial') { e.status = 'spiel'; e.info = v.info || (v.status === 'tutorial' ? 'Tutorial' : 'Story'); }
      else e.status = 'menu';
    }
    return e;
  });
  const rang = { pvp: 0, spiel: 1, menu: 2, offline: 3 };
  liste.sort((x, y) => rang[x.status] - rang[y.status] || x.name.localeCompare(y.name));
  c.send({ k: 'freunde', liste, code });
}
function koenigId(x) { return typeof x === 'string' && /^[a-z0-9]{1,24}$/.test(x) ? x : 'standard'; } // nur Optik: der Browser prüft, ob es ihn gibt
async function sozial(c, m) {
  if (m.k === 'hallo') { // Anmeldung der Verbindung (Anwesenheit): mit Token weiss der Server, wer online ist
    c.v = String(m.v || ''); c.koenig = koenigId(m.koenig);
    const u = await kontoUser(m.token);
    if (c.user) { const set = online.get(c.user.id); if (set) { set.delete(c); if (!set.size) online.delete(c.user.id); } }
    c.user = u ? { id: u.id, name: nameAus(u.email) } : null; c.acc = !!u; c.frei = [];
    if (!c.user) return c.send({ k: 'ich', id: null });
    if (!online.has(c.user.id)) online.set(c.user.id, new Set());
    online.get(c.user.id).add(c);
    let besiegt = [];
    if (KONTO_SECRET) {
      const l = await besiegtLesen(c.user.id).catch(() => null);
      if (l) { besiegt = l.besiegt; c.user.name = l.name || c.user.name; db('PATCH', 'spieler?user_id=eq.' + c.user.id, { gesehen: new Date().toISOString() }).catch(() => {});
        if (besiegt.length && ((l.story > 0 && l.story < 1000) || (SPALTE_BESIEGT && l.liste !== besiegt.join(',')))) besiegtSchreiben(c.user.id, besiegt).catch(() => {}); } // alter Stand oder Liste fehlt: zurückschreiben
      else await db('POST', 'spieler', { user_id: c.user.id, name: c.user.name }, 'resolution=ignore-duplicates').catch(() => {});
      c.frei = await freischaltungen(c.user.id).catch(() => []);
    }
    return c.send({ k: 'ich', id: c.user.id, name: c.user.name, besiegt });
  }
  if (m.k === 'koenig') { c.koenig = koenigId(m.id); return; }
  if (m.k === 'status') { c.status = ['menu', 'story', 'tutorial'].includes(m.s) ? m.s : 'menu'; c.info = String(m.info || '').slice(0, 40); return; }
  if (!c.user || !KONTO_SECRET) { if (['freunde', 'freund', 'fordern', 'zuschauen'].includes(m.k)) c.send({ k: 'sozialfehler', text: c.user ? 'Freunde sind noch nicht eingerichtet.' : 'Dafür brauchst du ein Konto.' }); return; }
  if (m.k === 'story') { // neue Siege dazunehmen (nie etwas wegnehmen)
    const l = await besiegtLesen(c.user.id).catch(() => null);
    const b = l ? l.besiegt : [];
    storyIds(m.ids).forEach((id) => { if (b.indexOf(id) < 0) b.push(id); });
    await besiegtSchreiben(c.user.id, b);
    return;
  }
  if (m.k === 'freunde') return freundesliste(c);
  if (m.k === 'freund') { // Freund per Code hinzufügen (beide Richtungen)
    const code = String(m.code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(code)) return c.send({ k: 'sozialfehler', text: 'Der Code hat 6 Zeichen.' });
    const l = await db('GET', 'einladungen?select=user_id&code=eq.' + code);
    if (!l || !l.length) return c.send({ k: 'sozialfehler', text: 'Diesen Code gibt es nicht.' });
    const f = l[0].user_id;
    if (f === c.user.id) return c.send({ k: 'sozialfehler', text: 'Das ist dein eigener Code.' });
    await db('POST', 'freunde', [{ user_id: c.user.id, freund_id: f }, { user_id: f, freund_id: c.user.id }], 'resolution=ignore-duplicates');
    c.send({ k: 'sozialok', text: 'Freund hinzugefügt.' });
    const v = verbindung(f); if (v) freundesliste(v).catch(() => {});
    return freundesliste(c);
  }
  if (m.k === 'fordern') { // einen Freund zu einer Online-Partie herausfordern
    const ziel = String(m.an || ''), v = verbindung(ziel);
    if (!(await sindFreunde(c.user.id, ziel))) return;
    if (!v || v.peer || v.queued || v.status !== 'menu') return c.send({ k: 'forderung_aus', grund: 'nicht frei' });
    if (c.peer) return;
    if (SPIEL_V && (c.v !== SPIEL_V || v.v !== SPIEL_V)) return c.send({ k: 'forderung_aus', grund: 'version' });
    const id = crypto.randomBytes(6).toString('hex');
    const timer = setTimeout(() => { if (forderungen.delete(id)) { c.send({ k: 'forderung_aus', grund: 'zeit' }); const z = verbindung(ziel); if (z) z.send({ k: 'forderung_weg', id }); } }, 30000);
    forderungen.set(id, { von: c, an: ziel, timer });
    c.send({ k: 'forderung_raus', id, an: ziel });
    for (const z of online.get(ziel) || []) z.send({ k: 'forderung', id, von: { id: c.user.id, name: c.user.name } });
    return;
  }
  if (m.k === 'fordern_ab' || m.k === 'antwort') {
    const f = forderungen.get(String(m.id || '')); if (!f) return;
    if (m.k === 'fordern_ab' && f.von !== c) return;
    if (m.k === 'antwort' && f.an !== c.user.id) return;
    forderungen.delete(m.id); clearTimeout(f.timer);
    for (const z of online.get(f.an) || []) if (z !== c) z.send({ k: 'forderung_weg', id: m.id });
    if (m.k === 'fordern_ab') return;
    if (!m.ja) return f.von.send({ k: 'forderung_aus', grund: 'abgelehnt' });
    if (!f.von.alive || f.von.peer || c.peer) return c.send({ k: 'forderung_weg', id: m.id });
    return starteMatch(f.von, c);
  }
  if (m.k === 'zuschauen') {
    const ziel = String(m.id || ''), v = verbindung(ziel), ma = v && v.peer ? v.match : v && v.botma && !v.botma.aus ? v.botma : null;
    if (!(await sindFreunde(c.user.id, ziel))) return;
    if (!ma || ma.aus) return c.send({ k: 'sozialfehler', text: 'Diese Partie ist schon vorbei.' });
    if (c.schaut) zuschauenAus(c);
    c.schaut = ma; ma.zuschauer.add(c);
    if (ma.bot) c.send({ k: 'zuschau', bot: ma.bot, art: ma.art, seed: ma.seed, namen: ma.namen, koenige: ma.koenige, log: ma.log, letzte: ma.letzte, v: SPIEL_V });
    else c.send({ k: 'zuschau', seed: ma.seed, acc: ma.acc, frei: ma.frei, namen: ma.namen, koenige: ma.koenige, log: ma.log, v: SPIEL_V });
    return zuschauerMelden(ma);
  }
  if (m.k === 'nichtzuschauen') return zuschauenAus(c);
}
function broadcastInfo() {
  const info = { k: 'info', online: clients.size, queued: queue.length, v: SPIEL_V };
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
