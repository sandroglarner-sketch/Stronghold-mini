# Stronghold Mini – Arbeitsregeln für Claude

## Antworten
- Kurz und auf Deutsch antworten.
- Annahmen immer ausdrücklich nennen.

## Arbeitsweise (seit 23.11.2026)
- Einzige Quelle ist GitHub: `main` = das Spiel, Render baut davon. Arbeit auf einem Zweig, Übernahme per Pull Request (der Besitzer mergt selbst oder sagt «mergen»).
- Das Spiel-Artifact https://claude.ai/artifact/5efX98MaDHM3U6imQTGn9c bleibt absichtlich auf dem alten Stand (23.11.): nicht mehr veröffentlichen, nicht mehr abgleichen.
- Spieländerungen testen: `build/artifact.html` bauen und dem Besitzer per SendUserFile (`display: render`) schicken. Läuft ohne Online-Funktionen, mit Tester-Modus; echtes Vollbild geht in der App-Ansicht nicht.

## Bots
- Bots werden im Bot-Editor bearbeitet (`build/bot-editor.html`, erzeugt aus `werkzeuge/bot-editor-vorlage.html`; Artifact https://claude.ai/artifact/4jmqnPCDZTpfPn9H8wVd7A), nicht von Hand vorgeschlagen.
- Exporte aus dem Bot-Editor (im Chat eingefügt) baust du ein: `daten/botdatenbank.js` (BOT_DB), `CONFIG.BOTS` / `daten/bots.js`, ggf. Belohnungen (`daten/freischalten.js`).
- Danach Regeltext (Karten-/Regeltexte im Spiel) und bei Bedarf `STAND.md` anpassen.
- Neue Bot-Parameter in `gemeinsam/bots.js` immer auch in den Bot-Editor aufnehmen.
- Bot-Editor-Artifact als einziges Artifact aktuell halten: neu veröffentlichen (gleiche URL, vorher lesen), wenn sich seine Daten oder die Vorlage geändert haben – `daten/regeln.js`, `bots.js`, `einheiten.js`, `koenige.js`, `botdatenbank.js`, `freischalten.js`, `spiel/koenig-optik.js`, `werkzeuge/bot-editor-vorlage.html`. Sonst nicht.

## Nach jeder Änderung
1. `node werkzeuge/bauen.js` (erzeugt `index.html` und `build/…`; `index.html` nie von Hand ändern).
2. Tests: `node tests/pruefen.js` (braucht `google-chrome`, ca. 20 s; prüft auch Code-Regeln und Determinismus). Fehler melden, nicht verschweigen. Dieselbe Prüfung läuft auf GitHub bei jedem Pull Request (`.github/workflows/pruefen.yml`); vor «mergen» muss sie grün sein.
3. `STAND.md` nur anpassen, wenn sich etwas Grundsätzliches ändert (Aufbau, Grundsätze, nächste freie Bot-nr, offene Punkte); kurz halten. Bei Bedarf diese CLAUDE.md.
   Einzelne Wertänderungen gehören in die Commit-Nachricht: Was, alte → neue Werte, warum (z. B. «Schwertkämpfer 8 → 9 Gold, 6 → 7 Leben»).
4. Committen und auf den Arbeitszweig pushen (`git push -u origin <zweig>`).
5. Bei Spieländerungen die Testdatei schicken; bei geänderten Bot-Daten den Bot-Editor neu veröffentlichen.

## Projekt und Notizen
@STAND.md

- `NOTIZEN.md` ist ein Archiv (bis 23.11.2026), wird nicht mehr fortgeschrieben und nicht automatisch geladen. Bei Fragen zur Vorgeschichte gezielt durchsuchen (`grep -n "BEGRIFF" NOTIZEN.md`) oder `git log -S…`.
