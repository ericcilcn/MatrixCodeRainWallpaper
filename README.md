# Matrix Code Rain Wallpaper

A lightweight Wallpaper Engine web wallpaper that recreates a Matrix-style code rain scene with local HTML, CSS, JavaScript, and bundled fonts. It renders in real time on a fixed character grid instead of playing a video, so the project stays small and adjustable.

Live preview: [ericcilcn.github.io/MatrixCodeRainWallpaper](https://ericcilcn.github.io/MatrixCodeRainWallpaper/)

## Screenshots

### Matrix rain

![Matrix rain](docs/screenshots/matrix-rain.png)

### Audio spectrum

![Audio spectrum](docs/screenshots/audio-spectrum.png)

### Peak caps only, reversed

![Peak caps only](docs/screenshots/peak-caps-only.png)

## Features

- Real-time Canvas renderer with Matrix-style fixed-grid rain.
- Local bundled fonts, including Matrix Code and a Resurrections-style option.
- Wallpaper Engine user properties for font, clock, rain brightness, character size, spacing, glow, and color.
- Optional dot-matrix clock rendered from code-rain glyph cells.
- Optional audio spectrum layer using Wallpaper Engine audio data.
- Audio modes including frequency gradient, aurora gradient, neon blocks, cool tint, and peak caps only.
- Optional reversed spectrum that grows from the bottom upward.
- Hidden browser control panel for previewing settings with URL parameters.
- No video playback, no `.scr`, no Windows binary dependency.

## Wallpaper Engine Setup

1. Download the release zip.
2. Extract it.
3. In Wallpaper Engine, create or import a web wallpaper from `MatrixCodeRainWallpaper/index.html`.
4. Use the Wallpaper Engine properties panel to adjust the wallpaper.

The audio spectrum requires Wallpaper Engine's desktop audio processing. Normal browsers and GitHub Pages cannot access Wallpaper Engine audio; use the local debug parameters below for browser-only previews.

## Local Preview

From the repository root:

```sh
python3 -m http.server 8765 --directory MatrixCodeRainWallpaper
```

Open:

```text
http://127.0.0.1:8765/index.html
```

Hidden controls and audio simulation:

```text
http://127.0.0.1:8765/index.html?controls=1&debugstate&audio=true&audiodebug=1
```

Example peak-caps-only reversed spectrum:

```text
http://127.0.0.1:8765/index.html?controls=1&debugstate&audio=true&audiodebug=1&audiocolormode=caps_only&audiospectrumreverse=1
```

## Main Settings

- `Rain font`: Matrix Code trilogy or Matrix Resurrections.
- `Clock`: toggles the dot-matrix clock.
- `Audio spectrum`: toggles the audio-responsive visualizer.
- `Audio response`: default `80`, controls spectrum amplitude response.
- `Audio brightness`: controls only the audio spectrum brightness.
- `Audio color`: spectrum color/display preset.
- `Reverse spectrum`: makes the audio spectrum grow from the bottom upward.
- `Character spacing`: controls glyph edge spacing without changing the fixed grid.

## Project Layout

```text
MatrixCodeRainWallpaper/
  assets/fonts/
  index.html
  main.js
  project.json
  style.css
  THIRD_PARTY_NOTICES.md
```

Reference videos, screenshots, extracted screensaver files, and other local analysis assets are intentionally excluded from the wallpaper package.

## Credits

This project includes third-party font assets. See [THIRD_PARTY_NOTICES.md](MatrixCodeRainWallpaper/THIRD_PARTY_NOTICES.md).
