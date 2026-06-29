# PezzaliSisma-Bridge

> ⚠️ **Progetto sperimentale e open source.**
> **Non** prevede terremoti, **non** è un sistema di allerta e **non**
> sostituisce i sistemi ufficiali (INGV, EMSC, USGS, Protezione Civile).
> Leggi prima [`DISCLAIMER.md`](DISCLAIMER.md).

PezzaliSisma-Bridge è un esperimento di **rete collaborativa di nodi** che
provano a rilevare **vibrazioni** tramite l'accelerometro di vecchi smartphone
Android fermi e in carica. I nodi inviano a un server centrale solo **eventi
candidati aggregati** (mai dati personali). Il server segnala un **possibile
cluster** solo quando **più nodi indipendenti** rilevano vibrazioni
quasi-contemporanee nella stessa zona.

L'obiettivo è **tecnico e prudente**: raccogliere segnali aggregati e renderli
osservabili, per poterli in futuro **confrontare** con i cataloghi sismici
ufficiali (INGV/EMSC/USGS). Nessun claim scientifico, nessuna promessa.

## Componenti

| Cartella | Cosa è | Stato |
|----------|--------|-------|
| [`android-node/`](android-node/) | App Android nativa (Kotlin): nodo con foreground service e accelerometro (solo dopo consenso) | prima versione |
| [`bridge-server/`](bridge-server/) | Server Node.js/Express: riceve eventi e calcola possibili cluster | prima versione, testato |
| [`iphone-receiver-pwa/`](iphone-receiver-pwa/) | PWA solo ricevitore/visualizzatore | prima versione |
| [`docs/`](docs/) | Documentazione (architettura, ecc.) | — |

## Regola fondamentale

**Un singolo nodo non genera mai un avviso.** Un possibile cluster esiste solo
se **almeno 3 nodi unici** nella **stessa zona** inviano eventi **entro 10
secondi**. Il messaggio è **sempre**:

> «Possibile vibrazione rilevata da più nodi. Verifica in corso.»

## Principi

- progetto **sperimentale** e **open source**;
- **nessuna** promessa di previsione terremoti;
- **nessuna** sostituzione dei sistemi ufficiali;
- confronto **futuro** con dati INGV/EMSC/USGS;
- **privacy by design** e **minimizzazione dati**;
- **consenso esplicito** prima di leggere i sensori;
- **log tecnico verificabile**.

## Dati inviati da un nodo

Solo questi campi aggregati:

```json
{ "nodeId": "node-abc123", "zone": "milano-nord", "timestamp": 1782700000000,
  "rms": 1.5, "peak": 4.2, "durationMs": 600 }
```

**Mai** nome, numero, email, audio, foto, rubrica o posizione precisa.
Vedi [`PRIVACY.md`](PRIVACY.md).

## Avvio locale rapido

### 1) bridge-server

```bash
cd bridge-server
npm install
npm start              # http://localhost:3000
npm test               # esegue i test della logica di clustering
```

Prova al volo (simula 3 nodi nella stessa zona):

```bash
for n in n1 n2 n3; do
  curl -s -X POST http://localhost:3000/api/events \
    -H 'Content-Type: application/json' \
    -d "{\"nodeId\":\"$n\",\"zone\":\"grid-42\",\"timestamp\":$(date +%s000),\"rms\":1.5,\"peak\":4.2,\"durationMs\":600}"
  echo
done
curl -s http://localhost:3000/api/status
```

Al terzo nodo la risposta riporta `possibleCluster: true` con il messaggio
prudente standard.

### 2) iphone-receiver-pwa

La PWA è servita dal bridge-server su `http://localhost:3000/app`, oppure
autonomamente:

```bash
cd iphone-receiver-pwa
python3 -m http.server 8080   # http://localhost:8080
```

Inserisci l'endpoint del bridge-server (es. `http://localhost:3000`) e
attiva l'aggiornamento automatico.

### 3) android-node

Apri la cartella `android-node/` in **Android Studio**, sincronizza e avvia su
un dispositivo/emulatore. Configura endpoint e zona, concedi il **consenso
esplicito**, quindi avvia il nodo. Dettagli in
[`android-node/README.md`](android-node/README.md).

> Nota: l'app Android non è compilabile in questo ambiente (manca l'Android
> SDK); il codice sorgente è completo e va costruito con Android Studio.

## Documentazione

- [`PRIVACY.md`](PRIVACY.md) — cosa si raccoglie e cosa no
- [`DISCLAIMER.md`](DISCLAIMER.md) — limiti e avvertenze
- [`ROADMAP.md`](ROADMAP.md) — direzione del progetto
- [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md) — architettura tecnica
- [`docs/`](docs/) — indice della documentazione

## Licenza

MIT (vedi [`LICENSE`](LICENSE) se presente). Contributi benvenuti, nel rispetto
dei principi sopra: tono tecnico, prudente, trasparente.
