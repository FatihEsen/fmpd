<div align="center">

```
██╗   ██╗███╗   ███╗██████╗ ██████╗
╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗
 ╚████╔╝ ██╔████╔██║██████╔╝██║  ██║
  ╚██╔╝  ██║╚██╔╝██║██╔═══╝ ██║  ██║
   ██║   ██║ ╚═╝ ██║██║     ██████╔╝
   ╚═╝   ╚═╝     ╚═╝╚═╝     ╚═════╝
```

# 🌿 ympd — Catppuccin Mocha × Studio Ghibli

**A gorgeous, minimal MPD web client wrapped in the Catppuccin Mocha color palette  
with Studio Ghibli vibes — because your music deserves a beautiful home.**

[![License: MIT](https://img.shields.io/badge/License-MIT-cba6f7?style=for-the-badge&logo=opensource&logoColor=11111b)](LICENSE)
[![C](https://img.shields.io/badge/Backend-C-a6e3a1?style=for-the-badge&logo=c&logoColor=11111b)](src/)
[![MPD](https://img.shields.io/badge/MPD-Compatible-fab387?style=for-the-badge&logo=musicbrainz&logoColor=11111b)](https://www.musicpd.org/)
[![WebSocket](https://img.shields.io/badge/Realtime-WebSocket-89b4fa?style=for-the-badge&logo=socket.io&logoColor=11111b)](src/websocket.c)

</div>

---

## ✨ Highlights

| Feature | Description |
|---|---|
| 🎨 **Catppuccin Mocha** | Full Catppuccin Mocha palette — every pixel lovingly themed |
| 🌿 **Studio Ghibli Vibes** | Warm pastels, smooth gradients, Quicksand font |
| 🎵 **Live Seekbar** | Client-side ticker keeps the progress bar moving smoothly between server updates |
| 📻 **Real-time via WebSocket** | Zero-poll, instant state sync with MPD |
| 🗂️ **Music Library** | Browse your collection by directory, click folders to drill down |
| 🔍 **Search** | Full-text search across your entire MPD database |
| 📋 **Queue Management** | Drag-to-reorder, multi-select, batch delete, batch move |
| ⌨️ **ncmpcpp Keybindings** | Feel right at home if you love the terminal |
| 📱 **Mobile Responsive** | Fixed mini-player footer on mobile, touch-friendly |
| 🔊 **Volume & Seek via Mouse Wheel** | Scroll over the volume or seekbar to control |

---

## 🖼️ Screenshots

> *"Moving a castle is hard. Moving your playlist should not be."*

```
┌─────────────────────────────────────────────────────────────────┐
│  ympd  Ghibli  │  📻 Sıra  │  📁 Kütüphane  │          ⚙️ ❓ +  │
├─────────────────┬───────────────────────────────────────────────┤
│                 │  📻 Çalma Listesi Sırası                       │
│  🌱  Spinning   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━ 2:34 / 4:20       │
│     Vinyl       │                                                │
│     Disk        │  ♫ Song Title          Artist     Album  3:45 │
│                 │  ♫ Song Title          Artist     Album  4:12 │
│  Karalaya       │  ♫ Song Title (active) Artist     Album  2:58 │
│  Kurtuluş Kuş   │  ♫ Song Title          Artist     Album  5:01 │
│  2026 Karma     │                                                │
│  ━━━━━━━━━━━━━  │                                                │
│  ⏮ ⏸ ⏹ ⏭      │                                                │
│  🔊 ━━━━━━ 88% │                                                │
│  ↑ ⏭ ↓ 🗑 🔄 💾 │                                                │
└─────────────────┴───────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ubuntu / Debian
sudo apt install cmake libmpdclient-dev libwebsockets-dev

# Arch Linux
sudo pacman -S cmake libmpdclient libwebsockets

# Fedora
sudo dnf install cmake libmpdclient-devel libwebsockets-devel
```

### Build & Run

```bash
git clone https://github.com/FatihEsen/fmpd.git
cd fmpd

# One-shot build (compiles assets into binary, no runtime file serving needed)
bash build.sh

# Run (defaults to port 8080, connects to MPD on localhost:6600)
./build/ympd

# Custom host/port
./build/ympd --webport 8080 --host 127.0.0.1 --port 6600
```

Open your browser at **http://localhost:8080** 🎉

---

## ⌨️ Keyboard Shortcuts

> Inspired by **ncmpcpp** — muscle memory friendly.

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `n` / `>` | Next track |
| `b` / `<` | Previous track |
| `s` | Stop |
| `z` | Toggle Random |
| `r` | Toggle Repeat |
| `y` | Toggle Single |
| `x` | Toggle Consume |
| `m` | Mute / Unmute |
| `+` / `-` | Volume Up / Down |
| `←` `→` | Seek -5s / +5s |
| `↑` `↓` | Move selected track Up / Down |
| `Shift+K` / `Shift+J` | Batch move Up / Down |
| `d` / `Delete` | Delete selected track(s) |
| `c` | Clear queue |
| `ö` | Queue Next (selected) |
| `/` | Focus search |
| `?` | Show keyboard shortcuts |
| `Enter` | Play selected / Open folder |
| `Escape` | Close sidebar / modals |

---

## 🏗️ Architecture

```
fmpd/
├── src/
│   ├── ympd.c           # Entry point, CLI args, HTTP server
│   ├── mpd_client.c     # MPD protocol handler (libmpdclient)
│   └── websocket.c      # WebSocket server (libwebsockets)
├── htdocs/
│   ├── index.html       # Single-page app shell
│   ├── css/mpd.css      # Catppuccin Mocha + Ghibli theme
│   └── js/
│       ├── mpd.js       # App logic, routing, WebSocket client
│       └── bootstrap-slider.js
├── build.sh             # Builds assets → assets.c → binary
└── CMakeLists.txt
```

The build process embeds all HTML/CSS/JS **directly into the binary** via `mkdata` — no runtime file serving, no web server config, just run and enjoy.

---

## 🎨 Color Palette — Catppuccin Mocha

| Swatch | Name | Hex | Usage |
|---|---|---|---|
| 🟣 | Mauve | `#cba6f7` | Active states, accents, seekbar |
| 🟠 | Peach | `#fab387` | Folder icons, brand title |
| 🟢 | Green | `#a6e3a1` | Music icons, seekbar fill start |
| 🔵 | Blue | `#89b4fa` | Links, info |
| 🩷 | Pink | `#f5c2e7` | Seekbar fill end |
| ⬛ | Base | `#1e1e2e` | Main background |
| ⬛ | Mantle | `#181825` | Header background |
| ⬛ | Crust | `#11111b` | Deepest background |

---

## 📱 Mobile

On screens ≤ 768px, the player collapses into a **fixed footer mini-player** with:
- Seekbar at the top of the card
- Track info (title, artist)
- Playback controls
- Mode toggles (random, repeat, single, consume, love)
- Batch action toolbar (move up/down, queue next, delete, clear, save)

---

## 🔧 Build Script

`build.sh` does everything in one shot:

```bash
bash build.sh
# → Runs CMake
# → Compiles mkdata (asset embedder)
# → Runs mkdata to generate assets.c from htdocs/
# → Compiles ympd with assets baked in
# → Output: build/ympd
```

---

## 📄 License

MIT — do whatever you want, just keep the vibes good. 🌿

---

<div align="center">

*Built with 🌿 and too much coffee.*  
*Powered by [MPD](https://www.musicpd.org/) · Themed with [Catppuccin](https://catppuccin.com/) · Vibes from [Studio Ghibli](https://www.ghibli.jp/)*

</div>
