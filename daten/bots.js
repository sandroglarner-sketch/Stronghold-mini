    // Gegner «Der Bandit» (Zahlen in BOTS.bauern):
    // farmers = höchstens so viele Bauern; huntLead = so viele Sekunden lang musst du mehr Bauern haben, bis die Jagd kommt; hunt = Jagdtrupp, huntEvery = Pause zwischen zwei Jagden;
    // wallGold = so viel Gold, dann baut er eine Mauer (repairAt 0 = er repariert nie, baut sie aber neu), wallClear = nur, solange kein Gegner in seiner Spielfeldhälfte ist;
    // attackGold = ab so viel Gold beginnt der Angriff; attack = Schritte (after = Sekunden nach dem Beginn, buy = [Einheit, Anzahl]);
    // lockSecs = so lange nach Beginn des Angriffs wird sonst nichts gekauft; defPlus = Verteidigung mit (deine Einheiten abzüglich seiner Turmbesatzung) plus so vielen Einheiten mehr als du hast,
    // defPool = erlaubte Einheiten, defMage = ab so vielen benötigten Einheiten sind auch Magier erlaubt, noOutput = danach so viele Sekunden keine Einheiten
  CONFIG.BOTS = {
      bauern: { farmers: 5, huntLead: 20, hunt: [['spear', 2]], huntEvery: 30,
                wallGold: 60, wallUnits: 0, repairAt: 0, wallClear: true,
                attackGold: 130, lockSecs: 15,
                attack: [{ after: 0, buy: [['ram', 1]] }, { after: 4, buy: [['spear', 2]] }, { after: 6, buy: [['spear', 4]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 4]] }],
                defPlus: 1, defPool: ['spear', 'archer'], defMage: 99, noOutput: 10 },
      // «Kleiner Prinz»: wie Der Bandit, aber 6 Bauern, Mauer bis Stufe 3 (wallStage) mit Reparatur ab 60 Leben,
      prinz: { farmers: 6, huntLead: 20, hunt: [['archer', 1], ['spear', 1]], huntEvery: 30,
               wallGold: 60, wallUnits: 0, repairAt: 60, wallStage: 3, wallClear: true,
               attackGold: 180, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 6]] }],
               defPlus: 1, defPool: ['spear', 'archer'], defMage: 99, noOutput: 10 },
      // «Der Feldherr»: wie der Kleine Prinz, aber 12 Bauern, Mauer bis Stufe 2, jagt nach 15 s Bauern-Vorsprung mit 1 Reiter (dann 25 s Pause),
      // verteidigt mit Bogenschützen, Speerkämpfern und Reitern, greift bei 210 Gold an
      feldherr: { farmers: 12, huntLead: 15, hunt: [['rider', 1]], huntEvery: 25,
               wallGold: 60, wallUnits: 0, repairAt: 60, wallStage: 2, wallClear: true,
               attackGold: 210, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['catapult', 1], ['ram', 1]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 5]] }, { after: 13, buy: [['rider', 4]] }],
               defPlus: 1, defPool: ['archer', 'spear', 'rider'], defMage: 99, noOutput: 10 },
      // «Baron Rabenstein»: wie der Feldherr, aber 9 Bauern, Mauer bis Stufe 5 (die Türme besetzt er wie alle Gegner komplett: je 3 Bogenschützen und auf dem Belagerungsplatz ein Trebuchet, towerSiege),
      // jagt nach 20 s Bauern-Vorsprung (35 s Pause) mit 1 Ritter, 3 s später 2 Bogenschützen, 1 s danach 2 Speerkämpfer (huntLater, after = Sekunden nach dem Beginn der Jagd),
      // verteidigt mit Rittern, Bogenschützen, Speerkämpfern und Tunnelgräbern, greift bei 230 Gold an
      baron: { farmers: 9, huntLead: 20, hunt: [['knight', 1]], huntEvery: 35,
               huntLater: [{ after: 3, buy: [['archer', 2]] }, { after: 4, buy: [['spear', 2]] }],
               wallGold: 60, wallUnits: 0, repairAt: 60, wallStage: 5, towerSiege: 'trebuchet', wallClear: true,
               attackGold: 230, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 5, buy: [['spear', 2]] }, { after: 6, buy: [['knight', 2]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 8]] }],
               defPlus: 1, defPool: ['knight', 'archer', 'spear', 'digger'], defMage: 99, noOutput: 10,
               defDiggerVsCatapult: 2 } // hat der Gegner ein Katapult auf dem Feld (nicht auf dem Turm), sind mindestens so viele Tunnelgräber in der Verteidigung
  };
