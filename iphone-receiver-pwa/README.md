# iphone-receiver-pwa

PWA (Progressive Web App) **solo ricevitore e visualizzatore** per
PezzaliSisma-Bridge, pensata per iPhone ma utilizzabile da qualunque browser
moderno.

> ⚠️ Progetto **sperimentale** e open source. **Non** prevede terremoti e
> **non** sostituisce i sistemi ufficiali. Vedi [`../DISCLAIMER.md`](../DISCLAIMER.md).

## Cosa fa

- Permette di inserire l'**endpoint del bridge-server**.
- Mostra **stato rete**, **zone attive** e **possibili cluster** leggendo
  `GET /api/status`.
- Funziona come PWA installabile (Aggiungi a Home su iOS).

## Cosa NON fa (onestà tecnica)

- **Non** rileva vibrazioni.
- **Non** promette rilevamento o notifiche **in background** su iPhone: iOS non
  lo consente in modo affidabile per una web app. La pagina aggiorna i dati
  solo quando è **aperta**.
- **Mixed content**: se la PWA è servita in **HTTPS** (es. GitHub Pages), il
  browser **blocca** le chiamate verso un bridge in `http://` (tipico in LAN).
  In quel caso servi la PWA in locale (HTTP) oppure esponi il bridge in HTTPS.

## Avvio locale

Serve un piccolo server statico (i service worker non funzionano via `file://`):

```bash
cd iphone-receiver-pwa
python3 -m http.server 8080
# poi apri http://localhost:8080
```

In alternativa, il `bridge-server` la espone già su `http://localhost:3000/app`
(vedi `../bridge-server`). In quel caso l'endpoint da inserire è la base del
bridge-server stesso, es. `http://localhost:3000`.

## File

```
index.html             # struttura e avvisi di piattaforma
styles.css             # stile
app.js                 # polling GET /api/status e rendering
manifest.webmanifest   # metadati PWA
service-worker.js      # cache dello shell statico (NON dei dati /api)
icon.svg               # icona
```
