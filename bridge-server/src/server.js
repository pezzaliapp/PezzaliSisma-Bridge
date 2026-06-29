'use strict';

const express = require('express');
const path = require('path');
const config = require('./config');
const { EventStore } = require('./store');
const { validateEvent } = require('./validate');
const { detectClusters, summarizeZones } = require('./clustering');

/**
 * Bridge server sperimentale di PezzaliSisma-Bridge.
 *
 * AVVISO: progetto sperimentale. NON prevede terremoti, NON e un sistema
 * di allerta ufficiale e NON sostituisce INGV, EMSC, USGS o la Protezione
 * Civile. Vedi DISCLAIMER.md.
 */

function createServer(options = {}) {
  const store = options.store || new EventStore();
  const app = express();

  app.use(express.json({ limit: '16kb' }));

  // Header informativi e prudenti su ogni risposta.
  app.use((req, res, next) => {
    res.setHeader('X-Project', 'PezzaliSisma-Bridge (sperimentale)');
    res.setHeader('X-Disclaimer', 'Non previsione terremoti. Non sistema ufficiale.');
    next();
  });

  // CORS permissivo solo per GET (la PWA ricevitore puo essere ospitata altrove).
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  /** Stato di salute del server. */
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      project: 'PezzaliSisma-Bridge',
      experimental: true,
      eventsInMemory: store.all().length,
      config: {
        minUniqueNodes: config.MIN_UNIQUE_NODES,
        clusterWindowMs: config.CLUSTER_WINDOW_MS,
      },
    });
  });

  /**
   * Ricezione di un evento candidato da un nodo Android.
   * Accetta solo i campi previsti (privacy by design).
   */
  app.post('/api/events', (req, res) => {
    const result = validateEvent(req.body);
    if (!result.ok) {
      return res.status(400).json({ accepted: false, error: result.error });
    }

    const now = nowMs();
    store.prune(now);
    store.add(result.event, now);

    // Calcola lo stato del possibile cluster per la zona di questo evento.
    const clusters = detectClusters(store.all(), now);
    const clusterForZone = clusters.find((c) => c.zone === result.event.zone) || null;

    res.status(202).json({
      accepted: true,
      // Sempre prudente: anche con un cluster, e solo "possibile" e "in verifica".
      possibleCluster: Boolean(clusterForZone),
      cluster: clusterForZone,
      note: 'Evento candidato ricevuto. Un singolo nodo non genera mai un avviso.',
    });
  });

  /** Stato della rete: zone attive e possibili cluster correnti. */
  app.get('/api/status', (req, res) => {
    const now = nowMs();
    store.prune(now);
    const events = store.all();

    const zones = summarizeZones(events, now, { windowMs: config.ZONE_ACTIVE_MS });
    const clusters = detectClusters(events, now);

    res.json({
      project: 'PezzaliSisma-Bridge',
      experimental: true,
      now,
      uniqueNodesTotal: new Set(events.map((e) => e.nodeId)).size,
      eventsInMemory: events.length,
      activeZones: zones.map((z) => ({ zone: z.zone, uniqueNodes: z.uniqueNodes })),
      possibleClusters: clusters,
      disclaimer:
        'Dati sperimentali. Nessuna previsione di terremoti. Non sostituisce i sistemi ufficiali (INGV/EMSC/USGS/Protezione Civile).',
    });
  });

  // Serve la PWA ricevitore se presente nel repo (comodo per i test locali).
  const pwaDir = path.join(__dirname, '..', '..', 'iphone-receiver-pwa');
  app.use('/app', express.static(pwaDir));

  app.get('/', (req, res) => {
    res.type('text/plain').send(
      [
        'PezzaliSisma-Bridge - bridge-server (sperimentale)',
        '',
        'Progetto sperimentale e open source.',
        'NON prevede terremoti. NON e un sistema di allerta ufficiale.',
        '',
        'Endpoint:',
        '  GET  /health        stato del server',
        '  POST /api/events    invio evento candidato (solo campi consentiti)',
        '  GET  /api/status     zone attive e possibili cluster',
        '  GET  /app           PWA ricevitore (se presente nel repo)',
      ].join('\n')
    );
  });

  // Gestione errori JSON malformato.
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ accepted: false, error: 'JSON non valido.' });
    }
    console.error('[server] errore non gestito:', err);
    res.status(500).json({ error: 'Errore interno.' });
  });

  return app;
}

function nowMs() {
  return Date.now();
}

// Avvio diretto da CLI.
if (require.main === module) {
  const app = createServer();
  app.listen(config.PORT, () => {
    console.log(`[bridge-server] in ascolto su http://localhost:${config.PORT}`);
    console.log(
      `[bridge-server] regola: minimo ${config.MIN_UNIQUE_NODES} nodi unici / stessa zona / entro ${config.CLUSTER_WINDOW_MS} ms`
    );
    console.log('[bridge-server] progetto SPERIMENTALE - nessuna previsione terremoti.');
  });
}

module.exports = { createServer };
