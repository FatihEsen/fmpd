# fmpd - YouTube Music Inspired MPD Web Client

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/FatihEsen/fmpd)
[![License](https://img.shields.io/badge/license-GPL--2.0-blue.svg)](LICENSE)

**fmpd** (fork of ympd) is a lightweight, high-performance Standalone MPD Web GUI written in C using WebSockets, libmpdclient, and a modern **YouTube Music** dark interface.

---

## ✨ Features & Enhancements

- 🎵 **YouTube Music UI/UX**: Dark mode styling (`#030303`), YouTube Red (`#ff0000`) accents, glassmorphic backdrop blurs (`backdrop-filter`), and sleek responsive layout.
- ⚡ **C Backend WebSocket `move_next`**: Native C backend WebSocket handler (`MPD_API_MOVE_NEXT` in `src/mpd_client.c`) that directly invokes `mpd_run_move_id()` to place songs right after the playing track.
- ☑️ **Multi-Select Checkboxes**: Select multiple tracks in the queue via checkboxes to batch "Queue Next" (`Ö` key) or remove them.
- 📊 **Live Equalizer Wave Animation**: Animated CSS 3-bar equalizer on the currently playing track.
- 📱 **100% Responsive Design**: Off-canvas drawer sidebar on Mobile (< 768px), compact icon sidebar on Tablet (768-991px), and centered wide-screen margins on Desktop (> 1200px).
- 🎛️ **Ingenious Touch & Wheel Sliders**:
  - Expanded 24px hit box for effortless finger and mouse scrubbing.
  - Hover scaling thumb knob ball for precise visual feedback.
  - Mouse wheel scrolling on volume bar to adjust volume (`+/- 5%`).
  - Mouse wheel scrolling on progress bar to seek (`+/- 5s`).
- ⌨️ **Keyboard-First Shortcuts**:
  - `J` / `K` or `↓` / `↑`: Navigate queue items.
  - `Enter`: Play selected track.
  - `Ö`: Queue Next (move track right after current song).
  - `D` / `Delete`: Remove track from queue.
  - `/`: Focus search pill.
  - `Space`: Play / Pause toggle.
  - `+` / `-`: Volume up / down.
  - `M`: Toggle Mute / Unmute.
  - `←` / `→`: Seek backward / forward 5s.
  - `?`: Open keyboard shortcuts help modal.

---

## 🛠️ Build & Installation (Linux)

### Dependencies
- `libmpdclient 2`
- `cmake 3.5+`
- `make` / `gcc` or `clang`

### Quick Build Script
```bash
git clone https://github.com/FatihEsen/fmpd.git
cd fmpd
chmod +x build.sh
./build.sh
```

### Running
```bash
./build/ympd -h 127.0.0.1 -p 6600 -w 8080
```
Open your browser at: **`http://localhost:8080`**

---

## 📱 Termux (Android) Installation Guide

To run **fmpd** directly on your Android phone using **Termux**:

1. **Install Dependencies**:
   ```bash
   pkg update && pkg upgrade -y
   pkg install git cmake make clang libmpdclient mpd -y
   ```

2. **Clone & Build**:
   ```bash
   git clone https://github.FatihEsen/fmpd.git
   cd fmpd
   chmod +x build.sh
   ./build.sh
   ```

3. **Start MPD & fmpd**:
   ```bash
   mpd
   ./build/ympd -h 127.0.0.1 -p 6600 -w 8080
   ```

4. **Access in Mobile Browser**:
   Open Chrome / Firefox on your phone and go to:
   👉 **`http://localhost:8080`**

---

## ⚙️ Command Line Options

```
Usage: ./ympd [OPTION]...

 -h, --host <host>             connect to mpd at host [localhost]
 -p, --port <port>             connect to mpd at port [6600]
 -w, --webport [ip:]<port>     listen interface/port for webserver [8080]
 -u, --user <username>         drop privileges to user after socket bind
 -V, --version                 get version
 --help                        this help
```

---

## 📜 License

GPL-2.0 License. Original ympd project by <andy@ndyk.de>. Customized & enhanced by Fatih Esen.
