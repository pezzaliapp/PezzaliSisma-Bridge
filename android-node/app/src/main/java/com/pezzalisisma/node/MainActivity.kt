package com.pezzalisisma.node

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contracts.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.pezzalisisma.node.databinding.ActivityMainBinding

/**
 * Schermata principale del nodo.
 *
 * Flusso:
 *  1. l'utente inserisce endpoint del bridge-server e zona approssimata;
 *  2. l'utente concede il CONSENSO ESPLICITO alla lettura dell'accelerometro
 *     (dialog dedicato che spiega cosa viene inviato e cosa NO);
 *  3. solo allora puo avviare il foreground service.
 *
 * Nessun dato personale viene richiesto o inviato.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: Prefs

    private val notifPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* esito ignorato: best effort */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = Prefs(this)

        binding.nodeIdText.text = getString(R.string.label_node_id, prefs.nodeId)
        binding.endpointInput.setText(prefs.endpoint)
        binding.zoneInput.setText(prefs.zone)
        binding.consentSwitch.isChecked = prefs.consentGiven

        binding.consentSwitch.setOnCheckedChangeListener { _, checked ->
            if (checked && !prefs.consentGiven) {
                // Non attivare subito: mostra prima il consenso esplicito.
                binding.consentSwitch.isChecked = false
                showConsentDialog()
            } else if (!checked) {
                prefs.consentGiven = false
                SensorService.stop(this)
                updateStatus()
            }
        }

        binding.startButton.setOnClickListener { onStartClicked() }
        binding.stopButton.setOnClickListener {
            SensorService.stop(this)
            updateStatus()
        }

        updateStatus()
    }

    private fun onStartClicked() {
        prefs.endpoint = binding.endpointInput.text?.toString()?.trim().orEmpty()
        prefs.zone = binding.zoneInput.text?.toString()?.trim().orEmpty()

        if (prefs.endpoint.isBlank() || prefs.zone.isBlank()) {
            toast(getString(R.string.error_missing_config))
            return
        }
        if (!prefs.consentGiven) {
            showConsentDialog()
            return
        }
        requestNotificationPermissionIfNeeded()
        SensorService.start(this)
        toast(getString(R.string.service_started))
        updateStatus()
    }

    /** Dialog di CONSENSO ESPLICITO: spiega cosa viene inviato e cosa NO. */
    private fun showConsentDialog() {
        AlertDialog.Builder(this)
            .setTitle(R.string.consent_title)
            .setMessage(R.string.consent_message)
            .setPositiveButton(R.string.consent_accept) { _, _ ->
                prefs.consentGiven = true
                binding.consentSwitch.isChecked = true
                updateStatus()
            }
            .setNegativeButton(R.string.consent_decline) { _, _ ->
                prefs.consentGiven = false
                binding.consentSwitch.isChecked = false
                updateStatus()
            }
            .setCancelable(false)
            .show()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun updateStatus() {
        val configured = prefs.isConfigured()
        binding.statusText.text = if (configured) {
            getString(R.string.status_ready)
        } else {
            getString(R.string.status_not_ready)
        }
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
