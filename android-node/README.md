# android-node

App Android nativa (Kotlin) che funge da **nodo** di PezzaliSisma-Bridge.

> ⚠️ Progetto **sperimentale** e open source. **Non** prevede terremoti e **non**
> sostituisce i sistemi ufficiali (INGV/EMSC/USGS/Protezione Civile).
> Vedi [`../DISCLAIMER.md`](../DISCLAIMER.md).

## Cosa fa

- Avvia un **foreground service visibile** con **notifica persistente**.
- Legge l'**accelerometro solo dopo consenso esplicito** dell'utente.
- È pensata per **vecchi smartphone Android fermi e in carica** (campionamento
  `SENSOR_DELAY_NORMAL`, dipendenze minime, `minSdk 23`).
- Invia al `bridge-server` **solo eventi candidati aggregati**:
  - `nodeId` casuale (generato una volta, non riconducibile a una persona)
  - `zone` (zona approssimata, etichetta scelta dall'utente)
  - `timestamp`
  - `rms` (RMS della vibrazione)
  - `peak` (picco della vibrazione)
  - `durationMs` (durata stimata)

## Cosa NON fa (privacy by design)

Non legge e non invia: nome, numero, email, audio, foto, rubrica, posizione
precisa/GPS, identificativi hardware (IMEI/MAC). I permessi richiesti sono solo
`INTERNET`, `FOREGROUND_SERVICE(_DATA_SYNC)` e `POST_NOTIFICATIONS`.

## Struttura

```
app/src/main/
├── AndroidManifest.xml
├── java/com/pezzalisisma/node/
│   ├── MainActivity.kt        # UI, configurazione, consenso esplicito
│   ├── SensorService.kt       # foreground service + notifica persistente
│   ├── VibrationAnalyzer.kt   # calcolo rms/peak/durata (solo numeri aggregati)
│   ├── EventUploader.kt       # invio HTTP del solo payload consentito
│   └── Prefs.kt               # consenso, nodeId casuale, endpoint, zona
└── res/                       # layout, stringhe, tema, icona
```

## Build

Il modo più semplice è **Android Studio** (Giraffe/Koala o più recente):

1. `File → Open` e seleziona la cartella `android-node/`.
2. Android Studio scarica l'SDK, genera il **Gradle wrapper** e sincronizza.
3. `Run` sull'emulatore o su un dispositivo reale.

Da riga di comando (richiede Android SDK e una `local.properties` con
`sdk.dir=...`):

```bash
# genera il wrapper la prima volta (serve gradle installato), poi:
./gradlew assembleDebug
```

> Nota: il file binario `gradle-wrapper.jar` non è incluso nel repo.
> È rigenerato automaticamente da Android Studio oppure con
> `gradle wrapper` se hai Gradle installato.

## Uso

1. Inserisci l'**endpoint** del bridge-server (es. `http://192.168.1.10:3000`).
2. Inserisci una **zona approssimata** (es. `milano-nord`).
3. Concedi il **consenso esplicito** (dialog dedicato).
4. Premi **Avvia nodo**: parte il servizio in primo piano con notifica.

Per i test in rete locale con server in HTTP semplice, valuta una
`network-security-config` o l'uso di HTTPS in produzione.
