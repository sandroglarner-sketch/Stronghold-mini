  // ---------- Shop (22.11.): Karten mit Edelsteinen freischalten ----------
  // Welche Karten es im Shop gibt und was sie kosten: daten/freischalten.js (Regel kaufen: n). Wie viele Edelsteine es wofür gibt: CONFIG.FREI.edel.
  // Kontostand und Käufe führt der Server (server.js: kontoStand, /api/kaufen, Nachricht 'edel'); der Browser zeigt nur an.
  // Fenster wie das Kartenbuch (gleiche Lage über dem Menü, die Einheitenleiste bleibt sichtbar). Kaufen: Preis antippen, dann innerhalb von 3 s bestätigen.
  var shopArm = '', shopArmT = 0, shopLaeuft = false;
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
  function shopKarte(t) {
    var d = CONFIG.units[t], preis = CONFIG.FREI.einheiten[t].kaufen, k = konto || {}, hat = !unitLocked(t), ab = abilityText(d);
    var knopf = hat ? '<button class="ghost" type="button" disabled>✓ Freigeschaltet</button>'
      : '<button class="' + (shopArm === t ? 'primary armed' : 'primary') + '" type="button" data-kauf="' + t + '"' + (k.user && typeof k.edel === 'number' && k.edel < preis ? ' style="opacity:0.55"' : '') + '>' +
        (shopArm === t ? 'Kaufen? ' + edelText(preis) : edelText(preis)) + '</button>';
    return '<div class="skarte' + (hat ? ' gekauft' : '') + '"><canvas width="88" height="88" data-t="' + t + '"></canvas><span class="snm">' + d.name + '</span>' +
      '<span class="stg">' + cardCat(d).join(' ') + '</span>' +
      '<span class="sst"><span title="Kosten im Spiel">' + COIN_SVG + ' ' + d.cost + '</span><span title="Leben">❤️ ' + d.hp + '</span>' + (d.atk ? '<span title="Angriff">💥 ' + d.atk + '</span><span title="Reichweite">🎯 ' + fmtN(d.range) + '</span>' : '') + '</span>' +
      (ab ? '<span class="sab">' + ab + '</span>' : '') + knopf + '</div>';
  }
  function shopMalen() {
    var k = konto || {}, E = CONFIG.FREI.edel, q = k.quellen;
    $('shopStand').innerHTML = k.user && typeof k.edel === 'number' ? edelText(k.edel) : '';
    var el = $('shopKarten');
    el.innerHTML = shopTypen().map(shopKarte).join('');
    drawCardIcons(el);
    var h = '<b>So bekommst du Edelsteine</b><div class="sregeln">' +
      '<span>+' + edelText(E.sieg) + '</span><span>Online-Partie gewonnen</span>' +
      '<span>+' + edelText(E.niederlage) + '</span><span>Online-Partie verloren</span>' +
      '<span>+' + edelText(E.bot) + '</span><span>pro Story-Gegner, den du besiegst (einmal)</span>' +
      '<span>+' + edelText(E.freund) + '</span><span>pro Freund, der über deinen Link mind. 30 s spielt</span></div>';
    if (!ONLINE) h += '<p>Der Shop funktioniert nur auf der Online-Seite. Hier im Artifact fehlt der Server.</p>';
    else if (!k.user) h += '<p>Edelsteine sammelst du mit einem Gratis-Konto. Was du schon geschafft hast, wird dir beim Anmelden gutgeschrieben.</p><button class="primary" type="button" id="shopKonto">👤 Konto</button>';
    else if (k.edel === null || k.edel === undefined) h += '<p>' + (k.shop === false && k.code ? 'Der Shop wird gerade eingerichtet.' : 'Kontostand wird geladen …') + '</p>';
    else {
      if (q) h += '<p>Bisher: ' + q.siege + (q.siege === 1 ? ' Sieg' : ' Siege') + ', ' + q.niederlagen + (q.niederlagen === 1 ? ' Niederlage' : ' Niederlagen') + ', ' + q.bots + ' Story-Gegner, ' + q.freunde + (q.freunde === 1 ? ' Freund' : ' Freunde') + (q.ausgegeben ? ' · ausgegeben: ' + q.ausgegeben : '') + '</p>';
      h += '<button class="ghost" type="button" id="shopEinladen">👥 Freund einladen</button>';
    }
    $('shopInfo').innerHTML = h;
  }
  function shopOpen(on) {
    $('shop').hidden = !on;
    shopArm = ''; clearTimeout(shopArmT);
    if (!on) return;
    openBook(false); $('koenigWahl').hidden = true;
    shopMsg(''); placeBook($('shop')); shopMalen();
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
  $('shopKarten').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-kauf]') : null; if (!b) return;
    var t = b.getAttribute('data-kauf'), preis = CONFIG.FREI.einheiten[t].kaufen;
    if (!ONLINE) { shopMsg('Kaufen geht nur auf der Online-Seite.'); return; }
    if (!konto.user) { shopMsg('Melde dich zuerst an (gratis).'); kontoOpen(true); return; }
    if (typeof konto.edel !== 'number') { shopMsg('Kontostand wird noch geladen …'); kontoServer(); return; }
    if (konto.edel < preis) { shopMsg('Dir fehlen noch ' + (preis - konto.edel) + ' Edelsteine.'); return; }
    if (shopArm !== t) { shopArm = t; shopMsg(''); clearTimeout(shopArmT); shopArmT = setTimeout(function () { shopArm = ''; if (!$('shop').hidden) shopMalen(); }, 3000); shopMalen(); return; }
    shopArm = ''; clearTimeout(shopArmT);
    shopKaufen(t);
  });
  $('shopInfo').addEventListener('click', function (e) {
    if (e.target.id === 'shopKonto') kontoOpen(true);
    else if (e.target.id === 'shopEinladen') $('inviteBtn').click();
  });
  $('shopBtn').addEventListener('click', function () { shopOpen(true); });
  $('shopZu').addEventListener('click', function () { shopOpen(false); $('shopBtn').focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('shop').hidden && $('konto').hidden) shopOpen(false); });
  window.addEventListener('resize', function () { if (!$('shop').hidden) placeBook($('shop')); });
