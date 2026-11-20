  // Bot-Datenbank (Teil 2): alle Bots mit Name, König (Optik aus KOENIGE, auch Bild auf der Story-Karte), Story-Platz und Logik.
  // platz = Reihenfolge im Story-Modus (1 = zuerst; null = noch nicht im Spiel); die Lage auf der Story-Karte ergibt sich von selbst (4 Gegner pro Seite, dann wird geblättert);
  // logik = Schlüssel in CONFIG.BOTS (daten/bots.js) mit dem ganzen Verhalten; null = noch keine Logik (Bot ist dann nicht im Spiel).
  // Gegen einen Bot kämpft man im Story-Modus, sobald der Bot mit dem Platz davor besiegt ist. Ein Sieg schaltet seinen König frei.
  var BOT_DB = [
    { id: 'bandit', name: 'Der Bandit', koenig: 'bandit', platz: 3, logik: 'bauern' },
    { id: 'prinz', name: 'Kleiner Prinz', koenig: 'prinz', platz: 4, logik: 'prinz' },
    { id: 'feldherr', name: 'Der Feldherr', koenig: 'feldherr', platz: 5, logik: 'feldherr' },
    { id: 'rabenstein', name: 'Baron Rabenstein', koenig: 'rabenstein', platz: 6, logik: 'baron' },
    // frühere Spieler-Könige, jetzt Bots, noch ohne Logik
    { id: 'loewenherz', name: 'Löwenherz', koenig: 'loewenherz', platz: null, logik: null },
    { id: 'jungkoenig', name: 'Jungkönig', koenig: 'jungkoenig', platz: null, logik: null },
    { id: 'waldkoenig', name: 'Waldkönig', koenig: 'waldkoenig', platz: null, logik: null },
    // Anfänger-Bots (Vorschlag: vor dem Banditen), noch ohne Logik
    { id: 'strohkoenig', name: 'Bauer Hannes, der Strohkönig', koenig: 'strohkoenig', platz: null, logik: null },
    { id: 'tollpatsch', name: 'Knappe Tollpatsch', koenig: 'tollpatsch', platz: 1, logik: 'tollpatsch' }, // seit 20.11. erster Story-Gegner
    // weitere Bots, noch ohne Logik
    { id: 'raubritterkuno', name: 'Raubritter Kuno', koenig: 'raubritterkuno', platz: null, logik: null },
    { id: 'graefineisenhand', name: 'Gräfin Eisenhand', koenig: 'graefineisenhand', platz: null, logik: null },
    { id: 'baerenfuerst', name: 'Der Bärenfürst', koenig: 'baerenfuerst', platz: null, logik: null },
    { id: 'herzognebelwald', name: 'Herzog Nebelwald', koenig: 'herzognebelwald', platz: null, logik: null },
    { id: 'sumpfhexe', name: 'Die Sumpfhexe', koenig: 'sumpfhexe', platz: null, logik: null },
    { id: 'koenigrotbart', name: 'König Rotbart', koenig: 'koenigrotbart', platz: null, logik: null },
    { id: 'markgrafmoorstein', name: 'Markgraf Moorstein', koenig: 'markgrafmoorstein', platz: null, logik: null },
    { id: 'wolfsjarl', name: 'Der Wolfsjarl', koenig: 'wolfsjarl', platz: null, logik: null },
    { id: 'kalifsandsturm', name: 'Kalif Sandsturm', koenig: 'kalifsandsturm', platz: null, logik: null },
    { id: 'fuerstbischofgerold', name: 'Fürstbischof Gerold', koenig: 'fuerstbischofgerold', platz: null, logik: null },
    { id: 'schwarzeritter', name: 'Der Schwarze Ritter', koenig: 'schwarzeritter', platz: null, logik: null },
    { id: 'zarinfrostmantel', name: 'Zarin Frostmantel', koenig: 'zarinfrostmantel', platz: null, logik: null },
    { id: 'junkerhabgier', name: 'Junker Habgier', koenig: 'junkerhabgier', platz: null, logik: null },
    { id: 'vogtgrimmbart', name: 'Vogt Grimmbart', koenig: 'vogtgrimmbart', platz: null, logik: null },
    { id: 'kaiseringoldfeder', name: 'Kaiserin Goldfeder', koenig: 'kaiseringoldfeder', platz: null, logik: null },
    { id: 'pilzkoenig', name: 'Der Pilzkönig', koenig: 'pilzkoenig', platz: null, logik: null },
    { id: 'admiralsalzwind', name: 'Admiral Salzwind', koenig: 'admiralsalzwind', platz: null, logik: null },
    { id: 'khansteppensturm', name: 'Khan Steppensturm', koenig: 'khansteppensturm', platz: null, logik: null },
    { id: 'drachenkoenig', name: 'Der Drachenkönig', koenig: 'drachenkoenig', platz: null, logik: null },
    { id: 'schattenkoenigin', name: 'Die Schattenkönigin', koenig: 'schattenkoenigin', platz: null, logik: null },
    // neue Bots (20.11.), noch ohne Logik. Idee: jeder Bot spielt selbst die Karte, die man durch einen Sieg gegen ihn freischaltet (Vorschlag in Klammern)
    { id: 'hauptmannschildwall', name: 'Hauptmann Schildwall', koenig: 'hauptmannschildwall', platz: 2, logik: 'hauptmannschildwall' }, // Belohnung: Belagerungsschild
    { id: 'glutmeisterin', name: 'Die Glutmeisterin', koenig: 'glutmeisterin', platz: null, logik: null }, // (Fackelwerfer)
    { id: 'haendlerfuerstgoldsand', name: 'Händlerfürst Goldsand', koenig: 'haendlerfuerstgoldsand', platz: null, logik: null }, // (Karawane)
    { id: 'abtglockenklang', name: 'Abt Glockenklang', koenig: 'abtglockenklang', platz: null, logik: null }, // (Kirche)
    { id: 'steinmetzbrocken', name: 'Steinmetz Brocken', koenig: 'steinmetzbrocken', platz: null, logik: null } // (Onager)
  ];
  // Story-Umbau: gespeichert ist die Anzahl besiegter Gegner (der Reihe nach). Wird ein Bot weiter vorne eingefügt, steht hier ein Eintrag:
  // v = neue Story-Version, platz = wo eingefügt. Gespeicherte Stände älterer Versionen werden umgerechnet: wer schon einen Gegner hinter
  // dem Einfügeplatz besiegt hat, gilt auch als Sieger gegen den eingefügten Bot (Spiel: sozial.js, Server: server.js).
  var STORY_UMBAU = [{ v: 2, platz: 1 }, { v: 3, platz: 2 }]; // 20.11.: Knappe Tollpatsch (1), Hauptmann Schildwall (2) vor dem Banditen
  var STORY_VERSION = 3;
  function storyUmrechnen(n, vonV) { STORY_UMBAU.forEach(function (u) { if (u.v > vonV && n > u.platz - 1) n++; }); return n; }
  // Story-Modus: alle Bots mit Platz und Logik, nach Platz sortiert (bot = Logik-Schlüssel). Lage auf der Karte automatisch: STORY_LAGE[i % 4], Seite = i / 4
  var STORY_PRO_SEITE = 4, STORY_LAGE = [{ x: 13, y: 73 }, { x: 34, y: 47 }, { x: 56, y: 69 }, { x: 80, y: 40 }]; // passt zum Weg in der SVG-Karte (spiel/index.html)
  var STORY = BOT_DB.filter(function (b) { return b.platz && b.logik; }).sort(function (a, b) { return a.platz - b.platz; })
    .map(function (b, i) { var l = STORY_LAGE[i % STORY_PRO_SEITE]; return { id: b.id, bot: b.logik, name: b.name, koenig: b.koenig, x: l.x, y: l.y, seite: Math.floor(i / STORY_PRO_SEITE) }; });
  // Name und König eines Bots aus seinem Logik-Schlüssel (für Sandbox, Tutorial usw.)
  function botEintrag(logik) { for (var i = 0; i < BOT_DB.length; i++) if (BOT_DB[i].logik === logik) return BOT_DB[i]; return { name: 'Gegner', koenig: 'standard' }; }
