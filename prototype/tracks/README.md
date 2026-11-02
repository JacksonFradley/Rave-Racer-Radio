# Rave Racer Remix — Rekordbox MP3 Track Folder (`prototype/tracks/`)

You can load licensed `.mp3`, `.wav`, `.ogg`, `.flac`, or `.m4a` songs into the **Rekordbox Dual-Deck AI DJ Replica** in three ways:

1. **Drag-and-Drop Anywhere in the Browser Window:**
   - Drag an `.mp3` file onto the **left half** of the screen to analyze and load it into **Deck 1**.
   - Drag an `.mp3` file onto the **right half** of the screen to analyze and load it into **Deck 2**.
   - Drag **two `.mp3` files at once** to load both Deck 1 and Deck 2 simultaneously.

2. **Use the In-Game `📂 LOAD MP3` Buttons:**
   - Press **`K`** (or click **`💿 REKORDBOX DJ (K)`** in the top bar, or launch **`LAB 04`** from the Dev Menu) to open the Rekordbox Dual-Deck Studio.
   - Click **`📂 LOAD MP3`** on **Deck 1** or **Deck 2** to pick any local audio file.

3. **Auto-Load from `prototype/tracks/playlist.json`:**
   - Drop your `.mp3` files into this `prototype/tracks/` directory and add their relative paths to `playlist.json`:
     ```json
     {
       "tracks": [
         { "title": "Bicep - Glue", "url": "tracks/glue.mp3" },
         { "title": "Prodigy - Breathe", "url": "tracks/breathe.mp3" }
       ]
     }
     ```

## Rekordbox Analysis Cache (`.rekordbox.json`)
- Every analyzed song automatically caches its **BPM**, **Quantized Beatgrid**, **3-Band RGB Waveform**, **8-Bar Phrase Classification (`INTRO`, `PRE_DROP`, `DROP`, `BREAKDOWN`, `OUTRO`)**, and **Hot Cues (`A/B/C/D`)** in `localStorage`.
- Click **`💾 JSON`** on Deck 1 or Deck 2 to export the analysis to a `.rekordbox.json` file, or drag-and-drop a `.rekordbox.json` file onto a deck to import it.
