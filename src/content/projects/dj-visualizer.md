---
title: dj-visualizer
tagline: Real-time mic-reactive 3D WebGL visualizer for DJs & live streams.
description: VIZORA is a real-time, mic-reactive 3D WebGL visualizer for DJs and live streams — Three.js particle systems and GLSL shaders driven by live FFT analysis of room audio, with five DJ scenes and OBS support.
stack: ['JavaScript', 'Three.js', 'WebGL', 'GLSL', 'Web Audio API', 'Zero-build']
github: https://github.com/prateekaryann/dj-visualizer
live: https://prateekaryann.github.io/dj-visualizer
glyph: audio
accent: pink
order: 2
banner: /projects/dj-visualizer/banner.png
demoVideo: /projects/dj-visualizer/demo.mp4
demoPoster: /projects/dj-visualizer/poster.png
architecture: /projects/dj-visualizer/architecture.png
---

# dj-visualizer

**VIZORA** is a real-time, mic-reactive 3D WebGL visualizer for DJs, electronic music, and
live streams. It listens to room audio through the microphone, runs an FFT, and drives a
3D particle system and shader effects in real time — no files, no upload, just sound in and
visuals out.

## Features

- **Mic-reactive** — live FFT of microphone input drives the 3D particle formations frame by frame.
- **5 DJ scenes** — TECHNO, TRANCE, HOUSE, MINIMAL, and ACID, each with its own formation profile.
- **BPM tap tempo** — tap to the beat and the visualizer syncs its morph timing.
- **OBS-ready** — append `?obs=1` for a transparent background to use as a browser source.
- **Keyboard-driven** — Space (mic), F (fullscreen), 1–5 (scenes), T (tap BPM).

## How it works

The Web Audio API captures the microphone and exposes a frequency spectrum via an
`AnalyserNode`. Those bins feed uniforms into **GLSL shaders** — Julia-set fractals, tunnel
rings, and particle formations rendered by **Three.js (r128)** on a WebGL canvas. Scene
changes morph the particle target positions; tap-tempo aligns the morph cadence to the beat.
It's a pure client-side app with zero build step.

## Use in OBS

1. Add a **Browser Source** in OBS.
2. Point it at `…/dj-visualizer/?obs=1`.
3. Set width/height to your stream resolution (e.g. 1920×1080).
4. Enable *Control audio via OBS* if routing desktop audio instead of the mic.

## Tech stack

- **Three.js r128** — WebGL 3D particle system
- **Web Audio API** — microphone capture + FFT analysis
- **GLSL shaders** — Julia-set fractals, tunnel rings, particle formations
- Zero build step — runs in any modern browser
