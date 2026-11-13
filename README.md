# Wildcat Devs — Startup Buildathon India 2026 Pitch Deck

An interactive 3D pitch deck for the **Startup Buildathon — India 2026** (Google DeepMind | Google Cloud), powered by H2S, nasscom, and HEADSTART.

Inspired by the immersive voyage format of [hackathoni.in](https://www.hackathoni.in/), this deck replaces static slides with a living 3D narrative featuring an emergency medical tech rig (ambulance) on a midnight highway, procedural Web Audio sirens and engine hum, and dynamic slide telemetry.

---

## The Pitch Story

1. **Slide 01 — Overview & Core Mission**: Every minute counts. The broken first 60 seconds of emergency response.
2. **Slide 02 — Problem Statement**: The Fatal First Minute (~500 road deaths/day, 64% choked helplines, 18 follow-up calls, location guesswork).
3. **Slide 03 — Proposed Solution**: Conversational AI that turns any voice into instant rescue (Omni-channel intake in Kannada/Hindi/English, landmark pin, open dispatch).
4. **Slide 04 — Solution Architecture**: Powered by Gemini Live API on Vertex AI, Cloud Run, Google Maps Routes & Places API, BigQuery ML, and Gemma (On-Device).
5. **Slide 05 — Business Model & The Ask**: $1.7B–$5.2B TAM, per-case fee, phased roadmap, and ask for pre-seed, Google Cloud credits, and hospital pilots.

---

## Tech Stack

- **Three.js (r128)**: High-performance 3D WebGL procedural ambulance, dynamic strobe lights, headlights, and camera tracking.
- **Web Audio API**: Procedural sound engine (diesel engine hum, road noise, siren bursts, 78 BPM ECG heartbeat).
- **Vanilla ES6 Modules & Modern CSS**: Zero build step required, runs instantly in any browser.

---

## Local Setup

```bash
# Serve locally
python -m http.server 3000
# Open in browser: http://localhost:3000
```
