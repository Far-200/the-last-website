# Credits

This file tracks every externally sourced media asset used by **The Last Website**, and the original media authored for it.

Environments, architecture, debris, terminals, screen content and all narrative copy are authored in the project itself — procedural geometry built in React Three Fiber / Three.js, plus the one modelled asset listed below. Third-party npm packages are not art assets and are not itemised here; see [`package.json`](../package.json).

---

## Music

**“Melancholic” — Monume**

- Source: [Pixabay](https://pixabay.com/music/instrumental-melancholic-547924/)
- License: [Pixabay Content License](https://pixabay.com/service/license-summary/)
- Published: June 20, 2026
- Used as: the continuous background soundtrack for the whole experience
- Local file: `public/audio/the-last-website-theme.mp3`

Pixabay lists this track as free to use under the Pixabay Content License. Attribution is not required by that license; the creator is credited here anyway. The track is marked **Content ID Registered** on Pixabay.

The track remains the work of its creator. It is used under the license above and is not owned by this project.

---

## Original Project Assets

### Grave Marker Kit

- Original six-piece grave-marker kit, modelled in Blender specifically for The Last Website
- Not a downloaded or third-party model
- Exported as `public/models/graveyard/grave_marker_kit_01.glb`
- Used as: the headstone geometry populating the Graveyard's cemetery field

The six meshes (`GEO_Grave_Slab_A`, `GEO_Grave_Slab_B`, `GEO_Grave_Block_A`, `GEO_Grave_Fragment_A`, `GEO_Grave_Thin_A`, `GEO_Grave_Hero_A`) are instanced and placed procedurally; see `src/scenes/Graveyard/GraveMarkerField.jsx`.

---

## Fonts

No font files are bundled. All type uses OS-installed system stacks declared in `src/scenes/Prelude/prelude.css`; nothing is fetched from a font service.

---

## Software

Built with React, Vite, Three.js, React Three Fiber, Drei and GSAP, each under its own open-source license. The authoritative list of dependencies and versions is [`package.json`](../package.json).
