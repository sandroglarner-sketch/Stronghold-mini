# Stronghold Mini

Kleines Echtzeitstrategie-Spiel im Browser (Burg, Mauer, Einheiten, Bots, Online-PvP).

## Ordner
| Ordner | Inhalt |
|---|---|
| `daten/` | Spielwerte: Regeln, Einheiten, Angriffswellen der Bots |
| `gemeinsam/` | Spielregeln (Simulation, Bots, Mathematik) – ohne Bildschirm |
| `spiel/` | alles, was man sieht und hört: Gerüst, Aussehen, Zeichnen, Töne, Menüs, Buch, Tutorial, Online |
| `werkzeuge/` | `bauen.js` fügt alles zu einer Datei zusammen |
| `tests/` | automatische Prüfungen der Regeln |
| Hauptordner | was Render ausliefert: `server.js`, `package.json`, `index.html` (gebaut, nicht von Hand ändern) |

## Bauen
```
node werkzeuge/bauen.js
```
Erzeugt `index.html` (online) und `build/artifact.html` (Claude-Artifact).
