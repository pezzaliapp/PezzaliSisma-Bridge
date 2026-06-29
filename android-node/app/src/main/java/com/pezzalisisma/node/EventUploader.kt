package com.pezzalisisma.node

import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Invia un evento candidato al bridge-server.
 *
 * Costruisce il JSON includendo ESCLUSIVAMENTE i campi consentiti:
 *   nodeId, zone, timestamp, rms, peak, durationMs
 *
 * Non invia mai nome, numero, email, audio, foto, rubrica o posizione precisa.
 * Usa HttpURLConnection per evitare dipendenze pesanti (adatto a vecchi device).
 */
object EventUploader {

    private const val TAG = "EventUploader"

    /**
     * @return true se il server ha accettato l'evento (HTTP 2xx).
     */
    fun upload(endpoint: String, nodeId: String, zone: String, event: CandidateEvent): Boolean {
        val base = endpoint.trimEnd('/')
        val url = URL("$base/api/events")

        val payload = JSONObject().apply {
            put("nodeId", nodeId)
            put("zone", zone)
            put("timestamp", System.currentTimeMillis())
            put("rms", event.rms)
            put("peak", event.peak)
            put("durationMs", event.durationMs)
        }.toString()

        var conn: HttpURLConnection? = null
        return try {
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 8000
                readTimeout = 8000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
            conn.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val ok = code in 200..299
            if (!ok) Log.w(TAG, "Risposta server non ok: HTTP $code")
            ok
        } catch (e: Exception) {
            Log.w(TAG, "Invio fallito: ${e.message}")
            false
        } finally {
            conn?.disconnect()
        }
    }
}
