  // ---------- Online-Spiel (PvP) ----------
  // Beide Browser rechnen dieselbe Partie (gleicher Startwert, feste Schrittlänge) und tauschen nur Kaufbefehle aus.
  // Jeder Befehl wird für beide im selben Spielschritt ausgeführt (PVP_DELAY Schritte später), so ist es für beide gleich schnell.
  // Der Server stellt nur die Paarung her und leitet die Nachrichten weiter.
  var STEP = 0.05, BL_STEP = 1 / 60, BL_MELDEN = 6, BL_PUFFER = 15, // Bot-Partie: Meldung an Zuschauer alle 6 Schritte (0,1 s), Zuschauer 15 Schritte (0,25 s) Puffer
      PVP_DELAY = 7, // BL_STEP: Bot-Partien rechnen 60 Schritte pro Sekunde (flüssig wie früher), online 20
      menuTitle = ovTitle.textContent, menuText = ovText.textContent;
  $('pvpBtn').hidden = false;
  if (ONLINE) presenceOpen();
  function pvpSend(o) { if (pvp.ws && pvp.ws.readyState === 1) pvp.ws.send(JSON.stringify(o)); }
  function pvpClose() { var w = pvp.ws; pvp.ws = null; if (w) { try { w.close(); } catch (e) { /* egal */ } } }
  function showMenu() { pauseBtn.hidden = false; zeigeMenu(); }
  function pvpOpen(onOpen) {
    var ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws');
    pvp.ws = ws;
    var opened = false;
    ws.onopen = function () { opened = true; onOpen(); };
    ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } pvpMsg(m); };
    ws.onclose = function () {
      if (pvp.ws !== ws) return;
      pvp.ws = null;
      // Der Gratis-Server schläft nach Pause ein und braucht bis zu ~1 Minute zum Aufwachen: beim Suchen mehrmals neu versuchen.
      if (!opened && pvp.searching && (pvp.tries = (pvp.tries || 0) + 1) <= 20) {
        ovText.textContent = 'Server wird geweckt … (kann bis zu einer Minute dauern)';
        setTimeout(function () { if (pvp.searching && !pvp.ws) pvpOpen(onOpen); }, 3000);
        return;
      }
      pvpLost();
      if (!pvp.on && !pvp.searching) setTimeout(presenceOpen, 5000); // Anwesenheit wieder aufbauen
    };
  }
  // Anwesenheit: Auf der Online-Seite ist jeder Besucher mit dem Server verbunden (auch ohne PvP), damit «Spieler online» alle zählt.
  // Dieselbe Verbindung dient dann auch der Gegnersuche (keine doppelte Zählung). Bricht sie ab, wird sie nach 5 s neu aufgebaut.
  function presenceOpen() {
    if (!ONLINE || pvp.ws || pvp.on || pvp.searching) return;
    pvpOpen(function () {});
  }
  function pvpQueue() { if (!pvp.searching) return; ovText.textContent = 'Du wartest in der Warteschlange. Sobald ein zweiter Spieler da ist, geht es los.'; var q = { k: 'queue', v: VERSION, koenig: meinKoenig(), besiegt: storyBesiegt() }; /* besiegte Story-Gegner: schalten Karten mit «besiegt» auch ohne Konto frei */ if (konto.token) q.token = konto.token; pvpSend(q); } // mit Konto: der Server prüft es und sagt beiden Spielern, wer eines hat
  // Der Server hat eine neuere Spielversion: Seite neu laden (nicht mitten in einer Partie; höchstens einmal pro Version)
  var neueVersion = '';
  function veraltet(v) {
    neueVersion = v;
    var schon = ''; try { schon = sessionStorage.getItem('stronghold-neu') || ''; } catch (e) {}
    if (schon === v) return; // schon einmal neu geladen: nicht endlos wiederholen
    if (pvp.on || state === 'playing' || state === 'paused') return; // nach der Partie
    try { sessionStorage.setItem('stronghold-neu', v); } catch (e) {}
    location.reload();
  }
  function pvpSearch() {
    if (neueVersion && neueVersion !== VERSION) { veraltet(neueVersion); }
    if (!ONLINE || pvp.on || pvp.searching) return;
    pvp.searching = true; pvp.ended = false; pvp.tries = 0;
    showOverlay('Suche Gegner …', 'Verbinde mit dem Server …', 'Abbrechen', false);
    if (pvp.ws && pvp.ws.readyState === 1) pvpQueue(); // schon verbunden (Anwesenheit): direkt in die Warteschlange
    else { pvpClose(); pvpOpen(pvpQueue); }
  }
  function pvpCancel() { pvpSend({ k: 'cancel' }); pvp.searching = false; showMenu(); } // Verbindung bleibt für die Anwesenheit offen
  function pvpLeave() {
    pvpClose(); // nach einer Partie neu verbinden (der Server löst die Paarung nur beim Trennen)
    setTimeout(presenceOpen, 300);
    zuschauenEnde(); augen(0);
    pvp.on = false; pvp.ended = false; pvp.searching = false; ME = 0; MP = 0; simRand = Math.random; pvp.bot = false; pvp.botEnde = null;
    duoAus();
    document.documentElement.classList.remove('guest');
    ui.gm = ui.gf = ui.cdown = -1;
    showMenu();
  }
  function pvpLost() {
    if (pvp.searching) { pvp.searching = false; pvp.ended = true; duoS.phase = ''; duoKnoepfe(); showOverlay('Keine Verbindung', 'Der Server ist gerade nicht erreichbar. Versuche es gleich noch einmal.', 'Zum Menü', false); }
    else if (pvp.on && state === 'playing') { state = 'over'; pvp.ended = true; showOverlay('Verbindung verloren', 'Die Verbindung zum Server wurde getrennt.', 'Zum Menü', false); }
  }
  function pvpMsg(m) {
    if (!m) return;
    if ((m.k === 'info' || m.k === 'alt') && m.v && m.v !== VERSION) veraltet(m.v);
    if (m.k === 'alt') return;
    if (m.k === 'info') {
      if (pvp.searching && !duoS.phase) ovText.textContent = 'Warteschlange: ' + m.queued + ' · Spieler online: ' + m.online;
      if (typeof m.duo === 'number') $('duoOnline').textContent = m.duo ? m.duo + (m.duo === 1 ? ' Spieler sucht' : ' Spieler suchen') : ''; // Duokampf: wer gerade Partner oder Gegner sucht
      if (typeof m.online === 'number') $('pvpOnline').textContent = m.online + (m.online === 1 ? ' Spieler online' : ' Spieler online'); // alle Besucher der Seite
    }
    else if (m.k === 'match') { pvp.bot = false; pvp.botEnde = null; pvp.namen = Array.isArray(m.namen) ? m.namen : ['', '']; pvp.elos = Array.isArray(m.elos) ? m.elos : [null, null]; pvp.koenige = m.koenige; sozial.forderungRaus = null; forderungAblehnen(); freundeOpen(false); pvp.konten = Array.isArray(m.acc) ? [!!m.acc[0], !!m.acc[1]] : [false, false]; pvp.frei = Array.isArray(m.frei) ? [[].concat(m.frei[0] || []), [].concat(m.frei[1] || [])] : [[], []]; startPvp(m.me === 1 ? 1 : 0, m.seed | 0); }
    else if (m.k === 't') pvpRecv(m);
    else if (m.k === 'left') { if (pvp.on && !duo.on && state === 'playing') finish(pvp.me, 'Dein Gegner hat die Partie verlassen.'); }
    else if (m.k.indexOf('duo_') === 0) duoMsg(m);
    else sozialMsg(m);
  }
  function startPvp(me, seed, ich) { // me = dein Team; ich = dein Spieler (Duokampf, sonst = me)
    blStop('verlassen');
    pvp.searching = false; pvp.on = true; pvp.ended = false; pvp.me = me; ME = me; MP = ich === undefined ? me : ich; pvp.zuschauer = false; augen(0);
    document.documentElement.classList.toggle('guest', me === 1);
    simRand = mulberry32(seed);
    tut.on = false; sandbox = false;
    reset();
    state = 'playing';
    disarmGive();
    jingle('start');
    overlay.hidden = true;
    openBook(false);
    applyDeck();
    pauseBtn.hidden = true;
    ui.gm = ui.gf = ui.sec = ui.inc = -1; ui.cdown = -1;
    koenigTeam = Array.isArray(pvp.koenige) ? [0, 1, 2, 3].map(function (i) { return String(pvp.koenige[i] || 'standard'); }) : ['standard', 'standard', 'standard', 'standard'];
    intro.t = 0; spielArt = duo.on ? 'duo' : 'pvp';
    if (duo.on) duoIntro(); else startIntro(pvp.namen && pvp.namen[0] || 'Blau', pvp.namen && pvp.namen[1] || 'Rot', pvp.bot ? null : pvp.elos);
    pvp.zh = {}; pvp.tick = 0; pvp.acc = 0; pvp.alpha = 0; pvp.inbox = {}; pvp.sent = {}; pvp.pending = []; pvp.hashes = {}; pvp.remoteHash = {}; pvp.stall = 0;
    for (var t = 0; t < PVP_DELAY; t++) pvp.inbox[t] = { 0: [], 1: [], 2: [], 3: [] };
  }
  function pvpHash() {
    var h = 2166136261;
    function mix(n) { h ^= n | 0; h = Math.imul(h, 16777619); }
    mix(units.length);
    for (var i = 0; i < units.length; i++) { var u = units[i]; mix(u.id); mix(Math.round(u.x * 1000)); mix(Math.round(u.y * 1000)); mix(Math.round(u.hp * 1000)); }
    mix(gold[0]); mix(gold[1]); if (duo.on) { mix(gold[2]); mix(gold[3]); } mix(Math.round(bases[0].hp * 100)); mix(Math.round(bases[1].hp * 100));
    return h >>> 0;
  }
  function pvpDesync() {
    if (state !== 'playing') return;
    state = 'over'; pvp.ended = true;
    if (pvp.bot) { showOverlay('Synchronisationsfehler', 'Deine Ansicht ist von der Partie abgewichen. Schau einfach noch einmal zu.', 'Zum Menü', false); return; }
    showOverlay('Synchronisationsfehler', duo.on ? 'Die Spiele sind auseinandergelaufen. Die Partie wurde abgebrochen.' : 'Die beiden Spiele sind auseinandergelaufen. Die Partie wurde abgebrochen.', 'Zum Menü', false);
  }
  function pvpCheck(t, h) {
    if (duo.on) { pvp.remoteHash[t] = pvp.remoteHash[t] || []; pvp.remoteHash[t].push(h); if (pvp.hashes[t] !== undefined) duoHashPruefen(t); return; } // Duokampf: mehrere Mitspieler
    if (pvp.hashes[t] !== undefined) { if (pvp.hashes[t] !== h) pvpDesync(); delete pvp.hashes[t]; }
    else pvp.remoteHash[t] = h;
  }
  function duoHashPruefen(t) { var l = pvp.remoteHash[t] || []; for (var i = 0; i < l.length; i++) if (l[i] !== pvp.hashes[t]) { pvpDesync(); return; } delete pvp.remoteHash[t]; }
  function pvpValid(c) { return c === 'resign' || (typeof c === 'string' && CONFIG.units[c] && !CONFIG.units[c].hidden); }
  function pvpRecv(m) {
    if (!pvp.on || typeof m.t !== 'number' || m.t < pvp.tick || m.t > pvp.tick + 60) return;
    var box = pvp.inbox[m.t] = pvp.inbox[m.t] || {}, von = duo.on ? m.p : 1 - pvp.me;
    if (duo.on && (duo.spieler.indexOf(von) < 0 || von === MP || (duo.bot && von === 1))) return;
    box[von] = Array.isArray(m.c) ? m.c.filter(pvpValid).slice(0, 6) : [];
    if (typeof m.ht === 'number' && typeof m.h === 'number') pvpCheck(m.ht, m.h);
  }
  function pvpSendTick(T) {
    var target = T + PVP_DELAY, cmds = pvp.pending.splice(0, 6), msg = { k: 't', t: target, c: cmds };
    var box = pvp.inbox[target] = pvp.inbox[target] || {};
    box[MP] = cmds;
    pvp.sent[target] = true;
    if (duo.on) msg.p = MP;
    if (T % 20 === 0) { var h = pvpHash(); msg.ht = T; msg.h = h;
      if (duo.on) { pvp.hashes[T] = h; duoHashPruefen(T); }
      else if (pvp.remoteHash[T] !== undefined) { if (pvp.remoteHash[T] !== h) pvpDesync(); delete pvp.remoteHash[T]; } else pvp.hashes[T] = h; }
    pvpSend(msg);
  }
  // Darf dieser Spieler (ohne Duokampf = Team) diese Einheit online bauen? Entscheidet nur, was der Server beim Start der Partie bestätigt hat (für alle Browser gleich)
  function pvpErlaubt(team, type) {
    if (pvp.bot) return true; // Zuschauer einer Bot-Partie: der Spieler hat schon geprüft
    var d = CONFIG.units[type];
    if (!d || !KONTO.url) return true;
    if (!CONFIG.FREI.regel(type)) return true; // keine Regel: für alle frei (Tutorial-Karten, Mauer); Karten in Entwicklung nur, wenn der Server sie bestätigt
    return !!(pvp.frei && pvp.frei[team] && pvp.frei[team].indexOf(type) >= 0); // der Server hat nach daten/freischalten.js geprüft
  }
  function pvpApply(team, cmds) { // team = Spieler (ohne Duokampf = Team)
    for (var i = 0; i < cmds.length && state === 'playing'; i++) {
      if (cmds[i] === 'resign' && duo.on) duoResign(team);
      else if (cmds[i] === 'resign') finish(1 - team, team === pvp.me ? 'Du hast aufgegeben.' : 'Dein Gegner hat aufgegeben.');
      else {
        if (team === MP) for (var di = 0; di < deploys.length; di++) if (deploys[di].net && deploys[di].type === cmds[i]) { deploys.splice(di, 1); break; } // eigener Kauf kommt jetzt heraus
        if (!pvpErlaubt(team, cmds[i])) continue; // Konto-Einheit ohne (vom Server bestätigtes) Konto: gilt für beide Browser gleich
        buy(team, cmds[i]);
      }
    }
  }
  function pvpFrame(rdt) {
    // Zuschauer: sendet nichts; liegt er zurück (Einstieg mitten in der Partie), rechnet er schnell nach (bis 300 Schritte pro Bild)
    var ST = pvp.bot ? BL_STEP : STEP; // Zuschauer einer Bot-Partie: dieselbe Schrittlänge wie der Spieler
    // Bot-Partie: der Zuschauer spielt mit einem kleinen Puffer (BL_PUFFER Schritte hinter der letzten Meldung) gleichmässig ab; erst wenn er über 1 s zurückliegt, holt er auf
    var bis = pvp.bot ? (pvp.botEnde ? pvp.letzte : pvp.letzte - BL_PUFFER) : pvp.letzte;
    var nach = pvp.zuschauer && (pvp.bot ? bis - pvp.tick > 60 : pvp.letzte - pvp.tick > PVP_DELAY + 4), maxS = nach ? 300 : 8;
    pvp.acc = nach ? Math.max(pvp.acc, (pvp.bot ? bis - pvp.tick : pvp.letzte - pvp.tick - PVP_DELAY) * ST) : Math.min(pvp.acc + rdt, 0.5);
    var steps = 0, waited = false;
    while (pvp.acc >= ST && steps < maxS && state === 'playing') {
      var T = pvp.tick;
      if (!pvp.zuschauer && !pvp.sent[T + PVP_DELAY]) pvpSendTick(T);
      var box = pvp.inbox[T];
      if (state !== 'playing') break;
      if (pvp.bot) { if (T > bis) { waited = true; break; } box = pvp.inbox[T] = box || {}; box[0] = box[0] || []; box[1] = []; } // Bot-Partie: Schritte bis zur letzten Meldung sind vollständig (ohne Eintrag = kein Kauf)
      if (duo.on) { box = pvp.inbox[T] = box || {}; if (!duoBoxFertig(T, box)) { waited = true; break; } }
      else if (!box || !box[0] || !box[1]) { waited = true; break; } // auf den Gegner warten: das gilt für beide gleich
      for (var i = 0; i < units.length; i++) { units[i].px = units[i].x; units[i].py = units[i].y; }
      if (duo.on) duo.spieler.forEach(function (p) { pvpApply(p, box[p]); }); // feste Reihenfolge: für alle Browser gleich
      else { pvpApply(0, box[0]); pvpApply(1, box[1]); }
      if (state === 'playing') update(ST);
      if (pvp.bot && pvp.zh[T] !== undefined) { if (state === 'playing' && pvp.zh[T] !== pvpHash()) pvpDesync(); delete pvp.zh[T]; } // Prüfsumme des Spielers
      pvp.tick = T + 1; delete pvp.inbox[T]; delete pvp.sent[T];
      pvp.acc -= ST; steps++;
    }
    if (pvp.bot && pvp.botEnde && state === 'playing' && pvp.tick > pvp.letzte) { // Spieler hat aufgegeben oder die Partie verlassen
      state = 'over'; pvp.ended = true;
      showOverlay('Partie beendet', pvp.namen[0] + (pvp.botEnde === 'aufgegeben' ? ' hat aufgegeben.' : ' hat die Partie verlassen.'), 'Zum Menü', false);
    }
    pvp.stall = waited ? pvp.stall + rdt : 0;
    if (nach && !waited) pvp.acc = 0;
    if (pvp.bot && waited) pvp.acc = Math.min(pvp.acc, ST); // kurz gewartet: danach nicht ruckartig nachholen
    if (pvp.stall > 20 && state === 'playing' && !pvp.zuschauer) { if (duo.on) { state = 'over'; pvp.ended = true; showOverlay('Verbindung verloren', 'Ein Mitspieler antwortet nicht mehr. Die Partie wurde abgebrochen.', 'Zum Menü', false); } else finish(pvp.me, 'Dein Gegner antwortet nicht mehr.'); }
    pvp.alpha = Math.min(1, pvp.acc / ST);
  }
  // Darstellung: die 20 Spielschritte pro Sekunde werden für den Bildschirm weich überblendet
  function pvpRender() {
    // Nur Darstellung: Laufwege UND Zeiten werden zwischen zwei Spielschritten geglättet (danach alles zurückgesetzt, die Berechnung bleibt deterministisch).
    // Gezeichnet wird der Stand (1 − alpha) Schritte vor dem letzten Schritt: Uhr, Angriffs-Restzeit (u.cd → Schlaganimationen, z. B. Morgenstern),
    // Aufbauzeit (u.setupT → Trebuchet) um diesen Rest zurückgedreht. (22.11.: vorher ruckelten die Animationen im 20er-Takt)
    // Effekte (e.t) NICHT: die laufen schon pro Bild mit der echten Zeit (updateEffects in main.js), Zurückdrehen würde sie ruckeln lassen.
    var a = pvp.alpha, saved = [], zeiten = [], i, u;
    var ST = pvp.on && !pvp.bot ? STEP : BL_STEP, lag = (1 - a) * ST, uhr = clock;
    for (i = 0; i < units.length; i++) {
      u = units[i];
      if (u.px !== undefined) {
        var dx = u.x - u.px, dy = u.y - u.py;
        if (dx * dx + dy * dy < 1) { saved.push(u, u.x, u.y); u.x = u.px + dx * a; u.y = u.py + dy * a; }
      }
      if (lag > 0) { zeiten.push(u, u.cd, u.setupT); if (u.cd > 0) u.cd += lag; if (u.setupT > 0) u.setupT = Math.max(0, u.setupT - lag); }
    }
    if (lag > 0) clock -= lag;
    try { render(); } finally {
      for (i = 0; i < saved.length; i += 3) { saved[i].x = saved[i + 1]; saved[i].y = saved[i + 2]; }
      for (i = 0; i < zeiten.length; i += 3) { zeiten[i].cd = zeiten[i + 1]; zeiten[i].setupT = zeiten[i + 2]; }
      clock = uhr;
    }
  }
  $('pvpBtn').addEventListener('click', function () {
    if (!ONLINE) { hinweis('Online-Partien gibt es nur auf der Online-Seite (Render). Hier im Artifact fehlt der Server.'); return; }
    spielArt = '';
    pvpSearch();
  });

  function setPaused(p) {
    if (pvp.on) return; // Online gibt es keine Pause
    if (p && state === 'playing') {
      state = 'paused';
      pauseBtn.textContent = 'Weiter';
      showOverlay('Pause', 'Das Spiel steht still.', 'Weiter', false);
    } else if (!p && state === 'paused') {
      state = 'playing';
      pauseBtn.textContent = 'Pause';
      overlay.hidden = true;
    }
  }

  function preisOnline(type) { // Karawane: noch nicht gesetzte (reservierte) zählen beim Preis mit
    var d = CONFIG.units[type]; return preisVon(ME, type) + (d && d.steigt ? d.steigt * deploys.filter(function (x) { return x.type === type; }).length : 0);
  }
  function tryBuy(type, el) {
    if (state !== 'playing' || intro.t > 0) return; // während der Namen noch nichts kaufen
    if (btns[type] && btns[type].hidden) return; // nicht im Deck
    if (unitLocked(type)) return; // braucht ein Konto
    if (pvp.on && !pvpErlaubt(MP, type)) return; // online zählt, was der Server bestätigt hat
    if (duo.on && kTot[MP] === Infinity) return; // Duokampf: aufgegeben
    var ok, pd = CONFIG.units[type];
    ok = !!pd && !pd.hidden && gold[MP] - deployGold() >= preisOnline(type) && !(pd.gebaeude && deploys.some(function (x) { return x.type === type; })) && !(tut.on && tut.avail.indexOf(type) < 0);
    if (ok && pd.wall) { // Mauer/Burg: nur, wenn keine eigenen Arbeiter unterwegs sind und kein Mauerkauf schon wartet
      if (units.some(function (w) { return w.team === ME && w.type === 'worker' && w.hp > 0 && !w.bank; }) || deploys.some(function (q) { return CONFIG.units[q.type].wall; })) ok = false;
    }
    if (ok) {
      deploys.push({ type: type, cost: preisOnline(type), t: 0, net: pvp.on, p: MP }); // Gold ist ab sofort reserviert
      if (pvp.on) pvp.pending.push(type); // online: wird für beide im selben Spielschritt ausgeführt (PVP_DELAY Schritte später)
      if (el) { el.classList.remove('press'); void el.offsetWidth; el.classList.add('press'); } // Knopf drückt sich kurz ein
    }
    sfxBuy(type, ok);
    if (!ok && el) {
      el.classList.add('nope');
      setTimeout(function () { el.classList.remove('nope'); }, 300);
    }
  }


  // ---------- Bot-Partie (Story, Einzelspiel) ----------
  // Läuft wie online in festen Schritten (BL_STEP = 1/60 s, damit es so flüssig ist wie früher) mit festem Zufalls-Startwert. Mit Konto und Verbindung meldet der Browser Startwert, Bot und seine Käufe
  // je Schritt an den Server (mindestens jede Sekunde, mit Prüfsumme); Freunde können so zuschauen. Der Spieler wartet dabei nie auf den Server.
  // Tutorial und Sandbox laufen wie bisher (ohne Zuschauen).
  var bl = { on: false, live: false, tick: 0, acc: 0, seed: 0, gesendet: -1 };
  function blVorbereiten(sb) {
    blStop('verlassen');
    bl.on = !tut.on && !sb && !pvp.on; bl.tick = 0; bl.acc = 0; bl.gesendet = -1;
    if (!bl.on) { simRand = Math.random; return; }
    bl.seed = 1 + Math.floor(Math.random() * 2147483646);
    simRand = mulberry32(bl.seed);
  }
  function blLos() {
    if (!bl.on || duo.on || !ONLINE || !konto.user || !pvp.ws || pvp.ws.readyState !== 1) return; // Duokampf (Tester, ohne Server): nicht zum Zuschauen melden
    bl.live = true;
    var name = spielArt === 'story' && STORY[storyIdx] ? STORY[storyIdx].name : botEintrag(botType).name;
    pvpSend({ k: 'bstart', v: VERSION, seed: bl.seed, bot: botType, art: spielArt === 'story' ? 'story' : '', gegner: name, koenige: koenigTeam });
  }
  function blStop(grund) {
    if (bl.live) {
      if (bl.tick - 1 > bl.gesendet) pvpSend({ k: 'bt', t: bl.tick - 1, c: [] }); // letzter Schritt, damit Zuschauer bis zum Ende rechnen
      pvpSend({ k: 'bende', grund: grund });
      augen(0);
    }
    bl.live = false; bl.on = false;
  }
  function blFrame(rdt) {
    bl.acc = Math.min(bl.acc + rdt, 0.5);
    while (bl.acc >= BL_STEP && state === 'playing') {
      var T = bl.tick, cmds = [];
      for (var dj = 0; dj < deploys.length; dj++) { // fällige Käufe in diesem Schritt
        var dpl = deploys[dj]; dpl.t += BL_STEP;
        if (dpl.t >= DEPLOY) { deploys.splice(dj, 1); dj--; cmds.push(dpl.type); buy(dpl.p === undefined ? MP : dpl.p, dpl.type); }
      }
      for (var i = 0; i < units.length; i++) { units[i].px = units[i].x; units[i].py = units[i].y; }
      if (state === 'playing') update(BL_STEP);
      bl.tick = T + 1; bl.acc -= BL_STEP;
      if (bl.live && (cmds.length || T % BL_MELDEN === 0 || state !== 'playing')) {
        var msg = { k: 'bt', t: T, c: cmds.slice(0, 6) };
        if (T % 60 === 0 && state === 'playing') msg.h = pvpHash();
        pvpSend(msg); bl.gesendet = T;
      }
    }
    pvp.alpha = Math.min(1, bl.acc / BL_STEP);
  }
