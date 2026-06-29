package com.pezzalisisma.node

import kotlin.math.sqrt

/**
 * Analizza i campioni dell'accelerometro per estrarre, su una finestra
 * temporale, alcune metriche aggregate:
 *  - rms     : valore RMS della magnitudine (al netto della gravita)
 *  - peak    : picco massimo della magnitudine
 *  - durationMs : durata in cui il segnale supera una soglia
 *
 * NON registra il segnale grezzo, NON salva audio, NON salva posizione.
 * Lavora solo su numeri aggregati.
 *
 * IMPORTANTE: le soglie qui sono parametri sperimentali, non valori
 * scientificamente validati. Servono solo a decidere quando un movimento
 * e "abbastanza interessante" da diventare un evento candidato.
 */
class VibrationAnalyzer(
    private val gravity: Double = 9.81,
    private val triggerThreshold: Double = 0.6, // m/s^2 sopra la gravita
) {

    private data class Sample(val magnitude: Double, val timeMs: Long)

    private val window = ArrayDeque<Sample>()
    private val windowMs = 3000L

    /**
     * Aggiunge un campione (x, y, z in m/s^2) e ritorna un evento candidato
     * se nella finestra corrente il movimento supera la soglia.
     *
     * Ritorna null se non c'e nulla di rilevante.
     */
    fun addSample(x: Float, y: Float, z: Float, timeMs: Long): CandidateEvent? {
        val magnitude = sqrt((x * x + y * y + z * z).toDouble())
        // Magnitudine "lineare": quanto ci discostiamo dalla gravita statica.
        val linear = kotlin.math.abs(magnitude - gravity)

        window.addLast(Sample(linear, timeMs))
        // Mantieni solo la finestra recente.
        while (window.isNotEmpty() && timeMs - window.first().timeMs > windowMs) {
            window.removeFirst()
        }

        if (window.size < MIN_SAMPLES) return null

        val maxLinear = window.maxOf { it.magnitude }
        if (maxLinear < triggerThreshold) return null

        // Solo gli istanti sopra soglia definiscono la "durata".
        val active = window.filter { it.magnitude >= triggerThreshold }
        if (active.isEmpty()) return null

        val rms = sqrt(window.sumOf { it.magnitude * it.magnitude } / window.size)
        val durationMs = active.last().timeMs - active.first().timeMs

        return CandidateEvent(
            rms = round3(rms),
            peak = round3(maxLinear),
            durationMs = durationMs.coerceAtLeast(0),
        )
    }

    /** Svuota la finestra (es. dopo aver emesso un evento). */
    fun reset() = window.clear()

    private fun round3(v: Double): Double = Math.round(v * 1000.0) / 1000.0

    companion object {
        private const val MIN_SAMPLES = 10
    }
}

/** Metriche aggregate di un evento candidato (nessun dato personale). */
data class CandidateEvent(
    val rms: Double,
    val peak: Double,
    val durationMs: Long,
)
