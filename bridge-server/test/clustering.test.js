'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { detectClusters, summarizeZones } = require('../src/clustering');
const { validateEvent } = require('../src/validate');

function evt(nodeId, zone, receivedAt, extra = {}) {
  return {
    nodeId,
    zone,
    timestamp: receivedAt,
    rms: extra.rms ?? 1.2,
    peak: extra.peak ?? 3.4,
    durationMs: extra.durationMs ?? 500,
    receivedAt,
  };
}

test('un singolo nodo non genera mai un cluster', () => {
  const now = 100000;
  const events = [evt('n1', 'zoneA', now), evt('n1', 'zoneA', now - 1000)];
  const clusters = detectClusters(events, now, { minUniqueNodes: 3, windowMs: 10000 });
  assert.strictEqual(clusters.length, 0);
});

test('due nodi unici non bastano (soglia 3)', () => {
  const now = 100000;
  const events = [evt('n1', 'zoneA', now), evt('n2', 'zoneA', now - 2000)];
  const clusters = detectClusters(events, now, { minUniqueNodes: 3, windowMs: 10000 });
  assert.strictEqual(clusters.length, 0);
});

test('tre nodi unici nella stessa zona entro la finestra creano un possibile cluster', () => {
  const now = 100000;
  const events = [
    evt('n1', 'zoneA', now - 1000),
    evt('n2', 'zoneA', now - 3000),
    evt('n3', 'zoneA', now - 9000),
  ];
  const clusters = detectClusters(events, now, { minUniqueNodes: 3, windowMs: 10000 });
  assert.strictEqual(clusters.length, 1);
  assert.strictEqual(clusters[0].uniqueNodes, 3);
  assert.strictEqual(
    clusters[0].message,
    'Possibile vibrazione rilevata da più nodi. Verifica in corso.'
  );
});

test('eventi fuori dalla finestra di 10s non contano', () => {
  const now = 100000;
  const events = [
    evt('n1', 'zoneA', now - 1000),
    evt('n2', 'zoneA', now - 2000),
    evt('n3', 'zoneA', now - 11000), // fuori finestra
  ];
  const clusters = detectClusters(events, now, { minUniqueNodes: 3, windowMs: 10000 });
  assert.strictEqual(clusters.length, 0);
});

test('lo stesso nodo che invia 3 volte non crea un cluster', () => {
  const now = 100000;
  const events = [
    evt('n1', 'zoneA', now - 1000),
    evt('n1', 'zoneA', now - 2000),
    evt('n1', 'zoneA', now - 3000),
  ];
  const clusters = detectClusters(events, now, { minUniqueNodes: 3, windowMs: 10000 });
  assert.strictEqual(clusters.length, 0);
});

test('zone diverse non si sommano tra loro', () => {
  const now = 100000;
  const events = [
    evt('n1', 'zoneA', now - 1000),
    evt('n2', 'zoneB', now - 2000),
    evt('n3', 'zoneC', now - 3000),
  ];
  const clusters = detectClusters(events, now, { minUniqueNodes: 3, windowMs: 10000 });
  assert.strictEqual(clusters.length, 0);
});

test('summarizeZones conta i nodi unici per zona', () => {
  const now = 100000;
  const events = [
    evt('n1', 'zoneA', now - 1000),
    evt('n2', 'zoneA', now - 2000),
    evt('n1', 'zoneA', now - 3000), // duplicato nodo
  ];
  const zones = summarizeZones(events, now, { windowMs: 10000 });
  assert.strictEqual(zones.length, 1);
  assert.strictEqual(zones[0].uniqueNodes, 2);
});

test('validateEvent rifiuta campi personali vietati', () => {
  const res = validateEvent({
    nodeId: 'n1',
    zone: 'zoneA',
    timestamp: 1,
    rms: 1,
    peak: 2,
    durationMs: 100,
    email: 'x@y.z',
  });
  assert.strictEqual(res.ok, false);
});

test('validateEvent tiene solo i campi consentiti', () => {
  const res = validateEvent({
    nodeId: 'n1',
    zone: 'zoneA',
    timestamp: 1,
    rms: 1,
    peak: 2,
    durationMs: 100,
  });
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(Object.keys(res.event).sort(), [
    'durationMs', 'nodeId', 'peak', 'rms', 'timestamp', 'zone',
  ]);
});
