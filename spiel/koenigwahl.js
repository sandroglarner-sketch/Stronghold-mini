  // ---------- Königswahl, Königsbilder, Namen zu Beginn (19.11.) ----------
  // Frei: die eigenen Könige (KOENIG_SPIELER) und der König jedes besiegten Story-Bots; im Tester-Modus alle.
  function koenigFrei(id) {
    if (tester) return !!KOENIGE[id];
    for (var i = 0; i < KOENIG_SPIELER.length; i++) if (KOENIG_SPIELER[i].id === id) return true;
    var n = storyStand();
    for (var j = 0; j < n && j < STORY.length; j++) if (STORY[j].koenig === id) return true;
    return false;
  }
  function meinKoenig() {
    var id = 'standard'; try { id = localStorage.getItem('stronghold-koenig') || 'standard'; } catch (e) {}
    return KOENIGE[id] && koenigFrei(id) ? id : 'standard';
  }
  function meinName() { return sozial && sozial.ich ? sozial.ich.name : konto.user ? konto.user.split('@')[0] : 'Du'; }
  // Bild eines Königs in ein Canvas (Körper mittig, Waffe ragt nach rechts)
  function koenigBild(cv, id, team, grau) {
    if (!cv.getAttribute('data-w')) { cv.setAttribute('data-w', cv.clientWidth || cv.width); cv.setAttribute('data-h', cv.clientHeight || cv.height); }
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || +cv.getAttribute('data-w'), h = cv.clientHeight || +cv.getAttribute('data-h');
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    var r = Math.min(h * 0.3, w * 0.2);
    c.save(); c.translate(w * 0.4, h / 2);
    if (grau) c.filter = 'grayscale(1) brightness(0.75)';
    koenigMalen(c, koenigOptik(id), r, team === 0 ? P.me : P.foe, {});
    c.restore();
  }
  // Name eines Königs für die Auswahl
  function koenigName(id) {
    for (var i = 0; i < KOENIG_SPIELER.length; i++) if (KOENIG_SPIELER[i].id === id) return KOENIG_SPIELER[i].name;
    for (var j = 0; j < BOT_DB.length; j++) if (BOT_DB[j].koenig === id) return BOT_DB[j].name;
    return id;
  }
  function menuKoenig() { koenigBild($('koenigIcon'), meinKoenig(), 0); }

  // ----- Fenster «Dein König» -----
  function koenigListe() {
    var l = KOENIG_SPIELER.map(function (k) { return { id: k.id, frei: true, txt: 'Immer frei' }; });
    STORY.forEach(function (s, i) { l.push({ id: s.koenig, frei: koenigFrei(s.koenig), txt: koenigFrei(s.koenig) ? 'Freigeschaltet' : 'Besiege ' + s.name }); });
    if (tester) BOT_DB.forEach(function (b) { if (!l.some(function (x) { return x.id === b.koenig; })) l.push({ id: b.koenig, frei: true, txt: 'Tester-Modus (Bot noch nicht im Spiel)' }); });
    return l;
  }
  function koenigWahlOpen(on) {
    $('koenigWahl').hidden = !on;
    if (!on) return;
    var akt = meinKoenig();
    $('koenigGrid').innerHTML = koenigListe().map(function (k) {
      return '<button type="button" class="kwkarte' + (k.id === akt ? ' sel' : '') + (k.frei ? '' : ' zu') + '" data-k="' + k.id + '"' + (k.frei ? '' : ' aria-disabled="true"') + '>' +
        '<canvas data-bild="' + k.id + '"' + (k.frei ? '' : ' data-grau="1"') + '></canvas><b>' + esc(koenigName(k.id)) + '</b><span>' + (k.id === akt ? '✓ Ausgewählt' : (k.frei ? '' : '🔒 ') + esc(k.txt)) + '</span></button>';
    }).join('');
    Array.prototype.forEach.call($('koenigGrid').querySelectorAll('canvas[data-bild]'), function (cv) { koenigBild(cv, cv.getAttribute('data-bild'), 0, cv.hasAttribute('data-grau')); });
  }
  $('koenigBtn').addEventListener('click', function () { koenigWahlOpen(true); });
  $('koenigZu').addEventListener('click', function () { koenigWahlOpen(false); });
  $('koenigGrid').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-k]') : null; if (!b || b.classList.contains('zu')) return;
    try { localStorage.setItem('stronghold-koenig', b.getAttribute('data-k')); } catch (x) {}
    pvpSend({ k: 'koenig', id: meinKoenig() });
    koenigWahlOpen(true); menuKoenig();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('koenigWahl').hidden) koenigWahlOpen(false); });

  // ----- Namen zu Beginn: beide Namen in der Farbe ihrer Burg, fliegen dann zur Burg und verschwinden; erst danach beginnt der Kampf -----
  var intro = { t: 0, namen: ['', ''] }, INTRO = 2.3;
  function startIntro(n0, n1) { intro.namen = [n0, n1]; intro.t = INTRO; }
  function zeichneIntro() {
    var e = INTRO - intro.t, ein = Math.min(1, e / 0.25), flug = Math.max(0, Math.min(1, (e - 1.35) / 0.8)), f = flug * flug * (3 - 2 * flug);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.25 * ein * (1 - f); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W * T, H * T);
    for (var t = 0; t < 2; t++) {
      var b = bases[t], zx = (b.x1 + b.x2) / 2 * T, zy = b.y1 * T - 18, sx = W * T * (t === 0 ? 0.28 : 0.72), sy = H * T * 0.45;
      var x = sx + (zx - sx) * f, y = sy + (zy - sy) * f, s = 1 - 0.7 * f;
      ctx.globalAlpha = ein * (1 - flug * flug);
      ctx.font = '700 ' + Math.round(46 * s) + 'px "Space Grotesk", system-ui, sans-serif';
      ctx.lineWidth = 8 * s; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(intro.namen[t], x, y);
      ctx.fillStyle = t === 0 ? P.me : P.foe; ctx.fillText(intro.namen[t], x, y);
    }
    ctx.globalAlpha = ein * (1 - Math.min(1, flug * 3));
    ctx.font = '600 26px "Space Grotesk", system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText('gegen', W * T / 2, H * T * 0.45); ctx.fillStyle = '#2b3437'; ctx.fillText('gegen', W * T / 2, H * T * 0.45);
    ctx.restore();
  }
  menuKoenig();
