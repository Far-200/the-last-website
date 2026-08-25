// src/data/graveyardRelics.js
//
// Authored placement for the Graveyard's individually-recognizable hero
// memorials — the dead internet phenomena the visitor can actually name if
// they pass close enough. Rendered by GraveyardMemorials.jsx, which also
// generates the anonymous instanced filler field around these.
//
// Ordering is chronological by real-world date, and that ordering is
// carried entirely through `position`: earlier phenomena sit close to the
// route's start (low |z|), later ones sit deep toward the CAPTCHA approach
// (high |z|), with the gap between consecutive graves shrinking as z grows
// more negative. That shrinking gap is the whole "internet culture
// accelerated" idea — it is never stated, only walked through.
//
// Positions here are NOT simply "a lateral offset from the centreline at
// this grave's own z" the way an early pass authored them, because that
// mental model is wrong for this camera: GraveyardCamera always looks
// down its OWN forward heading (tangent-then-converging-on-the-monument),
// never sideways at whatever is level with it. A grave standing exactly
// beside the camera's position on the route sits at roughly 90 degrees
// off the view axis at that exact moment — behind the frustum, not in
// it — and the camera never turns to look at it. What actually determines
// whether a grave reads as a large, close shape is the closest approach
// the camera makes to it WHILE it's still inside the forward viewing
// cone, which happens while the camera is still some distance BEFORE that
// z, not when the camera is level with it. Every position below was
// solved against a numeric simulation of GraveyardCamera's exact math
// (position, tangent, convergence) to find, for a target depth and a
// lateral offset, the true closest-while-in-frame distance — not
// eyeballed.
//
// A second pass then snapped every offset onto ROW_BANDS in
// GraveyardMemorials.jsx (row1 centred ~9-9.5, row2 centred ~18-20) rather
// than leaving each one at its own bespoke distance, so a hero grave sits
// IN one of the same rows the anonymous filler field builds, not floating
// between them. Ten of twelve landed in row1 (the near, most legible
// band); fidgetspinner and wordle sit in row2. `offset` is kept as
// authored metadata (signed lateral distance from routeXAt(z) at this
// grave's own z) purely for readability of the table; it is not read at
// render time.
//
// `lean` is a [x, z] tilt in radians, following the same convention as
// TOWERS/FALLEN in GraveyardArchitecture.jsx — small for most graves, much
// larger for the two authored as collapsed (mannequin, amongus). Yaw is
// deliberately NOT authored here: GraveyardMemorials computes it from each
// grave's own position so the engraved face turns toward the route instead
// of an arbitrary hand-picked angle, the same way a real roadside marker
// faces the road it sits beside rather than a random compass heading.
//
// `archetype` selects one of the four marker bodies built in
// GraveyardMemorials.jsx (tablet / round / obelisk / fractured).
// `symbol` selects one of the small original line-art engravings drawn
// into that grave's CanvasTexture — silhouette and gesture only, never a
// reproduction of any real photo, logo or screenshot.
export const heroMemorials = [
  {
    id: "planking",
    label: "PLANKING",
    year: "2011",
    archetype: "tablet",
    symbol: "plank",
    position: [-38.0, -8],
    offset: -9,
    lean: [0.02, 0.05],
    scale: 1.35,
  },
  {
    id: "vine",
    label: "VINE",
    year: "2013–2017",
    archetype: "fractured",
    symbol: "loop",
    position: [-22.2, -50],
    offset: 9,
    lean: [0.05, -0.06],
    scale: 1.1,
  },
  {
    id: "harlemshake",
    label: "HARLEM SHAKE",
    year: "2013",
    archetype: "round",
    symbol: "fragments",
    position: [-21.6, -78],
    offset: 9,
    lean: [0.03, -0.04],
    scale: 1.15,
  },
  {
    id: "icebucket",
    label: "ICE BUCKET CHALLENGE",
    year: "2014",
    archetype: "obelisk",
    symbol: "bucket",
    position: [-36.1, -112],
    offset: -9,
    lean: [0.04, 0.06],
    scale: 1.15,
  },
  {
    id: "thedress",
    label: "THE DRESS",
    year: "2015",
    archetype: "tablet",
    symbol: "dress",
    position: [-15.4, -138],
    offset: 9,
    lean: [0.02, 0.03],
    scale: 1.0,
  },
  {
    id: "bottleflip",
    label: "BOTTLE FLIP",
    year: "2016",
    archetype: "obelisk",
    symbol: "bottle",
    position: [-10.6, -160],
    offset: 9,
    lean: [0.06, 0.28],
    scale: 1.05,
  },
  {
    id: "mannequin",
    label: "MANNEQUIN CHALLENGE",
    year: "2016",
    archetype: "fractured",
    symbol: "frozen",
    position: [-23.8, -180],
    offset: -9,
    lean: [0.4, 0.15],
    scale: 1.15,
  },
  {
    id: "fidgetspinner",
    label: "FIDGET SPINNER",
    year: "2017",
    archetype: "round",
    symbol: "spinner",
    position: [8.1, -198],
    offset: 18.5,
    lean: [0.02, 0.03],
    scale: 1.0,
  },
  {
    id: "yannylaurel",
    label: "YANNY / LAUREL",
    year: "2018",
    archetype: "fractured",
    symbol: "waveform",
    position: [-15.5, -214],
    offset: -9,
    lean: [0.03, -0.05],
    scale: 1.0,
  },
  {
    id: "area51",
    label: "AREA 51 RAID",
    year: "2019",
    archetype: "tablet",
    symbol: "alien",
    position: [-11.1, -226],
    offset: -9,
    lean: [0.02, 0.04],
    scale: 1.05,
  },
  {
    id: "amongus",
    label: "AMONG US",
    year: "2020",
    archetype: "tablet",
    symbol: "bean",
    position: [-1.0, -252],
    offset: -9,
    lean: [0.45, -0.1],
    scale: 1.0,
  },
  {
    id: "wordle",
    label: "WORDLE",
    year: "2022",
    archetype: "fractured",
    symbol: "grid",
    position: [-10.5, -282],
    offset: -18.5,
    lean: [0.03, 0.05],
    scale: 0.9,
  },
];
