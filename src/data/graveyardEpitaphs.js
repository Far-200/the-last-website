// src/data/graveyardEpitaphs.js
//
// The Graveyard's ERA memorials — the second and last body of authored
// copy in the scene, and deliberately a different kind of thing from
// graveyardRelics.js.
//
// graveyardRelics.js buries MOMENTS: twelve dated viral events, 2011 to
// 2022, engraved on ordinary headstones and laid out chronologically
// along the walk with the gap between them shrinking as the visitor
// advances. Those are things that happened.
//
// This file buries ERAS: the infrastructure, habits and small rituals the
// web was actually made of before any of that. They are not events and
// they have no single date, so they are not headstones. Each is a larger
// civic memorial — a plinth carrying a recessed archive plate that is
// still, faintly, lit. The visual argument is the difference between the
// two: the things that lasted a decade get a monument nobody reads any
// more, and the things that lasted a week get a neat row of stones.
//
// They are concentrated in the first two thirds of the route and stop
// well before the CAPTCHA, so the walk moves from eras to moments to a
// machine — which is the scene's whole shape, and is never stated.
//
// COPY RULES (see AGENTS.md section 10). Every line here is meant to be
// flat and specific, the way a real municipal plaque is flat. No poetry,
// no elegy, no thesis. "the plugin was removed" is the entire story of
// Flash and it is also just a fact. Nothing here restates the project's
// closing line, and nothing here is a joke — the CAPTCHA carries the
// scene's only joke and must not have to compete with eight more.
//
// Nothing reproduces real artwork, logos or screenshots. `glyph` selects
// one of the small original pictograms drawn in GraveyardEpitaphs.jsx:
// silhouette and gesture only, in the same spirit as the hero graves'
// engravings.
//
// `position` and `yaw` were solved against a numeric simulation of
// GraveyardCamera's exact math rather than eyeballed, for the same reason
// the hero graves were: this camera looks down its own forward heading
// and never turns sideways, so a memorial's readable moment happens while
// the camera is still well BEFORE it, not level with it. Each position
// below puts its plate 27-43 units from the camera at 20-24 degrees off
// the view axis at that moment — comfortably inside frame, at a distance
// where the title resolves. `yaw` then turns the plate to face the camera
// position at that exact moment, so a memorial is square-on when it is
// legible instead of at whatever angle looked reasonable from above.
//
// `state` controls how much of the plate survived:
//   intact  the whole plate reads
//   faded   the plate reads, the subtext is going
//   lost    the title survives and little else
// Not every memorial should be readable. A cemetery where every stone can
// still be read is a cemetery that is still being maintained.
export const eraMemorials = [
  {
    id: "underconstruction",
    lines: ["UNDER", "CONSTRUCTION"],
    era: "1996 — 2004",
    epitaph: "never finished",
    glyph: "barrier",
    position: [-45.2, -30],
    yaw: 0.477,
    scale: 1.0,
    lean: [0.02, 0.05],
    state: "intact",
  },
  {
    id: "guestbooks",
    lines: ["GUESTBOOKS"],
    era: "1997 — 2006",
    epitaph: "sign before you go",
    glyph: "book",
    position: [-43.6, -56],
    yaw: 0.435,
    scale: 1.06,
    lean: [0.03, -0.04],
    state: "faded",
  },
  {
    id: "dialup",
    lines: ["DIAL-UP"],
    era: "1994 — 2007",
    epitaph: "it made a sound",
    glyph: "modem",
    position: [-19.4, -70],
    yaw: -0.361,
    scale: 0.94,
    lean: [0.04, 0.07],
    state: "intact",
  },
  {
    id: "smallweb",
    lines: ["THE SMALL", "WEB"],
    era: "1994 — 2008",
    epitaph: "everyone had a page",
    glyph: "page",
    position: [-40.8, -100],
    yaw: 0.307,
    scale: 1.12,
    lean: [0.03, 0.04],
    state: "lost",
    broken: true,
  },
  {
    id: "flashgames",
    lines: ["FLASH GAMES"],
    era: "2000 — 2020",
    epitaph: "the plugin was removed",
    glyph: "play",
    position: [-13.0, -132],
    yaw: -0.548,
    scale: 1.0,
    lean: [0.02, -0.03],
    state: "intact",
  },
  {
    id: "forumsigs",
    lines: ["FORUM", "SIGNATURES"],
    era: "1999 — 2010",
    epitaph: "four lines, every post",
    glyph: "signature",
    position: [-31.1, -158],
    yaw: 0.185,
    scale: 0.97,
    lean: [0.05, 0.06],
    state: "faded",
  },
  {
    id: "ragecomics",
    lines: ["RAGE COMICS"],
    era: "2008 — 2013",
    epitaph: "drawn badly on purpose",
    glyph: "panels",
    position: [0.3, -176],
    yaw: -0.605,
    scale: 1.08,
    lean: [0.03, 0.05],
    state: "intact",
  },
  {
    id: "chainemails",
    lines: ["CHAIN EMAILS"],
    era: "1998 — 2008",
    epitaph: "forward to ten people",
    glyph: "envelope",
    position: [-13.2, -236],
    yaw: 0.114,
    scale: 0.92,
    lean: [0.06, -0.05],
    state: "lost",
    broken: true,
  },
];

// Footprint radius each memorial reserves. Both grave layers read this so
// their fields break around these monuments instead of growing through
// them — the same contract the towers and relics already have.
export const ERA_MEMORIAL_CLEARANCE = 6;
