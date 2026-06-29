'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Store in memoria degli eventi candidati.
 *
 * Volutamente semplice e senza database: questa e una prima versione
 * sperimentale. Gli eventi piu vecchi di EVENT_TTL_MS vengono scartati.
 *
 * Se LOG_TO_FILE e attivo, ogni evento ricevuto viene anche scritto in
 * append su un file JSON Lines, per avere un log tecnico verificabile
 * (utile per il futuro confronto con dati INGV/EMSC/USGS).
 */
class EventStore {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? config.EVENT_TTL_MS;
    this.logToFile = options.logToFile ?? config.LOG_TO_FILE;
    this.logFile = options.logFile ?? config.LOG_FILE;
    /** @type {Array<object>} */
    this.events = [];

    if (this.logToFile) {
      const dir = path.dirname(this.logFile);
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Aggiunge un evento gia validato.
   * @param {object} event evento normalizzato (vedi validateEvent)
   * @param {number} receivedAt timestamp (ms) di ricezione lato server
   */
  add(event, receivedAt) {
    const stored = { ...event, receivedAt };
    this.events.push(stored);
    this._appendToLog(stored);
    return stored;
  }

  /** Rimuove gli eventi piu vecchi del TTL rispetto a `now`. */
  prune(now) {
    const cutoff = now - this.ttlMs;
    this.events = this.events.filter((e) => e.receivedAt >= cutoff);
  }

  /** Tutti gli eventi attualmente in memoria. */
  all() {
    return this.events.slice();
  }

  _appendToLog(stored) {
    if (!this.logToFile) return;
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(stored) + '\n');
    } catch (err) {
      // Il log e best-effort: non deve mai far cadere il server.
      console.error('[store] impossibile scrivere il log:', err.message);
    }
  }
}

module.exports = { EventStore };
