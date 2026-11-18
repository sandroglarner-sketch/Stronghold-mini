
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
    BASE_RANGE: 4.5,
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
