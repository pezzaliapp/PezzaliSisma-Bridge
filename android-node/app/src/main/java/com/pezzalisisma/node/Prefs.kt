package com.pezzalisisma.node

import android.content.Context
import java.util.UUID

/**
 * Piccolo wrapper su SharedPreferences.
 *
 * Conserva SOLO:
 *  - consenso esplicito dell'utente (consentGiven)
 *  - nodeId casuale (generato una volta, non riconducibile a una persona)
 *  - endpoint del bridge-server
 *  - zona approssimata scelta/derivata
 *
 * Privacy by design: nessun dato personale viene salvato.
 */
class Prefs(context: Context) {

    private val sp = context.applicationContext
        .getSharedPreferences("pezzalisisma_node", Context.MODE_PRIVATE)

    var consentGiven: Boolean
        get() = sp.getBoolean(KEY_CONSENT, false)
        set(value) = sp.edit().putBoolean(KEY_CONSENT, value).apply()

    /** Endpoint del bridge-server, es. http://192.168.1.10:3000 */
    var endpoint: String
        get() = sp.getString(KEY_ENDPOINT, "") ?: ""
        set(value) = sp.edit().putString(KEY_ENDPOINT, value.trim()).apply()

    /** Zona approssimata (etichetta libera, es. "milano-nord" o una cella di griglia). */
    var zone: String
        get() = sp.getString(KEY_ZONE, "") ?: ""
        set(value) = sp.edit().putString(KEY_ZONE, value.trim()).apply()

    /**
     * nodeId casuale e stabile per installazione.
     * Generato una sola volta. Non contiene IMEI, MAC o identificativi hardware.
     */
    val nodeId: String
        get() {
            val existing = sp.getString(KEY_NODE_ID, null)
            if (existing != null) return existing
            val generated = "node-" + UUID.randomUUID().toString().substring(0, 12)
            sp.edit().putString(KEY_NODE_ID, generated).apply()
            return generated
        }

    fun isConfigured(): Boolean =
        consentGiven && endpoint.isNotBlank() && zone.isNotBlank()

    companion object {
        private const val KEY_CONSENT = "consent_given"
        private const val KEY_ENDPOINT = "endpoint"
        private const val KEY_ZONE = "zone"
        private const val KEY_NODE_ID = "node_id"
    }
}
