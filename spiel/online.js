  // ---------- Online-Spiel (PvP) ----------
  // Beide Browser rechnen dieselbe Partie (gleicher Startwert, feste Schrittlänge) und tauschen nur Kaufbefehle aus.
  // Jeder Befehl wird für beide im selben Spielschritt ausgeführt (PVP_DELAY Schritte später), so ist es für beide gleich schnell.
  // Der Server stellt nur die Paarung her und leitet die Nachrichten weiter.
  var STEP = 0.05, PVP_DELAY = 7, menuTitle = ovTitle.textContent, menuText = ovText.textContent;
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
  function pvpQueue() { if (!pvp.searching) return; ovText.textContent = 'Du wartest in der Warteschlange. Sobald ein zweiter Spieler da ist, geht es los.'; var q = { k: 'queue', v: VERSION, koenig: meinKoenig() }; if (konto.token) q.token = konto.token; pvpSend(q); } // mit Konto: der Server prüft es und sagt beiden Spielern, wer eines hat
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
    pvp.on = false; pvp.ended = false; pvp.searching = false; ME = 0; simRand = Math.random;
    document.documentElement.classList.remove('guest');
    ui.gm = ui.gf = ui.cdown = -1;
    showMenu();
  }
  function pvpLost() {
    if (pvp.searching) { pvp.searching = false; pvp.ended = true; showOverlay('Keine Verbindung', 'Der Server ist gerade nicht erreichbar. Versuche es gleich noch einmal.', 'Zum Menü', false); }
    else if (pvp.on && state === 'playing') { state = 'over'; pvp.ended = true; showOverlay('Verbindung verloren', 'Die Verbindung zum Server wurde getrennt.', 'Zum Menü', false); }
  }
  function pvpMsg(m) {
    if (!m) return;
    if ((m.k === 'info' || m.k === 'alt') && m.v && m.v !== VERSION) veraltet(m.v);
    if (m.k === 'alt') return;
    if (m.k === 'info') {
      if (pvp.searching) ovText.textContent = 'Warteschlange: ' + m.queued + ' · Spieler online: ' + m.online;
      if (typeof m.online === 'number') $('pvpOnline').textContent = m.online + (m.online === 1 ? ' Spieler online' : ' Spieler online'); // alle Besucher der Seite
    }
    else if (m.k === 'match') { pvp.namen = Array.isArray(m.namen) ? m.namen : ['', '']; pvp.koenige = m.koenige; sozial.forderungRaus = null; toastWeg(); freundeOpen(false); pvp.konten = Array.isArray(m.acc) ? [!!m.acc[0], !!m.acc[1]] : [false, false]; pvp.frei = Array.isArray(m.frei) ? [[].concat(m.frei[0] || []), [].concat(m.frei[1] || [])] : [[], []]; startPvp(m.me === 1 ? 1 : 0, m.seed | 0); }
    else if (m.k === 't') pvpRecv(m);
    else if (m.k === 'left') { if (pvp.on && state === 'playing') finish(pvp.me, 'Dein Gegner hat die Partie verlassen.'); }
    else sozialMsg(m);
  }
  function startPvp(me, seed) {
    pvp.searching = false; pvp.on = true; pvp.ended = false; pvp.me = me; ME = me; pvp.zuschauer = false; augen(0);
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
    koenigTeam = Array.isArray(pvp.koenige) ? [String(pvp.koenige[0]), String(pvp.koenige[1])] : ['standard', 'standard'];
    intro.t = 0; spielArt = 'pvp';
    startIntro(pvp.namen && pvp.namen[0] || 'Blau', pvp.namen && pvp.namen[1] || 'Rot');
    pvp.tick = 0; pvp.acc = 0; pvp.alpha = 0; pvp.inbox = {}; pvp.sent = {}; pvp.pending = []; pvp.hashes = {}; pvp.remoteHash = {}; pvp.stall = 0;
    for (var t = 0; t < PVP_DELAY; t++) pvp.inbox[t] = { 0: [], 1: [] };
  }
  function pvpHash() {
    var h = 2166136261;
    function mix(n) { h ^= n | 0; h = Math.imul(h, 16777619); }
    mix(units.length);
    for (var i = 0; i < units.length; i++) { var u = units[i]; mix(u.id); mix(Math.round(u.x * 1000)); mix(Math.round(u.y * 1000)); mix(Math.round(u.hp * 1000)); }
    mix(gold[0]); mix(gold[1]); mix(Math.round(bases[0].hp * 100)); mix(Math.round(bases[1].hp * 100));
    return h >>> 0;
  }
  function pvpDesync() {
    if (state !== 'playing') return;
    state = 'over'; pvp.ended = true;
    showOverlay('Synchronisationsfehler', 'Die beiden Spiele sind auseinandergelaufen. Die Partie wurde abgebrochen.', 'Zum Menü', false);
  }
  function pvpCheck(t, h) {
    if (pvp.hashes[t] !== undefined) { if (pvp.hashes[t] !== h) pvpDesync(); delete pvp.hashes[t]; }
    else pvp.remoteHash[t] = h;
  }
  function pvpValid(c) { return c === 'resign' || (typeof c === 'string' && CONFIG.units[c] && !CONFIG.units[c].hidden); }
  function pvpRecv(m) {
    if (!pvp.on || typeof m.t !== 'number' || m.t < pvp.tick || m.t > pvp.tick + 60) return;
    var box = pvp.inbox[m.t] = pvp.inbox[m.t] || {};
    box[1 - pvp.me] = Array.isArray(m.c) ? m.c.filter(pvpValid).slice(0, 6) : [];
    if (typeof m.ht === 'number' && typeof m.h === 'number') pvpCheck(m.ht, m.h);
  }
  function pvpSendTick(T) {
    var target = T + PVP_DELAY, cmds = pvp.pending.splice(0, 6), msg = { k: 't', t: target, c: cmds };
    var box = pvp.inbox[target] = pvp.inbox[target] || {};
    box[pvp.me] = cmds;
    pvp.sent[target] = true;
    if (T % 20 === 0) { var h = pvpHash(); msg.ht = T; msg.h = h; if (pvp.remoteHash[T] !== undefined) { if (pvp.remoteHash[T] !== h) pvpDesync(); delete pvp.remoteHash[T]; } else pvp.hashes[T] = h; }
    pvpSend(msg);
  }
  // Darf dieses Team diese Einheit online bauen? Entscheidet nur, was der Server beim Start der Partie bestätigt hat (für beide Browser gleich)
  function pvpErlaubt(team, type) {
    var d = CONFIG.units[type];
    if (!d || !KONTO.url) return true;
    if (d.account && !(pvp.konten && pvp.konten[team])) return false;
    if (d.invite && !(pvp.konten && pvp.konten[team] && pvp.frei && pvp.frei[team] && pvp.frei[team].indexOf(type) >= 0)) return false;
    return true;
  }
  function pvpApply(team, cmds) {
    for (var i = 0; i < cmds.length && state === 'playing'; i++) {
      if (cmds[i] === 'resign') finish(1 - team, team === pvp.me ? 'Du hast aufgegeben.' : 'Dein Gegner hat aufgegeben.');
      else {
        if (team === pvp.me) for (var di = 0; di < deploys.length; di++) if (deploys[di].net && deploys[di].type === cmds[i]) { deploys.splice(di, 1); break; } // eigener Kauf kommt jetzt heraus
        if (!pvpErlaubt(team, cmds[i])) continue; // Konto-Einheit ohne (vom Server bestätigtes) Konto: gilt für beide Browser gleich
        buy(team, cmds[i]);
      }
    }
  }
  function pvpFrame(rdt) {
    // Zuschauer: sendet nichts; liegt er zurück (Einstieg mitten in der Partie), rechnet er schnell nach (bis 300 Schritte pro Bild)
    var nach = pvp.zuschauer && pvp.letzte - pvp.tick > PVP_DELAY + 4, maxS = nach ? 300 : 8;
    pvp.acc = nach ? Math.max(pvp.acc, (pvp.letzte - pvp.tick - PVP_DELAY) * STEP) : Math.min(pvp.acc + rdt, 0.5);
    var steps = 0, waited = false;
    while (pvp.acc >= STEP && steps < maxS && state === 'playing') {
      var T = pvp.tick;
      if (!pvp.zuschauer && !pvp.sent[T + PVP_DELAY]) pvpSendTick(T);
      var box = pvp.inbox[T];
      if (state !== 'playing') break;
      if (!box || !box[0] || !box[1]) { waited = true; break; } // auf den Gegner warten: das gilt für beide gleich
      for (var i = 0; i < units.length; i++) { units[i].px = units[i].x; units[i].py = units[i].y; }
      pvpApply(0, box[0]); pvpApply(1, box[1]);
      if (state === 'playing') update(STEP);
      pvp.tick = T + 1; delete pvp.inbox[T]; delete pvp.sent[T];
      pvp.acc -= STEP; steps++;
    }
    pvp.stall = waited ? pvp.stall + rdt : 0;
    if (nach && !waited) pvp.acc = 0;
    if (pvp.stall > 20 && state === 'playing' && !pvp.zuschauer) finish(pvp.me, 'Dein Gegner antwortet nicht mehr.');
    pvp.alpha = Math.min(1, pvp.acc / STEP);
  }
  // Darstellung: die 20 Spielschritte pro Sekunde werden für den Bildschirm weich überblendet
  function pvpRender() {
    var a = pvp.alpha, saved = [], i, u;
    for (i = 0; i < units.length; i++) {
      u = units[i];
      if (u.px !== undefined) {
        var dx = u.x - u.px, dy = u.y - u.py;
        if (dx * dx + dy * dy < 1) { saved.push(u, u.x, u.y); u.x = u.px + dx * a; u.y = u.py + dy * a; }
      }
    }
    render();
    for (i = 0; i < saved.length; i += 3) { saved[i].x = saved[i + 1]; saved[i].y = saved[i + 2]; }
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
    var d = CONFIG.units[type]; return preisVon(ME, type) + (d && d.karawane ? d.karawane.steigt * deploys.filter(function (x) { return x.type === type; }).length : 0);
  }
  function tryBuy(type, el) {
    if (state !== 'playing' || intro.t > 0) return; // während der Namen noch nichts kaufen
    if (btns[type] && btns[type].hidden) return; // nicht im Deck
    if (unitLocked(type)) return; // braucht ein Konto
    if (pvp.on && !pvpErlaubt(ME, type)) return; // online zählt, was der Server bestätigt hat
    var ok, pd = CONFIG.units[type];
    ok = !!pd && !pd.hidden && gold[ME] - deployGold() >= preisOnline(type) && !(pd.gebaeude && deploys.some(function (x) { return x.type === type; })) && !(tut.on && tut.avail.indexOf(type) < 0);
    if (ok && pd.wall) { // Mauer/Burg: nur, wenn keine eigenen Arbeiter unterwegs sind und kein Mauerkauf schon wartet
      if (units.some(function (w) { return w.team === ME && w.type === 'worker' && w.hp > 0 && !w.bank; }) || deploys.some(function (q) { return CONFIG.units[q.type].wall; })) ok = false;
    }
    if (ok) {
      deploys.push({ type: type, cost: preisOnline(type), t: 0, net: pvp.on }); // Gold ist ab sofort reserviert
      if (pvp.on) pvp.pending.push(type); // online: wird für beide im selben Spielschritt ausgeführt (PVP_DELAY Schritte später)
      if (el) { el.classList.remove('press'); void el.offsetWidth; el.classList.add('press'); } // Knopf drückt sich kurz ein
    }
    sfxBuy(type, ok);
    if (!ok && el) {
      el.classList.add('nope');
      setTimeout(function () { el.classList.remove('nope'); }, 300);
    }
  }

