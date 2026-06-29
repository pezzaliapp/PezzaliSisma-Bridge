package com.pezzalisisma.node

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Foreground service VISIBILE con notifica persistente.
 *
 * Legge l'accelerometro SOLO se l'utente ha dato consenso esplicito
 * (controllato qui e in MainActivity). Quando rileva un evento candidato,
 * invia al bridge-server solo metriche aggregate (rms, peak, durata) piu
 * nodeId, zona approssimata e timestamp.
 *
 * Pensato per vecchi smartphone fermi e in carica: campionamento non
 * aggressivo (SENSOR_DELAY_NORMAL) per ridurre consumo.
 */
class SensorService : Service(), SensorEventListener {

    private lateinit var prefs: Prefs
    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private val analyzer = VibrationAnalyzer()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var lastUploadAt = 0L

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Mostra subito la notifica: requisito del foreground service.
        startForeground(NOTIFICATION_ID, buildNotification(statusText()))

        // Difesa: senza consenso esplicito NON leggiamo i sensori.
        if (!prefs.consentGiven) {
            Log.w(TAG, "Consenso assente: il servizio non legge i sensori.")
            stopSelf()
            return START_NOT_STICKY
        }

        startListening()
        // START_STICKY: il sistema prova a riavviare il servizio se lo termina.
        return START_STICKY
    }

    private fun startListening() {
        if (accelerometer != null) return // gia in ascolto
        val sm = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        sensorManager = sm
        accelerometer = sm?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        if (accelerometer == null) {
            Log.w(TAG, "Accelerometro non disponibile su questo dispositivo.")
            return
        }
        sm?.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL)
        Log.i(TAG, "In ascolto dell'accelerometro (consenso presente).")
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
        val candidate = analyzer.addSample(
            event.values[0], event.values[1], event.values[2],
            System.currentTimeMillis()
        ) ?: return

        // Anti-spam: al massimo un invio ogni MIN_UPLOAD_INTERVAL_MS.
        val now = System.currentTimeMillis()
        if (now - lastUploadAt < MIN_UPLOAD_INTERVAL_MS) return
        lastUploadAt = now
        analyzer.reset()

        val endpoint = prefs.endpoint
        val zone = prefs.zone
        if (endpoint.isBlank() || zone.isBlank()) return

        scope.launch {
            val ok = EventUploader.upload(endpoint, prefs.nodeId, zone, candidate)
            Log.i(TAG, "Evento candidato inviato: ok=$ok rms=${candidate.rms} peak=${candidate.peak}")
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) { /* non usato */ }

    override fun onDestroy() {
        sensorManager?.unregisterListener(this)
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // --- Notifica persistente ---

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notif_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notif_channel_desc)
                setShowBadge(false)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notif_title))
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openIntent)
            .build()
    }

    private fun statusText(): String =
        getString(R.string.notif_text, prefs.zone.ifBlank { "—" })

    companion object {
        private const val TAG = "SensorService"
        private const val CHANNEL_ID = "pezzalisisma_node_service"
        private const val NOTIFICATION_ID = 1001
        private const val MIN_UPLOAD_INTERVAL_MS = 5000L

        fun start(context: Context) {
            val intent = Intent(context, SensorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, SensorService::class.java))
        }
    }
}
