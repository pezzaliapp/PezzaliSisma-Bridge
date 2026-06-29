'use strict';

/**
 * Validazione e normalizzazione degli eventi candidati.
 *
 * Per privacy by design il server ACCETTA SOLO i campi previsti e
 * IGNORA qualunque altro campo. In questo modo, anche se un nodo
 * inviasse per errore dati personali, questi non verrebbero memorizzati.
 *
 * Campi ammessi:
 *   - nodeId    (string)  identificativo casuale del nodo, non riconducibile a persona
 *   - zone      (string)  zona approssimata (es. griglia/geohash corto)
 *   - timestamp (number)  epoch ms lato dispositivo
 *   - rms       (number)  RMS della vibrazione
 *   - peak      (number)  picco della vibrazione
 *   - durationMs(number)  durata stimata dell'evento in ms
 */

const ALLOWED_FIELDS = ['nodeId', 'zone', 'timestamp', 'rms', 'peak', 'durationMs'];

// Campi che NON devono mai essere accettati: se presenti, l'evento e rifiutato.
// Difesa in profondita contro invii accidentali di dati personali.
const FORBIDDEN_FIELDS = [
  'name', 'fullName', 'phone', 'email', 'lat', 'lon', 'latitude', 'longitude',
  'gps', 'audio', 'photo', 'image', 'contacts', 'address', 'deviceId', 'imei',
];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * @param {unknown} body corpo della richiesta
 * @returns {{ok: true, event: object} | {ok: false, error: string}}
 */
function validateEvent(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Il corpo della richiesta deve essere un oggetto JSON.' };
  }

  for (const forbidden of FORBIDDEN_FIELDS) {
    if (forbidden in body) {
      return { ok: false, error: `Campo non ammesso per privacy: "${forbidden}".` };
    }
  }

  if (!isNonEmptyString(body.nodeId)) {
    return { ok: false, error: 'nodeId mancante o non valido.' };
  }
  if (body.nodeId.length > 128) {
    return { ok: false, error: 'nodeId troppo lungo.' };
  }
  if (!isNonEmptyString(body.zone)) {
    return { ok: false, error: 'zone mancante o non valida.' };
  }
  if (body.zone.length > 64) {
    return { ok: false, error: 'zone troppo lunga.' };
  }
  if (!isFiniteNumber(body.timestamp) || body.timestamp <= 0) {
    return { ok: false, error: 'timestamp mancante o non valido.' };
  }
  if (!isFiniteNumber(body.rms) || body.rms < 0) {
    return { ok: false, error: 'rms mancante o non valido.' };
  }
  if (!isFiniteNumber(body.peak) || body.peak < 0) {
    return { ok: false, error: 'peak mancante o non valido.' };
  }
  if (!isFiniteNumber(body.durationMs) || body.durationMs < 0) {
    return { ok: false, error: 'durationMs mancante o non valido.' };
  }

  // Normalizzazione: tieni SOLO i campi ammessi.
  const event = {};
  for (const field of ALLOWED_FIELDS) {
    event[field] = body[field];
  }
  event.nodeId = event.nodeId.trim();
  event.zone = event.zone.trim();

  return { ok: true, event };
}

module.exports = { validateEvent, ALLOWED_FIELDS, FORBIDDEN_FIELDS };
