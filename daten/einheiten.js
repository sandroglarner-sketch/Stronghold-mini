    // splash = Radius des Flächenschadens in Kacheln, slow = Tempo-Faktor und Dauer für getroffene Einheiten
    // passive = sucht sich einen Platz nahe der eigenen Kaserne und bleibt dort stehen,
    // bonus = Gold mehr bei jeder Auszahlung (erst wenn er steht)
  // account: true = nur mit (gratis) Konto spielbar; ohne Konto im Buch ausgegraut, nicht ins Deck wählbar
  // invite: true = wird freigeschaltet, sobald ein eingeladener Freund über den eigenen Einladungslink eine Partie gespielt hat (braucht Konto; nur online)
  CONFIG.units = {
      farmer: { cat: 'eco', name: 'Bauer',         cost: 4,  hp: 2,  atk: 0, range: 1, speed: 1.0, cd: 1, r: 0.26, key: '1', passive: true, bonus: 1, bonusEvery: 5 }, // bonus Gold alle bonusEvery Sekunden, Takt startet beim Niederlassen
      spear: { cat: 'melee', name: 'Speersoldat',   cost: 5,  hp: 3,  atk: 1, range: 1, speed: 1.0, cd: 1, r: 0.30, key: '2' },
      archer: { cat: 'ranged', name: 'Bogenschütze',  cost: 12, hp: 1,  atk: 1, range: 4, speed: 0.8, cd: 1, r: 0.28, key: '3', delay: 0.5 },
      rider:  { cat: 'melee', name: 'Reiter',        cost: 15, hp: 8,  atk: 1, range: 1, speed: 1.8, cd: 1, r: 0.34, key: '4' },
      mage:   { cat: 'ranged', name: 'Magier',        cost: 25, hp: 1,  atk: 1, range: 3.5, speed: 0.8, cd: 1, r: 0.30, key: '7', delay: 0.5, splash: 1, slow: { factor: 0.5, secs: 3 } },
      knight: { cat: 'melee', name: 'Ritter',        cost: 20, hp: 18, atk: 1, range: 1, speed: 0.7, cd: 1, r: 0.38, key: '6' },
      // dig = gräbt sich unsichtbar (speed Kacheln pro Sekunde) zu einem Punkt im Umkreis radius um einen zufälligen
      // gegnerischen Bogenschützen oder Magier, nie näher als minBase Kacheln an der gegnerischen Kaserne.
      // Die Grabspur bleibt trail Sekunden sichtbar. Danach ist er eine normale Einheit mit Marschtempo speed.
      digger: { cat: 'melee', name: 'Tunnelgräber', cost: 10, hp: 4,  atk: 1, range: 1, speed: 1.2, cd: 1, r: 0.30, key: '5', dig: { speed: 3, radius: 1.5, minBase: 6, trail: 1 } },
      // ram = greift nur Mauern und Kasernen an, keine Einheiten
      ram: { cat: 'siege', name: 'Rammbock', cost: 35, hp: 20, atk: 20, range: 1, speed: 0.6, cd: 1, r: 0.36, key: '9', ram: true, mass: 6 }, // mass = beim Gedränge schiebt er andere Einheiten so viel stärker zur Seite (alle anderen 1)
      // wall = Mauer: im Abstand dist Kacheln um die eigene Kaserne herum gebogen, workers Arbeiter, die mit rate Leben pro Sekunde bis zu add Leben bringen
      // rate Leben pro Sekunde bauen (jeder). Erst wenn sie einmal fertig ist, blockiert sie gegnerische Einheiten.
      wall: { name: 'Mauer',     cost: 20, hp: 0, atk: 0, range: 0, speed: 0, cd: 1, r: 0.3, key: '8',
              wall: { dist: 3, thick: 0.5, workers: 4, rate: 3, add: 10, cap: 200, heal: 0.6, fade: 1, tower: { from: 2, takeDist: 4, // takeDist = so nah (in Kacheln) an der Kaserne muss eine Einheit sein, damit sie einen freien Turmplatz nimmt
              taken: 0.25, // Einheiten in einem Turm erleiden von Fernkämpfern (auch von der Kaserne) nur diesen Anteil des Schadens
              // Türme ab Mauer 2: links und rechts (f = Stelle auf der Mauer, 0 oben bis 1 unten) je ein Turm; k = sq (Viereck) oder rd (Rund), w/h bzw. r = Grösse in Kacheln,
              // out = Abstand vor der Mauer; slots = Plätze (types = erlaubte Einheitentypen, dx/dy = Versatz in Kacheln)
              levels: {
                2: { list: [
                  { k: 'sq', f: 0.25, w: 0.7, h: 0.9, out: 0.5, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0, dy: 0 }] },
                  { k: 'sq', f: 0.75, w: 0.7, h: 0.9, out: 0.5, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0, dy: 0 }] }] },
                3: { list: [
                  { k: 'sq', f: 0.25, w: 0.85, h: 1.2, out: 0.55, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0, dy: -0.28 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0, dy: 0.28 }] },
                  { k: 'sq', f: 0.75, w: 0.85, h: 1.2, out: 0.55, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0, dy: -0.28 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0, dy: 0.28 }] }] },
                4: { list: [
                  { k: 'rd', f: 0.25, r: 0.8, out: 0.6, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0.38, dy: 0 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: -0.2, dy: -0.38 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: -0.2, dy: 0.38 }] },
                  { k: 'rd', f: 0.75, r: 0.8, out: 0.6, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0.38, dy: 0 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: -0.2, dy: -0.38 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: -0.2, dy: 0.38 }] }] },
                5: { list: [
                  { k: 'rd', f: 0.25, r: 1.05, out: 0.7, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0.5, dy: -0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0.5, dy: 0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: -0.05, dy: -0.62 }, { types: ['catapult', 'baliste', 'trebuchet'], dx: -0.4, dy: 0.3 }] },
                  { k: 'rd', f: 0.75, r: 1.05, out: 0.7, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0.5, dy: -0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: 0.5, dy: 0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin'], dx: -0.05, dy: -0.62 }, { types: ['catapult', 'baliste', 'trebuchet'], dx: -0.4, dy: 0.3 }] }] }
              } }, stages: [40, 80, 120, 160, 200], bars: [40, 40, 80, 120, 160, 200] } }, // rate = Leben pro Sekunde je Arbeiter, add = Leben, die jeder Arbeiter insgesamt bringt, cap = höchstes Leben der Mauer; stages = ab so viel Leben erscheint die nächste der 5 Optiken (davor nur ein Gerüst), bars = Maximum der Lebensleiste je Stufe (Gerüst, Optik 1 bis 5) = Leben, ab denen die Optik erscheint; heal = Leben pro Sekunde, die eine Mauer unter dem Höchstwert ihrer Optik von selbst heilt (erst ab der ersten Optik)
      // shield = Belagerungsschild: greift nur Mauern und Kasernen an (wie der Rammbock), richtet aber keinen Schaden an
      shield: { cat: 'siege', name: 'Belagerungsschild', cost: 25, hp: 12, atk: 0, range: 1, speed: 0.6, cd: 1, r: 0.34, key: '0', ram: true, rangedTaken: 0.25 }, // rangedTaken = Anteil des Schadens, den es von Fernkämpfern erleidet
      // delay = Flugzeit des Geschosses: der Treffer erfolgt erst so viele Sekunden nach dem Schuss (auch wenn der Schütze inzwischen gefallen ist)
      // fire = Katapult: Feuerbälle mit Flächenschaden (splash), ignoriert Mauern (nichts blockiert Ziel oder Schuss), schießt nur alle cd Sekunden
      catapult: { cat: 'siege', name: 'Katapult', cost: 50, hp: 2, atk: 2, range: 6, speed: 0.6, cd: 3, r: 0.34, key: 'q', delay: 1, splash: 1.2, fire: true, minRange: 2 },
      // baliste = Kriegsmaschine: ein schwerer Bolzen auf ein Ziel, trifft nach delay Sekunden, wird von Mauern aufgehalten wie ein Pfeil; passt wie das Katapult auf den großen Turm
      baliste: { cat: 'siege', name: 'Baliste', cost: 45, hp: 4, atk: 12, range: 4, speed: 0.6, cd: 2, r: 0.34, key: 'e', delay: 0.5, minRange: 2 },
      // onager = kleines Belagerungskatapult: greift nur Mauern und Burgen an (ram), fährt zusammengebaut, muss setup Sekunden stillstehen (aufbauen),
      // dann wirft er alle cd Sekunden einen Stein, der gerade (ohne Bogen) fliegt und nach delay Sekunden trifft; Mauern blockieren ihn nicht (Ziel ist die Mauer selbst)
      onager: { cat: 'siege', name: 'Onager', cost: 30, hp: 2, atk: 20, range: 5, speed: 0.6, cd: 3, r: 0.34, delay: 0.5, ram: true, setup: 2, blast: { r: 1.2, atk: 1 } }, // blast = zusätzlicher Flächenschaden am Einschlagpunkt (trifft alles: Einheiten, Mauer, Burg)
      // Schwertkämpfer: Helm wie der Ritter, Holzschild mit Eisenrand
      sword: { cat: 'melee', name: 'Schwertkämpfer', cost: 8, hp: 6, atk: 1, range: 1, speed: 0.8, cd: 1, r: 0.32 },
      // ladder = Leiterträger: rennt zu einem zufälligen Punkt der gegnerischen Mauer zwischen den Türmen (f 0,37–0,63), stellt die Leiter an
      // (bleibt show Sekunden sichtbar, nur für ihn) und klettert in climb Sekunden hinüber (fest, unabhängig von der Mauer); danach normale Einheit mit Schwert (ohne Schild)
      ladder: { cat: 'melee', name: 'Leiterträger', cost: 4, hp: 4, atk: 1, range: 1, speed: 1.2, cd: 1, r: 0.3, massRun: 5, pushRun: 0.08, ladder: { climb: 1.5, show: 3 } }, // massRun = drängt sich auf dem Weg zur Mauer fast so stark durch wie der Rammbock (6); pushRun 0,08 = sehr kleiner Körper im Gedränge, nur bis er über die Mauer ist (Optik gleich), schlängelt sich vorbei
      // belfry = Belagerungsturm: fährt wie der Leiterträger an die gegnerische Mauer und dockt an (bleibt dort stehen); innerhalb von
      // troops × every Sekunden klettern troops Schwertkämpfer über die Mauer. Oben archers Bogenschützen (25 % Fernkampfschaden,
      // nur von Fernkämpfern angreifbar, werden von gegnerischen Fernkämpfern vor dem Turm anvisiert). mass wie der Rammbock; push = Druckradius im Gedränge
      // (Standard 0,275 je Einheit): drückt Einheiten aus seiner Fläche, Türme überlappen sich nie; angedockt bewegt er sich nicht mehr
      belfry: { cat: 'siege', name: 'Belagerungsturm', account: true, cost: 80, hp: 40, atk: 0, range: 1, speed: 0.6, cd: 1, r: 0.55, mass: 40, push: 0.65, belfry: { stay: 5, troops: 8, every: 0.5, archers: 2 } },
      // Trebuchet: muss setup Sekunden stillstehen (aufbauen), bevor es schiesst; ein Schuss = multi.n Steine, die sich zufällig im Umkreis
      // multi.spread um das Ziel verteilen (je Flächenschaden splash), fliegen über Mauern (fire). Zwei Arten: bekommt es beim Kauf einen Platz auf dem grossen Turm (Mauer 5),
      // baut es sich dort auf und schiesst auf Gegner in Reichweite. Sonst (spot): fährt es zu einem zufälligen Punkt spot.dist vom Zielpunkt entfernt (Richtung eigene Seite,
      // ± spot.ang), baut sich auf und schiesst immer auf denselben Punkt: Mitte, spot.behind Kacheln hinter der gegnerischen Mauer
      trebuchet: { cat: 'siege', name: 'Trebuchet', account: true, cost: 70, hp: 4, atk: 1, range: 7, speed: 0.5, cd: 4, r: 0.4, delay: 2, splash: 0.8, fire: true, minRange: 3, setup: 2, multi: { n: 8, spread: 3, speed: 3.5, stagger: 0.5 }, spot: { dist: 8, behind: 1, ang: 0.26, mid: 2 } }, // Angriff: steht dist (= Reichweite im Angriff) vom Zielpunkt; mid = höchstens so viele Kacheln über/unter der Feldmitte; range 7 gilt auf dem Turm
      // Speerwerfer: wirft Wurfspeere (kurze Reichweite); Armbrustschütze: Bolzen, stark aber langsam nachladen
      javelin: { cat: 'ranged', name: 'Speerwerfer', cost: 6, hp: 2, atk: 1, range: 2.5, speed: 1, cd: 1, r: 0.3, delay: 0.35 },
      crossbow: { cat: 'ranged', name: 'Armbrustschütze', invite: true, cost: 18, hp: 2, atk: 2, range: 4, speed: 0.8, cd: 1.5, r: 0.3, delay: 0.3 },
      worker: { name: 'Arbeiter', cost: 0,  hp: 2,  atk: 0, range: 0, speed: 1.6, cd: 1, r: 0.26, worker: true, hidden: true },
      // king = König: sitzt auf der Burg (dann nur Bogen, unverwundbar); ist sie zerstört, kämpft er mit dem Zweihänder, höchstens leash Kacheln von der Burg entfernt
      king: { name: 'König', cost: 0, hp: 20, atk: 3, range: 1, speed: 1, cd: 1, r: 0.4, hidden: true, rangedTaken: 0.25, king: { leash: 5 } }
  };
