  // ---------- Konto (Supabase) ----------
  // Gratis-Konto mit E-Mail und Passwort. Mit Konto sind Einheiten mit account: true frei (Belagerungsturm, Trebuchet).
  // Die Anmeldung läuft direkt gegen Supabase Auth (REST, ohne Bibliothek). Sitzung im Browser: localStorage 'stronghold-konto'.
  // Online-Partien: der Browser schickt sein Zugangs-Token mit, der Server prüft es bei Supabase und meldet beiden Spielern, wer ein Konto hat.
  var konto = { user: null, token: null, refresh: null, exp: 0 };
  function kontoAn() { return !!KONTO.url; }
  function unitLocked(t) { var d = CONFIG.units[t]; return !!(d && d.account && kontoAn() && !(konto && konto.user)); }
  function kontoSave() {
    try { if (konto.user) localStorage.setItem('stronghold-konto', JSON.stringify(konto)); else localStorage.removeItem('stronghold-konto'); } catch (err) {}
  }
  function kontoSet(r) { // Antwort von Supabase mit access_token übernehmen
    konto.user = (r.user && r.user.email) || konto.user;
    konto.token = r.access_token; konto.refresh = r.refresh_token;
    konto.exp = Date.now() + (r.expires_in || 3600) * 1000;
    kontoSave(); kontoChanged();
  }
  function kontoClear() { konto = { user: null, token: null, refresh: null, exp: 0 }; kontoSave(); kontoChanged(); }
  function kontoApi(pfad, body, token) {
    return fetch(KONTO.url + pfad, {
      method: 'POST',
      headers: token ? { 'apikey': KONTO.key, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'apikey': KONTO.key, 'Content-Type': 'application/json' }, // neue «publishable» Keys gehören nur in apikey, nie als Bearer
      body: JSON.stringify(body || {})
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
    kb.textContent = konto.user ? '👤 ' + konto.user.split('@')[0] : '👤 Konto';
    if (kontoAn() && !konto.user) {
      var rest = DECK.filter(function (t) { return !unitLocked(t); });
      if (rest.length !== DECK.length) { DECK = rest.length ? rest : DECK_START.slice(); saveDeck(); }
    }
    applyDeck();
    if (!$('book').hidden) renderBook();
    kontoView();
  }
  function kontoView() {
    var on = !!konto.user;
    $('kontoTitel').textContent = on ? 'Dein Konto' : 'Gratis-Konto';
    $('kontoText').textContent = on ? 'Angemeldet als ' + konto.user + '. Belagerungsturm und Trebuchet sind freigeschaltet.' : 'Mit einem Gratis-Konto schaltest du Belagerungsturm und Trebuchet frei.';
    $('kontoForm').hidden = on;
    $('kontoOut').hidden = !on;
  }
  function kontoMsg(t, ok) { var m = $('kontoMsg'); m.textContent = t || ''; m.classList.toggle('ok', !!ok); }
  function kontoOpen(on) {
    $('konto').hidden = !on;
    if (on) { kontoMsg(''); kontoView(); if (!konto.user) $('kontoMail').focus(); }
  }
  function kontoBusy(b) { ['kontoLogin', 'kontoReg', 'kontoOut'].forEach(function (id) { $(id).disabled = b; }); }
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
  function kontoLogout() {
    var tk = konto.token;
    kontoClear(); kontoMsg('Du bist abgemeldet.', true);
    if (tk) kontoApi('/auth/v1/logout', {}, tk).catch(function () {});
  }
  $('kontoBtn').addEventListener('click', function () { kontoOpen(true); });
  $('kontoClose').addEventListener('click', function () { kontoOpen(false); });
  $('kontoForm').addEventListener('submit', kontoLogin);
  $('kontoReg').addEventListener('click', kontoRegister);
  $('kontoOut').addEventListener('click', kontoLogout);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('konto').hidden) kontoOpen(false); });
  // Start: gespeicherte Sitzung übernehmen und im Hintergrund erneuern
  try { var ks = JSON.parse(localStorage.getItem('stronghold-konto') || 'null'); if (ks && ks.user && ks.refresh) konto = ks; } catch (err) {}
  kontoChanged();
  if (kontoAn() && konto.refresh) kontoRefresh();
  setInterval(function () { if (kontoAn() && konto.refresh && konto.exp - Date.now() < 10 * 60 * 1000) kontoRefresh(); }, 60 * 1000);
