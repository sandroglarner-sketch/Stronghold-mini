  // ---------- Menü, Story-Modus, Freunde, Herausfordern, Zuschauen (19.11.) ----------
  // spielArt = was zuletzt gestartet wurde ('story' | 'sandbox' | 'tut' | ''), für «Nochmal» und «Zur Karte»
  var spielArt = '', storyIdx = 0, storySel = 0, storySeite = 0;
  var sozial = { ich: null, liste: [], code: '', zuschauer: 0, forderungRaus: null, forderungRein: null, lastToken: null };
  var SVG = function (d, c, w) { return '<svg width="' + (w || 20) + '" height="' + (w || 20) + '" viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ICON = {
    haken: '<path d="M5 12l5 5 9-10"></path>', burg: '<path d="M4 21V8l3 2V6l3 2V4l2 2 2-2v4l3-2v4l3-2v13z"></path>',
    schloss: '<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>', krone: '<path d="M5 17l2-9 5 4 5-4 2 9z"></path><path d="M5 20h14"></path>',
    schwert: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"></path><path d="M13 19l6-6"></path><path d="M9.5 6.5 18 3h3v3l-3.5 8.5"></path>',
    auge: '<path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"></path><circle cx="12" cy="12" r="3"></circle>'
  };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ----- Startmenü -----
  function ovleftZurueck() { var l = document.querySelector('.ovleft'), top = document.querySelector('.ovtop'); if (l.parentNode !== top) top.insertBefore(l, top.firstChild); }
  function zeigeMenu() {
    ovleftZurueck();
    if (bl.live && state !== 'playing') blStop(gaveUp ? 'aufgegeben' : state === 'over' ? 'fertig' : 'verlassen');
    if (pvp.on) return;
    overlay.classList.add('menu');
    overlay.hidden = false;
    pauseBtn.hidden = false;
    $('menuBtn').hidden = true;
    sandBtn.hidden = !tester;
    applyDeck(); menuAktuell(); menuKoenig();
    sozialStatus('menu');
    geschenkPruefen(); // wartendes Geschenk vom Entwickler zeigen
  }
  function menuAktuell() {
    $('deckZahl').textContent = DECK.length + '/' + DECK_MAX; neuZahl();
    var n = storyAnzahl(), nx = storyNaechster(); // Balken = Anteil besiegter Story-Gegner (passt sich neuen Gegnern automatisch an)
    $('storyDots').innerHTML = '<i><b style="width:' + (STORY.length ? Math.round(100 * n / STORY.length) : 0) + '%"></b></i><em>' + n + ' von ' + STORY.length + ' besiegt</em>';
    $('storyText').textContent = nx < 0 ? 'Alle Gegner besiegt – spiele sie nochmals' : (storyNeu(nx) ? 'Neuer Gegner: ' : 'Weiter gegen: ') + STORY[nx].name;
    var on = sozial.liste.filter(function (f) { return f.status !== 'offline'; }).length;
    $('freundeZahl').hidden = !on; $('freundeZahl').textContent = on;
  }

  // ----- Story-Modus -----
  // Story-Fortschritt: Liste der besiegten Gegner (ids), im Browser 'stronghold-besiegt' und mit Konto auf dem Server
  (function () { // alter Spielstand (nur Anzahl) einmal in die Liste umrechnen
    try { if (localStorage.getItem('stronghold-besiegt') === null && localStorage.getItem('stronghold-story') !== null) {
      var n = parseInt(localStorage.getItem('stronghold-story') || '0', 10) || 0, v = parseInt(localStorage.getItem('stronghold-story-v') || '1', 10) || 1;
      localStorage.setItem('stronghold-besiegt', JSON.stringify((STORY_ALT[v] || STORY_ALT[1]).slice(0, n))); } } catch (e) {}
  })();
  function storyBesiegt() { // alle besiegten Story-Gegner (Browser und Server zusammen)
    var l = []; try { l = JSON.parse(localStorage.getItem('stronghold-besiegt') || '[]') || []; } catch (e) {}
    if (sozial && sozial.ich && sozial.ich.besiegt) sozial.ich.besiegt.forEach(function (id) { if (l.indexOf(id) < 0) l.push(id); }); // sozial ist beim Start (Deck laden) evtl. noch nicht gesetzt
    return l;
  }
  function istBesiegt(id) { return storyBesiegt().indexOf(id) >= 0; }
  function storyAnzahl() { var b = storyBesiegt(); return STORY.filter(function (g) { return b.indexOf(g.id) >= 0; }).length; }
  function storyFront() { var b = storyBesiegt(), f = 0; STORY.forEach(function (g, i) { if (b.indexOf(g.id) >= 0) f = i + 1; }); return f; } // erster Platz hinter dem letzten Sieg
  function storyNeu(i) { return i < storyFront() && !istBesiegt(STORY[i].id); } // später weiter vorne eingefügt: spielbar, «neu»
  function storyNaechster() { var f = storyFront(); if (f < STORY.length) return f; for (var i = 0; i < STORY.length; i++) if (!istBesiegt(STORY[i].id)) return i; return -1; }
  function storySpeichern(id) {
    var l = storyBesiegt(); if (l.indexOf(id) < 0) l.push(id);
    try { localStorage.setItem('stronghold-besiegt', JSON.stringify(l)); } catch (e) {}
    if (sozial.ich) { sozial.ich.besiegt = l.slice(); pvpSend({ k: 'story', ids: l }); }
  }
  function storySperre(i) { // '' = spielbar, sonst warum nicht (Reihenfolge oder Regel aus daten/freischalten.js)
    if (tester) return '';
    var fr = storyFront(); if (i > fr) return 'Besiege zuerst: ' + STORY[fr].name;
    var FS = CONFIG.FREI.story, ab = FS.kontoAb ? storyIndex(FS.kontoAb) : -1, r = FS.gegner[STORY[i].id] || {};
    if (ab >= 0 && i >= ab) r = { konto: true, freunde: r.freunde, besiegt: r.besiegt };
    return regelErfuellt(r) ? '' : 'Benötigt ' + regelText(r);
  }
  function storyFrei(i) { return !storySperre(i); }
  function i_konto(i) { var s = storySperre(i); return s && s.indexOf('Account') >= 0 && !(konto && konto.user); } // fehlt nur das Konto: Knopf öffnet die Anmeldung
  function storyOpen() {
    var n = storyFront();
    storySel = -1; // Feld erscheint erst beim Antippen eines Kreises
    storySeite = Math.floor(Math.min(n, STORY.length - 1) / STORY_PRO_SEITE); // Seite mit dem aktuellen Gegner
    $('story').hidden = false;
    var kopf = document.querySelector('.storykopf'); kopf.insertBefore(document.querySelector('.ovleft'), kopf.firstChild); // Kartenbuch und König auch im Story-Modus, an derselben Stelle wie im Menü
    neuZahl();
    storyMalen();
  }
  function storyMalen() {
    var n = storyFront(), h = '', bs = storyBesiegt();
    var seiten = Math.ceil(STORY.length / STORY_PRO_SEITE);
    $('storyZurueck').hidden = storySeite <= 0; $('storyWeiter').hidden = storySeite >= seiten - 1;
    $('storyRein').style.display = storySeite > 0 ? '' : 'none'; $('storyRaus').style.display = storySeite < seiten - 1 ? '' : 'none';
    STORY.forEach(function (g, i) {
      if (g.seite !== storySeite) return; // nur die Gegner dieser Seite
      var bes = bs.indexOf(g.id) >= 0, cls = bes ? 'besiegt' : storyFrei(i) ? 'offen' : 'gesperrt', ic = bes ? ICON.haken : storyFrei(i) ? '' : ICON.schloss;
      if (storyNeu(i)) h += '<div class="sneu" style="left:' + g.x + '%;top:calc(' + g.y + '% - 50px)">neu</div>'; // später eingefügter Gegner
      h += '<button type="button" class="sknoten ' + cls + (i === storySel ? ' sel' : '') + '" data-i="' + i + '" style="left:' + g.x + '%;top:' + g.y + '%" aria-label="' + esc((i + 1) + '. ' + g.name) + '"><canvas data-bild="' + g.koenig + '"' + (cls === 'gesperrt' ? ' data-grau="1"' : '') + '></canvas>' + (ic ? '<i>' + SVG(ic, '#ffffff', 14) + '</i>' : '') + '</button>' +
        '<div class="sname" style="left:' + g.x + '%;top:calc(' + g.y + '% + 38px)"><b>' + (i + 1) + ' · ' + esc(g.name) + '</b>' + (bes ? 'besiegt' : storyFrei(i) ? '' : 'gesperrt') + '</div>';
    });
    var nz = []; STORY.forEach(function (g, i) { if (storyNeu(i) && g.seite !== storySeite) nz.push(g.seite); }); // neue Gegner auf anderen Seiten: grüner Pfeil
    if (nz.length) { var zl = nz.filter(function (p) { return p < storySeite; }), zs = zl.length ? zl[zl.length - 1] : nz[0];
      h += '<button type="button" class="sneupfeil ' + (zs < storySeite ? 'links' : 'rechts') + '" data-seite="' + zs + '">' + (zs < storySeite ? '‹ ' : '') + 'Neue Gegner' + (zs < storySeite ? '' : ' ›') + '</button>'; }
    var fi = Math.min(n, STORY.length - 1), f = STORY[fi];
    if (f.seite === storySeite) h += '<div class="sfigur" style="left:' + f.x + '%;top:calc(' + f.y + '% - 36px)"><canvas data-mein="1"></canvas></div>'; // dein König im blauen Kreis
    $('storyKnoten').innerHTML = h;
    var mk = $('storyKnoten').querySelector('canvas[data-mein]'); if (mk) koenigBild(mk, meinKoenig(), 0);
    Array.prototype.forEach.call($('storyKnoten').querySelectorAll('canvas[data-bild]'), function (cv) { koenigBild(cv, cv.getAttribute('data-bild'), 1, cv.hasAttribute('data-grau')); }); // Bild: König des Bots
    // Feld direkt neben dem angeklickten Kreis (rechts, bei Platzmangel links); keine Beschreibung des Gegners
    var k = $('storyKarte');
    if (storySel < 0) { k.hidden = true; return; }
    var g = STORY[storySel], links = g.x > 62;
    k.className = 'storykarte' + (links ? ' links' : '');
    k.style.left = links ? '' : 'calc(' + g.x + '% + 40px)';
    k.style.right = links ? 'calc(' + (100 - g.x) + '% + 40px)' : '';
    k.style.top = g.y + '%';
    var bel = Object.keys(CONFIG.FREI.einheiten).filter(function (t) { return CONFIG.FREI.einheiten[t].besiegt === g.id && CONFIG.units[t]; }); // Karte(n), die ein Sieg gegen diesen Gegner freischaltet
    k.innerHTML = '<b>' + (storySel + 1) + ' · ' + esc(g.name) + '</b>' +
      (bel.length || kontoAn() ? '<span class="blabel">Belohnung</span>' + belohnungHtml(bel.map(function (t) { return [t, istBesiegt(g.id)]; }), kontoAn() ? [CONFIG.FREI.edel.bot, istBesiegt(g.id) && !!(konto && konto.user)] : null) : '') +
      (storyFrei(storySel) ? '<button class="primary" type="button" id="storyLos">' + (bs.indexOf(g.id) >= 0 ? 'Nochmal' : 'Kämpfen') + '</button>'
        : (i_konto(storySel) ? '<button class="primary" type="button" id="storyKonto">' + esc(storySperre(storySel)) + ' · 👤 Konto</button>' : '<button class="primary" type="button" disabled>' + esc(storySperre(storySel)) + '</button>'));
    k.hidden = false;
    drawCardIcons(k);
  }
  function storyStart(i) {
    storyIdx = i; spielArt = 'story';
    botType = STORY[i].bot; botEl.value = botType; aiRoll();
    $('story').hidden = true;
    start();
    sozialStatus('story', 'Story gegen ' + STORY[i].name);
  }
  // nach einer Story-Partie: Sieg gegen den aktuellen Gegner schaltet den nächsten frei; Text für das Ergebnisfenster
  function storyErgebnis(w) {
    if (spielArt !== 'story' || w !== 0) return '';
    var g = STORY[storyIdx];
    if (!g || istBesiegt(g.id)) return '';
    storySpeichern(g.id);
    var karten = Object.keys(CONFIG.FREI.einheiten).filter(function (t) { return CONFIG.FREI.einheiten[t].besiegt === g.id && CONFIG.units[t] && !unitLocked(t); }); // Belohnung: Karte(n) für diesen Sieg
    ovKarten = karten; // showOverlay zeigt sie mit Bild
    return (karten.length ? ' Neue Karte: ' + karten.map(function (t) { return CONFIG.units[t].name; }).join(', ') + '!' : '') + (storyAnzahl() >= STORY.length ? ' Du hast alle Gegner besiegt!' : '');
  }
  $('storyBtn').addEventListener('click', storyOpen);
  $('storyZu').addEventListener('click', function () { $('story').hidden = true; zeigeMenu(); });
  function storyBlaettern(d) { storySeite = Math.max(0, Math.min(Math.ceil(STORY.length / STORY_PRO_SEITE) - 1, storySeite + d)); storySel = -1; storyMalen(); }
  $('storyZurueck').addEventListener('click', function () { storyBlaettern(-1); });
  $('storyWeiter').addEventListener('click', function () { storyBlaettern(1); });
  $('storyKnoten').addEventListener('click', function (e) { var pf = e.target.closest ? e.target.closest('[data-seite]') : null; if (pf) { storyBlaettern(+pf.getAttribute('data-seite') - storySeite); return; } var b = e.target.closest ? e.target.closest('[data-i]') : null; if (!b) return; var i = +b.getAttribute('data-i'); storySel = storySel === i ? -1 : i; storyMalen(); });
  $('story').addEventListener('click', function (e) { // Klick ins Leere (nicht auf Kreis, Infofeld oder Knopf): Infofeld schliessen, kein Gegner gewählt
    if (storySel < 0 || !e.target.closest || e.target.closest('.sknoten, #storyKarte, button, [data-seite]')) return;
    storySel = -1; storyMalen();
  });
  $('storyKarte').addEventListener('click', function (e) { if (e.target.id === 'storyLos') storyStart(storySel); else if (e.target.id === 'storyKonto') kontoOpen(true); });
  $('menuBtn').addEventListener('click', function () { if (spielArt === 'story') { zeigeMenu(); storyOpen(); } else zeigeMenu(); });

  // ----- Server-Verbindung: wer bin ich, was mache ich -----
  function sendeHallo(force) {
    if (!pvp.ws || pvp.ws.readyState !== 1) return;
    var tk = konto.token || null;
    if (!force && tk === sozial.lastToken) return;
    sozial.lastToken = tk;
    pvpSend({ k: 'hallo', token: tk, v: VERSION, koenig: meinKoenig() });
  }
  function sozialStatus(s, info) { if (ONLINE) pvpSend({ k: 'status', s: s, info: info || '' }); }
  function freundeHolen() { if (ONLINE && konto.user) pvpSend({ k: 'freunde' }); }
  setInterval(function () { if (!overlay.hidden || !$('freunde').hidden) freundeHolen(); }, 15000);

  // ----- Freundesliste -----
  var FARBEN = ['#c23a2e', '#9a6f00', '#3e7c3b', '#2a64b8', '#7b4fa8', '#b35a1f'];
  function freundeOpen(on) {
    $('freunde').hidden = !on;
    if (on) $('freunde').scrollTop = 0; // immer oben öffnen (✕ sichtbar)
    if (on) { $('freundMsg').textContent = ''; freundeMalen(); freundeHolen(); }
  }
  function zeitSeit(t) { var s = Math.max(0, Math.floor((Date.now() - t) / 1000)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function gesehen(t) { if (!t) return 'Offline'; var m = Math.floor((Date.now() - new Date(t).getTime()) / 60000); return 'Offline · ' + (m < 60 ? 'vor ' + Math.max(1, m) + ' Min.' : m < 1440 ? 'vor ' + Math.floor(m / 60) + ' Std.' : 'vor ' + Math.floor(m / 1440) + ' Tagen'); }
  function freundeMalen() {
    var l = $('freundListe'), angemeldet = !!konto.user;
    $('inviteBtn').hidden = !kontoAn(); $('freundForm').hidden = !angemeldet || !ONLINE;
    var fk = Object.keys(CONFIG.FREI.einheiten).filter(function (t) { return CONFIG.FREI.einheiten[t].freunde && CONFIG.units[t]; }), ik = $('inviteKarten'); // Karten, die nur über eingeladene Freunde frei werden
    ik.hidden = !kontoAn();
    if (!ik.hidden && !fk.length) ik.innerHTML = '<p class="frinvedel">Pro Freund, der über deinen Link mind. 30 s spielt: <b>+' + CONFIG.FREI.edel.freund + ' ' + EDEL_SVG + '</b></p>'; // Belohnung = Edelsteine (Shop)
    else if (!ik.hidden) {
      ik.innerHTML = '<span class="blabel">Freund einladen und ' + (fk.length === 1 ? 'diese Karte' : 'diese Karten') + ' freischalten:</span>' + belohnungHtml(fk.map(function (t) { return [t, regelErfuellt(CONFIG.FREI.einheiten[t])]; }));
      drawCardIcons(ik);
    }
    $('meinCode').textContent = !ONLINE ? 'Freunde gibt es nur auf der Online-Seite (Render). Hier im Artifact fehlt der Server.'
      : !angemeldet ? 'Melde dich an (👤 Konto), um Freunde hinzuzufügen, herauszufordern und ihnen zuzuschauen.'
      : sozial.code ? 'Dein Code: ' + sozial.code + ' – gib ihn Freunden, oder schick ihnen deinen Einladungslink.' : '';
    if (!angemeldet || !ONLINE) { l.innerHTML = ''; return; }
    if (!sozial.liste.length) { l.innerHTML = '<p class="frmein">Noch keine Freunde. Lade jemanden ein oder gib seinen Code ein.</p>'; return; }
    var frei = state !== 'playing' && !pvp.on;
    l.innerHTML = sozial.liste.map(function (f, i) {
      var farbe = FARBEN[(f.name.charCodeAt(0) || 0) % FARBEN.length], punkt = { menu: '#1d7a3a', spiel: '#c76a00', pvp: '#c76a00', offline: '' }[f.status];
      var txt = f.status === 'menu' ? '<span style="color:#1d7a3a">Online · im Menü</span>'
        : f.status === 'pvp' ? '<span style="color:#9a5200">Im Spiel · ' + esc(f.info) + ' · ' + zeitSeit(f.seit) + '</span>'
        : f.status === 'spiel' ? '<span style="color:#9a5200">Im Spiel · ' + esc(f.info) + '</span>'
        : '<span style="color:var(--muted)">' + gesehen(f.gesehen) + '</span>';
      var knopf = f.status === 'menu' && frei ? '<button class="primary" type="button" data-fordern="' + esc(f.id) + '">' + SVG(ICON.schwert, '#ffffff', 15) + ' Herausfordern</button>'
        : f.status === 'pvp' && frei ? '<button class="ghost" type="button" data-schau="' + esc(f.id) + '">' + SVG(ICON.auge, 'currentColor', 15) + ' Zuschauen</button>' : '';
      return '<div class="frzeile"><span class="frava frkoenig"><b class="fkrund"><canvas width="36" height="36" data-fk="' + esc(f.koenig || 'standard') + '"' + (f.status === 'offline' ? ' data-grau="1"' : '') + ' aria-hidden="true"></canvas></b>' + (punkt ? '<i style="background:' + punkt + '"></i>' : '') + '</span>' +
        '<span class="frinfo"><b>' + esc(f.name) + '</b>' + txt + '<span class="frwerte">' + (typeof f.elo === 'number' ? kranzSvg(15) + ' ' + f.elo + (f.partien ? ' (' + f.partien + ' Partien)' : '') + ' · ' : '') + 'Story ' + (f.story | 0) + '/' + (f.storyMax | 0) + '</span></span>' + knopf + '</div>';
    }).join('');
    Array.prototype.forEach.call(l.querySelectorAll('canvas[data-fk]'), function (cv) { koenigBild(cv, cv.getAttribute('data-fk'), 0, !!cv.getAttribute('data-grau')); }); // Bild = gewählter König des Freundes
  }
  function freundMsg(t, err) { var m = $('freundMsg'); m.textContent = t || ''; m.classList.toggle('err', !!err); }
  $('freundeBtn').addEventListener('click', function () { $('rangliste').hidden = true; freundeOpen(true); });
  $('freundeZu').addEventListener('click', function () { freundeOpen(false); });
  $('freundForm').addEventListener('submit', function (e) { e.preventDefault(); var c = $('freundCode').value.trim().toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(c)) { freundMsg('Der Code hat 6 Zeichen (Buchstaben und Zahlen).', true); return; } pvpSend({ k: 'freund', code: c }); $('freundCode').value = ''; });
  $('freundListe').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-fordern],[data-schau]') : null; if (!b) return;
    if (b.hasAttribute('data-fordern')) { pvpSend({ k: 'fordern', an: b.getAttribute('data-fordern') }); freundMsg('Herausforderung wird geschickt …'); }
    else pvpSend({ k: 'zuschauen', id: b.getAttribute('data-schau') });
  });

  // ----- Herausforderungen -----
  function toast(text, knoepfe) { $('toastText').textContent = text; $('toastKn').hidden = !knoepfe; $('toast').hidden = false; }
  function toastWeg() { $('toast').hidden = true; sozial.forderungRein = null; }
  $('toastJa').addEventListener('click', function () { var f = sozial.forderungRein; toastWeg(); if (f) pvpSend({ k: 'antwort', id: f.id, ja: true }); });
  $('toastNein').addEventListener('click', function () { var f = sozial.forderungRein; toastWeg(); if (f) pvpSend({ k: 'antwort', id: f.id, ja: false }); });
  function forderungAbbrechen() { if (sozial.forderungRaus) pvpSend({ k: 'fordern_ab', id: sozial.forderungRaus.id }); sozial.forderungRaus = null; zeigeMenu(); }

  // ----- Zuschauen (nur Online-Partien): der Server schickt Startwert und alle bisherigen Käufe, das Spiel rechnet die Partie selbst mit -----
  function startZuschauen(m) {
    freundeOpen(false); toastWeg();
    pvp.konten = Array.isArray(m.acc) ? [!!m.acc[0], !!m.acc[1]] : [false, false];
    pvp.frei = Array.isArray(m.frei) ? [[].concat(m.frei[0] || []), [].concat(m.frei[1] || [])] : [[], []];
    pvp.namen = m.namen || ['', '']; pvp.elos = Array.isArray(m.elos) ? m.elos : [null, null];
    pvp.koenige = m.koenige;
    pvp.bot = !!m.bot; pvp.botEnde = null; // Bot-Partie: der Bot rechnet hier mit
    if (pvp.bot) { botType = CONFIG.BOTS[m.bot] ? m.bot : 'bauern'; pvp.frei = [[], []]; }
    startPvp(0, m.seed | 0);
    intro.t = 0; // Zuschauer: ohne Namens-Einblendung, gleich nachrechnen
    pvp.me = -1; pvp.zuschauer = true; pvp.letzte = 0; ME = 0;
    document.documentElement.classList.remove('guest');
    document.documentElement.classList.add('zuschauer');
    (m.log || []).forEach(function (e) { zuschauTick(e[0], e[1], e[2], e[3]); });
    if (pvp.bot && typeof m.letzte === 'number' && m.letzte > pvp.letzte) pvp.letzte = m.letzte;
    $('zText').textContent = 'Du schaust ' + pvp.namen[0] + ' gegen ' + pvp.namen[1] + ' zu';
    $('zBanner').hidden = false;
  }
  function zuschauTick(team, t, c, h) {
    if (team !== 0 && team !== 1 || typeof t !== 'number') return;
    if (pvp.bot && typeof h === 'number') pvp.zh[t] = h;
    var box = pvp.inbox[t] = pvp.inbox[t] || {};
    box[team] = Array.isArray(c) ? c.filter(pvpValid).slice(0, 6) : [];
    if (t > pvp.letzte) pvp.letzte = t;
  }
  function zuschauenEnde() { $('zBanner').hidden = true; document.documentElement.classList.remove('zuschauer'); pvp.zuschauer = false; }
  $('zRaus').addEventListener('click', function () { pvpSend({ k: 'nichtzuschauen' }); zuschauenEnde(); pvpLeave(); });
  function augen(n) {
    sozial.zuschauer = n | 0;
    var a = $('augen'); a.hidden = !((pvp.on || bl.live) && sozial.zuschauer > 0);
    $('augenZahl').textContent = sozial.zuschauer;
    a.setAttribute('aria-label', sozial.zuschauer + (sozial.zuschauer === 1 ? ' Zuschauer' : ' Zuschauer'));
    if (!a.hidden) augenPlatz();
  }

  // ----- Nachrichten vom Server (alles ausser Partie selbst) -----
  function sozialMsg(m) {
    if (m.k === 'hello') { sozial.lastToken = undefined; sendeHallo(true); return; }
    if (m.k === 'elo') { // nach einer gewerteten Online-Partie: neue Elo, Änderung im Ergebnisfenster
      if (sozial.ich) { sozial.ich.elo = m.elo; sozial.ich.partien = m.partien | 0; }
      if (!overlay.hidden && state === 'over') { var ez = document.createElement('div'); ez.className = 'ovelo'; ez.innerHTML = kranzSvg(22) + ' ' + m.elo + ' (' + (m.diff >= 0 ? '+' : '') + m.diff + ')'; ovText.appendChild(ez); }
      return;
    }
    if (m.k === 'edel') { // neuer Edelstein-Kontostand (nach Online-Partie, Story-Sieg oder Kauf); plus = gerade dazugekommen
      edelUebernehmen(m);
      if (m.plus > 0 && state === 'over' && !overlay.hidden && !overlay.classList.contains('menu')) { var ed = document.createElement('div'); ed.className = 'ovedelplus'; ed.innerHTML = '+' + m.plus + ' ' + EDEL_SVG + (m.plus === 1 ? ' Edelstein' : ' Edelsteine'); ovText.appendChild(ed); }
      return;
    }
    if (m.k === 'name_ok') { if (sozial.ich) sozial.ich.name = m.name; $('kontoName').value = m.name; kontoMsg('Gespeichert: ' + m.name, true); kontoView(); return; }
    if (m.k === 'name_fehler') { kontoMsg(m.text || 'Name nicht gespeichert.'); return; }
    if (m.k === 'ich') {
      sozial.ich = m.id ? { id: m.id, name: m.name, besiegt: Array.isArray(m.besiegt) ? m.besiegt : [], elo: typeof m.elo === 'number' ? m.elo : null, partien: m.partien | 0, rid: m.rid || '' } : null;
      if (sozial.ich) { // Siege aus dem Browser, die der Server noch nicht kennt, nachtragen
        var lokal = []; try { lokal = JSON.parse(localStorage.getItem('stronghold-besiegt') || '[]') || []; } catch (e) {}
        var fehlt = lokal.filter(function (id) { return sozial.ich.besiegt.indexOf(id) < 0; });
        try { localStorage.setItem('stronghold-besiegt', JSON.stringify(storyBesiegt())); } catch (e) {}
        if (fehlt.length) pvpSend({ k: 'story', ids: storyBesiegt() });
        if (m.decksAn) decksVomKonto(m.decks);
        freundeHolen(); }
      if (!overlay.hidden && overlay.classList.contains('menu')) menuAktuell();
      sozialStatus(state === 'playing' && !pvp.on ? (tut.on ? 'tutorial' : 'story') : 'menu', spielArt === 'story' && state === 'playing' ? 'Story gegen ' + STORY[storyIdx].name : '');
      return;
    }
    if (m.k === 'freunde') { sozial.liste = m.liste || []; sozial.code = m.code || sozial.code; if (!$('freunde').hidden) freundeMalen(); menuAktuell(); return; }
    if (m.k === 'sozialfehler') { freundMsg(m.text, true); return; }
    if (m.k === 'sozialok') { freundMsg(m.text); return; }
    if (m.k === 'forderung_raus') {
      var f = sozial.liste.filter(function (x) { return x.id === m.an; })[0];
      sozial.forderungRaus = { id: m.id };
      freundeOpen(false);
      showOverlay('Herausforderung', 'Warte auf ' + (f ? f.name : 'deinen Freund') + ' … (bis zu 30 s)', 'Abbrechen', false);
      return;
    }
    if (m.k === 'forderung_aus') {
      var grund = { zeit: 'hat nicht rechtzeitig angenommen.', abgelehnt: 'hat abgelehnt.', 'nicht frei': 'ist gerade nicht frei.', version: 'hat eine andere Spielversion. Bitte beide die Seite neu laden.' }[m.grund] || 'ist nicht verfügbar.';
      sozial.forderungRaus = null; zeigeMenu(); freundeOpen(true); freundMsg('Dein Freund ' + grund, true);
      return;
    }
    if (m.k === 'forderung') {
      if (state === 'playing' || pvp.on || pvp.searching) { pvpSend({ k: 'antwort', id: m.id, ja: false }); return; }
      sozial.forderungRein = { id: m.id, von: m.von };
      toast(m.von.name + ' fordert dich zu einem 1 vs 1 heraus', true);
      return;
    }
    if (m.k === 'forderung_weg') { if (sozial.forderungRein && sozial.forderungRein.id === m.id) toastWeg(); return; }
    if (m.k === 'zuschau') { if (state !== 'playing' && !pvp.on) startZuschauen(m); return; }
    if (m.k === 'zt') { if (pvp.zuschauer) zuschauTick(m.p, m.t, m.c, m.h); return; }
    if (m.k === 'zende') { if (pvp.zuschauer && pvp.bot) { pvp.botEnde = m.grund || 'verlassen'; return; } if (pvp.zuschauer && state === 'playing') { state = 'over'; pvp.ended = true; showOverlay('Partie beendet', 'Ein Spieler hat die Partie verlassen.', 'Zum Menü', false); } return; }
    if (m.k === 'zuschauer') { augen(m.n); return; }
  }

  var ovZumMenu = false; // Knopf im Ergebnisfenster führt ins Menü (nach dem Tutorial)
  var hinweisT = 0;
  function hinweis(t) { toast(t, false); clearTimeout(hinweisT); hinweisT = setTimeout(function () { if ($('toastKn').hidden) $('toast').hidden = true; }, 4500); }
  // Augensymbol über die Einheiten-Leiste schieben, damit es keine Karte verdeckt (die Leiste ragt unten halb ins Spielfeld)
  function augenPlatz() {
    var a = $('augen'), st = $('stage').getBoundingClientRect(), u = unitsEl.getBoundingClientRect(), ueber = st.bottom - u.top;
    a.style.bottom = Math.round(ueber > 0 && ueber < st.height / 2 ? ueber + 8 : 10) + 'px';
  }
  window.addEventListener('resize', function () { if (!$('augen').hidden) augenPlatz(); });
  sandBtn.hidden = !tester;
  menuAktuell();

  // ----- Rangliste (21.11.): öffentliche Liste nach Elo aus Online-Partien zwischen zwei Konten -----
  function rangOpen(on) {
    $('rangliste').hidden = !on;
    if (!on) return;
    $('rangliste').scrollTop = 0;
    var ich = sozial && sozial.ich;
    $('rangMein').innerHTML = !ONLINE ? 'Die Rangliste gibt es nur auf der Online-Seite.' : !ich ? 'Melde dich an (👤 Konto): Online-Partien zwischen zwei Konten zählen für die Rangliste.' : 'Du: ' + kranzSvg(18) + ' <b>' + (typeof ich.elo === 'number' ? ich.elo : 1000) + '</b> · ' + (ich.partien | 0) + ' gewertete Partien';
    var l = $('rangListe');
    if (!ONLINE) { l.innerHTML = ''; return; }
    l.innerHTML = '<p class="frmein">Lädt …</p>';
    fetch('/api/rangliste').then(function (r) { return r.json(); }).then(function (d) {
      if (d.aus) { l.innerHTML = '<p class="frmein">Die Rangliste ist noch nicht eingerichtet.</p>'; return; }
      if (!d.liste || !d.liste.length) { l.innerHTML = '<p class="frmein">Noch keine gewerteten Partien. Spiel online gegen jemanden mit Konto!</p>'; return; }
      var mein = ich && ich.rid;
      l.innerHTML = d.liste.map(function (p, i) { return '<div class="rangzeile' + (p.r === mein ? ' ich' : '') + '"><span class="rp">' + (i + 1) + '.</span><span class="rn">' + esc(p.name) + '</span><span class="re">' + kranzSvg(16) + ' ' + p.elo + '</span><span class="rs">' + p.partien + (p.partien === 1 ? ' Partie' : ' Partien') + '</span></div>'; }).join('');
    }).catch(function () { l.innerHTML = '<p class="frmein">Die Rangliste konnte nicht geladen werden.</p>'; });
  }
  $('rangBtn').addEventListener('click', function () { freundeOpen(false); rangOpen(true); });
  $('rangZu').addEventListener('click', function () { rangOpen(false); });
