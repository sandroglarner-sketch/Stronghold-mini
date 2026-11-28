  var TYPES = ['farmer', 'spear', 'archer', 'rider', 'mage', 'knight', 'digger', 'wall', 'ram', 'worker', 'shield', 'catapult', 'baliste', 'sword', 'ladder', 'belfry', 'trebuchet', 'javelin', 'crossbow', 'onager', 'schmiede', 'adel', 'bank', 'dieb', 'kirche', 'karawane', 'brand', 'fackel', 'feuerbogen', 'holzfaeller', 'buerger', 'schwarzritter', 'raeuber', 'prinzessin', 'wache', 'waechter'];
  // Knopf-Reihenfolge (auch Deck/Buch): links die Mauer, dann Wirtschaft + Kampfeinheiten nach Kosten aufsteigend, dann Belagerungsmaschinen nach Kosten aufsteigend.
  // cat = Typ (genau einer): 'building' Gebäude, 'eco' Wirtschaft, 'melee' Nahkampfeinheit, 'ranged' Fernkampfeinheit, 'siege' Belagerungsmaschine. Ob eine Belagerungsmaschine auf den grossen Turm (Mauer 5) darf, steht in WALL.tower.levels[5] (slot types). Tasten 1–9, 0, Q, E werden von links nach rechts vergeben.
  var BUY_TYPES = (function () {
    var all = ['farmer', 'spear', 'archer', 'rider', 'digger', 'knight', 'mage', 'ram', 'shield', 'catapult', 'baliste', 'sword', 'ladder', 'belfry', 'trebuchet', 'javelin', 'crossbow', 'onager', 'schmiede', 'adel', 'bank', 'dieb', 'kirche', 'karawane', 'brand', 'fackel', 'feuerbogen', 'holzfaeller', 'buerger', 'schwarzritter', 'raeuber', 'prinzessin', 'wache'];
    var grp = function (t) { var c = CONFIG.units[t].cat; return c === 'building' ? 0 : c === 'eco' ? 1 : c === 'siege' ? 3 : 2; }; // nach der Mauer: Gebäude, Wirtschaft, Kampfeinheiten, Belagerung
    all.sort(function (a, b) { return grp(a) - grp(b) || CONFIG.units[a].cost - CONFIG.units[b].cost || 0; });
    var list = ['wall'].concat(all), keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
    list.forEach(function (t, i) { CONFIG.units[t].key = keys[i] || ''; });
    return list;
  })();
  var WALL = CONFIG.units.wall.wall, WALL_TH = WALL.thick;

  var W = 22, H = 10, T = 50; // Feld in Kacheln, T = Pixel pro Kachel
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('field'), ctx = canvas.getContext('2d');
  canvas.width = W * T;
  canvas.height = H * T;

  var simRand = Math.random; // im Online-Modus: gemeinsamer Zufallsgenerator mit festem Startwert
  var VERSION = 'dev'; // wird beim Bauen durch eine Kennung des Spielcodes ersetzt (Online: alter Stand -> Seite neu laden)
  var ONLINE = /*ONLINE*/false; // der Server schaltet das auf true (nur die gehostete Seite hat Online-Spiel)
  // Kauf-Verzögerung (18.11.): eigene Käufe reagieren sofort (Ton, Gold weg, Knopf drückt sich ein), die Einheit (auch die Arbeiter der Mauer) kommt nach DEPLOY s heraus.
  // Offline: Kauf wird nach DEPLOY s (Echtzeit, nur während das Spiel läuft) ausgeführt; online: bis der Befehl im Lockstep ausgeführt wird (PVP_DELAY Schritte).
  // deploys = eigene Käufe unterwegs {type, cost, t, net}; ihr Gold ist reserviert (nur Anzeige/Kaufprüfung, die Simulation zieht es beim Ausführen ab)
  var DEPLOY = 0.35, deploys = [];
  function deployGold() { var s = 0; for (var i = 0; i < deploys.length; i++) if (deploys[i].p === undefined || deploys[i].p === MP) s += deploys[i].cost; return s; } // nur deine (Tester-Duokampf: Tab wechselt den Spieler)
  var ME = 0; // welches Team du bist (0 = links/blau, 1 = rechts/rot im Online-Spiel)
  // Duokampf (27.11.): Spieler 0 und 2 bilden Team 0 (blau, violett), 1 und 3 Team 1 (rot, orange); Spieler p gehört zu Team p % 2.
  // duo.spieler = Spieler in der Partie (gegen den Bot [0, 1, 2], 1 = Bot); MP = welcher Spieler du bist (sonst = ME); duo.weg = Spieler, die gegangen sind (Spielschritt)
  var MP = 0, duo = { on: false, bot: false, spieler: [0, 1], namen: [], decks: [], weg: {} };
  var pvp = { on: false, me: 0, ws: null, searching: false, ended: false, tick: 0, acc: 0, alpha: 0, inbox: {}, sent: {}, pending: [], hashes: {}, remoteHash: {}, stall: 0 };
  var sandbox = false, sandBtn = $('sandBtn');
  // Tester-Modus (19.11.): zeigt die Sandbox und schaltet alle Einheiten und Gegner frei. Im Artifact für alle; online (28.11.) nur für Konten,
  // die der Server als Tester meldet (konto.tester, Render-Variable TESTER_IDS). Online zählen dann keine Siege und es gibt keine Partien gegen Menschen.
  var tester = false;
  try { tester = !ONLINE && localStorage.getItem('stronghold-tester') === '1'; } catch (err) {}
  var tut = { on: false, i: 0, avail: [], bought: {}, script: [], si: 0, rt: 0, st: 0, boxOpen: false };
  var overlay = $('overlay'), ovTitle = $('ovTitle'), ovText = $('ovText'), ovBtn = $('ovBtn');
  // Edelstein (22.11.): Währung für den Shop, grüner geschliffener Stein
  var EDEL_SVG = '<svg class="edel" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h10l4.2 5L10 18.2 0.8 7.5z" fill="#1c8f4c"/><path d="M0.8 7.5h18.4L10 18.2z" fill="#14713b"/><path d="M5 2.5l2.6 5h4.8l2.6-5z" fill="#6ee29b"/><path d="M7.6 7.5L10 18.2l2.4-10.7z" fill="#27b263"/><path d="M5 2.5L0.8 7.5h6.8zM15 2.5l4.2 5h-6.8z" fill="#3cc777"/><path d="M6.6 4.2l1.3 2.2" stroke="#e9fff1" stroke-width="1.1" stroke-linecap="round"/></svg>';
  var COIN_SVG = '<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.5" fill="#c98a12"/><circle cx="10" cy="10" r="7.4" fill="#f5c542"/><circle cx="10" cy="10" r="4.8" fill="none" stroke="#d9a21f" stroke-width="1.5"/><path d="M5.6 8.2A4.8 4.8 0 0 1 8.4 5.5" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var pauseBtn = $('pauseBtn'), goldMeEl = $('goldMe'), goldFoeEl = $('goldFoe');
  var payFill = $('payFill'), payText = $('payText'), unitsEl = $('units');

  // ---------- Farben aus dem Theme ----------
  var TOKENS = ['me', 'foe', 'p2', 'p3', 'gold', 'gold-fill', 'grass-a', 'grass-b', 'tuft', 'dirt', 'dirt-edge', 'tree',
    'tree-hi', 'water', 'water-hi', 'stone', 'stone-dark', 'wood', 'steel', 'shade', 'bg', 'line'];
  var P = {};
  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    for (var i = 0; i < TOKENS.length; i++) P[TOKENS[i]] = cs.getPropertyValue('--' + TOKENS[i]).trim();
  }
  function farbeVon(p) { return p === 1 ? P.foe : p === 2 ? P.p2 : p === 3 ? P.p3 : P.me; } // Farbe eines Spielers (0 blau, 1 rot, 2 violett, 3 orange)

