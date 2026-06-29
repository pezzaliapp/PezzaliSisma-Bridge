'use strict';

/**
 * Configurazione del bridge-server.
 * Tutti i parametri sono sovrascrivibili tramite variabili d'ambiente
 * per facilitare i test e la sperimentazione.
 *
 * IMPORTANTE: questi valori sono parametri sperimentali, non soglie
 * scientificamente validate. Vedi docs/ARCHITETTURA.md e DISCLAIMER.md.
 */

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

module.exports = {
  // Porta HTTP del server.
  PORT: intFromEnv('PORT', 3000),

  // Numero minimo di NODI UNICI necessari per considerare un cluster.
  // Regola fondamentale del progetto: un singolo nodo non genera mai un avviso.
  MIN_UNIQUE_NODES: intFromEnv('MIN_UNIQUE_NODES', 3),

  // Finestra temporale (ms) entro cui gli eventi devono arrivare per
  // essere considerati parte dello stesso possibile cluster.
  CLUSTER_WINDOW_MS: intFromEnv('CLUSTER_WINDOW_MS', 10000),

  // Per quanto tempo (ms) un evento resta in memoria prima di essere scartato.
  // Deve essere >= CLUSTER_WINDOW_MS.
  EVENT_TTL_MS: intFromEnv('EVENT_TTL_MS', 60000),

  // Per quanto tempo (ms) una zona resta "attiva" nella vista di stato
  // dopo l'ultimo evento ricevuto.
  ZONE_ACTIVE_MS: intFromEnv('ZONE_ACTIVE_MS', 120000),

  // Messaggio UNICO ammesso per un possibile cluster.
  // Non modificare con frasi allarmistiche o predittive.
  CLUSTER_MESSAGE: 'Possibile vibrazione rilevata da più nodi. Verifica in corso.',

  // Abilita la scrittura di un log tecnico verificabile (JSON Lines).
  LOG_TO_FILE: process.env.LOG_TO_FILE === '1',
  LOG_FILE: process.env.LOG_FILE || 'data/events.jsonl',
};
