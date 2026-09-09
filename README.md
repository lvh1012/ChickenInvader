# Doodle Sky Defenders

A complete, responsive vertical arcade shooter rendered as ballpoint-pen doodles on notebook paper. The game is original and uses no copyrighted Chicken Invaders assets, characters, logos, or audio.

## Run locally

```bash
npm install
npm run dev
```

Production build and tests:

```bash
npm test
npm run build
```

The static output is written to `dist/` and can be deployed to Cloudflare Pages or any static host. Use `npm run build` as the build command and `dist` as the output directory.

## Controls

- Desktop: Arrow keys or WASD to move, hold Space to fire, P/Escape to pause.
- Touch: Drag the ship; auto-fire is active while dragging. The target is offset above the finger so the ship remains visible.
- The pause button stays inside the safe area on touch devices.

## Architecture

- `core/`: state machine, game loop, input, procedural Web Audio, defensive persistence.
- `entities/`: compact data-oriented entity types.
- `systems/`: wave spawning, pooled particles, spatial-grid collision broad phase.
- `rendering/`: Canvas-only doodle renderer and cached paper texture.
- `config/`: balance, quality presets, and validated color tokens.
- `utils/`: allocation-light pool and math helpers.

Simulation uses a delta-time update clamped to 50 ms. The Canvas has a fixed logical resolution of 900×1600 and is scaled with preserved aspect ratio. Its backing store is DPR-aware and capped at 2× to avoid excessive GPU/memory cost. Portrait is the primary composition; landscape is supported with compact HUD placement and letterboxing.

## Gameplay

- Five repeating formation families: rows, zig-zag, sine, V, and arc.
- Scout, armored, and diving enemies with progressive movement and firing pressure.
- A multi-pattern boss every fifth wave: radial volleys with a dodge gap, aimed fans, spiral ink eggs, and summoned minions.
- Weapon spread, rapid-fire, and shield power-ups.
- Score, hull, wave, weapon, boss health, pause/restart, game over, best score, and settings.
- Keyboard and touch play from start through Game Over.

## Performance and defensive behavior

- Fixed-size object pools for both projectile groups and particles.
- Spatial-grid broad phase avoids all-projectile × all-enemy brute force checks.
- Static paper texture is generated once; doodle geometry stays deterministic.
- Offscreen projectile culling and capped particles.
- Auto quality starts from device/pixel cost and steps down after sustained low FPS without changing gameplay.
- `?debug=1` displays FPS, frame time, active objects, pool use, and quality.
- Safe `localStorage`, optional `AudioContext`, blur/input reset, tab auto-pause, touch-cancel handling, resize/orientation handling, and Canvas-context failure reporting.

## Accessibility

Menus use native buttons/dialog controls, visible keyboard focus, live status regions, labels, symbols in addition to color, and 44+ px touch targets. Low hull adds a warning glyph, shape/text treatment, and controlled pulse. `prefers-reduced-motion` and the in-game Reduced Effects setting limit motion.

### WCAG AA palette on `#F7F0DF`

| Foreground | Hex | Contrast | WCAG AA normal text |
|---|---:|---:|---:|
| Primary ink | `#17263D` | 13.38:1 | Pass |
| Secondary ink | `#315475` | 7.0:1 | Pass |
| Cyan ink | `#12566D` | 7.17:1 | Pass |
| Danger | `#8C2525` | 7.68:1 | Pass |
| Warning | `#814000` | 6.93:1 | Pass |
| Success | `#176044` | 6.62:1 | Pass |
| Purple | `#62417A` | 7.23:1 | Pass |

Ratios are verified in `test/colors.test.mjs` using the WCAG relative luminance formula.

## Verification matrix

The layout is designed against 320×568, 360×800, 390×844, 412×915, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080, and 2560×1440 viewports. The renderer accepts DPR 1, 1.5, 2, and 3 while capping the effective backing DPR at 2.

Stress targets are bounded by 180 player shots, 220 enemy shots, and 300 particles. Boss patterns can exercise 100+ projectiles; regular waves scale up to 36 formation enemies plus summoned minions.

## Trade-offs

- Procedural Web Audio keeps the project original and small, but is deliberately simpler than mastered audio assets.
- The fixed portrait logical world provides consistent enemy spacing and hitboxes across devices; wide screens use letterboxing instead of expanding the combat field.
- Automated tests cover deterministic utilities and palette contrast. Browser input, Canvas rendering, and performance remain best validated with a real-device smoke test.
