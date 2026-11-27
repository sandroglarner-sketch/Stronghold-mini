  // ---------- Duokampf (27.11.): 2 gegen 2 oder 2 gegen einen zufälligen Story-Bot ----------
  // Ablauf: Menü «Duokampf» -> «Zufälliger Partner» (Server sucht) oder «Freund einladen» (Freundesliste) -> mit Partner Gegner suchen.
  // Während der Suche kann jeder «Zufälliger Bot» drücken; haben es beide gedrückt, geht es gegen einen Bot (aus dem Startwert gewürfelt).
  // Die Partie läuft wie online (Lockstep, spiel/online.js) mit 3 oder 4 Spielern; Spieler p gehört zu Team p % 2 (gemeinsam/spielzustand.js).
  // Ohne Server (Artifact) gibt es im Tester-Modus einen Duokampf gegen den Bot, in dem Tab zwischen dir und deinem Partner wechselt.
  var duoS = { phase: '', partner: null, ichBot: false, partnerBot: false, info: null }; // phase: '' | 'wahl' | 'partner' | 'gegner' | 'einladen'

  function duoDatenNachricht(k) { // was der Server über dich braucht (Deck des Partners, König, freigeschaltete Karten)
    var m = { k: k, v: VERSION, koenig: meinKoenig(), besiegt: storyBesiegt(), deck: DECK.filter(function (t) { return !unitLocked(t); }) };
    if (konto.token) m.token = konto.token;
    return m;
  }
  function duoKnoepfe() { // Zusatzknöpfe im Fenster (unter dem Text)
    $('duoFreundBtn').hidden = duoS.phase !== 'wahl';
    $('duoBotBtn').hidden = duoS.phase !== 'gegner';
    $('duoBotBtn').setAttribute('aria-pressed', duoS.ichBot ? 'true' : 'false');
    $('duoBotBtn').textContent = duoS.ichBot ? '✓ Zufälliger Bot' : 'Zufälliger Bot';
  }
  function duoFenster(titel, text) {
    showOverlay(titel, text, duoS.phase === 'wahl' ? 'Zufälliger Partner' : 'Abbrechen', false);
    $('menuBtn').hidden = duoS.phase !== 'wahl'; $('menuBtn').textContent = 'Zurück';
    duoKnoepfe();
  }
  function duoWahl() { // erstes Fenster: Partner wählen
    if (!ONLINE) {
      if (tester) { duoLokal(); return; }
      hinweis('Den Duokampf gibt es nur auf der Online-Seite (Render). Hier im Artifact fehlt der Server.');
      return;
    }
    if (neueVersion && neueVersion !== VERSION) { veraltet(neueVersion); }
    if (pvp.on || pvp.searching) return;
    spielArt = 'duo';
    duoS.phase = 'wahl';
    duoFenster('Duokampf', 'Du und ein Partner gegen zwei andere Spieler. Jeder baut mit seinem eigenen Gold, auf eurer Burg sitzen beide Könige. Verloren hat ein Team erst, wenn beide Könige gefallen sind.');
  }
  function duoVerbinden(dann) { // wie die Gegnersuche: der Gratis-Server braucht evtl. bis zu einer Minute zum Aufwachen
    pvp.searching = true; pvp.ended = false; pvp.tries = 0;
    if (pvp.ws && pvp.ws.readyState === 1) dann(); else { pvpClose(); pvpOpen(dann); }
  }
  function duoZufall() {
    duoS.phase = 'partner'; duoS.ichBot = duoS.partnerBot = false;
    duoFenster('Duokampf', 'Suche einen Partner …');
    duoVerbinden(function () { pvpSend(duoDatenNachricht('duo_suche')); });
  }
  function duoAbbrechen() { // Suche oder Team verlassen (vor der Partie)
    pvpSend({ k: 'duo_ab' });
    duoS.phase = ''; duoS.partner = null; pvp.searching = false;
    duoKnoepfe(); showMenu();
  }
  function duoStatusText() {
    var p = duoS.partner, t = '';
    if (duoS.phase === 'partner') t = 'Suche einen Partner …';
    else if (duoS.phase === 'gegner') {
      t = 'Suche Gegner …';
      var andere = duoS.info ? Math.max(0, duoS.info.teams - 1) : 0; // ohne euer eigenes Team
      if (andere) t += ' (' + andere + (andere === 1 ? ' anderes Team wartet' : ' andere Teams warten') + ')';
      t += duoS.ichBot && duoS.partnerBot ? '' : duoS.ichBot ? ' Du willst gegen einen Bot spielen – wartet auf ' + (p ? p.name : 'deinen Partner') + '.' : duoS.partnerBot ? ' ' + (p ? p.name : 'Dein Partner') + ' möchte gegen einen zufälligen Bot spielen.' : ' Oder spielt zu zweit gegen einen zufälligen Bot.';
    }
    ovText.textContent = t;
    if (duoS.phase === 'gegner' && p) { // Partner mit Farbe und Deck
      var el = document.createElement('div'); el.className = 'ovduo';
      el.innerHTML = '<span><i style="background:' + farbeVon(0) + '"></i><b>' + esc(meinName()) + '</b></span><span><i style="background:' + farbeVon(2) + '"></i><b>' + esc(p.name) + '</b> (Partner)</span>';
      ovText.appendChild(el);
    }
  }
  function duoMsg(m) {
    if (m.k === 'duo_info') { duoS.info = m; if (duoS.phase === 'partner' || duoS.phase === 'gegner') duoStatusText(); return; }
    if (m.k === 'duo_team') { // Partner gefunden: jetzt Gegner suchen
      toastWeg(); freundeOpen(false); sozial.forderungRaus = null;
      duoS.phase = 'gegner'; duoS.partner = m.partner || { name: 'Partner', koenig: 'standard', deck: [] }; duoS.ichBot = duoS.partnerBot = false;
      pvp.searching = true;
      duoFenster('Duokampf', ''); duoStatusText();
      jingle('start');
      return;
    }
    if (m.k === 'duo_bot') { duoS.partnerBot = !!m.an; if (duoS.phase === 'gegner') duoStatusText(); return; }
    if (m.k === 'duo_partnerweg') {
      var name = duoS.partner ? duoS.partner.name : 'Dein Partner'; duoS.partner = null; duoS.ichBot = duoS.partnerBot = false;
      if (m.weiter) { duoS.phase = 'partner'; duoFenster('Duokampf', ''); duoStatusText(); hinweis(name + ' hat die Suche verlassen. Du suchst einen neuen Partner.'); }
      else { duoS.phase = ''; pvp.searching = false; showMenu(); hinweis(name + ' hat das Team verlassen.'); }
      return;
    }
    if (m.k === 'duo_match') { duoStarten(m); return; }
    if (m.k === 'duo_weg') { // ein Mitspieler hat die Partie verlassen: ab Schritt ab rechnen alle ohne ihn (sein König fällt)
      if (!duo.on || !pvp.on || typeof m.p !== 'number' || duo.spieler.indexOf(m.p) < 0 || m.p === MP) return;
      duo.weg[m.p] = Math.max(PVP_DELAY, m.ab | 0);
      if (state === 'playing') hinweis((duo.namen[m.p] || 'Ein Spieler') + ' hat die Partie verlassen.');
      return;
    }
  }
  // Partie beginnt: alle Browser bekommen dieselben Daten (Plätze 0–3, Startwert, Namen, Könige, Decks, freigeschaltete Karten)
  function duoStarten(m) {
    var ich = m.sitz | 0;
    duoS.phase = ''; duoKnoepfe(); toastWeg(); freundeOpen(false);
    duo.on = true; duo.bot = !!m.bot; duo.spieler = m.bot ? [0, 1, 2] : [0, 1, 2, 3]; duo.weg = {};
    duo.namen = Array.isArray(m.namen) ? m.namen.map(String) : ['', '', '', ''];
    duo.decks = Array.isArray(m.decks) ? m.decks : [[], [], [], []];
    pvp.bot = false; pvp.botEnde = null; pvp.elos = [null, null];
    pvp.koenige = Array.isArray(m.koenige) ? m.koenige.slice(0, 4) : ['standard', 'standard', 'standard', 'standard'];
    pvp.frei = [0, 1, 2, 3].map(function (i) { return Array.isArray(m.frei) && Array.isArray(m.frei[i]) ? m.frei[i].slice() : []; });
    pvp.konten = [0, 1, 2, 3].map(function (i) { return !!(Array.isArray(m.acc) && m.acc[i]); });
    if (duo.bot) duoBotWuerfeln(m.seed | 0);
    pvp.namen = [duoTeamName(0), duoTeamName(1)];
    startPvp(ich % 2, m.seed | 0, ich);
  }
  // Bot für «2 gegen Bot»: aus dem Startwert, damit alle Browser denselben nehmen (alle Story-Gegner, egal ob besiegt)
  function duoBotWuerfeln(seed) {
    var g = STORY[seed % STORY.length] || { bot: 'bauern', name: 'Der Bandit', koenig: 'bandit' };
    botType = CONFIG.BOTS[g.bot] ? g.bot : 'bauern';
    duo.namen[1] = g.name; duo.botName = g.name;
    if (pvp.koenige) pvp.koenige[1] = g.koenig || botEintrag(botType).koenig;
  }
  function duoTeamName(team) { return spielerIm(team).map(function (p) { return duo.namen[p] || ''; }).join(' & '); }
  function duoIntro() { // Namen beider Teams wie im 1 vs 1, dazu das Deck deines Partners
    startIntro(duoTeamName(0), duoTeamName(1), null);
    var partner = MP < 2 ? MP + 2 : MP - 2, dk = (duo.decks[partner] || []).filter(function (t) { return CONFIG.units[t] && !CONFIG.units[t].hidden; }), el = $('duoDeck');
    clearTimeout(duoS.deckT); clearTimeout(duoS.deckT2);
    if (!dk.length) { el.hidden = true; return; }
    el.style.borderColor = farbeVon(partner);
    el.innerHTML = '<b>Deck von ' + esc(duo.namen[partner] || 'deinem Partner') + '</b><span class="ddk">' + dk.map(function (t) { return '<canvas width="88" height="88" data-t="' + t + '" title="' + esc(CONFIG.units[t].name) + '"></canvas>'; }).join('') + '</span>';
    el.querySelectorAll('canvas').forEach(function (cv) { // in der Farbe des Partners
      var t = cv.getAttribute('data-t'), c = cv.getContext('2d'), ext = ICON_EXT[t] || [1, 2], span = ext[0] + ext[1], r = Math.min(24, 78 / span);
      drawUnit(c, t, (88 - span * r) / 2 + ext[0] * r, 44, r, partner, 1, 0, t !== 'ladder');
    });
    el.classList.remove('weg'); el.hidden = false;
    duoS.deckT = setTimeout(function () { el.classList.add('weg'); }, 7000);
    duoS.deckT2 = setTimeout(function () { el.hidden = true; }, 7700);
  }
  function duoResign(p) { // Spieler p gibt auf (oder ist gegangen): sein König fällt, er kauft nichts mehr; sein Team verliert erst ohne Könige
    if (kTot[p] === Infinity) return;
    duoAufgeben(p);
    if (p === MP) {
      deploys = [];
      var partnerDa = spielerIm(ME).some(function (q) { return q !== MP && kTot[q] !== Infinity; });
      showOverlay('Aufgegeben', 'Dein König ist gefallen.' + (partnerDa ? ' Dein Partner kämpft allein weiter.' : ''), 'Zum Menü', false);
      if (!partnerDa) return; // das Team ist besiegt: das Ergebnis folgt gleich (finish)
      pvp.ended = true; // «Zum Menü» verlässt die Partie
    } else if (!duo.weg[p] || pvp.tick !== duo.weg[p]) hinweis((duo.namen[p] || 'Ein Spieler') + ' hat aufgegeben.');
  }
  // Sind die Befehle aller Spieler für Schritt T da? Bot und gegangene Spieler: leer (beim Gehen einmal 'resign')
  function duoBoxFertig(T, box) {
    for (var i = 0; i < duo.spieler.length; i++) {
      var p = duo.spieler[i], ab = duo.weg[p];
      if (duo.bot && p === 1) { box[1] = []; continue; }
      if (ab !== undefined && T >= ab) { if (!box[p]) box[p] = T === ab ? ['resign'] : []; continue; }
      if (!box[p]) return false;
    }
    return true;
  }
  function duoAus() { // nach der Partie (pvpLeave) oder beim Verlassen
    duo.on = false; duo.bot = false; duo.spieler = [0, 1]; duo.weg = {}; duo.namen = []; duo.decks = [];
    duoS.phase = ''; duoS.partner = null; duoKnoepfe();
    clearTimeout(duoS.deckT); clearTimeout(duoS.deckT2); $('duoDeck').hidden = true;
    koenigTeam = [meinKoenig(), botEintrag(botType).koenig, 'standard', 'standard'];
  }

  // ----- Tester (ohne Server): du und ein Partner gegen einen zufälligen Bot; Tab wechselt, für wen du kaufst -----
  function duoLokal() {
    duo.on = true; duo.bot = true; duo.spieler = [0, 1, 2]; duo.weg = {};
    var seed = 1 + Math.floor(Math.random() * 2147483646);
    duo.namen = [meinName(), '', 'Partner']; duo.decks = [DECK.slice(), [], DECK.slice()];
    pvp.koenige = [meinKoenig(), 'standard', 'standard'];
    duoBotWuerfeln(seed);
    spielArt = 'duolokal'; MP = 0; ME = 0;
    start(); // setzt die Könige und zeigt Namen und Deck (duoIntro)
    hinweis('Tester-Duokampf gegen ' + duo.botName + ': Tab wechselt zwischen dir (blau) und deinem Partner (violett).');
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !duo.on || pvp.on || state !== 'playing') return;
    e.preventDefault();
    MP = MP === 0 ? 2 : 0; ui.gm = -1;
    hinweis('Du kaufst jetzt für ' + (MP === 0 ? 'dich (blau)' : 'den Partner (violett)') + '.');
  });

  $('duoBtn').addEventListener('click', duoWahl);
  $('duoFreundBtn').addEventListener('click', function () { // Freund einladen: Freundesliste mit «Einladen»-Knöpfen
    if (!konto.user) { hinweis('Zum Einladen brauchst du ein Konto (👤 Konto).'); return; }
    sozial.duoEinladen = true; freundeOpen(true);
  });
  $('duoBotBtn').addEventListener('click', function (e) {
    if (duoS.phase !== 'gegner') return;
    duoS.ichBot = !duoS.ichBot; pvpSend({ k: 'duo_bot', an: duoS.ichBot });
    duoKnoepfe(); duoStatusText();
    if (e.detail > 0) $('duoBotBtn').blur();
  });
  // Knopf im Fenster: in der Wahl «Zufälliger Partner», sonst «Abbrechen» (true = erledigt)
  function duoOvBtn() {
    if (duoS.phase === 'wahl') { duoZufall(); return true; }
    if (duoS.phase === 'partner' || duoS.phase === 'gegner') { duoAbbrechen(); return true; }
    return false;
  }
