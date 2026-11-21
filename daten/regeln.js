
  // Alle Spielwerte an einer Stelle, damit sich leicht daran drehen lässt.
  var CONFIG = {
    GOLD_EVERY: 5,
    GOLD_AMOUNT: 10,
    START_GOLD: 10,
    UNIT_HEAL: { delay: 10, rate: 1 }, // jede Einheit heilt rate Leben pro Sekunde, wenn sie delay Sekunden lang keinen Schaden erlitten hat
    GOLD_MAX: Infinity, SANDBOX_GOLD: 9999, // GOLD_MAX = mehr Gold kann niemand haben (alle Modi; Infinity = keine Obergrenze)
     SANDBOX_FOE_GOLD: 160, // Sandbox-Knopf im Menü: du startest mit so viel Gold, der Gegner mit so viel
    BASE_HP: 40,
    FARMER_RADIUS: 1.8, // so nah dürfen sich zwei Bauern nicht niederlassen
    FARMER_EDGE: 2,   // so nah am Spielfeldrand darf sich kein Bauer niederlassen
    BASE_ATK: 2,
    BASE_RANGE: 6, // Reichweite des Königs auf der Burg (seit 21.11. 10:37: 6)
    KING_BOW: { draw: 1, stow: 0.8 },
    KING_SWAP: { time: 1.8, bow: 0.8, stow: 1 }, // Burg kaputt: in time s Bogen versorgen (erste bow s) und Nahkampfwaffe hervorholen, so lange kein Kampf; zurück auf der Burg: Waffe in stow s versorgen // Sekunden: Bogen hervorholen, sobald ein Gegner in Reichweite ist (erst dann Schuss), und wieder verstauen
    BASE_CD: 1,
    BASE_DELAY: 0.5, // Flugzeit des Kasernenpfeils in Sekunden
    // Computergegner: bekommt wie du 10 Gold pro Auszahlung (ohne Bauernbonus). 
    levels: {
      normal: { income: 10 }
    },
    // think = Sekunden zwischen Entscheidungen; weakHp = Der Turm (die Kaserne) schafft es allein, wenn der Gegner nur noch Einheiten mit
    // zusammen höchstens so vielen Leben hat; attackMemory = so lange gilt ein Bauer oder die Kaserne als angegriffen
    AI: { think: [0.8, 1.6], weakHp: 6, attackMemory: 4, towerCool: 20, castleWait: 15, wallRepairLoss: 40 }, // towerCool = Pause in Sekunden nach dem Auffüllen der Turmplätze; castleWait = so lange baut ein Gegner eine zerstörte Burg frühestens nicht wieder auf
  };

  // Bäume (Ressourcen für Holzfäller): spiegelbildlich zur Mitte (x -> W - x). Wald unten in der Mitte, je 2 Bäume näher an jeder Burg, je 5 links und rechts vom Teich.
  // holz = so viel Gold gibt ein Baum höchstens, dann ist er gefällt (Stumpf). Feld: 22 × 10 Kacheln.
  CONFIG.BAEUME = (function () {
    var links = [[3.6, 8.0], [4.5, 8.75], [8.5, 8.45], [9.2, 7.95], [9.15, 8.95], [10.15, 7.6], [10.1, 8.6], [8.6, 0.9], [8.2, 1.85], [8.85, 2.6], [7.35, 1.3], [7.15, 2.45]], l = [], W0 = 22; // die letzten 5: links vom Teich (2 davon weiter Richtung Burg)
    links.forEach(function (p) { l.push({ x: p[0], y: p[1] }); l.push({ x: W0 - p[0], y: p[1] }); });
    l.push({ x: W0 / 2, y: 8.15 }); // ein Baum genau in der Mitte
    return { holz: 20, liste: l };
  })();
