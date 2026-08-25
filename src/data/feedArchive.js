// Authored secondary evidence for Feed's population pass.
//
// These are deliberately not primary fragments: none is interactive and
// none uses drei Html. They are physical, texture-bearing remnants placed in
// clusters against piers, rubble and side aisles. The clusters carry the
// route's density rhythm while FeedArchiveField supplies the cheaper implied
// quantity behind them.

export const archiveTextureContent = {
  post: {
    label: "POST CACHE / 2012-08-14",
    lines: ["@quietstairs", "bus is late again", "2 replies  ·  19 views"],
  },
  forum: {
    label: "FORUM / HOME REPAIR",
    lines: ["anyone know why this keeps blinking?", "0 accepted answers", "thread locked  ·  8y ago"],
  },
  video: {
    label: "VIDEO CACHE / 00:42",
    lines: ["preview unavailable", "281 views  ·  uploaded 2015", "audio track incomplete"],
  },
  chat: {
    label: "ROOM 18 / 4 PARTICIPANTS",
    lines: ["no i left it there", "okay", "see you after work"],
  },
  market: {
    label: "LISTING / LOCAL PICKUP",
    lines: ["used desk lamp", "still available?", "listing expired  ·  $12"],
  },
  image: {
    label: "IMG_1184 / ALBUM 06",
    lines: ["image data unavailable", "4 comments  ·  1 share", "original source missing"],
  },
  comments: {
    label: "12 REPLIES / PARTIAL",
    lines: ["@northwindow  i remember this", "@mira_02  same here", "9 replies not recovered"],
  },
  deleted: {
    label: "[ ACCOUNT UNAVAILABLE ]",
    lines: ["posted 2014-06-18", "content removed by author", "cached reactions: 7"],
  },
  node: {
    label: "ARCHIVE NODE 72C",
    lines: ["18,204 records", "integrity 11%", "last sync 03:14:09"],
  },
};

// `kind` changes the physical construction, not just the texture:
// screen = boxed dead display, shard = fractured thin plane, stack = several
// collapsed planes, frame = incomplete video/image shell, strip = clipped
// metadata band. Rotations are fixed world rotations; nothing billboards.
export const feedArchiveClusters = [
  {
    id: "entry-pier",
    remnants: [
      { id: "entry-node", kind: "strip", texture: "node", position: [7.0, 4.8, -7.8], rotation: [0, -0.1, -0.05], size: [2.8, 0.72] },
      { id: "entry-post", kind: "shard", texture: "post", position: [8.8, 2.3, -11.5], rotation: [0.03, -0.72, 0.08], size: [2.7, 1.35] },
      { id: "entry-deleted", kind: "strip", texture: "deleted", position: [-7.0, 6.5, -14.2], rotation: [0, 0.08, 0.03], size: [2.4, 0.62] },
    ],
  },
  {
    id: "early-video-bay",
    remnants: [
      { id: "early-video", kind: "frame", texture: "video", position: [9.4, 4.1, -30.5], rotation: [0.02, -0.78, -0.04], size: [3.8, 2.25] },
      { id: "early-comments", kind: "stack", texture: "comments", position: [6.4, 1.45, -34.8], rotation: [-0.08, -0.5, -0.11], size: [2.6, 1.3] },
      { id: "early-image", kind: "shard", texture: "image", position: [-8.4, 3.0, -37.5], rotation: [0.06, 0.68, 0.05], size: [2.5, 1.65] },
      { id: "early-meta", kind: "strip", texture: "node", position: [7.0, 8.4, -39.5], rotation: [0, -0.06, 0.02], size: [3.1, 0.66] },
    ],
  },
  {
    id: "middle-forum-drift",
    remnants: [
      { id: "middle-forum", kind: "screen", texture: "forum", position: [-8.8, 3.4, -53.5], rotation: [0.02, 0.72, 0.04], size: [3.4, 1.75] },
      { id: "middle-chat", kind: "shard", texture: "chat", position: [-6.4, 1.15, -58.5], rotation: [-0.16, 0.44, 0.13], size: [2.7, 1.4] },
      { id: "middle-market", kind: "stack", texture: "market", position: [8.4, 2.0, -61.5], rotation: [0.02, -0.7, -0.08], size: [3.0, 1.5] },
      { id: "middle-post", kind: "strip", texture: "post", position: [6.9, 6.2, -65.5], rotation: [0, -0.05, 0.04], size: [2.9, 0.68] },
      { id: "middle-deleted", kind: "shard", texture: "deleted", position: [-10.6, 6.8, -67.5], rotation: [-0.02, 0.92, -0.04], size: [2.5, 1.15] },
    ],
  },
  {
    id: "saturated-comment-bay",
    remnants: [
      { id: "dense-comments", kind: "stack", texture: "comments", position: [8.5, 3.2, -78.5], rotation: [0.02, -0.68, 0.05], size: [3.5, 1.75] },
      { id: "dense-video", kind: "frame", texture: "video", position: [-9.6, 5.1, -82.5], rotation: [-0.03, 0.8, 0.02], size: [4.2, 2.35] },
      { id: "dense-chat", kind: "shard", texture: "chat", position: [6.5, 1.15, -86.5], rotation: [-0.13, -0.45, -0.09], size: [2.6, 1.35] },
      { id: "dense-image", kind: "screen", texture: "image", position: [-7.0, 8.6, -89.5], rotation: [0, 0.04, -0.03], size: [3.2, 2.05] },
      { id: "dense-forum", kind: "shard", texture: "forum", position: [10.8, 6.7, -93.5], rotation: [0.01, -0.92, 0.05], size: [3.1, 1.55] },
      { id: "dense-node", kind: "strip", texture: "node", position: [-6.8, 2.15, -97.0], rotation: [0, 0.08, -0.06], size: [3.4, 0.72] },
    ],
  },
  {
    id: "late-pressure",
    remnants: [
      { id: "late-market", kind: "stack", texture: "market", position: [-5.9, 2.0, -109.5], rotation: [0.08, 0.58, 0.09], size: [3.0, 1.5] },
      { id: "late-deleted", kind: "shard", texture: "deleted", position: [5.8, 4.8, -113.0], rotation: [-0.02, -0.58, -0.03], size: [2.8, 1.3] },
      { id: "late-comments", kind: "strip", texture: "comments", position: [-6.1, 7.2, -116.0], rotation: [0, 0.05, 0.02], size: [3.0, 0.7] },
    ],
  },
];

// Density is authored in bands rather than derived from one uniform range.
// The last band deliberately withdraws before ThresholdAtmosphere begins at
// progress .88, leaving only quiet peripheral residue around the aperture.
export const archiveFieldBands = [
  { id: "opening", zNear: 8, zFar: -18, slabs: 18, frames: 7, marks: 30 },
  { id: "pause-a", zNear: -20, zFar: -30, slabs: 8, frames: 3, marks: 12 },
  { id: "early", zNear: -31, zFar: -47, slabs: 26, frames: 10, marks: 44 },
  { id: "pause-b", zNear: -48, zFar: -54, slabs: 6, frames: 2, marks: 10 },
  { id: "middle", zNear: -55, zFar: -78, slabs: 42, frames: 18, marks: 74 },
  { id: "saturation", zNear: -79, zFar: -118, slabs: 64, frames: 29, marks: 116 },
  { id: "withdrawal", zNear: -119, zFar: -146, slabs: 10, frames: 3, marks: 18 },
];
