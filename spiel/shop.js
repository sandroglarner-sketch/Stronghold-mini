  // ---------- Shop (22.11.): Karten mit Edelsteinen freischalten ----------
  // Welche Karten es im Shop gibt und was sie kosten: daten/freischalten.js (Regel kaufen: n). Wie viele Edelsteine es wofür gibt: CONFIG.FREI.edel.
  // Kontostand und Käufe führt der Server (server.js: kontoStand, /api/kaufen, Nachricht 'edel'); der Browser zeigt nur an.
  // Aufbau wie das Kartenbuch (22.11. 13:30): oben die Edelstein-Regeln als Chips (Freund-Chip lädt ein) und der Kontostand,
  // links kleine Karten mit Preis, rechts die gewählte Karte gross mit ganzem Beschrieb und Kaufknopf. Fenster deckt auch die Einheitenleiste ab (mehr Höhe).
  // Kaufen: Knopf antippen, dann innerhalb von 3 s «Kaufen?» bestätigen.
  var shopArm = '', shopArmT = 0, shopLaeuft = false, shopSel = '';
  $('shopBtn').querySelector('.ovedelsym').innerHTML = EDEL_SVG;
  function shopTypen() {
    return Object.keys(CONFIG.FREI.einheiten).filter(function (t) { return CONFIG.FREI.einheiten[t].kaufen && CONFIG.units[t]; })
      .sort(function (a, b) { return CONFIG.FREI.einheiten[a].kaufen - CONFIG.FREI.einheiten[b].kaufen; });
  }
  function edelText(n) { return n + ' ' + EDEL_SVG; }
  function edelMalen() { // Zahl am Shop-Knopf im Menü (nur angemeldet und bekannt)
    var k = konto || {};
    $('edelZahl').textContent = k.user && typeof k.edel === 'number' ? k.edel : '';
    $('shopBtn').hidden = !kontoAn() || !shopTypen().length;
    if (!$('shop').hidden) shopMalen();
  }
  function shopMsg(t, ok) { var m = $('shopMsg'); m.textContent = t || ''; m.style.color = ok ? '#2f8a3e' : t ? 'var(--foe)' : ''; }
  function shopMini(t) {
    var d = CONFIG.units[t], hat = !unitLocked(t);
    return '<div class="mcard' + (hat ? ' gekauft' : '') + (t === shopSel ? ' sel' : '') + '" data-show="' + t + '" title="' + d.name + '">' +
      '<canvas width="88" height="88" data-t="' + t + '"></canvas><span class="snm">' + d.name + '</span>' +
      '<span class="mc">' + (hat ? '✓' : edelText(CONFIG.FREI.einheiten[t].kaufen)) + '</span></div>';
  }
  function shopDetail(t) { // grosse Karte wie im Kartenbuch, ohne Deck-Knopf, dazu der Kaufbereich
    var preis = CONFIG.FREI.einheiten[t].kaufen, k = konto || {}, hat = !unitLocked(t);
    var h = cardHtml(t).replace(/<button class="pick"[\s\S]*?<\/button>/, '').replace(/<p class="lockinfo">[\s\S]*?<\/p>/, '').replace('class="ucard on', 'class="ucard').replace(' lockd', '');
    var kauf = '<div class="skauf">';
    if (hat) kauf += '<div class="gekauftok">✓ Freigeschaltet</div><p>Du findest die Karte im Kartenbuch.</p>';
    else {
      kauf += '<button class="primary' + (shopArm === t ? ' armed' : '') + '" type="button" data-kauf="' + t + '"' + (k.user && typeof k.edel === 'number' && k.edel < preis ? ' style="opacity:0.55"' : '') + '>' + (shopArm === t ? 'Kaufen? ' : 'Kaufen für ') + edelText(preis) + '</button>';
      if (!ONLINE) kauf += '<p>Kaufen geht nur auf der Online-Seite.</p>';
      else if (!k.user) kauf += '<p>Edelsteine sammelst du mit einem Gratis-Konto.</p><button class="ghost" type="button" id="shopKonto">👤 Konto</button>';
      else if (typeof k.edel !== 'number') kauf += '<p>' + (k.shop === false && k.code ? 'Der Shop wird gerade eingerichtet.' : 'Kontostand wird geladen …') + '</p>';
      else if (k.edel < preis) kauf += '<p>Dir fehlen noch ' + (preis - k.edel) + (preis - k.edel === 1 ? ' Edelstein.' : ' Edelsteine.') + '</p>';
    }
    kauf += '</div>';
    return h.slice(0, h.lastIndexOf('</div>')) + kauf + '</div>';
  }
  function shopMalen() {
    var k = konto || {}, E = CONFIG.FREI.edel, q = k.quellen, l = shopTypen();
    if (l.indexOf(shopSel) < 0) shopSel = l.filter(function (t) { return unitLocked(t); })[0] || l[0] || '';
    $('shopStand').innerHTML = k.user && typeof k.edel === 'number' ? edelText(k.edel) : '';
    $('shopRegeln').innerHTML =
      '<span title="Online-Partie gewonnen"><i class="lang">Online-</i>Sieg <b>+' + edelText(E.sieg) + '</b></span>' +
      '<span title="Online-Partie verloren (auch Unentschieden)"><i class="lang">Online-</i>Niederlage <b>+' + edelText(E.niederlage) + '</b></span>' +
      '<span title="Jeder Story-Gegner zählt einmal, beim ersten Sieg">Story-Gegner<i class="lang"> besiegt</i> <b>+' + edelText(E.bot) + '</b></span>' +
      '<button type="button" id="shopEinladen" title="Spielt ein Freund über deinen Link mindestens 30 s, bekommst du die Edelsteine">👥 Freund<i class="lang"> einladen</i> <b>+' + edelText(E.freund) + '</b></button>';
    var g = $('shopKarten'); g.innerHTML = l.map(shopMini).join(''); drawCardIcons(g);
    var dt = $('shopDetail'); dt.innerHTML = shopSel ? shopDetail(shopSel) : ''; drawCardIcons(dt);
    dt.style.setProperty('--bk-fs', Math.max(10, Math.min(14, (dt.clientHeight || 300) / 24)).toFixed(1) + 'px');
    $('shopBisher').textContent = k.user && q ? 'Bisher: ' + q.siege + (q.siege === 1 ? ' Sieg' : ' Siege') + ', ' + q.niederlagen + (q.niederlagen === 1 ? ' Niederlage' : ' Niederlagen') + ', ' + q.bots + ' Story-Gegner, ' + q.freunde + (q.freunde === 1 ? ' Freund' : ' Freunde') : '';
  }
  function shopPlatz() { // wie das Kartenbuch, aber bis fast an den unteren Rand (die Einheitenleiste braucht es im Shop nicht)
    var bk = $('shop'); placeBook(bk);
    var st = $('stage').getBoundingClientRect(); bk.style.bottom = Math.max(8, Math.round(st.height * 0.03)) + 'px';
  }
  function shopOpen(on) {
    $('shop').hidden = !on;
    shopArm = ''; clearTimeout(shopArmT);
    if (!on) return;
    openBook(false); $('koenigWahl').hidden = true;
    shopMsg(''); shopPlatz(); shopMalen();
    if (konto.user) kontoServer(); // Kontostand auffrischen
  }
  function shopKaufen(t) {
    if (shopLaeuft) return;
    var name = CONFIG.units[t].name;
    shopLaeuft = true; shopMsg('Wird gekauft …', true);
    var los = konto.exp - Date.now() < 60 * 1000 ? kontoRefresh() : Promise.resolve(true);
    los.then(function () {
      return fetch('/api/kaufen', { method: 'POST', headers: { 'Authorization': 'Bearer ' + konto.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ t: t }) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j || {} }; }); })
      .then(function (x) {
        shopLaeuft = false;
        edelUebernehmen(x.j);
        if (x.ok && x.j.ok) { shopMsg('🎉 ' + name + ' freigeschaltet! Du findest die Karte im Kartenbuch.', true); try { jingle('win'); } catch (e) {} }
        else shopMsg(x.j.fehler || 'Das hat nicht geklappt.');
        shopMalen();
      }).catch(function () { shopLaeuft = false; shopMsg('Keine Verbindung zum Server. Bitte nochmals versuchen.'); });
  }
  $('shopKarten').addEventListener('click', function (e) { // kleine Karte antippen: rechts gross zeigen
    var m = e.target.closest ? e.target.closest('[data-show]') : null; if (!m) return;
    shopSel = m.getAttribute('data-show'); shopArm = ''; shopMsg(''); shopMalen();
  });
  $('shopDetail').addEventListener('click', function (e) {
    if (e.target.id === 'shopKonto') { shopOpen(false); kontoOpen(true); return; }
    var b = e.target.closest ? e.target.closest('[data-kauf]') : null; if (!b) return;
    var t = b.getAttribute('data-kauf'), preis = CONFIG.FREI.einheiten[t].kaufen;
    if (!ONLINE) { shopMsg('Kaufen geht nur auf der Online-Seite.'); return; }
    if (!konto.user) { shopMsg('Melde dich zuerst an (gratis).'); return; }
    if (typeof konto.edel !== 'number') { shopMsg('Kontostand wird noch geladen …'); kontoServer(); return; }
    if (konto.edel < preis) { shopMsg('Dir fehlen noch ' + (preis - konto.edel) + ' Edelsteine.'); return; }
    if (shopArm !== t) { shopArm = t; shopMsg(''); clearTimeout(shopArmT); shopArmT = setTimeout(function () { shopArm = ''; if (!$('shop').hidden) shopMalen(); }, 3000); shopMalen(); return; }
    shopArm = ''; clearTimeout(shopArmT);
    shopKaufen(t);
  });
  $('shopRegeln').addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#shopEinladen')) $('inviteBtn').click(); });
  $('shopBtn').addEventListener('click', function () { shopOpen(true); });
  $('shopZu').addEventListener('click', function () { shopOpen(false); $('shopBtn').focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('shop').hidden && $('konto').hidden) shopOpen(false); });
  window.addEventListener('resize', function () { if (!$('shop').hidden) { shopPlatz(); shopMalen(); } });
