// src/scenes/Memories/layout.js
//
// The handful of authored positions more than one module in Memories
// needs, kept out of the component files so the camera, the architecture
// and the fragments all read from one definition and cannot drift apart.
// Same reason the Graveyard keeps groundHeight.js separate from its
// callers.

// The scene's only practical light. MemoriesArchitecture builds the lamp
// here and MemoriesScene puts the point light at the same coordinate, so
// the shade, the crate and the surface all cast from the object that
// appears to be lighting them.
export const LAMP_POSITION = [-2.35, 1.02, -1.15];

// The three private fragments, in the order the visitor finds them. Each
// sits low, near the floor, so the camera looks down to find every one
// of them — the deliberate inverse of the Graveyard's upward gaze at the
// CAPTCHA (see MemoriesCamera). All three stay within a few metres of
// each other: this is a corner, not a corridor of islands.
export const MEMORY_POSITION = [-0.95, 0.79, -0.42]; // on the surface, beside the lamp
export const VOICEMAIL_POSITION = [-2.55, 0.05, -2.55]; // low, against the left wall
export const PHOTO_POSITION = [0.85, 0.03, -3.85]; // low, against the back wall — the last one found

// Progress-space boundaries of the camera's four stops (see
// MemoriesCamera's KEYFRAMES, which are indexed in the same order:
// entry, fragment one, fragment two, fragment three). Kept here rather
// than in MemoriesCamera.jsx because Memories.jsx's own narration/stage
// logic needs the same numbers, and a file that exports a component
// cannot also export a plain constant without breaking fast refresh.
export const STOPS = [0, 0.34, 0.64, 0.9];

// The lamp's filament is tired. A very slow, very small variation - about
// four percent over a seven-second period - shared by the bulb mesh
// (MemoriesArchitecture) and the practical light that sits inside it
// (MemoriesScene), so the visible element and the light it casts can
// never drift apart. Each object still ramps its own value; this only
// supplies the curve.
//
// It is deliberately under the threshold of reading as an effect: at four
// percent nobody sees a light "pulsing", they see a light that is still
// working but not well. That is the difference between a lamp that is on
// and a lamp that is holding on. Any larger and it becomes a heartbeat,
// which would be sentimental and game-like at once.
export function lampBreath(t) {
  return 1 + Math.sin(t * 0.9) * 0.028 + Math.sin(t * 0.37 + 1.7) * 0.014;
}
