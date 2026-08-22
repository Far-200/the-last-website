// src/data/feedFragments.js
//
// Content and placement for The Feed's archive fragments. Kept as plain
// data (not inline JSX) so copy edits and spatial tuning don't touch
// scene code. Ordinary, restrained material — the Feed's emotional job is
// recognition, not poetry. `reconstructable: true` marks the single
// fragment wired to the discrete reconstruction interaction.
//
// `width` replaces the old `scale`
// --------------------------------
// `scale` was inverted and quietly did the opposite of what it claimed.
// FeedFragment derived `distanceFactor = 9 / scale`, and a transform-mapped
// `<Html>` has world width `cssPx * distanceFactor / 400` — so a HIGHER
// `scale` produced a physically SMALLER card. The authored "hero" at
// scale 2 was 2.48 units wide while the "peripheral" fragment at scale
// 0.9 was 5.5 units: more than twice as large. The hierarchy was
// backwards and only camera distance was doing any work, which is a large
// part of why the field read as an undifferentiated pile.
//
// Fragments now carry `width` in world units directly. 3.5 is roughly a
// door-sized panel in this nave; 2.2 is a small screen; 4 crops the frame
// when the camera passes close.
//
// Placement is relative to the architecture in FeedArchitecture.jsx —
// floor at y 0, camera eye at 1.75, colonnade at x +-7.6, bounding walls
// at x +-17, vault at y 23, route running z +12 to -120. Fragments are
// placed against columns, in the aisles beyond the colonnade, propped on
// the floor and high under the vault, so the columns cross in front of
// them as the camera moves and they read as things left in a building
// rather than cards in a void. Eight fragments across 130 units is
// deliberately sparse: the archive is mostly empty.
//
// Lateral placement is bounded by the frustum, not by taste. At fov 52 on
// a 16:9 frame the horizontal half-angle gives tan ~= 0.78, so a fragment
// sitting X units to the side of the path only enters frame once it is
// X / 0.78 units ahead. Two fragments in the first pass sat 10 and 12.6
// units off-axis, which put them off-frame until they were already too
// far away to read, and then swept them out of shot as the camera closed.
// Nothing here is further than ~9 units off the path.

export const feedFragments = [
  {
    // HERO — the first thing encountered, just off the worn path at
    // standing height, close enough to crop the frame as the camera
    // draws level with it.
    id: "post-marcus",
    kind: "post",
    position: [-4.2, 2.0, -4],
    rotation: [0, 0.42, -0.03],
    width: 3.6,
    content: {
      handle: "@marcus_t",
      timestamp: "3:41 AM",
      body: "just got back, nobody's up",
    },
  },
  {
    // Just inboard of the right colonnade, turned back into the nave.
    // Near enough to the path to be read on approach, with the columns
    // ahead of it crossing in front as the camera closes.
    id: "chat-cat",
    kind: "chat",
    position: [5.4, 2.5, -26],
    rotation: [0, -0.5, 0.02],
    width: 3.0,
    content: {
      title: "GROUP CHAT",
      lines: ["did you feed the cat", "yeah", "ok good"],
    },
  },
  {
    // Up on the ruin, above the collapsed right column at z -41 — high
    // enough to leave frame as the camera draws level, so it is glimpsed
    // rather than approached.
    // Its dying-display glow is the one light in the scene with a visible
    // physical source, and it now lands on the stump and the floor below.
    id: "upload-stall",
    kind: "upload",
    position: [-5.8, 6.4, -44],
    rotation: [0.2, 0.5, 0],
    width: 3.6,
    screenGlow: true,
    content: {
      filename: "beach_trip.mp4",
      percent: "67%",
    },
  },
  {
    // Leaning in the rubble drifted against the left colonnade. Dim, low,
    // half-lost — machine metadata rather than human content.
    id: "log-session",
    kind: "log",
    position: [-5.6, 1.3, -56],
    rotation: [0.08, 0.6, 0.14],
    width: 2.4,
    dim: true,
    content: {
      title: "SESSION LOG",
      lines: [
        "session_id: 88213",
        "last_seen: 2016-11-03 02:14",
        "status: idle (permanent)",
      ],
    },
  },
  {
    // Propped on the floor of the worn path itself, tipped up toward eye
    // level. The visitor walks past it looking down.
    id: "missing-photo",
    kind: "missing",
    position: [2.4, 0.9, -66],
    rotation: [-0.32, -0.4, 0.06],
    width: 2.2,
    content: {
      filename: "photo_042.jpg",
      caption: "dad's new car",
    },
  },
  {
    // In the left aisle just beyond the colonnade, read through the gap
    // where the column at z -86 has fallen.
    id: "reply-interrupted",
    kind: "chat",
    position: [-8.8, 4.6, -84],
    rotation: [0, 0.75, 0.04],
    width: 3.2,
    content: {
      title: "DIRECT MESSAGE",
      lines: ["you still there", "..."],
    },
  },
  {
    // The dimmest of the set — low against the right colonnade, half
    // lost, passed without ever being the subject of the frame.
    id: "metadata-drop",
    kind: "metadata",
    position: [6.2, 1.7, -102],
    rotation: [0, -0.62, -0.02],
    width: 2.4,
    dim: true,
    content: {
      title: "connection_dropped.log",
      fields: [
        { label: "duration", value: "00:04:12" },
        { label: "reason", value: "unknown" },
      ],
    },
  },
  {
    // The closing beat. Placed just past the route's end and off centre,
    // so the camera arrives facing it with the aperture at the end of the
    // nave still visible beside it.
    id: "recovered-ellie",
    kind: "post",
    reconstructable: true,
    position: [-1.9, 2.15, -127.5],
    rotation: [0, 0.2, 0],
    width: 3.4,
    content: {
      handleCorrupted: "@el███.k",
      handleRecovered: "@ellie.k",
      timestampCorrupted: "--:-- --",
      timestampRecovered: "11:52 PM",
      bodyCorrupted: "f██got my ch████r, c██ y██ br██g it t██orrow",
      bodyRecovered: "forgot my charger, can you bring it tomorrow",
    },
  },
];
