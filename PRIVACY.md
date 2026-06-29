# Privacy — PezzaliSisma-Bridge

Questo documento descrive, in modo trasparente, **quali dati il progetto tratta
e quali no**. Il progetto è **sperimentale** e segue il principio di **privacy
by design** e **minimizzazione dei dati**.

## Principi

- **Consenso esplicito**: il nodo Android legge l'accelerometro **solo dopo** che
  l'utente ha accettato un dialog che spiega cosa viene inviato e cosa no.
- **Minimizzazione**: si raccoglie il minimo indispensabile per stimare una
  vibrazione aggregata.
- **Nessun dato personale**: non si raccolgono identità, contatti, contenuti o
  posizione precisa.
- **Difesa in profondità**: il server rifiuta esplicitamente eventuali campi
  personali inviati per errore.

## Dati che un nodo invia

Solo questi campi aggregati:

| Campo        | Tipo    | Significato                                            |
|--------------|---------|--------------------------------------------------------|
| `nodeId`     | stringa | identificativo **casuale** del nodo (UUID parziale), generato una volta sull'installazione, **non** riconducibile a una persona |
| `zone`       | stringa | **zona approssimata** (etichetta scelta dall'utente, es. `milano-nord`) |
| `timestamp`  | numero  | momento dell'evento (epoch ms)                         |
| `rms`        | numero  | RMS della vibrazione (valore aggregato)                |
| `peak`       | numero  | picco della vibrazione (valore aggregato)              |
| `durationMs` | numero  | durata stimata dell'evento                             |

## Dati che NON vengono raccolti né inviati

- nome, cognome, numero di telefono, email;
- audio, registrazioni, foto, immagini;
- rubrica/contatti;
- **posizione precisa / GPS** (si usa solo una *zona approssimata* testuale);
- identificativi hardware (IMEI, MAC, Android ID);
- segnale grezzo dell'accelerometro (si calcolano solo metriche aggregate).

## Permessi richiesti dall'app Android

- `INTERNET`, `ACCESS_NETWORK_STATE` — per inviare gli eventi;
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_DATA_SYNC` — per il servizio in
  primo piano con notifica persistente;
- `POST_NOTIFICATIONS` — per mostrare la notifica su Android 13+.

**Non** si richiedono permessi di posizione, microfono, fotocamera, contatti o
archiviazione.

## Lato server

- Gli eventi sono tenuti **in memoria** e scartati dopo un breve TTL (default 60s).
- Se attivato (`LOG_TO_FILE=1`), viene scritto un **log tecnico verificabile**
  in formato JSON Lines contenente **solo** i campi aggregati sopra elencati.
  Questo log serve alla verificabilità e al futuro confronto con i cataloghi
  ufficiali, e non contiene dati personali.
- La validazione **rifiuta** richieste che contengono campi vietati (es. `email`,
  `lat`, `lon`, `audio`, `contacts`).

## PWA ricevitore (iPhone)

La PWA è **solo ricevitore/visualizzatore**: legge lo stato dal bridge-server e
salva localmente (nel browser) **solo** l'endpoint inserito dall'utente. Non
raccoglie altri dati e non rileva vibrazioni.

## Note

Trattandosi di un progetto sperimentale, chi ospita un bridge-server è
responsabile della propria istanza e di eventuali obblighi normativi applicabili
(es. informativa agli utenti dei nodi). Le scelte di design qui descritte
mirano a rendere semplice un trattamento dati minimo e trasparente.
