# Horizon Tweaks

> A Windows performance tool that actually does what it says. Built for gamers, streamers, and anyone who wants their PC to stop leaving performance on the table.

## Version 1.5.2 — Blue Edition

Complete rebrand to the blue/white/black theme. Performance optimizations, UI overhaul, and new AI-powered features.

## What's this all about?

Horizon Tweaks is a desktop app (Windows only, sorry) that helps you tune up your PC. Think of it as a control panel for all those Windows settings that are buried 5 menus deep — plus some stuff that Microsoft didn't even give you a switch for.

It's built with **Tauri** (Rust backend) + **React** (frontend), and it communicates with the system through PowerShell scripts and a C++ engine for the heavy lifting.

## What can it actually do?

- **One-click tweaks** — Disable bloat, Game Bar, background apps, power throttling, all that junk
- **Advanced tweaks** — CPU parking, registry edits, network stack tuning, GPU scheduling
- **Debloat** — Nuke unwanted Windows apps (safely, with undo)
- **Network tools** — Bufferbloat test, latency monitor, speed test
- **Game profiles** — Save different performance profiles for different games
- **Rollback** — Snapshots your system state so you can undo anything
- **Benchmarks** — See if your tweaks actually helped
- **Horizon Chat AI** — AI-powered assistant for optimization tips (Ultimate tier)

## Tech Stack

```
React + TypeScript  ← The UI
Tailwind CSS        ← Styling
Vite                ← Build tool
Tauri 2             ← Desktop wrapper (Rust ↔ JS bridge)
Rust                ← Backend commands & system calls
C++ (DLL)           ← Heavy lifting: memory, processes, registry
PowerShell          ← Windows automation scripts
```

## Project layout

```
src-ui/                          # Frontend - React app
├── src/components/              # UI components (one per feature)
├── src/App.tsx                  # Main app with routing
└── src/main.tsx                 # React entry point

src-tauri/                       # Backend - Rust/Tauri
├── src/commands/                # One file per feature (mirrors UI)
├── src/services/                # Business logic
├── src/ffi/                     # Rust ↔ C++ bridge
├── src/lib.rs                   # Registers all commands
├── src/main.rs                  # App entry point
└── tauri.conf.json              # Tauri config

core-engine/                     # C++ DLL for system-level operations
scripts/                         # PowerShell automation scripts
website/                         # Marketing website (Next.js)
```

## Getting started

### Prerequisites
- **Node.js** 18+
- **Rust** (stable)
- **CMake**
- **Visual Studio Build Tools** — "Desktop development with C++" workload
- **Windows 10/11 64-bit**

### Setup

```bash
git clone https://github.com/HBAABA119/Impulse-Optimization.git
cd Impulse-Optimization
npm install
cd src-ui && npm install
cd ..

# Build the C++ engine
cd core-engine && mkdir build && cd build
cmake .. && cmake --build . --config Release
cd ../..
```

### Running

```bash
# UI only (browser, no system features)
npm run dev:ui

# Full desktop app
npm run dev:tauri
```

### Building for release

```bash
npm run build
# Output: src-tauri/target/release/bundle/msi/*.msi
```

---

*Built for people who want their PC to actually use its hardware.*
