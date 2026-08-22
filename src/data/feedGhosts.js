// src/data/feedGhosts.js
//
// Tertiary environmental evidence for The Feed — traces of other, less
// complete material scattered in the gaps between the eight primary
// recovered fragments (see feedFragments.js). These are deliberately NOT
// cards: no panel, no border, just bare, barely-legible text capped well
// under a primary fragment's visual weight by useDepthFade's maxOpacity
// ceiling (see FeedGhostTraces.jsx). Their job is to make the empty
// stretches of the nave feel like they used to hold more than what
// survived intact — not to be read closely, and never to compete with
// the one thing in frame that actually is fully recoverable.
//
// Content is terse machine/log residue in the same voice as the existing
// dim/log-kind fragments, and never restates the Prelude's "THE INTERNET
// IS GONE" — that beat is already spent. Six traces across ~130 units,
// concentrated in the largest gaps between primary fragments (the ~22u
// gap after the hero, the ~18u gaps mid-route, and the ~25u gap before
// the closing fragment) rather than spread evenly — the two tightest
// gaps in the route (log-session to missing-photo, missing-photo's
// approach) get none, so the field stays irregular rather than metronomic.
export const feedGhosts = [
  {
    id: "ghost-entry",
    position: [2.1, 1.35, -8],
    rotation: [0, -0.5, 0],
    text: "cached copy — source unreachable",
  },
  {
    id: "ghost-cat-echo",
    position: [-2.6, 0.85, -15],
    rotation: [0, 0.6, 0],
    text: "3 replies unavailable",
  },
  {
    id: "ghost-stall-floor",
    position: [-2.2, 0.3, -33],
    rotation: [-0.12, 0.35, 0],
    text: "thumbnail failed to load",
  },
  {
    id: "ghost-corridor",
    position: [3.4, 1.5, -73],
    rotation: [0, -0.6, 0],
    text: "@____.19 · account unavailable",
  },
  {
    id: "ghost-dm-echo",
    position: [-3.6, 2.0, -91],
    rotation: [0, 0.55, 0],
    text: "last seen 2,846 days ago",
  },
  {
    id: "ghost-late",
    position: [2.8, 0.45, -113],
    rotation: [0, -0.45, 0],
    text: "03:1_:__ — checksum failed",
  },
];
