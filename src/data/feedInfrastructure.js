// src/data/feedInfrastructure.js
//
// Authored placement for FeedInfrastructure — the ruined information layer
// that has colonised the civic nave in FeedArchitecture.jsx. This is
// composition data, not narrative copy: no text, no readable content. The
// existing fragment / secondary / ghost layers still carry every word in
// the scene; everything here is silhouette, mass, and depth.
//
// Coordinates are the same world frame FeedArchitecture exports:
//   floor y 0, eye height 1.75, colonnade centres x +-7.6, bounding
//   walls x +-17, vault underside y 23, route z +12 -> -120, aperture
//   z -186.
//
// Placement is built against FeedCamera's actual WAYPOINTS
// (z 12 / -6 / -26 / -48 / -68 / -92 / -120, lateral drift within roughly
// x -1.8..+1.4) and the authored density bands in feedArchive.js: dense
// through the opening and the -55..-118 saturation stretch, deliberately
// withdrawn from z -119 to the aperture so the closing frames keep their
// negative space. The two tightest primary-fragment gaps (log-session ->
// missing-photo, and missing-photo's own approach) are left bare here too.
//
// `x2 = null` on an overhead run means "spans the whole nave"; a number
// means the run is broken and only reaches that x before its far end has
// fallen. Foreground occluders are overhead runs whose `y` sags into the
// upper-mid frame directly over a waypoint — the camera passes under them.
// None of them descends near eye level or crosses the walking corridor
// (that failure mode is documented at length in FeedArchitecture's
// FOREGROUND_SLABS comment); they crop the TOP of frame, never the path.

// --- Rack / terminal towers ----------------------------------------------
// Stacks of blade slabs in an open frame — the "ruined server column" of
// the kit. `bays` blades, some missing (silhouette damage, not a value
// change). Bolted just inboard of the colonnade or standing free in the
// side aisles that FeedArchitecture leaves as bare black voids. `lean`
// tips the whole stack; `side` is only used for facing.
export const RACK_TOWERS = [
  // Opening — right aisle, first thing the archive layer shows.
  { pos: [9.6, -8], h: 8.5, bays: 9, lean: [0, -0.5, 0.04], missing: [3, 7] },
  { pos: [-10.4, -14], h: 11, bays: 12, lean: [0.02, 0.4, -0.05], missing: [5] },
  // Near-path leaning stack: its mid-section passes a few units off the
  // camera's own x at this z, so a narrow vertical edge crops the left of
  // frame as the camera draws level — foreground without walling the nave.
  { pos: [-4.2, -21], h: 6.8, bays: 7, lean: [0.04, 0.25, 0.12], missing: [2, 6], slim: true },
  // Early video bay — a dense right-aisle cluster echoing feedArchive's
  // "early-video-bay".
  { pos: [9.2, -32], h: 12.5, bays: 13, lean: [0, -0.62, -0.03], missing: [4, 9, 10] },
  { pos: [11.3, -38], h: 9, bays: 9, lean: [0.03, -0.5, 0.06], missing: [1, 5] },
  { pos: [-9.8, -40], h: 14, bays: 15, lean: [0.02, 0.55, -0.04], missing: [7, 12] },
  // Saturation stretch — both aisles, overlapping the colonnade tops.
  { pos: [-10.8, -60], h: 15.5, bays: 16, lean: [0.02, 0.5, -0.06], missing: [3, 8, 13] },
  { pos: [9.4, -66], h: 13, bays: 14, lean: [0, -0.5, 0.05], missing: [6, 11] },
  { pos: [-8.6, -74], h: 10, bays: 10, lean: [0.04, 0.35, 0.05], missing: [4] },
  { pos: [10.6, -82], h: 16.5, bays: 17, lean: [0.02, -0.55, -0.05], missing: [2, 9, 15] },
  { pos: [-11.2, -92], h: 12.5, bays: 13, lean: [0.03, 0.6, -0.04], missing: [5, 10] },
  { pos: [8.8, -100], h: 9.5, bays: 10, lean: [0, -0.45, 0.07], missing: [3, 8] },
  // Withdrawal — a single far stack, already dissolving into haze.
  { pos: [-9.4, -124], h: 11, bays: 11, lean: [0.02, 0.4, -0.05], missing: [4, 9] },
];

// --- Feed pylons -------------------------------------------------------
// Tall narrow masts rising the full height of the nave, with broken
// cross-arms and a shattered panel head. They leave the top of frame
// before they resolve — the vertical scale cue the colonnade alone was
// carrying. Kept in the aisles except one pulled toward the path.
export const PYLONS = [
  { pos: [7.4, -10], h: 17, arms: [6, 11], head: "broken", lean: [0, -0.3, 0.03] },
  { pos: [-6.6, -30], h: 21, arms: [8, 14, 18], head: "half", lean: [0.02, 0.4, -0.04] },
  // Near-path pylon: base off the path, head leaning further off it, so
  // only the shaft mid-height clips the frame edge in passing.
  { pos: [3.6, -46], h: 15, arms: [7, 12], head: "broken", lean: [0, -0.2, -0.14] },
  { pos: [-7.8, -64], h: 24, arms: [9, 15, 20], head: "half", lean: [0.03, 0.5, -0.05] },
  { pos: [7.0, -78], h: 19, arms: [7, 13, 17], head: "broken", lean: [0, -0.4, 0.05] },
  { pos: [-6.8, -104], h: 16, arms: [6, 11], head: "half", lean: [0.02, 0.35, -0.03] },
];

// --- Overhead runs --------------------------------------------------
// Ducts, cable trays and structural beams slung under the vault, lower
// than the y-23 arches so the camera genuinely passes beneath them.
// `sag` bows the mid-span down enough to crop the TOP of frame just
// before the camera goes under it — never near eye level, never across
// the walking corridor. `x2` non-null = the run is snapped and only its
// near half survives, with the broken section hanging toward that side's
// aisle rather than into the centre.
//
// Deliberately only five, spaced unevenly with wide gaps: the nave's
// own vault rhythm still has to read between them, and the first frame
// after arrival stays legible (nothing overhead nearer than z -16). The
// mid-span never dips low enough at x 0 to touch the aperture sightline
// — that bright gap is the route's destination and the Feed->Graveyard
// handoff target and must stay clear the whole way down.
export const OVERHEAD_RUNS = [
  { z: -16, y: 12.5, kind: "tray", sag: 2.4, x2: null },
  { z: -40, y: 11.5, kind: "duct", sag: 2.6, x2: null },
  { z: -60, y: 10.5, kind: "beam", sag: 3.0, x2: null },
  { z: -78, y: 12, kind: "duct", sag: 2.2, x2: -6 },
  { z: -94, y: 11, kind: "beam", sag: 2.4, x2: null },
];

// --- Cable drapes -----------------------------------------------------
// Catenary bundles hung between overhead runs, pylon arms and the wall
// tops. Authored endpoints so the sag lines are reproducible. Thin
// (r <= 0.06) and kept to one side of the nave: every span here stays
// clear of x 0 at its lowest point, so a drape can read as a near-camera
// element on the left OR right of frame without ever crossing the
// aperture sightline down the centre. Four, not six — a cable that spans
// the full width and sags into the middle reads as a barrier, not a
// hanging line.
export const CABLE_DRAPES = [
  { a: [-8.0, 12, -20], b: [-4.6, 8.4, -34], sag: 2.4, r: 0.055 },
  { a: [7.4, 12.5, -38], b: [5.2, 8.0, -54], sag: 2.8, r: 0.06 },
  { a: [-7.2, 11.5, -62], b: [-5.0, 8.6, -78], sag: 2.6, r: 0.055 },
  { a: [8.2, 12, -82], b: [4.8, 7.8, -96], sag: 3.0, r: 0.06 },
];

// --- Conduit lines --------------------------------------------------
// Straight pipe runs along the base of each side aisle, parallel to the
// route. Their length rushes past the moving camera — the aisle-depth
// parallax the bare walls give nothing to. Broken into segments with
// short gaps so they read as damaged, not laid yesterday.
export const CONDUIT_LINES = [
  { x: 12.4, y: 0.5, z1: 6, z2: -30, r: 0.22 },
  { x: 12.8, y: 0.5, z1: -34, z2: -78, r: 0.22 },
  { x: 13.1, y: 0.9, z1: -40, z2: -70, r: 0.16 },
  { x: -12.6, y: 0.5, z1: 2, z2: -44, r: 0.22 },
  { x: -13.0, y: 0.9, z1: -12, z2: -40, r: 0.16 },
  { x: -12.9, y: 0.5, z1: -54, z2: -104, r: 0.22 },
  { x: 12.6, y: 0.5, z1: -86, z2: -122, r: 0.22 },
];

// --- Debris clusters ------------------------------------------------
// Chunky, deterministic rubble heaps — the silhouette the flat boxes in
// FeedArchitecture's RUBBLE_HEAPS could not give. Each `seed` drives a
// fixed spread of angular blocks, half-sunk into the floor (negative y),
// with a low dark skirt plane so the bright floor gets a value break
// where the pile sits. Pulled toward the path in the route's big gaps so
// they crop a lower frame corner in passing.
export const DEBRIS_CLUSTERS = [
  { pos: [3.4, -12], seed: 2110, count: 7, radius: 2.2, scale: 0.9 },
  { pos: [-3.8, -34], seed: 5521, count: 9, radius: 3.0, scale: 1.15 },
  { pos: [4.2, -50], seed: 8842, count: 8, radius: 2.6, scale: 1.0 },
  { pos: [-4.6, -62], seed: 3307, count: 10, radius: 3.4, scale: 1.25 },
  { pos: [3.0, -88], seed: 9163, count: 9, radius: 3.0, scale: 1.1 },
  { pos: [-3.4, -108], seed: 4419, count: 7, radius: 2.4, scale: 0.95 },
  // Larger masses out against the colonnade, backing the aisle towers.
  { pos: [-8.8, -30], seed: 7040, count: 8, radius: 3.6, scale: 1.5 },
  { pos: [9.0, -72], seed: 6612, count: 9, radius: 3.8, scale: 1.6 },
];

// Extra dark floor patches for the bare path stretches the clusters don't
// reach — old burn / fluid pooling. Value change only, irregular rotation
// so no edge lines up with the route, same rule as FeedArchitecture's
// FLOOR_STAINS. These exist because the floor plane is the brightest
// surface in most frames and reads as one flat sheet without them.
export const FLOOR_SCORCH = [
  { pos: [-1.0, 0.02, -24], rot: 0.5, size: [7, 9], color: "#0c100f" },
  { pos: [1.8, 0.02, -52], rot: -0.7, size: [8, 7.5], color: "#101413" },
  { pos: [-2.2, 0.02, -80], rot: 0.25, size: [9, 8], color: "#0e1312" },
  { pos: [1.2, 0.02, -110], rot: -0.35, size: [7.5, 9], color: "#0c100f" },
];

// --- Screen housings ----------------------------------------------
// Physical mounts placed at four primary-fragment positions so those DOM
// cards read as fixed to something — a bezel, a backplate and two legs,
// in the kit's metal vocabulary — instead of floating. Fragment ids, not
// coordinates: FeedInfrastructure reads the positions straight from
// feedFragments so a fragment move can't leave its housing behind. Only
// the low/eye-level fragments get one; the high "glimpsed" fragments
// (upload-stall, reply-interrupted) are left bare on purpose.
export const SCREEN_HOUSING_IDS = ["post-marcus", "chat-cat", "missing-photo", "metadata-drop"];

// --- Distant silhouettes -----------------------------------------
// Ruined server / relay towers beyond the colonnade, between the route's
// end and the aperture. They sit outside the nave walls (|x| >= 11) and
// keep |x| within [-9, 9] entirely empty so the bright destination and
// the leaving-dolly's forward path stay unobstructed.
//
// Contrast comes from WHERE they sit, not from a value: the aperture's
// own fog-exempt pale backdrop plane is ~30 wide and ~46 tall at x 0.
// The bracket group (|x| ~11-15) stands directly in front of that plane,
// so it reads as hard dark verticals against the glow — the strongest
// depth cue the scene gains. The mid group (|x| ~16-26) straddles the
// plane's edge. The far group (|x| >= 30) has only the haze behind it and
// is meant to be sensed rather than seen — mass dissolving into fog as
// the brief asks, not a detailed skyline. As the camera advances down the
// saturation stretch the whole field separates from the haze and looms.
export const DISTANT_TOWERS = [
  // Bracket — against the pale aperture plane, framing the bright gap.
  { pos: [-12.5, -170], w: 3.2, h: 40, taper: 0.5 },
  { pos: [13.2, -176], w: 3.8, h: 52, taper: 0.45 },
  { pos: [-14.5, -150], w: 3.0, h: 30, taper: 0.58 },
  { pos: [12.4, -150], w: 2.8, h: 27, taper: 0.6 },
  // Mid — straddling the plane edge, partial contrast.
  { pos: [-19, -164], w: 5.0, h: 44, taper: 0.5 },
  { pos: [21, -158], w: 4.6, h: 38, taper: 0.52 },
  { pos: [-24, -180], w: 6.5, h: 66, taper: 0.42 },
  { pos: [25, -184], w: 6, h: 58, taper: 0.44 },
  // Far — haze mass only.
  { pos: [-36, -170], w: 10, h: 80, taper: 0.38 },
  { pos: [40, -176], w: 9, h: 70, taper: 0.4 },
  { pos: [-54, -178], w: 14, h: 104, taper: 0.34 },
  { pos: [58, -166], w: 12, h: 82, taper: 0.38 },
];
