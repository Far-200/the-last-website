// src/scenes/Graveyard/exitLayout.js
//
// The Graveyard's service exit — the concealed maintenance stair beside
// the CAPTCHA monument — expressed as plain coordinates so that the five
// modules which have to agree about it cannot drift apart:
//
//   GraveyardExit.jsx          builds the doorway, the stair and its light
//   GraveyardCamera.jsx        drives the authored exit route through it
//   GraveyardArchitecture.jsx  carves the ground open above the shaft
//   GraveMarkerField.jsx       keeps grave markers out of the excavation
//   GraveyardMemorials.jsx     same, for the filler rows
//
// Same reason groundHeight.js and Memories' layout.js exist. A component
// module cannot also export plain constants without breaking fast
// refresh, so the numbers live here.
//
// Siting, measured off the render
// -------------------------------
// The entrance is NOT on the route and NOT in front of the monument. From
// GraveyardCamera's closing pose (about (8, 1.5, -252), aimed at
// (21, 21.5, -320)) the doorway sits about 23 degrees to the LEFT and 12
// degrees below the optical axis, at 23.5 units. The monument itself
// spans from 6 degrees left to 21 degrees right of that aim, so the two
// never overlap; the retaining wall's near end stops about 7 degrees
// clear of the monument's left edge and its far end runs out through the
// left frame edge.
//
// Two earlier sitings were rejected against actual frames:
//
//   * Against the monument's own plinth, 55 units away. The approach
//     became a twenty-second march.
//   * At 17 units, as a free-standing concrete head with a roof. In the
//     render it read as a lit shed sitting in the cemetery: a box with
//     its own roofline, 30 degrees wide and with its top edge only 2
//     degrees below frame centre, competing with the monument instead of
//     being glimpsed beside it.
//
// What is built now is a low RETAINING WALL with a door in it, banked
// into the ground at both ends, holding back an open cut that the stair
// descends through. At 23.5 units its top sits 9.5 degrees below the
// optical axis — bottom-left of frame, under the horizon, with no
// roofline. The thing the eye actually catches is not the structure at
// all; it is a 0.07-unit seam of light at the edge of a door.
//
// Grid alignment
// --------------
// GRAVEYARD GROUND IS A 1400-UNIT PLANE AT 220 SEGMENTS, so its quads are
// 6.3636 units and their boundaries fall at x = 0 / 6.36 / 12.73... and
// z = -274.55 / -280.91 / -287.27... The shaft below is only visible if
// those quads are removed, and the numbers here are chosen so the removed
// block is exactly two quads deep and one quad wide and the apron above
// covers its ragged edge completely. If GROUND_SEGMENTS ever changes,
// re-check EXIT_GROUND_HOLE against the new spacing.

import * as THREE from "three";

// --- Siting -----------------------------------------------------------
export const EXIT_X = 3; // shaft centreline
export const EXIT_THRESHOLD_Z = -275; // the plane of the door
// Top of the poured apron and of the landing inside it. The surrounding
// terrain here runs -0.05 to 0.40 (measured off groundHeightAt), so this
// stands about half a unit proud on its low side and is level with the
// ground on its high side — a poured pad in settled earth.
export const EXIT_Y = 0.42;

// --- Shaft ------------------------------------------------------------
export const SHAFT_HALF_W = 2.0; // interior half width
export const WALL_T = 0.5;
export const SHAFT_BACK_Z = -286.7;

// A service door, not an entrance: 2.6 wide by 3.4 high, which at the
// closing camera's distance subtends under nine degrees.
export const DOOR_W = 2.6;
export const DOOR_H = 3.4;

// A utility flight, not a civic stair: 32 degrees, which is steep enough
// to read as back-of-house and shallow enough that the camera can descend
// it without the frame tipping.
export const LANDING_DEPTH = 0.9;
export const STEP_RISE = 0.5;
export const STEP_RUN = 0.76;
export const STEP_COUNT = 13;

// How far the door swings. Just past 90 degrees, so the open slab stands
// proud of the wall on the hinge side and sweeps close past the camera as
// it walks in — near-field occlusion the transition gets for free.
export const DOOR_OPEN_ANGLE = -1.62;

// --- Ground carve -----------------------------------------------------
// A ground face is dropped when its centroid falls inside this rect. With
// the current tessellation that removes exactly the quads spanning
// x [0, 6.36] and z [-287.27, -274.55] — see the header.
export const EXIT_GROUND_HOLE = { x0: 0.2, x1: 5.8, z0: -286, z1: -276 };
// Belt and braces for a finer ground: any face with a vertex strictly
// inside the shaft's own footprint also goes. At 220 segments no vertex
// qualifies, so this changes nothing today.
export const EXIT_SHAFT_RECT = { x0: 0.5, x1: 5.5, z0: -286.7, z1: -275 };

// --- Keep-out for the two grave layers --------------------------------
// The excavation cleared the ground it stands on. Wide enough to cover
// the apron and the retaining wall's buried ends with margin.
export const EXIT_OBSTACLE = { x: 3, z: -280, r: 12 };
// The ruined archive mouth the visitor walks out through at the start of
// the route — see GraveyardThreshold.jsx for why it sits there rather
// than back along the arrival path.
export const ARCHIVE_MOUTH_OBSTACLE = { x: -28, z: 4, r: 15 };

// --- The authored exit route ------------------------------------------
// Positions and look targets only. GraveyardCamera owns every write to
// the actual camera; GSAP only advances the plain 0-1 progress value that
// indexes into this. See GraveyardCamera's exit branch for the easing.
//
// Orientation is authored as carefully as position: the camera does not
// follow a tangent. It turns from the failed CAPTCHA onto the doorway,
// holds the doorway through the whole approach (so the door grows in a
// fixed part of the frame instead of swimming), then drops onto the
// flight in two stages.
export const EXIT_TURN_END = 0.16; // notice: rotation only, no travel
export const EXIT_WALK_END = 0.6; // approach ends just outside the door

// Eye heights: 1.62 above whatever the camera is standing on, a little
// lower than the field's 1.8, which is the scale shift into the human
// space below starting early.
export const EXIT_EYE = 1.62;
// Where the approach stops, seven units short of the door rather than
// four. At four the 2.6-wide opening already subtended thirty-six degrees
// and filled most of the frame, so the beat that should read as standing
// outside a doorway read as already being inside a corridor. At seven the
// opening is twenty-one degrees wide, with the wall, the swung-back slab
// and the ground still around it.
export const EXIT_APPROACH_POSE = [EXIT_X, 1.76, -268];
export const EXIT_THRESHOLD_POSE = [EXIT_X, EXIT_Y + EXIT_EYE, -275.9];
export const EXIT_DESCENT_POSE = [EXIT_X, -2.49, -282.6];

// The only fixed look target the exit uses. Everything after the doorway
// is aimed by heading rather than at a point — see GraveyardCamera's note
// on EXIT_LOOK_STAIR_START for the measurement that forced that.
export const EXIT_DOOR_LOOK = [EXIT_X, EXIT_Y + 1.5, EXIT_THRESHOLD_Z];

// --- Atmosphere handoff -----------------------------------------------
// How far the scene has "gone underground". Zero until the camera is at
// the doorway, one by the time it is well down the flight — at which
// point the fog colour, the fog distances and the general lights have all
// arrived at the enclosed warm dark Memories mounts in, because the
// camera is physically inside a small enclosed volume and there is no
// longer a sky or a field to render.
export function exitSink(e) {
  return THREE.MathUtils.smoothstep(e, 0.58, 0.95);
}

// The value the Graveyard's fog, backdrop and leave overlay all resolve
// to, and the value Memories mounts at. Must stay identical to
// MemoriesScene's WARM_DARK, `.memories-root`'s background and
// `.graveyard-leave-overlay`'s background.
export const UNDERGROUND_DARK = "#0b0806";

// The one warm colour in this transition. Carried over unchanged from the
// scene's earlier warm cue so the first warmth in the whole experience
// keeps the hue it always had; it is now leaking from behind a door
// instead of glowing on the ground.
export const EXIT_AMBER = "#c98a4b";
