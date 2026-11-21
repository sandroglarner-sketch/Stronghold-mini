  // ---------- Königswahl, Königsbilder, Namen zu Beginn (19.11.) ----------
  // Frei: die eigenen Könige (KOENIG_SPIELER) und der König jedes besiegten Story-Bots; im Tester-Modus alle.
  function koenigFrei(id) {
    if (tester) return !!KOENIGE[id];
    for (var i = 0; i < KOENIG_SPIELER.length; i++) if (KOENIG_SPIELER[i].id === id) return true;
    for (var j = 0; j < STORY.length; j++) if (STORY[j].koenig === id && istBesiegt(STORY[j].id)) return true;
    return false;
  }
  function meinKoenig() {
    var id = 'standard'; try { id = localStorage.getItem('stronghold-koenig') || 'standard'; } catch (e) {}
    return KOENIGE[id] && koenigFrei(id) ? id : 'standard';
  }
  function meinName() { return sozial && sozial.ich ? sozial.ich.name : konto.user ? konto.user.split('@')[0] : 'Du'; }
  // Bild eines Königs in ein Canvas (Körper mittig, Waffe ragt nach rechts)
  // modus: 0 = ohne Waffe (Hände leer), 1 = mit Bogen, 2 = mit Nahkampfwaffe
  function koenigBild(cv, id, team, grau, modus, zust) { // zust = Ablauf (zieh/nah/rot/str/kratz) für die Animation in der Königswahl
    if (!cv.getAttribute('data-w')) { cv.setAttribute('data-w', cv.clientWidth || cv.width); cv.setAttribute('data-h', cv.clientHeight || cv.height); }
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || +cv.getAttribute('data-w'), h = cv.clientHeight || +cv.getAttribute('data-h');
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    var r = modus ? Math.min(h * 0.3, w * 0.15) : Math.min(h * 0.4, w * 0.3);
    c.save();
    if (modus === 2) c.translate(w * 0.3, h * 0.62); else if (modus === 1) c.translate(w * 0.38, h / 2); else c.translate(w / 2 + r * 0.4, h / 2); // ohne Waffe: Körper mittig
    if (grau) c.filter = 'grayscale(1) brightness(0.75)';
    koenigMalen(c, koenigOptik(id), r, team === 0 ? P.me : P.foe, zust || (modus === 1 ? { bogen: true, zieh: 1, str: 0.5, arrow: 1 } : modus === 2 ? {} : { ohneWaffe: true }));
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
  var kwAnsicht = {}, kwStart = {}, kwOffen = 0; // pro König: 0 ohne Waffe, 1 Bogen, 2 Nahkampfwaffe (Pfeil auf dem Bild, nur bei eigenen Königen); Startzeit der Animation
  // Ablauf in der Königswahl: Bogen: hervorholen 1 s, 2 Schüsse, versorgen 0,8 s, Pause; Nahkampf: hervorholen 1 s, 2 Hiebe, versorgen 1 s, Pause
  function kwZustand(id, modus, t, sel) {
    var z = { bogen: true, zieh: 0, nah: 0 };
    if (modus === 1) {
      t %= 5.2;
      if (t < 1) z.zieh = t;
      else if (t < 3) { var s = (t - 1) % 1, A = attackPose('kingbow', s - 0.45, 20); z.zieh = 1; z.str = A.str; z.vib = A.vib; z.arrow = A.arrow; }
      else if (t < 3.8) z.zieh = 1 - (t - 3) / 0.8;
    } else if (modus === 2) {
      t %= 5;
      if (t < 1) z.nah = t;
      else if (t < 2.6) { var s2 = (t - 1) % 0.8; z.nah = 1; z.rot = attackPose('king', s2 - 0.35, 20).rot; }
      else if (t < 3.6) z.nah = 1 - (t - 2.6);
    }
    if (sel && !(z.zieh > 0) && !(z.nah > 0)) { var kt = (performance.now() - kwOffen) / 1000 + KRATZ.alle - 1.5; kt %= KRATZ.alle; if (kt < KRATZ.dauer) z.kratz = kt / KRATZ.dauer; } // ausgewählter König kratzt sich alle 15 s
    return z;
  }
  function kwAnimieren() {
    if ($('koenigWahl').hidden) return;
    var akt = meinKoenig(), jetzt = performance.now();
    Array.prototype.forEach.call($('koenigGrid').querySelectorAll('canvas[data-bild]'), function (cv) {
      var id = cv.getAttribute('data-bild'), m = kwAnsicht[id] || 0;
      if (!m && id !== akt) return;
      koenigBild(cv, id, 0, cv.hasAttribute('data-grau'), m, kwZustand(id, m, (jetzt - (kwStart[id] || jetzt)) / 1000, id === akt));
    });
    requestAnimationFrame(kwAnimieren);
  }
  var KW_TEXT = ['Ohne Waffe – Pfeil: mit Bogen zeigen', 'Mit Bogen – Pfeil: mit Nahkampfwaffe zeigen', 'Mit Nahkampfwaffe – Pfeil: ohne Waffe zeigen'];
  function koenigWahlOpen(on) {
    var war = !$('koenigWahl').hidden;
    $('koenigWahl').hidden = !on;
    if (!on) return;
    if (!war) { kwOffen = performance.now(); requestAnimationFrame(kwAnimieren); }
    var akt = meinKoenig();
    $('koenigGrid').innerHTML = koenigListe().map(function (k) {
      if (!k.frei) kwAnsicht[k.id] = 0; // Bogen und Waffe sieht man nur bei eigenen Königen
      var m = kwAnsicht[k.id] || 0;
      return '<div role="button" tabindex="0" class="kwkarte' + (k.id === akt ? ' sel' : '') + (k.frei ? '' : ' zu') + '" data-k="' + k.id + '"' + (k.frei ? '' : ' aria-disabled="true"') + ' aria-label="' + esc(koenigName(k.id)) + '">' +
        '<span class="kwbild"><canvas data-bild="' + k.id + '"' + (k.frei ? '' : ' data-grau="1"') + '></canvas>' + (k.frei ? '<button type="button" class="kwpfeil" data-pfeil="' + k.id + '" title="' + KW_TEXT[m] + '" aria-label="' + KW_TEXT[m] + '">›</button>' : '') + '</span>' +
        '<b>' + esc(koenigName(k.id)) + '</b><span>' + (k.id === akt ? '✓ Ausgewählt' : (k.frei ? '' : '🔒 ') + esc(k.txt)) + '</span></div>';
    }).join('');
    Array.prototype.forEach.call($('koenigGrid').querySelectorAll('canvas[data-bild]'), function (cv) { var id = cv.getAttribute('data-bild'); koenigBild(cv, id, 0, cv.hasAttribute('data-grau'), kwAnsicht[id] || 0); });
  }
  $('koenigBtn').addEventListener('click', function () { koenigWahlOpen(true); });
  $('koenigZu').addEventListener('click', function () { koenigWahlOpen(false); });
  function kwWaehlen(b) {
    if (!b || b.classList.contains('zu')) return;
    try { localStorage.setItem('stronghold-koenig', b.getAttribute('data-k')); } catch (x) {}
    pvpSend({ k: 'koenig', id: meinKoenig() });
    koenigWahlOpen(true); menuKoenig();
  }
  $('koenigGrid').addEventListener('click', function (e) {
    var pf = e.target.closest ? e.target.closest('[data-pfeil]') : null;
    if (pf) { // nur die Ansicht wechseln, nicht auswählen
      var id = pf.getAttribute('data-pfeil'), m = ((kwAnsicht[id] || 0) + 1) % 3, cv = pf.parentNode.querySelector('canvas');
      kwAnsicht[id] = m; kwStart[id] = performance.now(); koenigBild(cv, id, 0, cv.hasAttribute('data-grau'), m); pf.title = KW_TEXT[m]; pf.setAttribute('aria-label', KW_TEXT[m]);
      return;
    }
    kwWaehlen(e.target.closest ? e.target.closest('[data-k]') : null);
  });
  $('koenigGrid').addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('kwkarte')) { e.preventDefault(); kwWaehlen(e.target); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('koenigWahl').hidden) koenigWahlOpen(false); });

  // ----- Namen zu Beginn: beide Namen in der Farbe ihrer Burg über und unter «vs» (Mitte), fliegen dann zur Burg und verschwinden; erst danach beginnt der Kampf -----
  var intro = { t: 0, namen: ['', ''], elos: [null, null] }, INTRO = 2.3;
  function startIntro(n0, n1, elos) { intro.namen = [n0, n1]; intro.elos = Array.isArray(elos) ? elos : [null, null]; intro.t = INTRO; }
  // Goldener Lorbeerkranz = Symbol für die Elo-Punkte (21.11.), als SVG für HTML und als Bild fürs Canvas
  function kranzSvg(px) {
    var bl = '', i, a, x, y, r = 8.2;
    for (var sd = -1; sd <= 1; sd += 2) for (i = 0; i < 6; i++) {
      a = (122 + i * 21) * Math.PI / 180; x = 12 + sd * Math.cos(a) * -r; y = 12.6 + Math.sin(a) * -r * -1;
      bl += '<ellipse cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" rx="2.5" ry="1.15" transform="rotate(' + ((sd < 0 ? 180 - (122 + i * 21) : (122 + i * 21)) + 55 * sd).toFixed(1) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"/>';
    }
    return '<svg class="kranz" width="' + px + '" height="' + px + '" viewBox="0 0 24 24" aria-label="Elo" role="img"><g fill="#e2b33c" stroke="#9a6f12" stroke-width="0.5">' + bl +
      '</g><path d="M11 20.2 L9.3 23 M13 20.2 L14.7 23" stroke="#c0392b" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="19.8" r="1.4" fill="#c0392b"/></svg>';
  }
  var kranzBild = new Image(); kranzBild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(kranzSvg(64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  function zeichneIntro() {
    var e = INTRO - intro.t, ein = Math.min(1, e / 0.25), flug = Math.max(0, Math.min(1, (e - 1.35) / 0.8)), f = flug * flug * (3 - 2 * flug);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.25 * ein * (1 - f); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W * T, H * T);
    for (var t = 0; t < 2; t++) { // Namen über und unter «vs» (Mitte), lange Namen werden kleiner, damit sie aufs Feld passen
      var b = bases[t], zx = (b.x1 + b.x2) / 2 * T, zy = b.y1 * T - 18, sx = W * T / 2, sy = H * T * (t === 0 ? 0.3 : 0.6);
      var x = sx + (zx - sx) * f, y = sy + (zy - sy) * f;
      ctx.font = '700 46px "Space Grotesk", system-ui, sans-serif';
      var passt = Math.min(1, W * T * 0.86 / Math.max(1, ctx.measureText(intro.namen[t]).width)), s = passt * (1 - 0.7 * f);
      ctx.globalAlpha = ein * (1 - flug * flug);
      ctx.font = '700 ' + Math.round(46 * s) + 'px "Space Grotesk", system-ui, sans-serif';
      ctx.lineWidth = 8 * s; ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.strokeText(intro.namen[t], x, y);
      ctx.fillStyle = t === 0 ? P.me : P.foe; ctx.fillText(intro.namen[t], x, y);
      if (typeof intro.elos[t] === 'number') { // Elo unter dem Namen: goldener Kranz + Zahl
        var ez = String(intro.elos[t]), eg = Math.round(28 * s), ey = y + 40 * s;
        ctx.font = '700 ' + eg + 'px "Space Grotesk", system-ui, sans-serif';
        var ew = ctx.measureText(ez).width, kg = eg * 1.25, ex = x - (kg + 6 * s + ew) / 2;
        if (kranzBild.complete) ctx.drawImage(kranzBild, ex, ey - kg / 2, kg, kg);
        ctx.textAlign = 'left'; ctx.lineWidth = 6 * s; ctx.strokeText(ez, ex + kg + 6 * s, ey);
        ctx.fillStyle = '#a5780f'; ctx.fillText(ez, ex + kg + 6 * s, ey); ctx.textAlign = 'center';
      }
    }
    ctx.globalAlpha = ein * (1 - Math.min(1, flug * 3));
    ctx.font = '600 26px "Space Grotesk", system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText('vs', W * T / 2, H * T * 0.45); ctx.fillStyle = '#2b3437'; ctx.fillText('vs', W * T / 2, H * T * 0.45);
    ctx.restore();
  }
  menuKoenig();
