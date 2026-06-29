# Architettura — PezzaliSisma-Bridge

> Progetto **sperimentale**. Non prevede terremoti e non sostituisce i sistemi
> ufficiali. Vedi [`../DISCLAIMER.md`](../DISCLAIMER.md).

## Visione d'insieme

```
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ android-node │        │ android-node │        │ android-node │   ... N nodi
 │ (Kotlin)     │        │ (Kotlin)     │        │ (Kotlin)     │
 │ accelerometro│        │ accelerometro│        │ accelerometro│
 └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
        │  POST /api/events            (solo campi aggregati)│
        │ {nodeId, zone, ts, rms, peak, durationMs}          │
        └───────────────┬───────────────────┬───────────────┘
                        ▼                   ▼
                 ┌─────────────────────────────────┐
                 │          bridge-server           │
                 │       (Node.js / Express)        │
                 │  validate → store → clustering   │
                 │  regola: ≥3 nodi unici/zona/10s  │
                 └───────────────┬─────────────────┘
                                 │  GET /api/status
                                 ▼
                       ┌────────────────────┐
                       │ iphone-receiver-pwa │  (solo visualizzazione)
                       │ zone attive, cluster│
                       └────────────────────┘
```

## Flusso dei dati

1. **Nodo Android**
   - Foreground service visibile con notifica persistente.
   - Legge l'accelerometro **solo dopo consenso esplicito**.
   - `VibrationAnalyzer` mantiene una finestra di campioni e calcola metriche
     **aggregate**: `rms`, `peak`, `durationMs`. Il segnale grezzo non viene mai
     trasmesso né salvato.
   - Quando un movimento supera una soglia sperimentale, l'`EventUploader`
     invia un evento candidato con **solo** `nodeId`, `zone`, `timestamp`,
     `rms`, `peak`, `durationMs`.

2. **Bridge-server**
   - `validate.js`: accetta **solo** i campi previsti, rifiuta i campi personali
     (privacy by design + minimizzazione).
   - `store.js`: memoria volatile con TTL; log tecnico opzionale (JSON Lines).
   - `clustering.js`: raggruppa per `zone` gli eventi recenti e conta i **nodi
     unici**. Se ≥ `MIN_UNIQUE_NODES` (default 3) entro `CLUSTER_WINDOW_MS`
     (default 10000 ms), la zona diventa un **possibile cluster**.
   - `server.js`: espone le route HTTP.

3. **PWA ricevitore**
   - Interroga `GET /api/status` e mostra **stato rete**, **zone attive** e
     **possibili cluster**. Nessun rilevamento, nessun background su iOS.

## Regola dei "possibili cluster"

```
possibile_cluster(zona) ⇔
    | { nodeId distinti con evento in `zona` negli ultimi W ms } | ≥ N
con N = MIN_UNIQUE_NODES (default 3), W = CLUSTER_WINDOW_MS (default 10000)
```

Conseguenze volute:

- un **singolo nodo** (anche con molti eventi) **non** crea mai un cluster;
- **due** nodi non bastano (con N=3);
- eventi **fuori finestra** non contano;
- **zone diverse** non si sommano.

Queste proprietà sono coperte dai test in `bridge-server/test/`.

## Modello dei dati (evento candidato)

| Campo        | Tipo    | Note                                   |
|--------------|---------|----------------------------------------|
| `nodeId`     | stringa | casuale, non personale                 |
| `zone`       | stringa | zona approssimata (etichetta)          |
| `timestamp`  | numero  | epoch ms lato dispositivo              |
| `rms`        | numero  | metrica aggregata                      |
| `peak`       | numero  | metrica aggregata                      |
| `durationMs` | numero  | metrica aggregata                      |

Lato server si aggiunge `receivedAt` (epoch ms di ricezione), usato per la
finestra temporale e il TTL.

## Scelte tecniche

- **Niente database** nella v0.1: store in memoria, semplice e ispezionabile.
  La persistenza è una voce della roadmap.
- **Dipendenze minime** sul nodo Android (`HttpURLConnection`, no librerie HTTP
  pesanti) per adattarsi a **vecchi dispositivi**.
- **Parametri configurabili** via variabili d'ambiente per facilitare la
  sperimentazione e i test.
- **Log tecnico verificabile** (JSON Lines) per consentire, in futuro, il
  **confronto a posteriori** con i cataloghi ufficiali INGV/EMSC/USGS.

## Limiti noti

- Le soglie di vibrazione sono **sperimentali**, non validate.
- Le vibrazioni hanno molte cause **non sismiche**: i cluster non implicano
  eventi sismici.
- La "zona" testuale è grezza; una definizione migliore (con attenzione alla
  privacy) è in roadmap.
- Nessuna autenticazione dei nodi nella v0.1: adatto a sperimentazione, non a
  produzione aperta.

## Sicurezza (prima versione)

- Limite dimensione payload JSON (16 kB).
- Rifiuto esplicito dei campi personali.
- CORS aperto in **sola lettura** per consentire alla PWA di interrogare lo
  stato; gli endpoint di scrittura andranno protetti nelle versioni successive
  (rate limiting/autenticazione in roadmap).
