'use strict';

/**
 * PWA ricevitore di PezzaliSisma-Bridge.
 *
 * Solo visualizzazione: legge GET /api/status dal bridge-server e mostra
 * stato rete, zone attive e possibili cluster.
 *
 * NON rileva vibrazioni e NON promette funzionamento in background su iPhone.
 */

const STORAGE_KEY = 'pezzalisisma.endpoint';
const POLL_MS = 5000;

const els = {
  endpoint: document.getElementById('endpoint'),
  saveBtn: document.getElementById('saveBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  autoToggle: document.getElementById('autoToggle'),
  netState: document.getElementById('netState'),
  lastUpdate: document.getElementById('lastUpdate'),
  uniqueNodes: document.getElementById('uniqueNodes'),
  eventsCount: document.getElementById('eventsCount'),
  zonesList: document.getElementById('zonesList'),
  clustersList: document.getElementById('clustersList'),
  disclaimer: document.getElementById('disclaimer'),
};

let timer = null;

function getEndpoint() {
  return (els.endpoint.value || '').trim().replace(/\/+$/, '');
}

function setNetState(kind, text) {
  const dotClass = kind === 'ok' ? 'ok' : kind === 'off' ? 'off' : 'idle';
  els.netState.innerHTML = `<span class="dot ${dotClass}"></span>${text}`;
}

async function fetchStatus() {
  const base = getEndpoint();
  if (!base) {
    setNetState('idle', 'Endpoint non impostato');
    return;
  }
  setNetState('idle', 'Aggiornamento…');
  try {
    const res = await fetch(`${base}/api/status`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
    setNetState('ok', 'Connesso');
    els.lastUpdate.textContent = new Date().toLocaleTimeString('it-IT');
  } catch (err) {
    setNetState('off', `Non raggiungibile (${err.message})`);
  }
}

function render(data) {
  els.uniqueNodes.textContent = String(data.uniqueNodesTotal ?? '—');
  els.eventsCount.textContent = String(data.eventsInMemory ?? '—');
  if (data.disclaimer) els.disclaimer.textContent = data.disclaimer;

  renderZones(data.activeZones || []);
  renderClusters(data.possibleClusters || []);
}

function renderZones(zones) {
  if (!zones.length) {
    els.zonesList.innerHTML = '<li class="empty">Nessuna zona attiva.</li>';
    return;
  }
  els.zonesList.innerHTML = zones
    .map(
      (z) =>
        `<li><strong>${escapeHtml(z.zone)}</strong> — ${z.uniqueNodes} nodo/i unico/i</li>`
    )
    .join('');
}

function renderClusters(clusters) {
  if (!clusters.length) {
    els.clustersList.innerHTML =
      '<li class="empty">Nessun possibile cluster.</li>';
    return;
  }
  els.clustersList.innerHTML = clusters
    .map((c) => {
      const when = new Date(c.lastEventAt).toLocaleTimeString('it-IT');
      return `<li class="cluster">
        <p class="msg">${escapeHtml(c.message)}</p>
        <p class="meta">Zona <strong>${escapeHtml(c.zone)}</strong> · ${c.uniqueNodes} nodi unici · ${c.eventCount} eventi · ultimo: ${when}</p>
      </li>`;
    })
    .join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function startAuto() {
  stopAuto();
  timer = setInterval(fetchStatus, POLL_MS);
}
function stopAuto() {
  if (timer) clearInterval(timer);
  timer = null;
}

// --- eventi UI ---
els.saveBtn.addEventListener('click', () => {
  localStorage.setItem(STORAGE_KEY, getEndpoint());
  fetchStatus();
});
els.refreshBtn.addEventListener('click', fetchStatus);
els.autoToggle.addEventListener('change', () => {
  els.autoToggle.checked ? startAuto() : stopAuto();
});

// Stato online/offline del browser.
window.addEventListener('offline', () => setNetState('off', 'Dispositivo offline'));
window.addEventListener('online', fetchStatus);

// init
els.endpoint.value = localStorage.getItem(STORAGE_KEY) || '';
fetchStatus();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {
    /* best effort: la PWA funziona anche senza service worker */
  });
}
