    // Gegner «Der Bandit» (Zahlen in BOTS.bauern):
    // income / incomeEvery = Grundeinkommen des Bots: so viel Gold alle so viele Sekunden (Standard 10 Gold alle 5 s, wie der Spieler);
    // farmers = höchstens so viele Bauern; huntLead = so viele Sekunden lang musst du mehr Bauern haben, bis die Jagd kommt; hunt = Jagdtrupp, huntEvery = Pause zwischen zwei Jagden;
    // wallGold = so viel Gold, dann baut er eine Mauer (repariert wird bei allen Bots gleich: fehlen mehr als 40 Leben zum Höchstwert der angestrebten Stufe), wallClear = nur, solange kein Gegner in seiner Spielfeldhälfte ist;
    // wallStage = Ausbau bis Stufe (0 = keine Mauer, 1 = Mauer ohne Türme, 2 = 2 Turmplätze, 3 = 4, 4 = 6, 5 = 6 + 2 Belagerungsplätze);
    // turm = angestrebte Turmbesatzung (Gesamtzahl je Einheit auf allen Türmen, z. B. { archer: 6, trebuchet: 2 }); Einheiten, die von selbst hinaufsteigen, bleiben; ein frei gewordener Platz wird mit der angestrebten Mischung besetzt;
    // defPlus kann auch negativ sein (verteidigt dann mit weniger Stärke als dein Angriff);
    // attackGold = ab so viel Gold beginnt der Angriff; attack = Schritte (after = Sekunden nach dem Beginn, buy = [Einheit, Anzahl]);
    // lockSecs = so lange nach Beginn des Angriffs wird sonst nichts gekauft; defPlus = Verteidigung mit (Stärkewert deiner Einheiten abzüglich seiner Turmbesatzung) plus so viel Stärke mehr als du hast (Stärkewert: CONFIG.units[..].staerke),
    // karawanen = so viele Karawanen strebt er an (wie die Bauern); gebaeude = Gebäudekäufe in Reihenfolge [{ type, gold }]: die n-te Zeile eines Gebäudes ist sein n-ter Kauf (Bau, Ausbaustufe, bei der Kirche ein Gebet), gekauft ab so viel freiem Gold und nur ohne gegnerische Einheit in seiner Spielfeldhälfte;
    // für die Jagd zählt auf beiden Seiten jede Karawane wie 2 Bauern (er jagt nur, wenn du mehr Wirtschaft hast); farmers und karawanen kauft er genau wie angegeben;
    // defPool = erlaubte Einheiten, defMage = ab so vielen benötigten Einheiten sind auch Magier erlaubt, noOutput = danach so viele Sekunden keine Einheiten
  CONFIG.BOTS = {
      bauern: { income: 10, incomeEvery: 5, farmers: 5, huntLead: 20, hunt: [['spear', 2]], huntEvery: 30,
                wallGold: 60, wallUnits: 0, wallStage: 1, turm: {}, wallClear: true,
                attackGold: 130, lockSecs: 15,
                attack: [{ after: 0, buy: [['ram', 1]] }, { after: 4, buy: [['spear', 2]] }, { after: 6, buy: [['spear', 4]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 4]] }],
                defPlus: 1, defPool: ['spear', 'archer'], defMage: 99, noOutput: 10 },
      // «Kleiner Prinz» (Story-Platz 3): 5 Bauern, Mauer bis Stufe 3 mit 4 Bogenschützen, Jagd alle 40 s, greift bei 200 Gold an,
      // spielt selbst das Katapult (Belohnung: Katapult), verteidigt auch mit Rittern und Katapult
      prinz: { income: 10, incomeEvery: 5, farmers: 5, huntLead: 20, hunt: [['archer', 1], ['spear', 1]], huntEvery: 40,
               wallGold: 60, wallUnits: 0, wallStage: 3, turm: { archer: 4 }, wallClear: true,
               attackGold: 200, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 2, buy: [['catapult', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 7, buy: [['archer', 4]] }, { after: 9, buy: [['spear', 4]] }, { after: 10, buy: [['ladder', 10]] }],
               defPlus: 1, defPool: ['spear', 'archer', 'knight', 'catapult'], defMage: 99, noOutput: 10 },
      // «Der Feldherr»: wie der Kleine Prinz, aber 12 Bauern, Mauer bis Stufe 2, jagt nach 15 s Bauern-Vorsprung mit 1 Reiter (dann 25 s Pause),
      // verteidigt mit Bogenschützen, Speerkämpfern und Reitern, greift bei 210 Gold an
      feldherr: { income: 10, incomeEvery: 5, farmers: 12, huntLead: 15, hunt: [['rider', 1]], huntEvery: 25,
               wallGold: 60, wallUnits: 0, wallStage: 2, turm: { archer: 2 }, wallClear: true,
               attackGold: 210, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['catapult', 1], ['ram', 1]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 5]] }, { after: 13, buy: [['rider', 4]] }],
               defPlus: 1, defPool: ['archer', 'spear', 'rider'], defMage: 99, noOutput: 10 },
      // «Baron Rabenstein»: wie der Feldherr, aber 9 Bauern, Mauer bis Stufe 5 (die Türme besetzt er wie alle Gegner komplett: je 3 Bogenschützen und auf dem Belagerungsplatz ein Trebuchet, towerSiege),
      // jagt nach 20 s Bauern-Vorsprung (35 s Pause) mit 1 Ritter, 3 s später 2 Bogenschützen, 1 s danach 2 Speerkämpfer (huntLater, after = Sekunden nach dem Beginn der Jagd),
      // verteidigt mit Rittern, Bogenschützen, Speerkämpfern und Tunnelgräbern, greift bei 230 Gold an
      baron: { income: 10, incomeEvery: 5, farmers: 9, huntLead: 20, hunt: [['knight', 1]], huntEvery: 35,
               huntLater: [{ after: 3, buy: [['archer', 2]] }, { after: 4, buy: [['spear', 2]] }],
               wallGold: 60, wallUnits: 0, wallStage: 5, turm: { archer: 6, trebuchet: 2 }, wallClear: true,
               attackGold: 230, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 5, buy: [['spear', 2]] }, { after: 6, buy: [['knight', 2]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 8]] }],
               defPlus: 1, defPool: ['knight', 'archer', 'spear', 'digger'], defMage: 99, noOutput: 10,
               defDiggerVsCatapult: 2 }, // hat der Gegner ein Katapult auf dem Feld (nicht auf dem Turm), sind mindestens so viele Tunnelgräber in der Verteidigung
      // «Knappe Tollpatsch» (erster Story-Gegner, seit 20.11.): 2 Bauern, Mauer ohne Türme, greift bei 120 Gold an, spielt selbst Leiterträger (Belohnung: Leiterträger)
      tollpatsch: { income: 10, incomeEvery: 5, farmers: 2, huntLead: 20, hunt: [['spear', 2]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 1, turm: {}, wallClear: true, attackGold: 120, lockSecs: 15,
                    attack: [{ after: 0, buy: [['knight', 1]] }, { after: 5, buy: [['spear', 6]] }, { after: 6, buy: [['archer', 4]] }, { after: 7, buy: [['ladder', 6]] }, { after: 9, buy: [['ladder', 10]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'knight'], defMage: 99, noOutput: 10 },
      // «Hauptmann Schildwall» (zweiter Story-Gegner, seit 20.11.): 4 Bauern, Mauer bis Stufe 2 mit 2 Bogenschützen, jagt mit 1 Bogenschützen, greift bei 160 Gold an (mit 4 Leiterträgern),
      // spielt selbst den Belagerungsschild (Belohnung: Belagerungsschild)
      hauptmannschildwall: { income: 10, incomeEvery: 5, farmers: 4, huntLead: 20, hunt: [['archer', 1]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 2, turm: { archer: 2 }, wallClear: true, attackGold: 160, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 6, buy: [['archer', 4]] }, { after: 7, buy: [['spear', 6]] }, { after: 8, buy: [['ladder', 4]] }, { after: 10, buy: [['spear', 10]] }],
                    defPlus: 1, defPool: ['spear', 'archer'], defMage: 99, noOutput: 10 }
  };
