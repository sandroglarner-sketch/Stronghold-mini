'use strict';
// Stronghold Mini: Webseite + Warteschlange (WebSocket) in einer Datei, ohne externe Pakete.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { pruefen: storyPruefen } = require('./nachrechnen.js'); // Story-Siege nachrechnen (eigener Thread)

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
// von Hand vergebene (und alte) Freischaltungen: [{ einheit, grund, gezeigt }]; Spalte gezeigt (22.11., Geschenke) fehlt evtl. noch -> ohne Geschenk-Fenster
let SPALTE_GEZEIGT = true;
async function freischaltungenTabelle(userId) {
  const q = 'freischaltungen?user_id=eq.' + encodeURIComponent(userId) + '&select=';
  if (SPALTE_GEZEIGT) { try { return (await db('GET', q + 'einheit,grund,gezeigt')) || []; } catch (e) { if (e.status !== 400) throw e; SPALTE_GEZEIGT = false; } }
  return ((await db('GET', q + 'einheit')) || []).map((x) => ({ einheit: x.einheit, grund: '', gezeigt: true }));
}
// Regeln aus daten/freischalten.js (dieselbe Datei wie im Spiel) und Story-Reihenfolge aus daten/botdatenbank.js
let FREI = { einheiten: {}, story: { kontoAb: '', gegner: {} } }, STORY_IDS = [], STORY_NR = {}, STORY_ALT = { 1: [] }, STORY_BOT = {}; // STORY_BOT: id -> { logik, name }
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
// ---------- Elo (21.11.): Online-Partien zwischen zwei Konten; spieler.elo (Start 1000) und spieler.partien. Fehlen die Spalten, ist Elo aus (SPALTE_ELO false). ----------
let SPALTE_ELO = true;
// Gewählter König (nur Optik) fürs Freundesbild: spieler.koenig (text); ohne Spalte nur solange der Server läuft (letzterKoenig)
let SPALTE_KOENIG = true;
const letzterKoenig = new Map();
function koenigMerken(c) {
  if (!c.user) return;
  if (letzterKoenig.get(c.user.id) === c.koenig) return;
  letzterKoenig.set(c.user.id, c.koenig);
  if (KONTO_SECRET && SPALTE_KOENIG) db('PATCH', 'spieler?user_id=eq.' + c.user.id, { koenig: c.koenig }).catch((e) => { if (e.status === 400) SPALTE_KOENIG = false; });
}
// Deck-Plätze (Kartenbuch 1/2/3) mit Konto: spieler.decks (text, JSON { nr, decks: [[typ, …] | null ×3] }). Fehlt die Spalte, bleiben die Decks nur im Browser.
let SPALTE_DECKS = true;
function decksPruefen(x) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.decks)) return null;
  const decks = [0, 1, 2].map((i) => { const d = x.decks[i]; if (!Array.isArray(d)) return null; const l = d.filter((t) => typeof t === 'string' && /^[a-z0-9_]{1,24}$/.test(t)).slice(0, 12); return l.length ? l : null; });
  return { nr: Math.max(0, Math.min(2, x.nr | 0)), decks };
}
async function decksLesen(userId) {
  if (!SPALTE_DECKS || !KONTO_SECRET) return null;
  try { const l = await db('GET', 'spieler?select=decks&user_id=eq.' + userId); return l && l[0] && l[0].decks ? decksPruefen(JSON.parse(l[0].decks)) : null; }
  catch (e) { if (e.status === 400) SPALTE_DECKS = false; return null; }
}
const ELO_START = 1000, ELO_K = 32;
function rangId(id) { return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 10); } // öffentliche Kennung in der Rangliste (keine user_id)
async function eloLesen(ids) {
  if (!SPALTE_ELO || !KONTO_SECRET) return null;
  try { return await db('GET', 'spieler?select=user_id,elo,partien&user_id=in.(' + ids.join(',') + ')'); }
  catch (e) { if (e.status === 400) { SPALTE_ELO = false; return null; } throw e; }
}
function storyZahl(p) { const b = storyAus(p.story | 0); String(p.besiegt || '').split(',').forEach((id) => { if (id && b.indexOf(id) < 0) b.push(id); }); return b.filter((id) => STORY_IDS.indexOf(id) >= 0).length; }
let rangCache = null, rangZeit = 0;
// Ende einer Online-Partie steht fest (einmal pro Partie): Elo (nur Konto gegen Konto) und Edelsteine (jedes Konto)
function abschluss(ma, w) {
  if (ma.bewertet) return; ma.bewertet = true;
  bewerten(ma, w).catch((e) => console.error('elo', e.message));
  edelPartie(ma, w).catch((e) => console.error('edel', e.message));
}
async function bewerten(ma, w) { // w = Sieger-Team (0/1), -1 = unentschieden; nur wenn beide ein (verschiedenes) Konto haben
  const ua = ma.a.user, ub = ma.b.user;
  if (!ua || !ub || ua.id === ub.id) return;
  const rows = await eloLesen([ua.id, ub.id]); if (!rows) return;
  const pa = rows.find((r) => r.user_id === ua.id) || {}, pb = rows.find((r) => r.user_id === ub.id) || {};
  const ea = pa.elo === undefined || pa.elo === null ? ELO_START : pa.elo, eb = pb.elo === undefined || pb.elo === null ? ELO_START : pb.elo;
  const erw = 1 / (1 + Math.pow(10, (eb - ea) / 400)), s = w === 0 ? 1 : w === 1 ? 0 : 0.5, d = Math.round(ELO_K * (s - erw));
  await Promise.all([db('PATCH', 'spieler?user_id=eq.' + ua.id, { elo: ea + d, partien: (pa.partien | 0) + 1 }), db('PATCH', 'spieler?user_id=eq.' + ub.id, { elo: eb - d, partien: (pb.partien | 0) + 1 })]);
  rangCache = null;
  for (const z of online.get(ua.id) || []) { if (z.user) z.user.elo = ea + d; } for (const z of online.get(ub.id) || []) { if (z.user) z.user.elo = eb - d; }
  for (const z of online.get(ua.id) || []) z.send({ k: 'elo', elo: ea + d, diff: d, partien: (pa.partien | 0) + 1 });
  for (const z of online.get(ub.id) || []) z.send({ k: 'elo', elo: eb - d, diff: -d, partien: (pb.partien | 0) + 1 });
}
function ergebnis(c, wRoh) { // ein Browser meldet das Ende der Online-Partie; gewertet wird, wenn beide dasselbe melden (oder der andere schon weg ist)
  const ma = c.match; if (!ma || ma.bewertet) return;
  const t = ma.a === c ? 0 : 1, w = wRoh === 0 || wRoh === 1 ? wRoh : -1, o = t === 0 ? ma.b : ma.a;
  ma.erg = ma.erg || {}; ma.erg[t] = w;
  if (!o.alive && ma.wartet) { clearTimeout(ma.wartet); return abschluss(ma, w); } // der andere ist gegangen, nachdem er gemeldet hat: es gilt, was der Bleibende meldet
  if (ma.erg[1 - t] !== undefined) { if (ma.erg[1 - t] === w) abschluss(ma, w); else ma.bewertet = true; } // unterschiedlich: nicht werten
  else if (!o.alive && w === t) abschluss(ma, w);
}
function verlassen(c) { // Verbindung weg während einer Online-Partie: wer geht, verliert (ausser beide hatten das Ende schon gemeldet)
  const ma = c.match; if (!ma || ma.bewertet || (!ma.a.user && !ma.b.user)) return;
  const t = ma.a === c ? 0 : 1;
  if (ma.erg && ma.erg[1 - t] !== undefined) return abschluss(ma, ma.erg[1 - t]); // der Bleibende hat das Ende schon gemeldet: das gilt
  if (ma.erg && ma.erg[t] !== undefined) { // 26.11.: nur der Gehende hat gemeldet (z. B. «gewonnen» und sofort weg): auf die Meldung des anderen warten, sonst verliert der Gehende
    ma.wartet = setTimeout(() => { if (!ma.bewertet) abschluss(ma, 1 - t); }, 15000);
    return;
  }
  abschluss(ma, 1 - t);
}
async function apiRangliste(res) {
  if (!KONTO_SECRET || !SPALTE_ELO) return json(res, 200, { liste: [], aus: true });
  if (!rangCache || Date.now() - rangZeit > 30000) {
    let l;
    try { l = await db('GET', 'spieler?select=user_id,name,elo,partien&partien=gt.0&order=elo.desc,partien.desc&limit=100'); }
    catch (e) { if (e.status === 400) { SPALTE_ELO = false; return json(res, 200, { liste: [], aus: true }); } throw e; }
    rangCache = (l || []).map((p) => ({ r: rangId(p.user_id), name: p.name || 'Spieler', elo: p.elo, partien: p.partien })); rangZeit = Date.now();
  }
  json(res, 200, { liste: rangCache });
}
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
  ctx.__BOT.forEach((b) => { if (STORY_IDS.indexOf(b.id) >= 0) STORY_BOT[b.id] = { logik: b.logik, name: b.name }; });
  ctx.__BOT.forEach((b) => { if (b.nr && b.nr <= 30) STORY_NR[b.id] = b.nr; });
  STORY_ALT = ctx.STORY_ALT || STORY_ALT;
} catch (e) { console.error('Freischaltungen nicht geladen:', e.message); }
function regelOk(r, st, t) { // st = { konto, freunde, besiegt: [ids], gekauft: [typen] }, t = Karte
  if (r.entwicklung) return false;
  if (r.geschenk) return false; // nur über die Tabelle freischaltungen (Geschenk)
  if (r.kaufen && (!st.konto || (st.gekauft || []).indexOf(t) < 0)) return false; // Shop: nur gekauft
  if ((r.konto || r.freunde) && !st.konto) return false;
  if (r.freunde && st.freunde < r.freunde) return false;
  if (r.besiegt && STORY_IDS.indexOf(r.besiegt) >= 0 && st.besiegt.indexOf(r.besiegt) < 0) return false;
  return true;
}
// Freigeschaltete Karten eines Spielers: alle Regeln aus daten/freischalten.js, die er erfüllt, plus Einträge der Tabelle freischaltungen
function freiGast(besiegt) { // ohne Konto: nur Regeln mit Story-Siegen (der Browser meldet seine besiegten Gegner)
  const st = { konto: false, freunde: 0, besiegt: storyIds(besiegt) };
  return Object.keys(FREI.einheiten || {}).filter((t) => regelOk(FREI.einheiten[t], st, t));
}
// ---------- Edelsteine und Shop (22.11.) ----------
// Kontostand wird jedes Mal aus den Zählern berechnet: verdient (Online-Siege/-Niederlagen, besiegte Story-Gegner, eingeladene Freunde) minus ausgegeben.
// Spalten spieler.pvp_siege, pvp_niederlagen, edel_ausgegeben, gekauft (datenbank/schema.sql). Fehlen sie, ist der Shop aus (SPALTE_EDEL false).
let SPALTE_EDEL = true;
const EDEL = () => (FREI.edel || { sieg: 2, niederlage: 1, bot: 1, freund: 20, minPartie: 30 });
async function edelZeile(userId) { // {} = noch keine Zeile, null = Shop nicht eingerichtet
  if (!SPALTE_EDEL || !KONTO_SECRET) return null;
  try { const l = await db('GET', 'spieler?select=elo,partien,pvp_siege,pvp_niederlagen,edel_ausgegeben,gekauft&user_id=eq.' + encodeURIComponent(userId)); return (l && l[0]) || {}; }
  catch (e) { if (e.status === 400) { SPALTE_EDEL = false; console.error('Edelsteine aus: Spalten fehlen (datenbank/schema.sql ausführen)'); return null; } throw e; }
}
function pvpZahlen(z) { // Partien vor den Edelsteinen (pvp_siege leer): Siege aus der Elo geschätzt (je Sieg/Niederlage etwa ±16)
  if (z.pvp_siege !== null && z.pvp_siege !== undefined) return { siege: z.pvp_siege | 0, niederlagen: z.pvp_niederlagen | 0 };
  const p = z.partien | 0, elo = typeof z.elo === 'number' ? z.elo : ELO_START;
  const s = Math.max(0, Math.min(p, Math.round((p + (elo - ELO_START) / (ELO_K / 2)) / 2)));
  return { siege: s, niederlagen: p - s };
}
// spieler.gekauft: Einträge «typ@bezahlt» (z. B. schwarzritter@40); alte Einträge ohne @ wurden zum Preis aus PREIS_ALT gekauft
const PREIS_ALT = { crossbow: 10, schwarzritter: 25, bank: 35, dieb: 30 };
// Einmalige Nachzahlung nach einer Preiserhöhung (nur auf ausdrücklichen Wunsch eintragen): typ -> neuer Preis
const NACHZAHLEN = { schwarzritter: 40 }; // 22.11.: Schwarzer Ritter 25 -> 40, einmalig
function gekauftListe(z) { return String((z && z.gekauft) || '').split(',').filter(Boolean).map((e) => { const [t, p] = e.split('@'); return { t, p: p !== undefined ? p | 0 : (PREIS_ALT[t] | 0) }; }); }
function gekauftAus(z) { return gekauftListe(z).map((e) => e.t).filter((t) => FREI.einheiten[t] && FREI.einheiten[t].kaufen); }
function gekauftText(l) { return l.map((e) => e.t + '@' + e.p).join(','); }
// Alles zum Konto eines Spielers: Freunde, Story-Siege, gekaufte Karten, freigeschaltete Karten, Edelsteine
async function kontoStand(userId) {
  const [ein, sp, tab, z] = await Promise.all([
    db('GET', 'einladungen?select=code&user_id=eq.' + encodeURIComponent(userId)).catch(() => []),
    besiegtLesen(userId).catch(() => null),
    freischaltungenTabelle(userId).catch(() => []),
    edelZeile(userId).catch(() => null)]);
  let freunde = 0;
  if (ein && ein.length) { const b = await db('GET', 'einladung_besuche?select=geraet&code=eq.' + ein[0].code).catch(() => []); freunde = (b || []).length; }
  const bServer = sp ? sp.besiegt.slice() : [], b = bServer.slice(); // nur vom Server geprüfte Siege (26.11.: gemeldete Siege zählen mit Konto nicht mehr)
  const gekauft = gekauftAus(z);
  const st = { konto: true, freunde, besiegt: b, gekauft };
  const einheiten = Object.keys(FREI.einheiten || {}).filter((t) => regelOk(FREI.einheiten[t], st, t));
  (tab || []).forEach((x) => { const t = x.einheit; if (einheiten.indexOf(t) < 0 && !(FREI.einheiten[t] && FREI.einheiten[t].kaufen)) einheiten.push(t); }); // Shop-Karten nur durch Kauf (alte Einträge, z. B. Armbrust aus Einladungen, zählen nicht)
  const geschenke = (tab || []).filter((x) => x.grund === 'geschenk' && x.gezeigt === false).map((x) => x.einheit); // noch nicht gezeigte Geschenke (Fenster im Spiel)
  const erg = { code: ein && ein.length ? ein[0].code : '', freunde, einheiten, gekauft, geschenke, shop: !!z, edel: null, quellen: null, zeile: z };
  if (z) {
    const E = EDEL(), pv = pvpZahlen(z), bots = bServer.filter((id) => STORY_IDS.indexOf(id) >= 0).length;
    const freundeEdel = E.freundMax > 0 ? Math.min(freunde, E.freundMax) : freunde; // 26.11.: Edelsteine höchstens für freundMax eingeladene Freunde
    const verdient = pv.siege * E.sieg + pv.niederlagen * E.niederlage + bots * E.bot + freundeEdel * E.freund;
    // Einmalige Nachzahlung (NACHZAHLEN): wer billiger gekauft hat, zahlt die Differenz, höchstens bis Kontostand 0.
    // Sonst ändern Preisänderungen im Shop NICHTS am Kontostand (Wunsch Besitzer 22.11.).
    const gl = gekauftListe(z); let nach = 0, geaendert = false;
    gl.forEach((e) => { const ziel = NACHZAHLEN[e.t]; if (ziel && ziel > e.p) { nach += ziel - e.p; e.p = ziel; geaendert = true; } });
    if (geaendert) {
      const abzug = Math.min(nach, Math.max(0, verdient - (z.edel_ausgegeben | 0)));
      z.edel_ausgegeben = (z.edel_ausgegeben | 0) + abzug; z.gekauft = gekauftText(gl);
      await db('PATCH', 'spieler?user_id=eq.' + encodeURIComponent(userId), { edel_ausgegeben: z.edel_ausgegeben, gekauft: z.gekauft }).catch((e) => console.error('nachzahlen', e.message));
    }
    erg.edel = Math.max(0, verdient - (z.edel_ausgegeben | 0));
    erg.quellen = { siege: pv.siege, niederlagen: pv.niederlagen, bots, freunde: freundeEdel, ausgegeben: z.edel_ausgegeben | 0 };
  }
  return erg;
}
async function freischaltungen(userId) { return (await kontoStand(userId)).einheiten; }
function edelDaten(st) { return { edel: st.edel, quellen: st.quellen, gekauft: st.gekauft, shop: st.shop, einheiten: st.einheiten, geschenke: st.geschenke }; }
// neuen Kontostand an alle offenen Verbindungen des Spielers schicken (plus = gerade dazugekommen, fürs Ergebnisfenster)
async function edelMelden(userId, plus, grund) {
  const set = online.get(userId); if (!set || !set.size) return;
  const st = await kontoStand(userId); if (!st.shop) return;
  for (const z of set) { z.frei = st.einheiten; z.send(Object.assign({ k: 'edel', plus: plus || 0, grund: grund || '' }, edelDaten(st))); }
}
async function edelGutschrift(user, sieg) {
  const userId = user.id, z = await edelZeile(userId); if (!z) return;
  if (z.pvp_siege === undefined) await db('POST', 'spieler', { user_id: userId, name: user.name || 'Spieler' }, 'resolution=ignore-duplicates').catch(() => {}); // noch keine Zeile
  const pv = pvpZahlen(z);
  await db('PATCH', 'spieler?user_id=eq.' + encodeURIComponent(userId), sieg ? { pvp_siege: pv.siege + 1, pvp_niederlagen: pv.niederlagen } : { pvp_siege: pv.siege, pvp_niederlagen: pv.niederlagen + 1 });
  const E = EDEL(); await edelMelden(userId, sieg ? E.sieg : E.niederlage, sieg ? 'sieg' : 'niederlage');
}
async function edelPartie(ma, w) { // jedes Konto bekommt Edelsteine (Sieg / Niederlage, Unentschieden wie Niederlage); nicht gegen sich selbst, nicht unter minPartie s
  const ua = ma.a.user, ub = ma.b.user;
  if (ua && ub && ua.id === ub.id) return;
  if (Date.now() - ma.start < EDEL().minPartie * 1000) return;
  await Promise.all([ua ? edelGutschrift(ua, w === 0) : null, ub ? edelGutschrift(ub, w === 1) : null]);
}
// Geschenk gesehen (Knopf «Annehmen» im Geschenk-Fenster): nicht nochmals zeigen
async function apiGeschenk(req, res) {
  const u = await kontoUser(bearer(req));
  if (!u) return json(res, 401, { fehler: 'nicht angemeldet' });
  if (!KONTO_SECRET || !SPALTE_GEZEIGT) return json(res, 200, { ok: true });
  const b = await lesen(req), t = String(b.t || '');
  if (!/^[a-z0-9_]{1,30}$/.test(t)) return json(res, 400, { fehler: 'ungültig' });
  await db('PATCH', 'freischaltungen?user_id=eq.' + encodeURIComponent(u.id) + '&einheit=eq.' + t, { gezeigt: true });
  json(res, 200, { ok: true });
}
// Kauf im Shop: ein Kauf pro Spieler gleichzeitig (sonst könnte man doppelt ausgeben)
const kaufSperre = new Map();
async function apiKaufen(req, res) {
  const u = await kontoUser(bearer(req));
  if (!u) return json(res, 401, { fehler: 'Melde dich zuerst an.' });
  if (!KONTO_SECRET) return json(res, 503, { fehler: 'Der Shop ist noch nicht eingerichtet.' });
  const b = await lesen(req), t = String(b.t || ''), r = FREI.einheiten[t];
  if (!r || !r.kaufen) return json(res, 400, { fehler: 'Diese Karte gibt es nicht im Shop.' });
  if (kaufSperre.get(u.id)) return json(res, 429, { fehler: 'Einen Moment …' });
  kaufSperre.set(u.id, true);
  try {
    const st = await kontoStand(u.id);
    if (!st.shop) return json(res, 503, { fehler: 'Der Shop ist noch nicht eingerichtet.' });
    if (st.gekauft.indexOf(t) >= 0) return json(res, 200, Object.assign({ ok: true }, edelDaten(st)));
    if (st.edel < r.kaufen) return json(res, 400, Object.assign({ fehler: 'Zu wenig Edelsteine.' }, edelDaten(st)));
    if (st.zeile.edel_ausgegeben === undefined) await db('POST', 'spieler', { user_id: u.id, name: nameAus(u.email) }, 'resolution=ignore-duplicates');
    await db('PATCH', 'spieler?user_id=eq.' + encodeURIComponent(u.id), { edel_ausgegeben: (st.zeile.edel_ausgegeben | 0) + r.kaufen, gekauft: gekauftText(gekauftListe(st.zeile).concat([{ t, p: r.kaufen }])), pvp_siege: pvpZahlen(st.zeile).siege, pvp_niederlagen: pvpZahlen(st.zeile).niederlagen });
    const neu = await kontoStand(u.id);
    json(res, 200, Object.assign({ ok: true }, edelDaten(neu)));
    for (const z of online.get(u.id) || []) { z.frei = neu.einheiten; z.send(Object.assign({ k: 'edel', plus: 0 }, edelDaten(neu))); }
  } finally { kaufSperre.delete(u.id); }
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
  const st = await kontoStand(u.id);
  json(res, 200, Object.assign({ code, freunde: st.freunde }, edelDaten(st)));
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
  if (req.method === 'GET' && url === '/api/rangliste') { apiRangliste(res).catch((e) => { console.error(url, e.message); json(res, 500, { fehler: 'Serverfehler' }); }); return; }
  if (req.method === 'POST' && (url === '/api/konto' || url === '/api/besuch' || url === '/api/kaufen' || url === '/api/geschenk')) {
    (url === '/api/konto' ? apiKonto : url === '/api/kaufen' ? apiKaufen : url === '/api/geschenk' ? apiGeschenk : apiBesuch)(req, res).catch((e) => { console.error(url, e.message); json(res, 500, { fehler: 'Serverfehler: ' + String(e.message).slice(0, 160) }); });
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
  if (url === '/sw.js') { // Service Worker der installierbaren App (spiel/sw.js); nie lange zwischenspeichern, damit Änderungen ankommen
    fs.readFile(path.join(__dirname, 'spiel', 'sw.js'), (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
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
        kontoUser(m.token).then((u) => { this.acc = !!u; return u && KONTO_SECRET ? freischaltungen(u.id).catch(() => freiGast([])) : freiGast(m.besiegt); })
          .then((frei) => { this.frei = frei; if (this.alive) enqueue(this); });
      } else { this.acc = false; this.frei = freiGast(m.besiegt); enqueue(this); }
      return;
    }
    if (m.k === 'cancel') { dequeue(this); return; }
    if (m.k.startsWith('duo_') || (this.duoMa && (m.k === 't' || m.k === 'ergebnis'))) { duoNachricht(this, m); return; } // Duokampf (27.11.)
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
    if (m.k === 'ergebnis') { ergebnis(this, m.w); return; } // Ende einer Online-Partie (für Elo)
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
    verlassen(this); // Elo: wer mitten in der Partie geht, verliert
    matchAus(this.match);
    botAus(this, 'verlassen');
    if (this.schaut) zuschauenAus(this);
    duoWeg(this);
    if (this.user) { const set = online.get(this.user.id); if (set) { set.delete(this); if (!set.size) online.delete(this.user.id); } }
    clients.delete(this);
    broadcastInfo();
  }
}

const clients = new Set();
let queue = [];

function enqueue(c) {
  if (c.peer || c.queued || c.duo || c.duoMa) return;
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
  const elos = [a.user && typeof a.user.elo === 'number' ? a.user.elo : null, b.user && typeof b.user.elo === 'number' ? b.user.elo : null]; // Elo neben dem Namen im Intro (Gäste: null)
  const ma = { a, b, seed, acc, frei, namen, elos, koenige, log: [], zuschauer: new Set(), start: Date.now() };
  a.match = b.match = ma;
  a.send({ k: 'match', me: 0, seed, acc, frei, namen, elos, koenige });
  b.send({ k: 'match', me: 1, seed, acc, frei, namen, elos, koenige });
  broadcastInfo();
}
// ---------- Duokampf (27.11.): 2 gegen 2 oder 2 gegen einen zufälligen Story-Bot ----------
// Ablauf: Partner finden (zufällig über duoSolo oder Einladung eines Freundes) -> Team sucht Gegner (duoTeams). Klicken beide auf «Zufälliger Bot»,
// spielen sie gegen einen Bot (den würfeln die Browser aus dem Startwert aus). Plätze: Team A = Spieler 0 und 2, Team B = 1 und 3 (gegen den Bot: 1 = Bot).
// Der Server leitet die Spielschritte an alle anderen weiter (mit Spielernummer p). Wer geht, gibt auf: ab dem Schritt nach seinem letzten (ab) rechnen alle ohne ihn.
let duoSolo = [], duoTeams = [];
function duoDeck(x) { return Array.isArray(x) ? x.filter((t) => typeof t === 'string' && /^[a-z0-9_]{1,24}$/.test(t)).slice(0, 12) : []; }
function duoProfil(c) { return { name: c.user ? c.user.name : 'Gast', koenig: c.koenig || 'standard', deck: c.duoDeck || [] }; }
function duoListen() { duoSolo = duoSolo.filter((c) => c.alive && c.duoSucht); duoTeams = duoTeams.filter((T) => !T.aus && T.a.alive && T.b.alive); }
function duoInfoSenden() {
  duoListen(); broadcastInfo();
  const info = { k: 'duo_info', solo: duoSolo.length, teams: duoTeams.length, online: clients.size };
  for (const c of duoSolo) c.send(info);
  for (const T of duoTeams) { T.a.send(info); T.b.send(info); }
}
async function duoDaten(c, m) { // Deck, König, freigeschaltete Karten (wie bei der Warteschlange)
  c.koenig = koenigId(m.koenig); c.duoDeck = duoDeck(m.deck);
  if (typeof m.token === 'string' && m.token.length < 4096) {
    const u = await kontoUser(m.token).catch(() => null); c.acc = !!u;
    c.frei = u && KONTO_SECRET ? await freischaltungen(u.id).catch(() => freiGast([])) : freiGast(m.besiegt);
  } else { c.acc = false; c.frei = freiGast(m.besiegt); }
}
function duoTeamBilden(a, b, art) {
  a.duoSucht = b.duoSucht = false;
  const T = { a, b, art, bot: [false, false], aus: false };
  a.duo = b.duo = T;
  a.send({ k: 'duo_team', partner: duoProfil(b) }); b.send({ k: 'duo_team', partner: duoProfil(a) });
  duoTeams.push(T);
  duoPaaren();
}
function duoPaaren() {
  duoListen();
  while (duoSolo.length >= 2) { const a = duoSolo.shift(), b = duoSolo.shift(); duoTeamBilden(a, b, 'zufall'); }
  duoListen();
  while (duoTeams.length >= 2) { const A = duoTeams.shift(), B = duoTeams.shift(); duoStart([A.a, B.a, A.b, B.b], false, [A, B]); }
  duoInfoSenden();
}
function duoStart(sitze, bot, teams) {
  teams.forEach((T) => { T.aus = true; T.a.duo = T.b.duo = null; });
  duoTeams = duoTeams.filter((T) => !T.aus);
  const seed = crypto.randomInt(1, 2147483647), spieler = bot ? [0, 1, 2] : [0, 1, 2, 3];
  const leer = { name: 'Bot', koenig: 'standard', deck: [] }, pr = sitze.map((c) => c ? duoProfil(c) : leer);
  const ma = { duo: true, sitze, bot, seed, letzt: {}, weg: {}, erg: {}, start: Date.now(), namen: pr.map((x) => x.name) };
  const daten = { k: 'duo_match', seed, bot, spieler, namen: pr.map((x) => x.name), koenige: pr.map((x) => x.koenig), decks: pr.map((x) => x.deck),
    frei: sitze.map((c) => (c && c.frei) || []), acc: sitze.map((c) => !!(c && c.acc)) };
  sitze.forEach((c, i) => { if (!c) return; c.duoMa = ma; c.sitz = i; c.send(Object.assign({ sitz: i }, daten)); });
  broadcastInfo();
}
function duoTeamAuf(c, grund) { // c verlässt sein Team (vor der Partie): der Partner sucht weiter (zufällig) oder geht zurück ins Menü (Freund)
  const T = c.duo; if (!T) return;
  T.aus = true; T.a.duo = T.b.duo = null;
  const p = T.a === c ? T.b : T.a;
  duoTeams = duoTeams.filter((x) => x !== T);
  if (p.alive) {
    if (T.art === 'zufall') { p.duoSucht = true; duoSolo.push(p); p.send({ k: 'duo_partnerweg', weiter: true, grund }); duoPaaren(); }
    else p.send({ k: 'duo_partnerweg', weiter: false, grund });
  }
  duoInfoSenden();
}
function duoWeg(c) { // Verbindung weg oder Partie verlassen
  c.duoSucht = false; duoSolo = duoSolo.filter((x) => x !== c);
  if (c.duo) duoTeamAuf(c, 'weg');
  const ma = c.duoMa; if (!ma) return;
  c.duoMa = null;
  const p = c.sitz;
  if (ma.weg[p] === undefined) {
    ma.weg[p] = (ma.letzt[p] === undefined ? 6 : ma.letzt[p]) + 1; // ab diesem Schritt ohne ihn (vorher kam alles schon an)
    ma.sitze.forEach((o) => { if (o && o !== c && o.alive && o.duoMa === ma) o.send({ k: 'duo_weg', p, ab: ma.weg[p] }); });
  }
  duoWerten(ma);
  broadcastInfo();
}
function duoWerten(ma) { // Ergebnis steht fest, wenn zwei Spieler dasselbe melden oder alle Gebliebenen gemeldet haben (und übereinstimmen)
  if (ma.bewertet) return;
  const werte = Object.values(ma.erg); if (!werte.length) return;
  const n = {}; werte.forEach((w) => { n[w] = (n[w] || 0) + 1; });
  let w = null; Object.keys(n).forEach((k) => { if (n[k] >= 2) w = Number(k); });
  if (w === null) {
    const da = ma.sitze.map((c, i) => c && ma.weg[i] === undefined ? i : -1).filter((i) => i >= 0);
    if (da.length && da.every((i) => ma.erg[i] !== undefined) && new Set(da.map((i) => ma.erg[i])).size === 1) w = ma.erg[da[0]];
  }
  if (w === null) return;
  ma.bewertet = true;
  if (Date.now() - ma.start < EDEL().minPartie * 1000) return;
  const schon = new Set(); // jedes Konto nur einmal; wer vor dem Ende gegangen ist, bekommt nichts
  ma.sitze.forEach((c, i) => {
    if (!c || !c.user || schon.has(c.user.id) || (ma.weg[i] !== undefined && ma.erg[i] === undefined)) return;
    schon.add(c.user.id);
    edelGutschrift(c.user, w === i % 2).catch((e) => console.error('edel duo', e.message));
  });
}
async function duoNachricht(c, m) {
  const ma = c.duoMa;
  if (m.k === 't') { // Spielschritt an alle anderen (mit Spielernummer)
    if (!ma || typeof m.t !== 'number') return;
    const p = c.sitz;
    if (ma.letzt[p] === undefined || m.t > ma.letzt[p]) ma.letzt[p] = m.t;
    const o = { k: 't', t: m.t, p, c: Array.isArray(m.c) ? m.c.filter((x) => typeof x === 'string' && x.length < 30).slice(0, 6) : [] };
    if (typeof m.ht === 'number' && typeof m.h === 'number') { o.ht = m.ht; o.h = m.h; }
    const txt = JSON.stringify(o);
    ma.sitze.forEach((x) => { if (x && x !== c && x.alive && x.duoMa === ma) { if (TEST_DELAY > 0) setTimeout(() => x.sendRaw(txt), TEST_DELAY); else x.sendRaw(txt); } });
    return;
  }
  if (m.k === 'ergebnis') { if (ma) { ma.erg[c.sitz] = m.w === 0 || m.w === 1 ? m.w : -1; duoWerten(ma); } return; }
  if (m.k === 'duo_suche') { // zufälligen Partner suchen
    if (SPIEL_V && m.v !== SPIEL_V) { c.send({ k: 'alt', v: SPIEL_V }); return; }
    if (c.peer || c.queued || c.duo || c.duoMa || c.duoSucht) return;
    c.duoSucht = true; // gleich vormerken (die Kontoprüfung dauert)
    await duoDaten(c, m);
    if (!c.alive || !c.duoSucht) return;
    duoSolo.push(c); duoPaaren();
    return;
  }
  if (m.k === 'duo_ab') { c.duoSucht = false; duoSolo = duoSolo.filter((x) => x !== c); if (c.duo) duoTeamAuf(c, 'ab'); duoInfoSenden(); return; }
  if (m.k === 'duo_verlassen') { duoWeg(c); return; } // laufende Partie verlassen (Verbindung bleibt)
  if (m.k === 'duo_bot') { // «Zufälliger Bot»: klicken beide, geht es gegen einen Bot
    const T = c.duo; if (!T || T.aus) return;
    const i = T.a === c ? 0 : 1, p = i ? T.a : T.b;
    T.bot[i] = !!m.an;
    p.send({ k: 'duo_bot', an: T.bot[i] });
    if (T.bot[0] && T.bot[1]) duoStart([T.a, null, T.b, null], true, [T]);
    return;
  }
  if (m.k === 'duo_daten') { await duoDaten(c, m); return; } // vor einer Einladung (Deck, König)
  if (m.k === 'duo_fordern') { // Freund zum Duokampf einladen (wie Herausfordern)
    if (!c.user || !KONTO_SECRET) return c.send({ k: 'sozialfehler', text: 'Dafür brauchst du ein Konto.' });
    const ziel = String(m.an || ''), v = verbindung(ziel);
    if (!(await sindFreunde(c.user.id, ziel))) return;
    if (!v || v.peer || v.queued || v.duo || v.duoMa || v.duoSucht || v.status !== 'menu') return c.send({ k: 'forderung_aus', grund: 'nicht frei' });
    if (c.peer || c.duo || c.duoMa) return;
    if (SPIEL_V && (c.v !== SPIEL_V || v.v !== SPIEL_V)) return c.send({ k: 'forderung_aus', grund: 'version' });
    await duoDaten(c, m);
    const id = crypto.randomBytes(6).toString('hex');
    const timer = setTimeout(() => { if (forderungen.delete(id)) { c.send({ k: 'forderung_aus', grund: 'zeit' }); const z = verbindung(ziel); if (z) z.send({ k: 'forderung_weg', id }); } }, 30000);
    forderungen.set(id, { von: c, an: ziel, timer, duo: true });
    c.send({ k: 'forderung_raus', id, an: ziel, duo: true });
    for (const z of online.get(ziel) || []) z.send({ k: 'forderung', id, von: { id: c.user.id, name: c.user.name }, duo: true });
  }
}

// ---------- Freunde, Herausfordern, Zuschauen, Story ----------
const online = new Map(); // user_id -> Set der Verbindungen dieses Spielers
const forderungen = new Map(); // id -> { von: Client, an: user_id, timer }
// Spielername (20.11.): 3–16 Zeichen, Buchstaben, Zahlen, Leerzeichen, - und _; keine reservierten oder groben Wörter. Muss nicht einmalig sein.
const NAME_VERBOTEN = ['admin', 'moderator', 'support', 'system', 'stronghold', 'arsch', 'fick', 'fotze', 'hure', 'nazi', 'hitler', 'wichser', 'schlampe', 'nutte', 'penis', 'fuck', 'shit', 'bitch', 'cunt'];
function nameCheck(x) {
  const n = String(x || '').replace(/\s+/g, ' ').trim();
  if (n.length < 3 || n.length > 16) return { fehler: 'Der Name muss 3 bis 16 Zeichen lang sein.' };
  if (!/^[\p{L}\p{N} _-]+$/u.test(n)) return { fehler: 'Erlaubt sind Buchstaben, Zahlen, Leerzeichen, - und _.' };
  const k = n.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (NAME_VERBOTEN.some((w) => k.includes(w))) return { fehler: 'Diesen Namen kannst du nicht verwenden.' };
  return { name: n };
}
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
  c.botAlt = ma; // für die Sieg-Prüfung: der Browser meldet 'storysieg' erst nach 'bende' (26.11.)
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
    if (c.botma.art === 'story') { const l = STORY_IDS.filter((id) => STORY_BOT[id].logik === bot); c.botma.storyId = l.find((id) => STORY_BOT[id].name === c.botma.namen[1]) || l[0] || ''; } // welcher Story-Gegner
    return;
  }
  const ma = c.botma; if (!ma) return;
  if (m.k === 'bende') return botAus(c, m.grund === 'aufgegeben' ? 'aufgegeben' : m.grund === 'fertig' ? 'fertig' : 'verlassen');
  if (typeof m.t !== 'number' || m.t < ma.letzte) return;
  if (ma.log.length > 20000) { ma.zuLang = true; return; } // sehr lange Partie: kann nicht mehr nachgerechnet werden
  const cmds = Array.isArray(m.c) ? m.c.filter((x) => typeof x === 'string' && x.length < 30).slice(0, 6) : [];
  ma.letzte = m.t;
  if (cmds.length || typeof m.h === 'number') ma.log.push([0, m.t, cmds, typeof m.h === 'number' ? m.h : undefined]);
  if (ma.zuschauer.size) { const z = JSON.stringify({ k: 'zt', p: 0, t: m.t, c: cmds, h: typeof m.h === 'number' ? m.h : undefined }); for (const s of ma.zuschauer) s.sendRaw(z); }
}
// Story-Sieg (26.11.): der Browser meldet nach einer gewonnenen Story-Partie 'storysieg'. Der Server rechnet die Partie aus Startwert und
// gemeldeten Käufen nach (nachrechnen.js). Zählt nur, wenn der Spieler wirklich gewonnen hat, die Prüfsummen stimmen, die Partie nicht
// schneller als in Echtzeit lief und der Gegner nach der Story-Reihenfolge schon spielbar war. Dann: besiegt speichern, Edelsteine.
async function storySieg(c) {
  const ma = c.botma || c.botAlt, antwort = (ok, grund, besiegt) => c.send({ k: 'storysieg', ok, grund: grund || '', id: ma ? ma.storyId : '', besiegt });
  if (!ma || ma.art !== 'story' || !ma.storyId) return antwort(false, 'keine Verbindung');
  if (ma.geprueft) return; ma.geprueft = true;
  if (ma.zuLang) return antwort(false, 'zu lang');
  const l = await besiegtLesen(c.user.id).catch(() => null), b = l ? l.besiegt : [];
  if (b.indexOf(ma.storyId) >= 0) return antwort(true, '', b); // schon besiegt
  const i = STORY_IDS.indexOf(ma.storyId); let front = 0; STORY_IDS.forEach((id, k) => { if (b.indexOf(id) >= 0) front = k + 1; });
  if (i > front) return antwort(false, 'reihenfolge');
  const log = ma.log.slice(), r = await storyPruefen({ bot: ma.bot, seed: ma.seed, log, letzte: ma.letzte });
  if (!r.ok || r.winner !== 0) { console.error('storysieg abgelehnt', c.user.id, ma.storyId, JSON.stringify(r)); return antwort(false, r.ok ? 'kein Sieg' : r.grund); }
  console.log('storysieg geprüft', ma.storyId, r.ticks, 'Schritte', r.ms, 'ms');
  if (Date.now() - ma.start < r.ticks / 60 * 1000 * 0.8) { console.error('storysieg zu schnell', c.user.id, ma.storyId); return antwort(false, 'zu schnell'); }
  const l2 = await besiegtLesen(c.user.id).catch(() => null), b2 = l2 ? l2.besiegt : b.slice(); // neu lesen (andere Geräte)
  if (b2.indexOf(ma.storyId) < 0) { b2.push(ma.storyId); await besiegtSchreiben(c.user.id, b2); edelMelden(c.user.id, EDEL().bot, 'bot').catch(() => {}); }
  for (const z of online.get(c.user.id) || []) z.send({ k: 'storysieg', ok: true, id: ma.storyId, besiegt: b2 }); // alle offenen Geräte
}
function zuschauenAus(c) { const ma = c.schaut; c.schaut = null; if (ma) { ma.zuschauer.delete(c); zuschauerMelden(ma); } }
async function sindFreunde(a, b) { if (!KONTO_SECRET) return false; const l = await db('GET', 'freunde?select=freund_id&user_id=eq.' + a + '&freund_id=eq.' + b); return !!(l && l.length); }
function verbindung(userId) { const set = online.get(userId); if (!set) return null; for (const c of set) if (c.alive) return c; return null; }
async function freundesliste(c) {
  if (!c.user || !KONTO_SECRET) return c.send({ k: 'freunde', liste: [], code: '' });
  const [rows, code] = await Promise.all([db('GET', 'freunde?select=freund_id&user_id=eq.' + c.user.id), eigenerCode(c.user.id).catch(() => '')]);
  const ids = (rows || []).map((r) => r.freund_id);
  let profile = [];
  if (ids.length) {
    const sel = () => 'user_id,name,gesehen,story' + (SPALTE_BESIEGT ? ',besiegt' : '') + (SPALTE_ELO ? ',elo,partien' : '') + (SPALTE_KOENIG ? ',koenig' : '');
    try { profile = await db('GET', 'spieler?select=' + sel() + '&user_id=in.(' + ids.join(',') + ')'); }
    catch (e) {
      if (e.status !== 400) throw e;
      if (SPALTE_KOENIG) { SPALTE_KOENIG = false; try { profile = await db('GET', 'spieler?select=' + sel() + '&user_id=in.(' + ids.join(',') + ')'); } catch (e2) { if (e2.status !== 400) throw e2; profile = null; } }
      if (!profile) { SPALTE_ELO = false; profile = await db('GET', 'spieler?select=user_id,name,gesehen,story&user_id=in.(' + ids.join(',') + ')'); }
    }
  }
  const liste = ids.map((id) => {
    const p = (profile || []).find((x) => x.user_id === id) || {}, v = verbindung(id), e = { id, name: p.name || 'Spieler', gesehen: p.gesehen || null, status: 'offline', story: storyZahl(p), storyMax: STORY_IDS.length, elo: p.elo, partien: p.partien | 0, koenig: koenigId(letzterKoenig.get(id) || p.koenig) };
    if (v) {
      if (v.koenig) e.koenig = v.koenig;
      const ma = v.match && !v.match.aus && v.peer ? v.match : null;
      if (ma) { const ich = ma.a === v ? 0 : 1; e.status = 'pvp'; e.info = 'gegen ' + ma.namen[1 - ich]; e.seit = ma.start; e.zuschauer = ma.zuschauer.size; }
      else if (v.duoMa) { e.status = 'spiel'; e.info = v.duoMa.bot ? 'Duokampf gegen Bot' : 'Duokampf'; }
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
    let elo = null, partien = 0;
    const er = await eloLesen([c.user.id]).catch(() => null);
    if (er && er[0]) { elo = er[0].elo; partien = er[0].partien | 0; }
    koenigMerken(c);
    c.user.elo = typeof elo === 'number' ? elo : (SPALTE_ELO && KONTO_SECRET ? ELO_START : null); // für die Anzeige vor Online-Partien
    const decks = await decksLesen(c.user.id).catch(() => null); // null = noch keine auf dem Konto: der Browser schickt seine
    return c.send({ k: 'ich', id: c.user.id, name: c.user.name, besiegt, elo, partien, rid: rangId(c.user.id), decks, decksAn: SPALTE_DECKS && !!KONTO_SECRET });
  }
  if (m.k === 'koenig') { c.koenig = koenigId(m.id); koenigMerken(c); return; }
  if (m.k === 'status') { c.status = ['menu', 'story', 'tutorial'].includes(m.s) ? m.s : 'menu'; c.info = String(m.info || '').slice(0, 40); return; }
  if (!c.user || !KONTO_SECRET) { if (['freunde', 'freund', 'fordern', 'zuschauen'].includes(m.k)) c.send({ k: 'sozialfehler', text: c.user ? 'Freunde sind noch nicht eingerichtet.' : 'Dafür brauchst du ein Konto.' }); return; }
  if (m.k === 'name') { // eigenen Spielernamen ändern (jederzeit)
    const r = nameCheck(m.name);
    if (r.fehler) return c.send({ k: 'name_fehler', text: r.fehler });
    await db('PATCH', 'spieler?user_id=eq.' + c.user.id, { name: r.name });
    for (const z of online.get(c.user.id) || []) { if (z.user) z.user.name = r.name; z.send({ k: 'name_ok', name: r.name }); }
    return;
  }
  if (m.k === 'story') return; // 26.11.: vom Browser gemeldete Siege zählen nicht mehr (alte Spielversion); nur noch geprüfte ('storysieg')
  if (m.k === 'storysieg') return storySieg(c);
  if (m.k === 'decks') { // Deck-Plätze aufs Konto (nach jeder Änderung im Kartenbuch)
    const d = decksPruefen(m);
    if (!d || !SPALTE_DECKS) return;
    await db('PATCH', 'spieler?user_id=eq.' + c.user.id, { decks: JSON.stringify(d) }).catch((e) => { if (e.status === 400) SPALTE_DECKS = false; });
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
    if (!v || v.peer || v.queued || v.duo || v.duoMa || v.duoSucht || v.status !== 'menu') return c.send({ k: 'forderung_aus', grund: 'nicht frei' });
    if (c.peer || c.duo || c.duoMa) return;
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
    if (!f.von.alive || f.von.peer || c.peer || f.von.duo || f.von.duoMa || c.duo || c.duoMa) return c.send({ k: 'forderung_weg', id: m.id });
    if (f.duo) { await duoDaten(c, m); if (!f.von.alive || f.von.duo || c.duo) return; return duoTeamBilden(f.von, c, 'freund'); } // Duokampf: zusammen ein Team, dann Gegner suchen
    return starteMatch(f.von, c);
  }
  if (m.k === 'zuschauen') {
    const ziel = String(m.id || ''), v = verbindung(ziel), ma = v && v.peer ? v.match : v && v.botma && !v.botma.aus ? v.botma : null;
    if (!(await sindFreunde(c.user.id, ziel))) return;
    if (!ma || ma.aus) return c.send({ k: 'sozialfehler', text: 'Diese Partie ist schon vorbei.' });
    if (c.schaut) zuschauenAus(c);
    c.schaut = ma; ma.zuschauer.add(c);
    if (ma.bot) c.send({ k: 'zuschau', bot: ma.bot, art: ma.art, seed: ma.seed, namen: ma.namen, koenige: ma.koenige, log: ma.log, letzte: ma.letzte, v: SPIEL_V });
    else c.send({ k: 'zuschau', seed: ma.seed, acc: ma.acc, frei: ma.frei, namen: ma.namen, elos: ma.elos, koenige: ma.koenige, log: ma.log, v: SPIEL_V });
    return zuschauerMelden(ma);
  }
  if (m.k === 'nichtzuschauen') return zuschauenAus(c);
}
function broadcastInfo() {
  const info = { k: 'info', online: clients.size, queued: queue.length, duo: duoSolo.filter((c) => c.alive).length + 2 * duoTeams.filter((T) => !T.aus).length, v: SPIEL_V };
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
