  // ---------- Konto (Supabase) ----------
  // Gratis-Konto mit E-Mail und Passwort. Welche Karten ein Konto, Freunde oder Story-Siege brauchen, steht in daten/freischalten.js.
  // Die Anmeldung läuft direkt gegen Supabase Auth (REST, ohne Bibliothek). Sitzung im Browser: localStorage 'stronghold-konto'.
  // Online-Partien: der Browser schickt sein Zugangs-Token mit, der Server prüft es bei Supabase und meldet beiden Spielern, wer ein Konto hat.
  // Einladungen (nur auf der Online-Seite, der Render-Server führt Buch): konto.code = eigener Einladungscode, konto.freunde = Anzahl Freunde,
  // die über den Link gespielt haben, konto.einheiten = freigeschaltete Einheiten (z. B. 'crossbow')
  var konto = { user: null, token: null, refresh: null, exp: 0, code: '', freunde: 0, einheiten: [] };
  function kontoAn() { return !!KONTO.url; }
  // Freischaltungen nach daten/freischalten.js
  function storyIndex(botId) { for (var i = 0; i < STORY.length; i++) if (STORY[i].id === botId) return i; return -1; }
  function botName(botId) { for (var i = 0; i < BOT_DB.length; i++) if (BOT_DB[i].id === botId) return BOT_DB[i].name; return botId; }
  function regelErfuellt(r) { // alles in der Regel erfüllt? (Konto, Freunde, Story-Sieg)
    var k = konto || {};
    if (!r) return true;
    if ((r.konto || r.freunde) && !k.user) return false;
    if (r.freunde && (k.freunde | 0) < r.freunde) return false;
    if (r.besiegt) { var si = storyIndex(r.besiegt); if (si >= 0 && storyStand() <= si) return false; }
    return true;
  }
  function regelText(r, kurz) { // «benötigt Account und 2 eingeladene Freunde» / «Sieg gegen …»
    var k = konto || {}, l = [];
    if ((r.konto || r.freunde) && !k.user) l.push('Account');
    if (r.freunde && (k.freunde | 0) < r.freunde) l.push(r.freunde === 1 ? 'einen eingeladenen Freund' : r.freunde + ' eingeladene Freunde');
    if (r.besiegt) { var si = storyIndex(r.besiegt); if (si >= 0 && storyStand() <= si) l.push('einen Sieg gegen ' + botName(r.besiegt)); }
    return l.join(' und ');
  }
  function unitLocked(t) {
    var d = CONFIG.units[t], r = CONFIG.FREI.einheiten[t];
    if (!d || !r || !kontoAn() || tester) return false; // Tester-Modus: alles frei
    if (((konto || {}).einheiten || []).indexOf(t) >= 0) return false; // vom Server freigeschaltet (Regeln oder von Hand)
    return !regelErfuellt(r);
  }
  function kontoKarten() { var l = Object.keys(CONFIG.FREI.einheiten).filter(function (t) { var r = CONFIG.FREI.einheiten[t]; return CONFIG.units[t] && !CONFIG.units[t].hidden && r.konto && !r.freunde && !r.besiegt; }).map(function (t) { return CONFIG.units[t].name; }); return l.length > 1 ? l.slice(0, -1).join(', ') + ' und ' + l[l.length - 1] : l.join(''); } // Karten, die allein ein Konto freischaltet
  function lockText(t) {
    var r = CONFIG.FREI.einheiten[t] || {}, txt = regelText(r);
    if (r.freunde && konto && konto.user && !r.besiegt) return 'Nicht freigeschaltet – lade ' + (r.freunde === 1 ? 'einen Freund' : r.freunde + ' Freunde') + ' ein (👥 Freund einladen)';
    return 'Nicht freigeschaltet – benötigt ' + (txt || 'Account');
  }
  function kontoSave() {
    try { if (konto.user) localStorage.setItem('stronghold-konto', JSON.stringify(konto)); else localStorage.removeItem('stronghold-konto'); } catch (err) {}
  }
  function kontoSet(r) { // Antwort von Supabase mit access_token übernehmen
    konto.user = (r.user && r.user.email) || konto.user;
    konto.token = r.access_token; konto.refresh = r.refresh_token;
    konto.exp = Date.now() + (r.expires_in || 3600) * 1000;
    kontoSave(); kontoChanged(); kontoServer();
  }
  function kontoClear() { konto = { user: null, token: null, refresh: null, exp: 0, code: '', freunde: 0, einheiten: [] }; kontoSave(); kontoChanged(); }
  function kontoApi(pfad, body, token, methode) {
    return fetch(KONTO.url + pfad, {
      method: methode || 'POST',
      headers: token ? { 'apikey': KONTO.key, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'apikey': KONTO.key, 'Content-Type': 'application/json' }, // neue «publishable» Keys gehören nur in apikey, nie als Bearer
      body: (methode || 'POST') === 'GET' ? undefined : JSON.stringify(body || {})
    }).then(function (res) {
      return res.text().then(function (t) { var j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) {} if (!res.ok) { var er = new Error(j.msg || j.error_description || j.message || j.error || ('Fehler ' + res.status)); er.status = res.status; er.code = j.error_code || j.code; throw er; } return j; });
    });
  }
  function kontoFehler(e) {
    var m = String((e && e.message) || ''), c = String((e && e.code) || '');
    if (/invalid login credentials|invalid_credentials/i.test(m + c)) return 'E-Mail oder Passwort ist falsch.';
    if (/already registered|already been registered|user_already_exists/i.test(m + c)) return 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.';
    if (/password/i.test(m) && /6|short|weak/i.test(m + c)) return 'Das Passwort braucht mindestens 6 Zeichen.';
    if (/email/i.test(m) && /invalid|valid/i.test(m)) return 'Bitte eine gültige E-Mail eingeben.';
    if (/not confirmed|email_not_confirmed/i.test(m + c)) return 'Bitte zuerst die E-Mail bestätigen (Link im Postfach).';
    if (/rate|too many/i.test(m + c)) return 'Zu viele Versuche. Bitte kurz warten.';
    if (/failed to fetch|network/i.test(m)) return 'Keine Verbindung. Bitte später nochmals versuchen.';
    return 'Das hat nicht geklappt (' + m + ').';
  }
  // Token rechtzeitig erneuern (Supabase-Token gelten 1 Stunde)
  function kontoRefresh() {
    if (!konto.refresh) return Promise.resolve(false);
    return kontoApi('/auth/v1/token?grant_type=refresh_token', { refresh_token: konto.refresh }).then(function (r) { kontoSet(r); return true; })
      .catch(function (e) { if (e.status === 400 || e.status === 401 || e.status === 403) kontoClear(); return false; }); // ungültig: abmelden; ohne Netz: Konto behalten
  }
  // Nach jeder Änderung: gesperrte Einheiten aus dem Deck, Knöpfe, Buch und Kontofenster aktualisieren
  function kontoChanged() {
    var kb = $('kontoBtn');
    kb.hidden = !kontoAn();
    $('inviteBtn').hidden = !kontoAn(); // auch im Artifact sichtbar (dort nur Hinweis)
    kb.textContent = konto.user ? '👤 ' + konto.user.split('@')[0] : '👤 Konto';
    if (kontoAn() && !konto.user) {
      var rest = DECK.filter(function (t) { return !unitLocked(t); });
      if (rest.length !== DECK.length) { DECK = rest.length ? rest : DECK_START.slice(); saveDeck(); }
    }
    applyDeck();
    if (!$('book').hidden) renderBook();
    kontoView();
    if (sozial) { sendeHallo(); if (!konto.user) { sozial.liste = []; sozial.code = ''; } freundeMalen(); menuAktuell(); }
  }
  var kontoPwModus = ''; // '' | 'aendern' (angemeldet) | 'reset' (aus dem Link der Passwort-vergessen-Mail)
  // Eigene Einladungsdaten vom Render-Server holen (nur online, nur angemeldet)
  var kontoServerLaeuft = false, kontoServerFehler = ''; // letzte Fehlermeldung des Servers (zur Fehlersuche angezeigt)
  function kontoServer() {
    if (!ONLINE || !konto.token || kontoServerLaeuft) return Promise.resolve(false);
    kontoServerLaeuft = true;
    return fetch('/api/konto', { method: 'POST', headers: { 'Authorization': 'Bearer ' + konto.token } }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { kontoServerFehler = r.ok ? '' : 'Code ' + r.status + (j && j.fehler ? ': ' + j.fehler : ''); return r.ok ? j : null; });
    }).then(function (j) {
      kontoServerLaeuft = false;
      if (!j || !j.code) return false;
      var erste = !konto.code, vorher = konto.einheiten || [], neu = (j.einheiten || []).filter(function (t) { return vorher.indexOf(t) < 0 && CONFIG.units[t]; });
      konto.code = j.code; konto.freunde = j.freunde | 0; konto.einheiten = j.einheiten || [];
      kontoSave(); kontoChanged();
      if (neu.length && !erste) { kontoOpen(true); kontoMsg('🎉 Freigeschaltet: ' + neu.map(function (t) { return CONFIG.units[t].name; }).join(', ') + '.', true); }
      return true;
    }).catch(function (e) { kontoServerLaeuft = false; kontoServerFehler = 'keine Verbindung zum Server'; return false; });
  }
  function einladeLink() { return location.origin + location.pathname + '?von=' + konto.code; }
  function kontoView() {
    var on = !!konto.user, pw = on && !!kontoPwModus;
    $('kontoTitel').textContent = kontoPwModus === 'reset' ? 'Neues Passwort' : pw ? 'Passwort ändern' : on ? 'Dein Konto' : 'Gratis-Konto';
    $('kontoText').textContent = kontoPwModus === 'reset' ? 'Wähle ein neues Passwort für ' + konto.user + '.' : pw ? 'Neues Passwort für ' + konto.user + '.' :
      on ? 'Angemeldet als ' + konto.user + '. ' + kontoKarten() + ' sind freigeschaltet.' : 'Mit einem Gratis-Konto schaltest du ' + kontoKarten() + ' frei.';
    $('kontoForm').hidden = on;
    $('kontoPwForm').hidden = !pw;
    $('kontoIn').hidden = !on || pw;
    var inv = on && !pw && ONLINE && !!konto.code;
    $('kontoInv').hidden = !inv;
    if (inv) {
      var frei = (konto.einheiten || []).indexOf('crossbow') >= 0;
      $('kontoInvText').textContent = (frei ? '✓ Armbrustschütze freigeschaltet. ' : 'Spielt ein Freund über deinen Link eine Partie, bekommst du den Armbrustschützen. ') + 'Eingeladene Freunde: ' + (konto.freunde || 0) + '.';
      $('kontoLink').value = einladeLink();
    }
  }
  function kontoMsg(t, ok) { var m = $('kontoMsg'); m.textContent = t || ''; m.classList.toggle('ok', !!ok); }
  function kontoOpen(on) {
    $('konto').hidden = !on;
    if (!on) kontoPwModus = '';
    if (on) { kontoMsg(''); kontoView(); if (!konto.user) $('kontoMail').focus(); else kontoServer(); }
  }
  function kontoBusy(b) { ['kontoLogin', 'kontoReg', 'kontoOut', 'kontoVergessen', 'kontoPwSave', 'kontoPwBtn'].forEach(function (id) { $(id).disabled = b; }); }
  function kontoEingabe() {
    var mail = $('kontoMail').value.trim(), pw = $('kontoPw').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { kontoMsg('Bitte eine gültige E-Mail eingeben.'); return null; }
    if (pw.length < 6) { kontoMsg('Das Passwort braucht mindestens 6 Zeichen.'); return null; }
    return { email: mail, password: pw };
  }
  function kontoLogin(e) {
    if (e) e.preventDefault();
    var d = kontoEingabe(); if (!d) return;
    kontoBusy(true); kontoMsg('Anmelden …', true);
    kontoApi('/auth/v1/token?grant_type=password', d).then(function (r) { kontoSet(r); $('kontoPw').value = ''; kontoMsg('Willkommen! Du bist angemeldet.', true); })
      .catch(function (er) { kontoMsg(kontoFehler(er)); }).then(function () { kontoBusy(false); });
  }
  function kontoRegister() {
    var d = kontoEingabe(); if (!d) return;
    kontoBusy(true); kontoMsg('Konto wird erstellt …', true);
    kontoApi('/auth/v1/signup', d).then(function (r) {
      if (r.access_token) { kontoSet(r); $('kontoPw').value = ''; kontoMsg('Konto erstellt. Viel Spass!', true); }
      else kontoMsg('Fast geschafft: Bitte bestätige deine E-Mail (Link im Postfach) und melde dich dann an.', true);
    }).catch(function (er) { kontoMsg(kontoFehler(er)); }).then(function () { kontoBusy(false); });
  }
  // Passwort vergessen: Supabase schickt eine Mail mit Link zurück auf diese Seite (#access_token=…&type=recovery)
  function kontoVergessen() {
    var mail = $('kontoMail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { kontoMsg('Gib oben deine E-Mail ein, dann nochmals auf «Passwort vergessen?» tippen.'); return; }
    kontoBusy(true); kontoMsg('Mail wird verschickt …', true);
    var zurueck = location.origin + location.pathname;
    kontoApi('/auth/v1/recover?redirect_to=' + encodeURIComponent(zurueck), { email: mail }).then(function () {
      kontoMsg('Falls es ein Konto mit dieser E-Mail gibt, ist jetzt eine Mail unterwegs. Öffne den Link darin, dann kannst du ein neues Passwort wählen.', true);
    }).catch(function (er) { kontoMsg(kontoFehler(er)); }).then(function () { kontoBusy(false); });
  }
  // Neues Passwort speichern (angemeldet oder über den Link aus der Mail)
  function kontoPwSpeichern(e) {
    if (e) e.preventDefault();
    var pw = $('kontoPwNeu').value;
    if (pw.length < 6) { kontoMsg('Das Passwort braucht mindestens 6 Zeichen.'); return; }
    kontoBusy(true); kontoMsg('Speichern …', true);
    var los = konto.exp - Date.now() < 60 * 1000 ? kontoRefresh() : Promise.resolve(true);
    los.then(function () { return kontoApi('/auth/v1/user', { password: pw }, konto.token, 'PUT'); }).then(function () {
      $('kontoPwNeu').value = ''; kontoPwModus = ''; kontoView(); kontoMsg('Dein neues Passwort ist gespeichert.', true);
    }).catch(function (er) { kontoMsg(/same|different/i.test(er.message) ? 'Das neue Passwort muss anders sein als das alte.' : kontoFehler(er)); }).then(function () { kontoBusy(false); });
  }
  function kontoLogout() {
    var tk = konto.token;
    kontoClear(); kontoMsg('Du bist abgemeldet.', true);
    if (tk) kontoApi('/auth/v1/logout', {}, tk).catch(function () {});
  }
  // Freund einladen: Link über das Teilen-Menü des Handys schicken (sonst kopieren)
  function kopieren(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    var f = $('kontoLink'); f.focus(); f.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} return Promise.resolve(ok);
  }
  function teilen() {
    var weiter = konto.code ? Promise.resolve(true) : kontoServer();
    weiter.then(function () {
      if (!konto.code) { kontoOpen(true); kontoMsg('Einladen geht gerade nicht' + (kontoServerFehler ? ' (' + kontoServerFehler + ')' : '') + '. Bitte später nochmals versuchen.'); return; }
      var url = einladeLink(), text = 'Spiel mit mir Stronghold Mini – ein kleines Burgen-Strategiespiel im Browser!';
      if (navigator.share) navigator.share({ title: 'Stronghold Mini', text: text, url: url }).catch(function () {});
      else kopieren(url).then(function (ok) { kontoOpen(true); kontoMsg(ok ? 'Link kopiert – schick ihn deinem Freund.' : 'Kopiere den Link oben und schick ihn deinem Freund.', true); });
    });
  }
  $('inviteBtn').addEventListener('click', function () {
    if (!ONLINE) { kontoOpen(true); kontoMsg('Einladen geht nur auf der Online-Seite (Render). Hier im Artifact fehlt der Server.'); return; }
    if (!konto.user) { kontoOpen(true); kontoMsg('Melde dich zuerst an (gratis). Dann bekommst du deinen Einladungslink.', true); return; }
    teilen();
  });
  $('kontoShare').addEventListener('click', teilen);
  $('kontoCopy').addEventListener('click', function () { kopieren(einladeLink()).then(function (ok) { kontoMsg(ok ? 'Link kopiert.' : 'Bitte den Link oben von Hand kopieren.', ok); }); });
  // Eingeladen worden? ?von=CODE merken; nach der ersten Partie (mind. 30 s) dem Einladenden gutschreiben, einmal pro Gerät
  function geraetId() {
    var g = ''; try { g = localStorage.getItem('stronghold-geraet') || ''; } catch (e) {}
    if (!/^[a-z0-9]{8,40}$/.test(g)) { g = ''; for (var i = 0; i < 20; i++) g += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36)); try { localStorage.setItem('stronghold-geraet', g); } catch (e) {} }
    return g;
  }
  (function () {
    var m = /[?&]von=([A-Za-z0-9]{6})(?:&|$)/.exec(location.search);
    if (!m) return;
    try { if (!localStorage.getItem('stronghold-von-ok')) localStorage.setItem('stronghold-von', m[1].toUpperCase()); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  })();
  function einladungGespielt() {
    if (!ONLINE || clock < 30) return;
    var code = ''; try { if (localStorage.getItem('stronghold-von-ok')) return; code = localStorage.getItem('stronghold-von') || ''; } catch (e) { return; }
    if (!code) return;
    var h = { 'Content-Type': 'application/json' }; if (konto.token) h.Authorization = 'Bearer ' + konto.token;
    fetch('/api/besuch', { method: 'POST', headers: h, body: JSON.stringify({ code: code, geraet: geraetId() }) }).then(function (r) {
      if (r.ok || r.status === 400 || r.status === 404) { try { localStorage.setItem('stronghold-von-ok', '1'); localStorage.removeItem('stronghold-von'); } catch (e) {} } // erledigt (oder ungültig): nicht nochmals senden
    }).catch(function () {}); // ohne Netz: beim nächsten Mal nochmals
  }
  $('kontoBtn').addEventListener('click', function () { kontoOpen(true); });
  // Tester-Modus ein/aus (Knopf oben, nur ausserhalb der Online-Seite)
  function testerSync() {
    var b = $('testerBtn'); b.hidden = ONLINE; b.setAttribute('aria-pressed', String(tester)); b.classList.toggle('on', tester);
    b.textContent = tester ? 'Tester Modus ✓' : 'Tester Modus';
    if (state !== 'playing' && state !== 'paused' && !pvp.on) sandBtn.hidden = !tester;
    if (sozial && !$('story').hidden) storyMalen();
    if (sozial) menuAktuell();
  }
  $('testerBtn').addEventListener('click', function () {
    tester = !tester;
    try { localStorage.setItem('stronghold-tester', tester ? '1' : '0'); } catch (e) {}
    testerSync(); kontoChanged();
  });
  testerSync();
  $('kontoClose').addEventListener('click', function () { kontoOpen(false); });
  $('kontoForm').addEventListener('submit', kontoLogin);
  $('kontoReg').addEventListener('click', kontoRegister);
  $('kontoOut').addEventListener('click', kontoLogout);
  $('kontoVergessen').addEventListener('click', kontoVergessen);
  $('kontoPwBtn').addEventListener('click', function () { kontoPwModus = 'aendern'; kontoMsg(''); kontoView(); $('kontoPwNeu').focus(); });
  $('kontoPwAbbr').addEventListener('click', function () { kontoPwModus = ''; kontoMsg(''); kontoView(); });
  $('kontoPwForm').addEventListener('submit', kontoPwSpeichern);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('konto').hidden) kontoOpen(false); });
  // Start: gespeicherte Sitzung übernehmen und im Hintergrund erneuern
  try { var ks = JSON.parse(localStorage.getItem('stronghold-konto') || 'null'); if (ks && ks.user && ks.refresh) konto = ks; } catch (err) {}
  // Zurück aus der Passwort-vergessen-Mail: Anmeldedaten stehen hinter # in der Adresse
  (function () {
    var h = location.hash || '';
    if (!kontoAn() || h.indexOf('access_token=') < 0 && h.indexOf('error=') < 0) return;
    var q = {}; h.slice(1).split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {} // Token nicht in der Adresse lassen
    if (q.error) { setTimeout(function () { kontoOpen(true); kontoMsg(/expired/i.test(q.error_code + q.error_description) ? 'Der Link ist abgelaufen. Fordere unten einen neuen an.' : 'Der Link hat nicht funktioniert. Fordere unten einen neuen an.'); }, 0); return; }
    konto.token = q.access_token; konto.refresh = q.refresh_token || konto.refresh; konto.exp = Date.now() + (Number(q.expires_in) || 3600) * 1000;
    kontoApi('/auth/v1/user', null, konto.token, 'GET').then(function (u) { // E-Mail zum Token holen
      konto.user = u.email; kontoSave(); kontoChanged();
      if (q.type === 'recovery') { kontoPwModus = 'reset'; kontoOpen(true); $('kontoPwNeu').focus(); }
    }).catch(function () { kontoClear(); kontoOpen(true); kontoMsg('Der Link hat nicht funktioniert. Fordere unten einen neuen an.'); });
  })();
  if (!konto.einheiten) konto.einheiten = [];
  kontoChanged();
  if (kontoAn() && konto.refresh) kontoRefresh(); else kontoServer();
  setInterval(function () { if (kontoAn() && konto.refresh && konto.exp - Date.now() < 10 * 60 * 1000) kontoRefresh(); }, 60 * 1000);
