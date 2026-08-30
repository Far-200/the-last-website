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

// --- The way in -------------------------------------------------------
// Memories is reached by walking down a service stair from the Graveyard
// (see GraveyardExit.jsx and exitLayout.js). Nothing about the room below
// changes; what changes is that the scene now begins part-way down the
// LAST flight of that same stair instead of resolving out of a warm
// overlay, so the descent the visitor started in the previous scene
// simply continues across the React mount swap.
//
// These numbers are not free-hand. They are chosen so the incoming frame
// is dimensionally the same shot as the outgoing one:
//
//   shaft interior width   4.0 units, both sides
//   flight pitch           0.5 rise over 0.76 run, both sides
//   soffit clearance       2.9 above the nosing line, both sides
//   camera eye             1.62 above the tread it stands on, both sides
//   lateral clearance      2.0 to each wall, both sides
//   distance to the end    4.9 here against 4.6 there
//   aim                    22.0 degrees below horizontal here, 24.5 there
//
// So the two frames differ by about two degrees of pitch and a quarter of
// a unit of headroom. The half-second overlay that covers the actual
// mount swap is therefore covering a frame that has almost stopped
// changing, rather than hiding a cut between two unrelated shots.
export const STAIR_X = 0.9;
export const STAIR_HALF_W = 2.0;
// Where the flight meets the room's floor. The last tread is at y = 0
// from here on, and the camera walks the remaining flat metre to its
// normal start pose.
export const STAIR_FOOT_Z = 6.0;
export const STAIR_RISE = 0.5;
export const STAIR_RUN = 0.76;
export const STAIR_COUNT = 9;
// The threshold the camera passes under on its way in: the soffit's
// leading edge plus two jamb returns, at the foot of the flight. It sits
// just BEHIND the scene's normal start pose, so none of it is in frame
// once arrival has finished.
//
// Pulled back from 5.6 after measuring the frame at the moment of
// crossing. At 5.6 the camera passed the soffit edge with its eye almost
// exactly level with it, so the underside spanned the full width of the
// frame as one hard horizontal line — a wipe, not a threshold. At 6.2 the
// camera is 0.7 below the edge as it goes under, which is a ceiling
// passing overhead, and the last metre into the room is open above.
export const STAIR_THRESHOLD_Z = 6.2;

// Where the scene actually opens. Standing on the seventh tread (y = 3.5)
// with 1.62 of eye above it, looking 22 degrees down the flight.
export const ARRIVAL_POSE = [STAIR_X, 5.12, 10.94];
export const ARRIVAL_LOOK = [STAIR_X, 1.5, 2.0];
