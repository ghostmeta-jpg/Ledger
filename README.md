# 🧾 Ledger Survivors

**The bills are due. You are not.**

A fast, punchy [Vampire-Survivors](https://en.wikipedia.org/wiki/Vampire_Survivors)-style
roguelite where you play a lone office clerk mowing down endless waves of overdue
invoices, audits, and tax collectors. Built in pure HTML5 + canvas — **zero
dependencies to play** — and packaged to ship on **Steam at $7.99**.

![price](https://img.shields.io/badge/price-%247.99-ffcf4d) ![platform](https://img.shields.io/badge/platform-Steam%20%2F%20Web-4dd0ff) ![engine](https://img.shields.io/badge/engine-HTML5%20canvas-7fd17f)

---

## ▶️ Play it right now (no install)

```bash
npm run serve      # serves on http://localhost:8080
```
…or just open `index.html` in any modern browser.

## 🎮 Controls
| Action | Keys |
|--------|------|
| Move   | `W A S D` or arrow keys |
| Attack | automatic — you only dodge |
| Level up | walk over the gold coins enemies drop |

Every few coins you get a **promotion**: pick one of three stacking upgrades.
Survive as long as you can and rack up the kill count.

## ✨ Features
- 4 enemy types that ramp in toughness and speed over time
- 3 auto-firing weapons: **Stapler** (homing shots), **Orbit Coins**, **Audit Pulse** (AoE)
- 9 stackable upgrades — damage, fire rate, projectiles, HP, regen, magnet, speed…
- Particle juice, screen shake, hit flashes, i-frames
- Endless difficulty scaling and a run-summary game-over screen

## 🟥 Roblox spin-off
An original Roblox companion game, **Overdue: Audit Arena**, lives in [`roblox/`](roblox/README.md).

## 🚀 Ship it on Steam ($7.99)
The repo is structured for Steam distribution:

```bash
npm install
npm run dist       # builds a native desktop app (Electron) into ./build
```

- **Store listing** (title, $7.99 price, tags, copy): [`steam/STORE_PAGE.md`](steam/STORE_PAGE.md)
- **Full publishing checklist** (Steam Direct, SteamPipe upload, pricing): [`steam/PUBLISHING.md`](steam/PUBLISHING.md)
- **SteamPipe build script**: [`steam/app_build.vdf`](steam/app_build.vdf)

> ⚠️ **Note:** Actually listing on the Steam store requires a Steamworks partner
> account, the one-time **$100 Steam Direct fee**, and Valve's review — those are
> account/legal steps only you can do. Everything on the engineering side (the
> game, the desktop build, the store metadata, and the $7.99 price config) is
> ready here. See `steam/PUBLISHING.md`. No upfront fee? `itch.io` is a one-click
> alternative, also covered there.

## 📁 Project layout
```
index.html          # entry point
src/game.js         # the entire game engine
src/style.css       # UI / menus
electron/main.js    # desktop wrapper (Steam-ready)
steam/              # store page, publishing guide, build scripts
package.json        # run + build scripts
```

## 📜 License
MIT — see code header. Make it your own.
