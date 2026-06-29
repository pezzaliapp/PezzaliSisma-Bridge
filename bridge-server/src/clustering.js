'use strict';

const config = require('./config');

/**
 * Logica di rilevamento dei possibili cluster.
 *
 * REGOLA FONDAMENTALE DEL PROGETTO:
 *   un singolo nodo non genera mai un avviso.
 *
 * Un "possibile cluster" esiste in una zona solo se almeno
 * MIN_UNIQUE_NODES nodi UNICI hanno inviato un evento nella stessa zona
 * entro una finestra di CLUSTER_WINDOW_MS millisecondi.
 *
 * Questo NON significa che ci sia un terremoto. Significa solo che piu
 * dispositivi indipendenti hanno rilevato vibrazioni quasi contemporanee.
 * Il messaggio resta sempre quello prudente definito in config.CLUSTER_MESSAGE.
 */

/**
 * Raggruppa per zona gli eventi recenti e conta i nodi unici.
 * @param {Array<object>} events eventi (con receivedAt)
 * @param {number} now timestamp ms
 * @param {object} [opts]
 * @returns {Array<{zone: string, uniqueNodes: number, nodeIds: string[], events: object[]}>}
 */
function summarizeZones(events, now, opts = {}) {
  const windowMs = opts.windowMs ?? config.CLUSTER_WINDOW_MS;
  const cutoff = now - windowMs;

  /** @type {Map<string, {nodeIds: Set<string>, events: object[]}>} */
  const byZone = new Map();

  for (const e of events) {
    if (e.receivedAt < cutoff) continue;
    if (!byZone.has(e.zone)) {
      byZone.set(e.zone, { nodeIds: new Set(), events: [] });
    }
    const bucket = byZone.get(e.zone);
    bucket.nodeIds.add(e.nodeId);
    bucket.events.push(e);
  }

  const result = [];
  for (const [zone, bucket] of byZone.entries()) {
    result.push({
      zone,
      uniqueNodes: bucket.nodeIds.size,
      nodeIds: Array.from(bucket.nodeIds),
      events: bucket.events,
    });
  }
  // Ordina per numero di nodi unici decrescente per leggibilita.
  result.sort((a, b) => b.uniqueNodes - a.uniqueNodes);
  return result;
}

/**
 * Restituisce i possibili cluster (zone che superano la soglia di nodi unici).
 * @param {Array<object>} events
 * @param {number} now
 * @param {object} [opts]
 * @returns {Array<object>}
 */
function detectClusters(events, now, opts = {}) {
  const minNodes = opts.minUniqueNodes ?? config.MIN_UNIQUE_NODES;
  const zones = summarizeZones(events, now, opts);

  return zones
    .filter((z) => z.uniqueNodes >= minNodes)
    .map((z) => {
      const peaks = z.events.map((e) => e.peak);
      const rmsValues = z.events.map((e) => e.rms);
      return {
        zone: z.zone,
        uniqueNodes: z.uniqueNodes,
        eventCount: z.events.length,
        windowMs: opts.windowMs ?? config.CLUSTER_WINDOW_MS,
        firstEventAt: Math.min(...z.events.map((e) => e.receivedAt)),
        lastEventAt: Math.max(...z.events.map((e) => e.receivedAt)),
        maxPeak: Math.max(...peaks),
        avgRms: rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length,
        // Messaggio UNICO, prudente. Non sostituire con frasi predittive.
        message: config.CLUSTER_MESSAGE,
      };
    });
}

module.exports = { summarizeZones, detectClusters };
