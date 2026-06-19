---
title: deep-focus-studio
tagline: Neuroscience-backed ambient sound & focus timer.
description: Deep Focus Studio is a neuroscience-backed ambient sound generator and focus timer — binaural beats, noise textures, and procedurally generated chill EDM synthesized in the browser with Tone.js.
stack: ['JavaScript', 'Web Audio API', 'Tone.js', 'localStorage', 'Zero-build']
github: https://github.com/prateekaryann/deep-focus-studio
live: https://prateekaryann.github.io/deep-focus-studio
glyph: focus
accent: cyan
order: 1
banner: /projects/deep-focus-studio/banner.png
demoVideo: /projects/deep-focus-studio/demo.mp4
demoPoster: /projects/deep-focus-studio/poster.png
architecture: /projects/deep-focus-studio/architecture.png
---

# deep-focus-studio

A neuroscience-backed ambient sound generator for deep work sessions. No dependencies,
no build step — just open it and focus. Every sound is **synthesized live in the browser**
with the Web Audio API; nothing is streamed or pre-recorded.

## Features

- **Binaural beats** — brainwave entrainment across Theta (6 Hz, creative flow), Alpha
  (10 Hz, relaxed focus), Beta (18 Hz, active thinking), and Gamma (40 Hz, peak cognition).
  *Headphones required for the effect.*
- **Noise textures** — brown (deep rumble), pink (balanced, rain-like), and white (full spectrum).
- **Procedural chill EDM** — algorithmically generated music that never repeats: evolving
  arpeggios with ping-pong delay, lush reverbed pads, optional soft beats. Presets: Ambient,
  Lo-fi, Deep House.
- **Focus timer** — tracks session duration and saves sessions, total time, and streak to
  `localStorage`, persisting across refreshes.

## The science

| Layer | Mechanism | Research |
|---|---|---|
| Binaural beats | Frequency-following response in auditory cortex | Oster (1973); Wahbeh (2007) |
| Pink / brown noise | Stochastic resonance, distraction masking | Zhou et al. (2012) |
| 40 Hz Gamma | Enhanced neural synchronization | MIT Tsai Lab (2016) |
| Ambient music | Reduced cortisol, improved mood | Thoma et al. (2013) |

## How it works

Tone.js drives a small synthesis graph in the browser — oscillator pairs for the binaural
layer, filtered noise generators for the textures, and a generative sequencer for the EDM
layer routed through delay and reverb buses. Session stats live entirely in `localStorage`,
so there's no backend, no accounts, and no tracking.

## Tech stack

- Vanilla HTML / CSS / JS — zero build tools, zero install
- [Tone.js](https://tonejs.github.io/) for Web Audio synthesis
- `localStorage` for persistence
