# BYTE / GLITCH

A browser-based, audio-reactive visualizer combining real-time audio analysis, an eight-state amplitude display, and three qubit-inspired geometric displays.

**Live app:** https://qubyte-chawk.netlify.app

![BYTE / GLITCH preview](docs/preview.png)

## Features
- Original **NEGATIVE VELOCITY** demo track by *artificialflowers*.
- Play or pause the demo; upload your own audio file.
- Audio analysis using the Web Audio API with HTML Canvas 2D rendering.
- Animation targeting **30 FPS** (actual rate depends on the device and browser).
- No equations, numbers, or text rendered inside the visualizer canvas.
- Local-file uploads are played directly from the browser using an object URL, not sent to a server.

The geometric displays are **quantum-inspired artwork**, not a quantum-computing implementation or simulation of actual quantum hardware.

## Run locally

From the project root:

```bash
python -m http.server 8080
```

Then visit http://localhost:8080 in your browser. Using an HTTP server is recommended instead of opening `index.html` directly.

## Deploy to Netlify

1. Download and extract the Netlify deployment ZIP.
2. In the Netlify dashboard, open the existing `qubyte-chawk` site's **Deploys** page.
3. Drag in the extracted deployment folder containing `index.html`, `app.js`, `styles.css`, `netlify.toml`, and `assets/`.
4. Once the deploy succeeds, open https://qubyte-chawk.netlify.app and confirm Play, Pause, and Upload all work.

This is a static site. No Node build step, cloud database, third-party scripts, or secret credentials are needed.

If you later connect this GitHub repository to Netlify for continuous deployment, publish directory is `.` and the build command can be left empty. Do not create a second Netlify site unless you want a new URL.

## Files
- `index.html` — page markup and audio element.
- `styles.css` — responsive styling.
- `app.js` — audio player, 30 FPS loop, procedural visualization.
- `assets/negative-velocity.mp3` — browser-compatible demo playback.
- `assets/negative-velocity.m4a` — original input used to seed visual states (not the playback source).
- `netlify.toml` — static deployment configuration.
- `docs/preview.png` — project screenshot.
- `LINKEDIN_POST.md` — copy of the announcement.

## Compatibility and privacy

The demo uses the bundled MP3 for browser playback. The original M4A is retained for visual-state seeding. Users' locally chosen audio files stay on their devices; the app does not upload them to a server.

If audio doesn't begin, ensure the browser hasn't muted the tab and that autoplay restrictions are not blocking playback. Click **Play demo** to start the audio context.

## Rights

The original demo track is by *artificialflowers*; **all rights reserved for the music**. The repository does not currently specify an open-source license for its code; please obtain permission before reusing code or assets.
