# Roadmap — PezzaliSisma-Bridge

Roadmap **indicativa** e soggetta a cambiamenti. Mantiene il tono del progetto:
tecnico, prudente, trasparente. Nessuna voce promette previsione di terremoti o
sostituzione dei sistemi ufficiali.

## v0.1 — Prima versione (attuale)

- [x] `bridge-server` Node.js/Express con regola dei possibili cluster
      (≥3 nodi unici / stessa zona / entro 10s) e messaggio prudente fisso.
- [x] Validazione con minimizzazione dati (rifiuto di campi personali).
- [x] Store in memoria + log tecnico opzionale (JSON Lines).
- [x] Test della logica di clustering.
- [x] `android-node` (Kotlin): foreground service con notifica persistente,
      lettura accelerometro **solo dopo consenso esplicito**, invio dei soli
      campi aggregati.
- [x] `iphone-receiver-pwa`: ricevitore/visualizzatore con stato rete, zone
      attive e possibili cluster.
- [x] Documentazione: README, PRIVACY, DISCLAIMER, ARCHITETTURA, ROADMAP.

## v0.2 — Robustezza e qualità del dato

- [ ] Calibrazione/autotaratura della soglia di vibrazione per dispositivo.
- [ ] Filtri anti-falso-positivo (es. movimento del telefono vs vibrazione del
      piano d'appoggio).
- [ ] Persistenza opzionale lato server (database) mantenendo la minimizzazione.
- [ ] Definizione più rigorosa della "zona" (es. griglia/geohash a bassa
      risoluzione, scelto con attenzione alla privacy).
- [ ] Rate limiting e protezione di base degli endpoint.

## v0.3 — Verificabilità e confronto

- [ ] Strumento di **confronto a posteriori** dei log tecnici con i cataloghi
      ufficiali **INGV/EMSC/USGS** (puramente analitico, offline).
- [ ] Metriche di affidabilità trasparenti (falsi positivi/negativi sui dati
      storici), pubblicate onestamente.
- [ ] Esportazione dei log in formato aperto e documentato.

## v0.4 — Esperienza e distribuzione

- [ ] Miglioramenti UI dell'app e della PWA.
- [ ] Gestione riavvio del servizio al boot (opt-in) per dispositivi dedicati.
- [ ] Pacchetti/Docker per il bridge-server.
- [ ] Documentazione per chi vuole ospitare un proprio bridge.

## Principi che NON cambiano

- Nessuna promessa di previsione terremoti.
- Nessuna sostituzione dei sistemi ufficiali.
- Privacy by design e minimizzazione dei dati.
- Consenso esplicito.
- Messaggistica sempre prudente.
- Log tecnico verificabile e tono trasparente.

## Come contribuire

Apri una issue o una pull request descrivendo in modo tecnico la proposta.
Ogni contributo che introduca claim non supportati o messaggistica allarmistica
non sarà accettato.
