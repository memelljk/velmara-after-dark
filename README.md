# Velmara After Dark

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/memelljk/velmara-after-dark/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/memelljk/velmara-after-dark/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A 3D open-world crime game that runs entirely in the browser from static
files — no build step, no network requests, nothing to install. Velmara is a
rain-soaked neon port city after midnight: wet streets under 648 streetlights,
205 seeded buildings across five districts (the Neon Mile, the Harbor, the
Old Market, The Heights and the Dockyards), container yards, market stalls,
working cranes over dark water, and a permanent drizzle lit pink and cyan by
canvas-painted neon signs.

You are **Jax Rook**, a getaway driver who owes money to the wrong people.
Fixer **Odile Vane**, who runs her business from a booth on the Neon Mile, has
work — twelve jobs of it, climbing from a single sealed parcel to the harbour
vault cash and a five-star run for the city limits.

## What is in the game

- **12 story missions**, each with its own dialogue, objective logic and
  payoff: First Parcel · Nine Minutes to Dock Nine · Indigo Heart · Dock
  Crew · The Vault Run (hold the vault point for 60 seconds, then lose the
  cops) · Market Shakedown · Night Courier · Siren Song (steal a police
  interceptor) · Rooftop Cover · The Ledger (carry it under a forced 3-star
  wanted level) · Harbor Blockade · Velmara Goodbye (the 5-star finale).
- **A living city**: traffic that drives the road grid, brakes and flees
  gunfire; 30 pedestrians who stroll, run and can be robbed at gunpoint;
  thugs and officers who shoot back.
- **Cars you can steal and drive** — any of them. Parked cars, traffic
  (drag the driver out), police interceptors. Six vehicle types including
  the Orphee GT and the Dockmaster Pickup, with arcade handling, handbrake
  drift, hull damage and damage smoke.
- **Wanted system, 0–5 stars**: heat from crimes, decaying over time;
  interceptors that chase and ram, foot officers from 3 stars, a BUSTED
  meter, and WASTED / BUSTED respawns at St. Mirella Hospital with a fee.
- **6 interactable shops** (walk up, press E, buy with mission cash):
  Mirella Arms (ammo + armor), Fixer Garage (repairs), Stitch & Co (an
  outfit that raises max health), Noodle Nine (a meal that heals 50),
  Pawn Star (sell loot), St. Mirella Clinic (full heal).
- **3 safehouses** — Jax's Loft, Harbor Bunk, The Heights Flat — where E
  saves the game, heals you and cools one star of heat.
- **4 radio stations** while driving, all synthesized live with WebAudio:
  Bassline FM, Neon Wave, Rain FM and Harbor Talk. Engine, siren, gunshots
  and rain are synthesized too; there are no audio files.
- **Repeatable earners** after (and between) story beats: checkpoint races
  and timed courier runs from Odile, plus robbery and car theft.
- **Full interface**: cash / rank / clock / district readout, health and
  armor bars, wanted stars, speedometer, ammo counter, an objective banner
  with live distance and countdowns, a **live circular minimap** with
  police blips, and a **full city map on P**. Title screen, pause menu,
  and a localStorage save with Continue.

## Controls

| Input | Action |
| --- | --- |
| W A S D / arrows | Move on foot · drive |
| Mouse | Orbit camera · aim (pointer lock) |
| E | Talk · enter / steal / exit car · use shop & safehouse · advance dialogue |
| Mouse click | Shoot pistol |
| F | Melee · rob a pedestrian |
| Space | Handbrake drift |
| R | Cycle radio (in a car) · reload (on foot) |
| P | Full city map |
| M | Mute |
| Esc | Pause · close menus |

## Running it

Serve the `game/` folder with any static file server and open `index.html`
in desktop Chrome. A tiny development server is included:

```
node serve.ts            # http://localhost:8080
node serve.ts --port 8099
```

The hand-in program copies `game/` and `screenshots/` to the output
directory and writes the dossier:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How it is built

Plain classic scripts under `game/src/`, one job each, plus three.js r128
vendored as a single minified file. Static city geometry is merged into a
handful of vertex-coloured meshes (whole city: ~110 draw calls), cars are
one merged body + one merged lamp mesh + two axle meshes, and the seeded
city generator (seed 7) produces exactly 205 buildings and 648
streetlights. The frame delta is clamped both ways, headlight cones are
fog-free and near-transparent, and every gameplay spot — mission drops,
shops, safehouses — sits on open ground or road, never inside a collider.

Screenshots in `screenshots/` are real renders of this code, posed through
the deterministic `?shot=` scenes described in `shots.json` (seed 7) and
captured headlessly at 1280×720.
