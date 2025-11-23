# Dodge the Blocks: Evolved

Dodge the Blocks: Evolved is a browser-based arcade dodger where you weave through falling hazards, chase powerups, and climb an endless level curve. The project is entirely client-side—open the HTML and start evading.

## Features
- **Responsive canvas renderer** with HUD overlays for score, level, combo multiplier, events, powerups, and notifications. 【F:index.html†L15-L83】
- **Enemy variety** including fast, wobbling, tracking, and splitter blocks that modify speed, size, or movement style. 【F:main.js†L226-L279】
- **Powerups** such as shield, magnet, dash, and size shift that modify survival and scoring dynamics. 【F:main.js†L132-L181】【F:main.js†L294-L333】
- **Dynamic difficulty** with level-based scaling, combo tracking, and periodic events (e.g., darkness overlay, meteor banner hooks). 【F:main.js†L352-L523】
- **Achievements and persistence** stored via `localStorage`, plus theme, sound, and particle toggles in the settings menu. 【F:index.html†L47-L73】【F:main.js†L76-L102】【F:main.js†L524-L711】

## Controls
- **Move**: Arrow keys or `A` / `D`; pointer and touch input also supported for direct horizontal movement. 【F:main.js†L160-L173】【F:main.js†L416-L433】
- **Pause / Resume**: `Esc` or `P`. 【F:main.js†L417-L423】
- **Menus**: Click/tap the on-screen buttons to start, open settings, or browse achievements. 【F:index.html†L37-L73】

## Running locally
1. Open `index.html` directly in a modern browser **or** serve the directory with a simple static server, e.g.:
   ```bash
   npx serve .
   ```
2. Make sure audio playback is allowed (browser will initialize the audio context after user interaction).

## Project structure
```
index.html  # Game layout, menus, HUD
style.css   # Themes, layout, overlays, and animations
main.js     # Game engine, entities, input, HUD updates, persistence
```

## Contributing
- Keep new features self-contained in `main.js` with clear separation between entity logic and UI updates.
- Prefer updating HUD elements through existing `this.ui` references in `Game` to maintain consistency.

Enjoy dodging! 
