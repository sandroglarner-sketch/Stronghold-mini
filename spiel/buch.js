  // ---------- Deck und Kartenbuch ----------
  // DECK = gewählte Einheiten (höchstens DECK_MAX, die Mauer zählt nicht). Gespeichert nur im Browser (localStorage 'stronghold-deck').
  // Die Knöpfe zeigen immer die Mauer plus die Deck-Einheiten (im Tutorial alle), Tasten 1–9, 0, Q, E von links nach rechts über die sichtbaren Knöpfe.
  var TUT_TYPES = ['farmer', 'spear', 'archer', 'rider', 'knight', 'ram']; // genau die Einheiten, die das Tutorial braucht: im Tutorial nur diese Knöpfe (plus Mauer)
  var GEB_MAX = 2; // höchstens so viele Gebäude im Deck (= Gebäudeplätze)
  var DECK_MAX = 10, DECK_START = TUT_TYPES.slice(); // Startauswahl beim ersten Spielen = Tutorial-Einheiten
  var DECK = DECK_START.slice();
  try {
    var dk = JSON.parse(localStorage.getItem('stronghold-deck') || 'null');
    if (Array.isArray(dk)) { var ngeb = 0; dk = dk.filter(function (t) { return t !== 'wall' && BUY_TYPES.indexOf(t) >= 0 && !(CONFIG.units[t].cat === 'building' && ++ngeb > 2); }).slice(0, DECK_MAX); if (dk.length) DECK = dk; }
  } catch (err) {}
  function saveDeck() { try { localStorage.setItem('stronghold-deck', JSON.stringify(DECK)); } catch (err) {} }
  function applyDeck() {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'e'], n = 0;
    BUY_TYPES.forEach(function (t) {
      var vis = t === 'wall' || (tut.on ? TUT_TYPES.indexOf(t) >= 0 : DECK.indexOf(t) >= 0 && !unitLocked(t));
      if (btns[t].hidden === vis) btns[t].hidden = !vis;
      CONFIG.units[t].key = vis ? (keys[n++] || '') : '';
      var info = unitInfo(t);
      btns[t].title = info; btns[t].setAttribute('aria-label', info);
      if (t === 'wall') ui.wallTitle = info;
    });
  }
  var CATS = { building: ['🏠', 'Gebäude'], eco: ['🌾', 'Wirtschaft'], melee: ['🗡️', 'Nahkampfeinheit'], ranged: ['🏹', 'Fernkampfeinheit'], siege: ['🔨', 'Belagerungsmaschine'] };
  function cardCat(d) { return CATS[d.cat] || (d.range > 1.5 ? CATS.ranged : CATS.melee); }
  function fmtN(v) { return String(v).replace('.', ','); }
  // Spezialfähigkeit: nur was im Code wirklich programmiert ist (aus den Werten in CONFIG.units abgeleitet)
  function abilityText(d) {
    var a = [];
    if (d.gebaeude) { var GBt = d.gebaeude; // Gebäude: keine Leben (stehen oben), immer «alle … s»
      a.push(GBt.art === 'zins' ? 'Alle ' + GBt.alle + ' s <b>+' + GBt.prozent + ' % deines Goldes</b>.'
        : GBt.art === 'dieb' ? 'Alle ' + GBt.alle + ' s klaut ein Dieb <b>' + GBt.prozent + ' % des gegnerischen Goldes</b>.'
        : GBt.art === 'brand' ? 'Alle ' + GBt.alle + ' s legt ein Brandstifter in der gegnerischen Burg Feuer: der Gegner <b>verliert ' + GBt.prozent + ' % seines Goldes</b>.'
        : GBt.art === 'kirche' ? 'Ein Priester betet ' + GBt.gebet.dauer + ' s für ' + GBt.gebet.cost + ' Gold, dann <b>Gunst +1</b>. Bei Gunst ' + GBt.gunstMax + ' kommt ein <b>Unwetter über den Gegner, das er nicht überlebt</b>.'
        : GBt.steigt ? 'Alle ' + GBt.alle + ' s <b>+' + GBt.stufen[0].gold + ' Gold</b>, jedes Mal ' + GBt.steigt + ' Gold mehr (' + [0, 1, 2].map(function (n) { return GBt.stufen[0].gold + GBt.steigt * n; }).join(', ') + ' …).'
        : GBt.stufen.length === 1 ? 'Alle ' + GBt.alle + ' s <b>+' + GBt.stufen[0].gold + ' Gold</b>.'
        : GBt.stufen.map(function (st, i) { return 'Stufe ' + (i + 1) + ': alle ' + GBt.alle + ' s <b>+' + st.gold + ' Gold</b>'; }).join('<br>')); }
    if (d.kegel) a.push('<b>Morgenstern:</b> trifft alle Gegner in einem ' + d.kegel.winkel + '°-Bogen Richtung Ziel, ' + fmtN(d.kegel.r) + (d.kegel.r === 1 ? ' Kachel' : ' Kacheln') + ' weit.');
    if (d.unsichtbar) a.push('<b>Unsichtbar:</b> kann nicht anvisiert werden, Flächenschaden trifft ihn aber. Greift er an, ist er mindestens ' + d.unsichtbar.sichtbar + ' s sichtbar.');
    if (d.holz) a.push('Geht zum nächsten Baum und fällt ihn: <b>alle ' + d.holz.alle + ' s +' + d.holz.gold + ' Gold</b>. Ein Baum gibt höchstens ' + CONFIG.BAEUME.holz + ' Gold, dann bleibt nur der Stumpf. Höchstens ' + d.holz.proBaum + ' Holzfäller pro Baum.');
    if (d.karawane) a.push('Geht zum Teich und wieder zurück. <b>+' + d.karawane.gold + ' Gold</b>. Kosten steigen mit jeder weiteren Karawane.');
    if (d.passive && d.bonus) a.push('Lässt sich nahe der eigenen Burg nieder und bringt <b>alle ' + d.bonusEvery + ' s +' + d.bonus + ' Gold</b>.');
    if (d.dig) a.push('<b>Gräbt sich unsichtbar</b> (Tempo ' + fmtN(d.dig.speed) + ') zu einem gegnerischen Fernkämpfer und taucht neben ihm auf.');
    if (d.splash && !d.fire) a.push('<b>Flächenschaden</b> (Radius ' + fmtN(d.splash) + ')' + (d.slow ? ' und <b>bremst</b> Getroffene ' + d.slow.secs + ' s auf ' + Math.round(d.slow.factor * 100) + ' % Tempo' : '') + '.');
    if (d.multi) return 'Schleudert <b>' + d.multi.n + ' Steine</b> auf einmal, die sich zufällig im Umkreis von ' + fmtN(d.multi.spread) + ' Kacheln um das Ziel verteilen (je Flächenschaden Radius ' + fmtN(d.splash) + '), <b>fliegen über Mauern</b>.'; // Trebuchet: Beschreibung endet hier (Aufbau, Turm/Angriff, Mindestabstand stehen nicht auf der Karte)
    if (d.spot) a.push('<b>Auf dem grossen Turm</b> (Mauer 5) schiesst es auf Gegner in Reichweite. <b>Sonst</b> fährt es an einen Punkt ' + fmtN(d.spot.dist) + ' Kacheln vor das Ziel und beschiesst immer dieselbe Stelle: Mitte, ' + fmtN(d.spot.behind) + ' Kacheln hinter der gegnerischen Mauer.');
    if (d.fire && !d.multi) a.push('<b>Feuerbälle</b> mit Flächenschaden (Radius ' + fmtN(d.splash) + '), <b>fliegen über Mauern</b>.');
    if (d.ram && d.atk) a.push('Greift <b>nur Mauern und Burgen</b> an.' + (d.mass > 1 ? ' Schiebt Einheiten im Weg zur Seite.' : ''));
    if (d.setup) a.push('Muss <b>' + d.setup + ' s stillstehen</b>, um sich aufzubauen, bevor er schiessen kann.' + (d.setupFrei ? ' Aufgebaut darf er sich bis ' + fmtN(d.setupFrei) + (d.setupFrei === 1 ? ' Kachel' : ' Kacheln') + ' bewegen.' : ''));
    if (d.blast) a.push('Am Einschlagpunkt zusätzlich <b>Flächenschaden ' + d.blast.atk + '</b> (Radius ' + fmtN(d.blast.r) + ').');
    if (d.ram && !d.atk) a.push('Zieht zu Mauer oder Burg, richtet keinen Schaden an.');
    if (d.rangedTaken) a.push('Erleidet von Fernkämpfern nur <b>' + Math.round(d.rangedTaken * 100) + ' % Schaden</b>.');
    if (d.ladder) a.push('<b>Rennt direkt zur gegnerischen Mauer</b> (zufälliger Punkt zwischen den Türmen), stellt eine Leiter an und <b>klettert hinüber</b>. Danach kämpft er mit dem Schwert.');
    if (d.belfry) return '<b>Dockt an der gegnerischen Mauer an:</b> ' + d.belfry.troops + ' Schwertkämpfer klettern innerhalb von ' + Math.round(d.belfry.troops * d.belfry.every) + ' s hinüber. Oben stehen ' + d.belfry.archers + ' Bogenschützen, die nur ' + Math.round(WALL.tower.taken * 100) + '% Fernkampfschaden erleiden.'; // Beschreibung endet hier
    if (d.minRange) a.push('Kann Ziele <b>näher als ' + fmtN(d.minRange) + ' Kacheln</b> nicht angreifen.');
    return a.join(' ');
  }
  function unitInfo(t) {
    var d = CONFIG.units[t], k = d.key ? ' (Taste ' + d.key.toUpperCase() + ')' : '';
    if (d.wall) return d.name + ': ' + d.cost + ' Gold. ' + WALL.workers + ' Arbeiter bringen je ' + WALL.add + ' Leben (Mauer bis ' + WALL.cap + ' Leben, Türme ab Stufe 2). Ist deine Burg zerstört, baut dieser Knopf sie wieder auf' + k;
    return d.name + ': ' + d.cost + ' Gold, Leben ' + d.hp + ', Angriff ' + d.atk + ', Reichweite ' + d.range + ', Tempo ' + d.speed.toFixed(1) + '. ' + abilityText(d).replace(/<[^>]+>/g, '') + k;
  }
  // Buch: so gross wie der Startbildschirm (liegt im Spielfeld), Karten seitenweise, Pfeile/Wischen/Pfeiltasten blättern mit Umblätter-Animation
  var book = { page: 0, per: 6, busy: false, sel: null, filter: '' };
  function bookTypes() {
    var l = BUY_TYPES.filter(function (t) { return t !== 'wall' && (!book.filter || (CONFIG.units[t].cat || (CONFIG.units[t].range > 1.5 ? 'ranged' : 'melee')) === book.filter); });
    neuPruefen();
    return l.filter(function (t) { return !unitLocked(t); }).concat(l.filter(function (t) { return unitLocked(t); })); // nicht freigeschaltete Karten ganz hinten
  }
  // «neu»: war eine Karte gesperrt und ist jetzt frei, steht bis zum ersten Antippen ein grünes «neu» darauf (gemerkt im Browser)
  var NEU = { gesperrt: [], neu: [] };
  try { NEU = JSON.parse(localStorage.getItem('stronghold-neu') || 'null') || NEU; } catch (err) {}
  function neuSpeichern() { try { localStorage.setItem('stronghold-neu', JSON.stringify(NEU)); } catch (err) {} }
  function neuPruefen() {
    if (!kontoAn() || tester) return; // ohne Konto-System oder im Tester-Modus ist alles frei: nichts merken
    var ch = false;
    BUY_TYPES.forEach(function (t) {
      var lk = unitLocked(t), gi = NEU.gesperrt.indexOf(t);
      if (lk && gi < 0) { NEU.gesperrt.push(t); ch = true; }
      else if (!lk && gi >= 0) { NEU.gesperrt.splice(gi, 1); if (NEU.neu.indexOf(t) < 0) NEU.neu.push(t); ch = true; }
    });
    if (ch) neuSpeichern();
  }
  function istNeu(t) { return NEU.neu.indexOf(t) >= 0 && !unitLocked(t); }
  function neuZahl() { // grüne Zahl am Kartenbuch-Knopf: so viele Karten tragen noch ein «neu»
    var el = $('neuZahl'); if (!el || !NEU) return; // NEU ist erst nach dem Laden von buch.js gesetzt
    neuPruefen();
    var n = BUY_TYPES.filter(istNeu).length;
    el.textContent = n; el.hidden = !n; el.title = n === 1 ? '1 neue Karte' : n + ' neue Karten';
  }
  function ersteKarte(list) { // beim Öffnen/Filtern nie eine «neu»-Karte vorwählen (sonst wäre ihr «neu» weg, ohne dass man es sieht)
    for (var i = 0; i < list.length; i++) if (!istNeu(list[i])) return list[i];
    return list[0];
  }
  function neuGesehen(t) { var i = NEU.neu.indexOf(t); if (i < 0) return; NEU.neu.splice(i, 1); neuSpeichern(); neuZahl(); document.querySelectorAll('[data-show="' + t + '"] .neu').forEach(function (n) { n.remove(); }); }
  // Goldmünze: ein Symbol für Burg-Anzeige, Deck-Knöpfe, Buch (Mini- und Grosskarte) und die aufpoppenden +Gold-Zahlen
  function cardHtml(t) {
    var d = CONFIG.units[t], on = DECK.indexOf(t) >= 0, c = cardCat(d), ab = abilityText(d);
    var lk = unitLocked(t);
    return '<div class="ucard' + (on ? ' on' : '') + (lk ? ' lockd' : '') + '"><button class="pick" type="button" data-pick="' + t + '" aria-pressed="' + on + '" aria-label="' + d.name + ' ins Deck">' + (on ? '✓' : '') + '</button>' +
      '<canvas width="88" height="88" data-t="' + t + '"></canvas><div class="nm">' + d.name + '</div>' +
      '<div class="tg"><span>' + c.join(' ') + '</span></div>' +
      '<div class="st"><span title="Kosten">' + COIN_SVG + ' ' + d.cost + '</span><span title="Leben">❤️ ' + d.hp + '</span><span title="Angriff">💥 ' + (d.atk || '–') + '</span><span title="Angriff alle … Sekunden">⏱️ ' + (d.atk ? fmtN(d.cd) + ' s' : '–') + '</span>' +
      '<span title="Reichweite in Kacheln">🎯 ' + (d.atk || d.ram ? fmtN(d.range) : '–') + '</span><span title="Tempo">👟 ' + fmtN(d.speed) + '</span></div>' +
      '<div class="ab">' + (ab ? '✨ ' + ab : '✨ keine') + '</div>' + (lk ? '<p class="lockinfo">🔒 ' + lockText(t) + '</p>' : '') + '</div>';
  }
  function miniHtml(t) {
    var d = CONFIG.units[t], on = DECK.indexOf(t) >= 0;
    return '<div class="mcard' + (on ? ' on' : '') + (t === book.sel ? ' sel' : '') + (unitLocked(t) ? ' lockd' : '') + '" data-show="' + t + '" title="' + d.name + (unitLocked(t) ? ' (' + lockText(t) + ')' : '') + '"><button class="pick" type="button" data-pick="' + t + '" aria-pressed="' + on + '" aria-label="' + d.name + ' ins Deck">' + (on ? '✓' : '') + '</button>' +
      '<canvas width="88" height="88" data-t="' + t + '"></canvas><span class="mc">' + COIN_SVG + d.cost + '</span>' + (istNeu(t) ? '<span class="neu">neu</span>' : '') + '</div>';
  }
  function drawCardIcons(el) {
    el.querySelectorAll('canvas').forEach(function (cv) {
      var t = cv.getAttribute('data-t'), c = cv.getContext('2d'), ext = ICON_EXT[t] || [1, 2], span = ext[0] + ext[1], r = Math.min(24, 78 / span);
      c.clearRect(0, 0, 88, 88);
      drawUnit(c, t, (88 - span * r) / 2 + ext[0] * r, 44, r, 0, 1, 0, t !== 'ladder');
    });
  }
  function renderDetail() { // rechte Buchseite: die gewählte Karte gross mit allen Werten
    var el = $('bookDetail');
    el.innerHTML = book.sel ? cardHtml(book.sel) : '';
    drawCardIcons(el);
  }
  function bookLayout() { // linke Seite: Minikarten im Raster (so viele wie Platz haben), rechte Seite: grosse Karte
    var a = $('bookArea'), w = a.clientWidth || 400, h = a.clientHeight || 300, gap = 8, dh = $('bookDetail').clientHeight || h;
    $('bookDetail').style.setProperty('--bk-fs', Math.max(9, Math.min(14, dh / 22)).toFixed(1) + 'px');
    var cellH = Math.max(62, Math.min(112, (h - 2 * gap) / 3)), cellW = Math.round(cellH * 0.84);
    book.rows = Math.max(1, Math.floor((h + gap) / (cellH + gap)));
    book.cols = Math.max(1, Math.floor((w + gap) / (cellW + gap)));
    book.per = book.rows * book.cols; book.cellW = cellW; book.cellH = Math.round(cellH);
  }
  function fillPage(el) {
    var list = bookTypes(), pages = Math.max(1, Math.ceil(list.length / book.per));
    book.page = Math.max(0, Math.min(book.page, pages - 1));
    el.style.gridTemplateColumns = 'repeat(' + book.cols + ', ' + book.cellW + 'px)';
    el.style.gridTemplateRows = 'repeat(' + book.rows + ', ' + book.cellH + 'px)';
    el.innerHTML = list.slice(book.page * book.per, (book.page + 1) * book.per).map(miniHtml).join('');
    drawCardIcons(el);
    $('bookPg').textContent = 'Seite ' + (book.page + 1) + ' / ' + pages;
    $('bookPrev').disabled = book.page <= 0;
    $('bookNext').disabled = book.page >= pages - 1;
    $('bookN').textContent = DECK.length;
    $('bookN').parentNode.classList.toggle('full', DECK.length === DECK_MAX);
  }
  function placeBook(bk) { // Buch (und Shop) über dem Menü: rundum etwas Landschaft frei, unten bleibt das Deck (Einheitenknöpfe) sichtbar
    bk = bk || $('book');
    var st = $('stage').getBoundingClientRect(), ub = unitsEl.getBoundingClientRect();
    var side = Math.max(10, Math.round(st.width * 0.035)), top = Math.max(8, Math.round(st.height * 0.04));
    var fb = $('fsBar').getBoundingClientRect(); if (fb.height && fb.bottom > st.top) top = Math.max(top, Math.round(fb.bottom - st.top + 4)); // Vollbild: unter Gold/Pause/✕
    var bottom = ub.height ? Math.max(top, Math.round(st.bottom - ub.top + 6)) : top;
    bk.style.left = bk.style.right = side + 'px'; bk.style.top = top + 'px'; bk.style.bottom = bottom + 'px';
  }
  function renderBook() { placeBook(); bookLayout(); fillPage($('bookPage')); renderDetail(); }
  function snapPage(el) { // Kopie der aktuellen Seite samt gezeichneter Bilder
    var cp = el.cloneNode(true), src = el.querySelectorAll('canvas'), dst = cp.querySelectorAll('canvas');
    cp.removeAttribute('id');
    for (var i = 0; i < dst.length; i++) dst[i].getContext('2d').drawImage(src[i], 0, 0);
    return cp;
  }
  // Jedes Blättern läuft mit eigener Kennung (book.flip): ein neuer Klick beendet die laufende Animation sofort und startet die nächste,
  // alte Rückrufe (animationend/Zeitgeber) dürfen die neue Animation nicht mehr abbrechen (Fehler vom 17.11.: Zurückblättern ohne Animation bei schnellem Klicken)
  function flipBook(dir) {
    var pages = Math.max(1, Math.ceil(bookTypes().length / book.per)), np = book.page + dir;
    if (np < 0 || np >= pages) return;
    if (book.finish) book.finish();
    var pg = $('bookPage'), old = snapPage(pg), id = (book.flip || 0) + 1;
    book.flip = id;
    book.page = np;
    fillPage(pg);
    var mover = dir > 0 ? old : pg, cls = dir > 0 ? 'flipout' : 'flipin';
    if (dir > 0) pg.parentNode.appendChild(old); else pg.parentNode.insertBefore(old, pg);
    pg.classList.remove('flipout', 'flipin');
    void mover.offsetWidth; // Animation sicher neu starten
    mover.classList.add(cls);
    book.busy = true;
    try { sfx({ kind: 'page' }); } catch (err) {}
    var timer, onEnd = function (e) { if (e.target === mover) book.finish && book.flip === id && book.finish(); };
    book.finish = function () {
      if (book.flip !== id) return;
      clearTimeout(timer);
      mover.removeEventListener('animationend', onEnd);
      mover.classList.remove(cls);
      if (old.parentNode) old.parentNode.removeChild(old);
      book.busy = false; book.finish = null;
    };
    mover.addEventListener('animationend', onEnd);
    timer = setTimeout(book.finish, 900);
  }
  function openBook(on) {
    $('book').hidden = !on;
    if (on) { $('shop').hidden = true; $('bookMsg').textContent = ''; book.page = 0; if (!book.sel || !CONFIG.units[book.sel] || istNeu(book.sel)) book.sel = ersteKarte(bookTypes()); renderBook(); $('bookClose').focus(); }
  }
  function bookClick(e) {
    var b = e.target.closest ? e.target.closest('[data-pick]') : null;
    if (book.finish) book.finish();
    if (!b) { // Minikarte angetippt: rechts gross zeigen
      var m = e.target.closest ? e.target.closest('[data-show]') : null;
      if (!m) return;
      book.sel = m.getAttribute('data-show'); neuGesehen(book.sel);
      $('bookPage').querySelectorAll('.mcard').forEach(function (c) { c.classList.toggle('sel', c.getAttribute('data-show') === book.sel); });
      renderDetail();
      return;
    }
    var t = b.getAttribute('data-pick'), i = DECK.indexOf(t), msg = '';
    neuGesehen(t);
    if (i < 0 && unitLocked(t)) { $('bookMsg').textContent = lockText(t); return; }
    if (i >= 0) { if (DECK.length > 1) DECK.splice(i, 1); else msg = 'Mindestens eine Einheit muss im Deck bleiben.'; }
    else if (DECK.length >= DECK_MAX) msg = 'Dein Deck ist voll (' + DECK_MAX + '). Entferne zuerst eine Einheit.';
    else if (CONFIG.units[t].cat === 'building' && DECK.filter(function (x) { return CONFIG.units[x].cat === 'building'; }).length >= GEB_MAX) msg = 'Nur maximal ' + GEB_MAX + ' Gebäude erlaubt';
    else DECK.push(t);
    $('bookMsg').textContent = msg;
    saveDeck(); applyDeck(); fillPage($('bookPage'));
    if (t === book.sel) { var dc = $('bookDetail').querySelector('.ucard'), on = DECK.indexOf(t) >= 0, pk = dc && dc.querySelector('.pick'); if (dc) { dc.classList.toggle('on', on); pk.textContent = on ? '✓' : ''; pk.setAttribute('aria-pressed', on); } }
  }
  $('bookArea').addEventListener('click', bookClick);
  $('bookFilter').addEventListener('click', function (e) { // Filter nach Einheitentyp
    var b = e.target.closest ? e.target.closest('[data-f]') : null;
    if (!b) return;
    if (book.finish) book.finish();
    book.filter = b.getAttribute('data-f'); book.page = 0;
    $('bookFilter').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    var list = bookTypes();
    if (list.length && list.indexOf(book.sel) < 0) { book.sel = ersteKarte(list); renderDetail(); }
    fillPage($('bookPage'));
  });
  $('bookDetail').addEventListener('click', bookClick);
  $('bookPrev').addEventListener('click', function () { flipBook(-1); });
  $('bookNext').addEventListener('click', function () { flipBook(1); });
  (function () { // Wischen zum Blättern
    var sx = null, sy = 0;
    $('bookArea').addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    $('bookArea').addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) flipBook(dx < 0 ? 1 : -1);
    });
  })();
  window.addEventListener('resize', function () { if (!$('book').hidden) { if (book.finish) book.finish(); renderBook(); } });
  $('bookBtn').addEventListener('click', function () { openBook(true); });
  $('bookClose').addEventListener('click', function () { openBook(false); neuZahl(); $('bookBtn').focus(); });
  document.addEventListener('keydown', function (e) {
    if ($('book').hidden) return;
    if (e.key === 'Escape') openBook(false);
    else if (e.key === 'ArrowRight') flipBook(1);
    else if (e.key === 'ArrowLeft') flipBook(-1);
  });
  applyDeck();

  function syncUi() {
    var gm = gold[ME] - deployGold(), gf = gold[1 - ME];
    var canGive = state === 'playing' || state === 'paused';
    var tv = tut.on && canGive;
    if (tutPanelEl.hidden === tv) tutPanelEl.hidden = !tv;
    if (tutBoxEl.hidden === (tv && tut.boxOpen)) tutBoxEl.hidden = !(tv && tut.boxOpen);
    BUY_TYPES.forEach(function (t) {
      var lk = tut.on && tut.avail.indexOf(t) < 0;
      btns[t].classList.toggle('locked', lk);
      var th = tutArrow(t);
      btns[t].classList.toggle('tuthint', th);
      if (th) { var tn = String(TUT[tut.i].need[t] - (tut.bought[t] || 0)); if (btns[t].getAttribute('data-need') !== tn) btns[t].setAttribute('data-need', tn); }
    });
    if (giveBtn.disabled === canGive) giveBtn.disabled = !canGive;
    var ruhe = state !== 'playing'; // Menü, Pause, Ergebnis: alle Einheiten leicht durchsichtig wie «zu wenig Gold»
    if (ruhe !== ui.ruhe) { unitsEl.classList.toggle('ruhe', ruhe); ui.ruhe = ruhe; }
    if (gm !== ui.gm) {
      goldMeEl.textContent = gm;
      ui.gm = gm;
      BUY_TYPES.forEach(function (t) { btns[t].classList.toggle('poor', gm < preisVon(ME, t)); });
    }
    BUY_TYPES.forEach(function (t) { // Gebäude: Preis der nächsten Stufe (– = höchste Stufe, im Bau oder kein Platz)
      if (!CONFIG.units[t].gebaeude && !CONFIG.units[t].steigt) return; // Karawane, Holzfäller: Preis steigt mit jeder lebenden
      var gp = state === 'playing' || state === 'paused' ? preisVon(ME, t) : CONFIG.units[t].cost, gk = gp + '|' + gm;
      if (ui['geb_' + t] === gk) return; ui['geb_' + t] = gk;
      var gc = btns[t].querySelector('.cost'); if (gc) gc.innerHTML = COIN_SVG + (isFinite(gp) ? gp : '–');
      if (!CONFIG.units[t].gebaeude) { btns[t].classList.toggle('poor', gm < gp); return; }
      var gg = state === 'playing' || state === 'paused' ? meinGebaeude(ME, t) : null, nst = Math.min(CONFIG.units[t].gebaeude.stufen.length, gg ? gg.stufe + (gg.bau ? 0 : 1) : 1); // Bild: nächste Stufe
      if (CONFIG.units[t].gebaeude.gebet && gg && !gg.bau) nst = 'priester'; // fertige Kirche: Knopf zeigt den Priester
      if (ui['gebB_' + t] !== nst) { ui['gebB_' + t] = nst; var ic = icons[t].getContext('2d'), ext = ICON_EXT[t] || [1, 2], span = ext[0] + ext[1], ir = Math.min(24, 78 / span); ic.clearRect(0, 0, 88, 88); if (nst === 'priester') drawUnit(ic, 'priester', 44, 44, 20, ME, 1, 0); else drawUnit(ic, t, (88 - span * ir) / 2 + ext[0] * ir, 44, ir, 0, 1, 0, { bau: 1, stufe: nst, phase: -1, nx: 0, ny: 1 }, undefined, 0); }
      btns[t].classList.toggle('poor', gm < gp);
    });
    if (gf !== ui.gf) { goldFoeEl.textContent = gf; ui.gf = gf; }
    var cdown = !!(bases && bases[ME] && bases[ME].down);
    if (cdown !== ui.cdown && btns.wall) { // Burg gefallen: der Mauer-Knopf zeigt eine Burg und baut sie wieder auf
      if (ui.wallTitle === undefined) ui.wallTitle = btns.wall.title;
      ui.cdown = cdown;
      var wc = icons.wall.getContext('2d'); wc.clearRect(0, 0, 88, 88);
      if (cdown) drawCastleIcon(wc); else drawWallIcon(wc);
      btns.wall.title = cdown ? 'Burg wiederaufbauen: ' + CONFIG.units.wall.cost + ' Gold. ' + WALL.workers + ' Arbeiter bringen je ' + WALL.add + ' Leben (bis ' + CONFIG.BASE_HP + '). Ab 1 Leben steht die Burg wieder und der König kehrt zurück (Taste ' + CONFIG.units.wall.key.toUpperCase() + ')' : ui.wallTitle;
      btns.wall.setAttribute('aria-label', btns.wall.title);
    }
    payFill.style.width = (payT / CONFIG.GOLD_EVERY * 100) + '%';
    var sec = Math.ceil(CONFIG.GOLD_EVERY - payT);
    var inc = income(ME);
    if (sec !== ui.sec || inc !== ui.inc) {
      payText.textContent = '+' + inc + ' Gold in ' + sec + ' s';
      ui.sec = sec;
      ui.inc = inc;
    }
  }

  // Belohnungskarten mit Bild (Story-Feld, Freunde): liste = [[typ, erreicht], ...]; nicht erreicht = ausgegraut, erreicht = klar mit grünem Haken
  function belohnungHtml(liste, edel) { // edel = [Anzahl, erreicht]: zusätzlich ein Edelstein-Kärtchen
    return '<div class="belohn">' + liste.map(function (e) {
      var t = e[0], ok = !!e[1];
      return '<span class="bkarte' + (ok ? ' ok' : '') + '" title="' + CONFIG.units[t].name + (ok ? ' (freigeschaltet)' : ' (noch nicht freigeschaltet)') + '"><canvas width="88" height="88" data-t="' + t + '"></canvas><span class="bname">' + CONFIG.units[t].name + '</span>' + (ok ? '<i class="bhaken" aria-label="freigeschaltet">✓</i>' : '') + '</span>';
    }).join('') + (edel ? edelKarteHtml(edel[0], edel[1]) : '') + '</div>';
  }
  var ovKarten = []; // neue Karten nach einem Story-Sieg (gesetzt von storyErgebnis)
  function showOverlay(title, text, btnText, withChoice) {
    // Ergebnis-, Pausen- und Suchfenster (das Startmenü zeigt zeigeMenu() in sozial.js)
    overlay.classList.remove('menu');
    ovZumMenu = false;
    var ohneWahl = withChoice === false || (state === 'paused');
    $('menuBtn').hidden = ohneWahl || pvp.on;
    $('menuBtn').textContent = spielArt === 'story' ? 'Zur Karte' : 'Zum Menü';
    if (!pvp.on && state === 'over') sozialStatus('menu');
    ovTitle.textContent = title;
    ovText.textContent = text;
    if (ovKarten.length) { // neu freigeschaltete Karte(n) mit Bild unter der Meldung
      var kd = document.createElement('div'); kd.className = 'ovkarten';
      kd.innerHTML = ovKarten.map(function (t) { return '<div class="ovkarte"><canvas width="88" height="88" data-t="' + t + '"></canvas><b>' + CONFIG.units[t].name + '</b><span>neu</span></div>'; }).join('');
      ovText.appendChild(kd); drawCardIcons(kd); ovKarten = [];
    }
    ovBtn.textContent = btnText;
    if (title === 'Sieg!') jingle('win');
    else if (title === 'Niederlage' || title === 'Aufgegeben' || title === 'Unentschieden') jingle('lose');
    applyDeck();
    overlay.hidden = false;
    ovBtn.focus();
  }

  function fmtTime(s) {
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function finish(w, note) {
    einladungGespielt(); // kam der Spieler über einen Einladungslink: dem Einladenden gutschreiben (einmal pro Gerät)
    if (tut.on) {
      tut.on = false; state = 'over'; winner = w; pauseBtn.textContent = 'Pause';
      tutBox('');
      showOverlay(w === 0 ? 'Tutorial geschafft!' : 'Lektion verloren', w === 0 ? 'Du hast den gegnerischen König besiegt. Jetzt bist du bereit für ein echtes Spiel.' : 'Dein König ist gefallen. Starte das Tutorial einfach neu.', 'Zum Menü');
      ovZumMenu = true; $('menuBtn').hidden = true;
      if (w === 0) jingle('win'); else jingle('lose');
      return;
    }
    if (pvp.on && pvp.zuschauer) { // Zuschauer: neutral, wer gewonnen hat
      pvp.ended = true; state = 'over'; winner = w;
      showOverlay('Partie beendet', w >= 0 ? pvp.namen[w] + ' hat gewonnen.' : 'Unentschieden: beide Könige sind gefallen.', 'Zum Menü', false);
      return;
    }
    if (pvp.on && !pvp.ended) pvpSend({ k: 'ergebnis', w: w }); // Ende an den Server melden (Elo); w = Sieger-Team, -1 = unentschieden
    if (pvp.on) { pvp.ended = true; if (pvp.me === 1 && w >= 0) w = 1 - w; } // im Online-Spiel immer aus deiner Sicht
    if (!pvp.on && note === undefined) { var neu = storyErgebnis(w); if (neu) note = (w === 0 ? 'Der gegnerische König ist gefallen.' : '') + neu; }
    state = 'over';
    winner = w;
    var again = pvp.on ? 'Zum Menü' : 'Nochmal';
    var stats = 'Spielzeit ' + fmtTime(clock) + ', ' + produced + (produced === 1 ? ' Einheit' : ' Einheiten') + ' gebaut.';
    if (w === 0) showOverlay('Sieg!', note || 'Der gegnerische König ist gefallen. ' + stats, again);
    else if (w === 1) showOverlay('Niederlage', note || 'Dein König ist gefallen. ' + stats, again);
    else showOverlay('Unentschieden', 'Beide Könige sind gleichzeitig gefallen. ' + stats, again);
    pauseBtn.textContent = 'Pause';
  }

  function logText() {
    var res = gaveUp ? 'Aufgegeben' : state === 'over' ? (winner === 0 ? 'Sieg' : winner === 1 ? 'Niederlage' : 'Unentschieden') : 'laeuft';
    return 'SM1 gegner=' + level + ' ergebnis=' + res +
      ' dauer=' + Math.round(clock) + ' burgIch=' + Math.ceil(bases[0].hp) + ' burgGegner=' + Math.ceil(bases[1].hp) +
      '\nICH: ' + rec[0].join(' ') + '\nGEGNER: ' + rec[1].join(' ');
  }
  var logBtn = $('logBtn'), logBox = $('logBox');
  logBtn.addEventListener('click', function () {
    var text = logText();
    logBox.value = text;
    var showBox = function () { logBox.hidden = false; logBox.focus(); logBox.select(); };
    try {
      navigator.clipboard.writeText(text).then(function () {
        logBtn.textContent = 'Kopiert';
        setTimeout(function () { logBtn.textContent = 'Spielprotokoll kopieren'; }, 1800);
        logBox.hidden = true;
      }, showBox);
    } catch (err) { showBox(); }
  });

  // Aufgeben: erst tippen, dann innerhalb von 3 Sekunden noch einmal bestätigen (verhindert Fehlklicks)
  var giveBtn = $('giveBtn'), giveTimer = 0;
  function disarmGive() {
    clearTimeout(giveTimer);
    giveBtn.classList.remove('armed');
    giveBtn.textContent = 'Aufgeben';
  }
  giveBtn.addEventListener('click', function (e) {
    if (state !== 'playing' && state !== 'paused') return;
    if (e.detail > 0) giveBtn.blur();
    if (!giveBtn.classList.contains('armed')) {
      giveBtn.classList.add('armed');
      giveBtn.textContent = 'Sicher?';
      giveTimer = setTimeout(disarmGive, 3000);
      return;
    }
    disarmGive();
    if (pvp.on) { pvp.pending.push('resign'); return; } // wird für beide gleichzeitig ausgeführt
    tut.on = false;
    tutBox('');
    state = 'over';
    winner = 1;
    gaveUp = true;
    showOverlay('Aufgegeben', 'Du hast das Spiel abgebrochen. Spielzeit ' + fmtTime(clock) + '.', 'Nochmal');
    pauseBtn.textContent = 'Pause';
  });

  function start(keepTut) {
    if (keepTut !== true) tut.on = false;
    blVorbereiten(sandbox); // Bot-Partie: fester Startwert (vor reset), feste Spielschritte
    reset();
    disarmGive();
    state = 'playing';
    jingle('start');
    overlay.hidden = true;
    $('story').hidden = true; $('freunde').hidden = true; $('koenigWahl').hidden = true; $('shop').hidden = true;
    koenigTeam = [meinKoenig(), botEintrag(botType).koenig]; // Aussehen der beiden Könige
    intro.t = 0;
    if (spielArt === 'story' && !tut.on) startIntro(meinName(), STORY[storyIdx].name); // auch bei «Nochmal»
    openBook(false);
    applyDeck();
    pauseBtn.textContent = 'Pause';
    ui.gm = ui.gf = ui.sec = ui.inc = -1;
    blLos(); // Freunde können zuschauen (mit Konto, online)
  }

