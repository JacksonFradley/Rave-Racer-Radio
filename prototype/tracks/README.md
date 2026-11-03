# Rave Racer Remix — Custom Music & Rekordbox Crate Guide (`prototype/tracks/`)

## How the Rekordbox 7 AI DJ Crate Works

1. **Pre-Analyzed `/Music` Library (`prototype/js/rekordbox-library-data.js`)**:
   * At startup, `RRR.RekordboxController` indexes all **121 pre-analyzed club tracks** defined in `RRR.PREANALYZED_MUSIC_LIBRARY` (`js/rekordbox-library-data.js`), immediately populating the crate with exact BPMs, Bar-1 downbeats (`firstBeatSec`), Camelot keys, 8-bar structural phrases (`INTRO`, `GROOVE`, `PRE_DROP`, `DROP`, `BREAKDOWN`, `OUTRO`), auto-trim LUFS staging (`autoTrimDb`), and 120-column 3-band RGB overview waveforms.
   * When a track is cued onto **Deck 1** or **Deck 2**, the engine fetches the corresponding audio file on demand from `../Music/<fileName>` (or `tracks/<fileName>` as a fallback), keeping an LRU cache of decoded `AudioBuffer` instances so memory usage stays bounded across long sets.

2. **Zero-Config Procedural Dual-Deck Fallback**:
   * Before any external MP3/WAV finishes loading (or if running without the `/Music` folder), the engine synthesizes two full 64-bar stereo club tracks in memory (`NAGAI BAYSHORE ANTHEM` at 132 BPM `8A` and `WANGAN MIDNIGHT RUNNER` at 134 BPM `9A`) so Dual-Deck beat-matching and transitions work out of the box.

3. **Loading Your Own MP3 / WAV / FLAC / OGG Files Live**:
   * Press **`K`** in-game to open the **rekordbox 7 // CDJ-3000 & DJM-A9 AI DJ Studio**.
   * Click **📁 LOAD SONG FOLDER** to select any local directory of audio files, click **📂 LOAD** on Deck 1 or Deck 2, or **drag and drop** `.mp3`, `.wav`, `.ogg`, `.flac`, or exported `.json` analysis files anywhere onto the browser window.
