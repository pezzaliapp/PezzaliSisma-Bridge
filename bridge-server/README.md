# bridge-server

Server **Node.js / Express** di PezzaliSisma-Bridge. Riceve eventi candidati da
più nodi Android e segnala **possibili cluster**.

> ⚠️ Progetto **sperimentale** e open source. **Non** prevede terremoti e
> **non** sostituisce i sistemi ufficiali. Vedi [`../DISCLAIMER.md`](../DISCLAIMER.md).

## Regola fondamentale

**Un singolo nodo non genera mai un avviso.** Un possibile cluster esiste solo
se **almeno 3 nodi unici** nella **stessa zona** inviano eventi **entro 10
secondi** (parametri configurabili). Il messaggio è **sempre**:

> «Possibile vibrazione rilevata da più nodi. Verifica in corso.»

Non vengono mai usate frasi come «terremoto in arrivo», «allerta garantita»,
«sistema salvavita» o «previsione terremoto».

## Avvio locale

```bash
cd bridge-server
npm install
npm start          # http://localhost:3000
# oppure in sviluppo (autoreload):
npm run dev
```

Test:

```bash
npm test
```

## Configurazione (variabili d'ambiente)

| Variabile           | Default | Descrizione                                            |
|---------------------|---------|--------------------------------------------------------|
| `PORT`              | `3000`  | porta HTTP                                              |
| `MIN_UNIQUE_NODES`  | `3`     | nodi unici minimi per un possibile cluster             |
| `CLUSTER_WINDOW_MS` | `10000` | finestra temporale del cluster (ms)                    |
| `EVENT_TTL_MS`      | `60000` | quanto resta in memoria un evento (ms)                 |
| `ZONE_ACTIVE_MS`    | `120000`| quanto una zona resta "attiva" nello stato (ms)        |
| `LOG_TO_FILE`       | `0`     | `1` per scrivere un log tecnico JSON Lines             |
| `LOG_FILE`          | `data/events.jsonl` | percorso del log                           |

Esempio con log tecnico verificabile attivo:

```bash
LOG_TO_FILE=1 npm start
```

## API

### `GET /health`
Stato del server e parametri correnti.

### `POST /api/events`
Riceve un evento candidato. **Accetta solo** i campi consentiti; qualunque
campo personale fa rifiutare la richiesta (HTTP 400).

```json
{
  "nodeId": "node-abc123",
  "zone": "milano-nord",
  "timestamp": 1782700000000,
  "rms": 1.5,
  "peak": 4.2,
  "durationMs": 600
}
```

Risposta (HTTP 202):

```json
{
  "accepted": true,
  "possibleCluster": false,
  "cluster": null,
  "note": "Evento candidato ricevuto. Un singolo nodo non genera mai un avviso."
}
```

### `GET /api/status`
Zone attive e possibili cluster correnti (usato dalla PWA ricevitore).

### `GET /app`
Serve la PWA `iphone-receiver-pwa` (comodo per i test locali).

## Architettura del modulo

```
src/
├── config.js       # parametri (sovrascrivibili da env)
├── validate.js     # validazione + minimizzazione dei campi (privacy by design)
├── store.js        # store in memoria + log tecnico opzionale (JSON Lines)
├── clustering.js   # regola dei "possibili cluster"
└── server.js       # Express app, route, avvio
test/
└── clustering.test.js
```

## Privacy

Il server **non** memorizza dati personali. La funzione di validazione tiene
solo i campi previsti e rifiuta esplicitamente campi come `email`, `lat`,
`lon`, `audio`, `contacts`, ecc. Vedi [`../PRIVACY.md`](../PRIVACY.md).
