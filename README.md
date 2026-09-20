# Eure Hochzeitsseite — Anleitung

## Was hier drin ist
- `index.html`, `style.css`, `script.js` — die Website selbst
- `images/` — hier kommen später eure eigenen Fotos rein
- `cloudflare-worker/worker.js` — Code für die RSVP-Anbindung an Cloudflare D1 (nicht Teil der Website, siehe Schritt 3)

Öffnet `index.html` einfach per Doppelklick im Browser, um die Seite jetzt schon lokal anzuschauen.

---

## Schritt 1 — Inhalte anpassen
In `index.html` nach `[...]` suchen (z.B. `[Vorname]`, `[Kirche / Location]`, `[Straße Hausnummer, PLZ Ort]`) und durch eure echten Infos ersetzen.

Für die Playlist: in `index.html` die Zeile mit `open.spotify.com/playlist/DEINE_PLAYLIST_ID` durch euren echten Playlist-Link ersetzen (Spotify, Apple Music o.ä. funktioniert genauso als Link).

## Schritt 2 — Eigene Fotos einbauen
Die Objekte (Umschlag, Kassette, Polaroid, LIPP-Flyer, Gebäude, Dose, Ticket) liegen als echte Bilddateien im Ordner `images/`. Wollt ihr eines austauschen, legt euer eigenes Bild dort ab und ändert in `index.html` den passenden `src="images/..."`. Position, Größe und Drehung jedes Objekts stehen im `style`-Attribut (`--x`, `--y`, `--rot`) direkt am jeweiligen Element — dort lässt sich alles millimetergenau verschieben.

## Schritt 3 — RSVP mit Cloudflare D1 verbinden
Alle RSVPs landen als Zeilen in einer kleinen Datenbank (Cloudflare D1), die direkt an
euren Cloudflare Worker angebunden ist — kein Google, kein separater Datei-Host, keine
manuelle Zusammenführung noetig. Die Daten koennt ihr jederzeit direkt im Cloudflare-
Dashboard einsehen und als CSV exportieren.

1. **D1-Datenbank anlegen** (im selben kostenlosen Cloudflare-Account wie der Worker):
   - Dashboard → **Workers & Pages → D1** → **Create database**
   - Namen vergeben, z.B. `rsvp-db`

2. **Datenbank an den Worker binden:**
   - Im Worker (`bryllup-rsvp` o.ä.) → **Settings → Bindings** → **Add binding** → Typ **D1 database**
   - Variablenname: `RSVP_DB` (muss genau so heissen, der Code erwartet diesen Namen)
   - Datenbank: die eben erstellte `rsvp-db` auswaehlen
   - Speichern (der Worker muss danach ggf. neu deployed werden)

3. **Worker-Code einfügen:**
   - Im Worker-Code-Editor den kompletten Inhalt aus `cloudflare-worker/worker.js` einfügen, speichern/deployen
   - Unter **Settings → Variables and Secrets** weiterhin `ALLOWED_ORIGIN` gesetzt lassen (eure GitHub-Pages- bzw. spaetere Domain-URL) — die Nextcloud-Variablen (`NEXTCLOUD_...`) werden nicht mehr gebraucht und koennen geloescht werden

4. In `script.js` steht ganz oben bereits die Worker-URL bei `const RSVP_ENDPOINT_URL = "..."` — die bleibt unveraendert, es aendert sich nur, wo der Worker die Daten speichert

Die Tabelle (`rsvps`) wird beim ersten eingehenden RSVP automatisch angelegt — kein
manuelles Setup noetig. Gäste sehen beim Absenden nur eine kurze Bestätigung, niemals
die Datenbank selbst.

**Antworten ansehen:** Dashboard → **Workers & Pages → D1** → eure Datenbank →
**Console** → `SELECT * FROM rsvps;` ausführen. Falls eurer Dashboard dort keinen
"Export"-Button anbietet: der Worker hat einen eingebauten CSV-Download.

1. In den Worker-**Settings → Variables and Secrets** ein neues Secret `EXPORT_KEY`
   anlegen — ein selbst ausgedachtes, langes, zufaelliges Passwort (das ist euer
   privater Schluessel fuer den Export-Link, nicht an Gaeste weitergeben!)
2. Danach ist die CSV-Liste unter folgendem Link abrufbar (Worker-URL + `?key=...`):
   `https://EUER-WORKER.EUER-ACCOUNT.workers.dev/?key=EUER-EXPORT-KEY`
3. Link im Browser oeffnen → laedt automatisch `rsvps.csv` herunter

Diesen Link am besten irgendwo privat speichern (Passwortmanager, eigene Notizen) —
wer den Link kennt, kann die komplette Gaesteliste herunterladen.

Das RSVP-Formular öffnet sich als Pop-up, sobald jemand auf den Einladungs-Umschlag klickt.

## Schritt 4 — Auf GitHub Pages veröffentlichen
1. Neues Repository auf GitHub erstellen (öffentlich), z.B. `unsere-hochzeit`
2. Alle Dateien aus diesem Ordner (außer `cloudflare-worker/`) ins Repo pushen:
   ```
   git init
   git add index.html style.css script.js images
   git commit -m "Erste Version der Hochzeitsseite"
   git branch -M main
   git remote add origin https://github.com/EUER-USERNAME/unsere-hochzeit.git
   git push -u origin main
   ```
3. Im Repo: **Settings → Pages**
4. Bei "Source" → **Deploy from a branch** → Branch `main`, Ordner `/ (root)` → **Save**
5. Nach ein bis zwei Minuten ist die Seite live unter:
   `https://EUER-USERNAME.github.io/unsere-hochzeit/`

## Schritt 5 — Eigene Domain (optional)
Falls ihr z.B. `sophieundjulius.de` wollt: Domain bei einem Anbieter (Namecheap, IONOS, etc.) kaufen, dann in GitHub unter **Settings → Pages → Custom domain** eintragen und beim Domain-Anbieter einen `CNAME`-Eintrag auf `EUER-USERNAME.github.io` setzen. Das kann ich euch machen, sobald ihr so weit seid.

---

**Wenn ihr wollt, gehen wir jeden dieser Schritte gemeinsam durch — sagt einfach Bescheid, bei welchem ihr gerade steht.**
