// src/data/terminalCopy.js
//
// Centralized copy for the Prelude's terminal, HUD, and boot sequence.
// Keeping this as data (rather than inline JSX strings) means the tone
// and pacing of the "archive" voice can be tuned in one place.

export const terminalStates = {
  idle: ["last://connection", "", "waiting for input...", "", "_"],
  connecting: ["last://connection", "", "initiating handshake...", "locating surviving node...", "_"],
  connected: ["last://connection", "", "connection accepted.", "", "1 survivor node found."],
};

export const heroCopy = {
  eyebrowLine1: "THE INTERNET IS GONE.",
  eyebrowLine2: "but something is still moving",
  eyebrowLine3: "in the wreckage. _",
  title: "THE LAST WEBSITE",
};

export const ctaCopy = {
  idle: "[ CLICK TO CONNECT ]",
  connecting: "[ CONNECTING... ]",
  connected: "[ CONNECTION RESTORED ]",
  warning:
    "⚠ Warning: Connection may restore unrecoverable memory.\nProceed only if you are ready to remember.",
  thesis: "The internet didn't preserve history.\nIt preserved people.",
};

export const bootLogLines = [
  "> scanning...",
  "> rebuilding session...",
  "> recovering fragments...",
  "> establishing link...",
  "",
  "> handshaking...",
  "> failed.",
];

export const hud = {
  topLeft: {
    node: "NODE 0001 // PUBLIC ARCHIVE",
    network: "NETWORK: DEAD",
  },
  telemetry: [
    { label: "LAST UPTIME", value: "unknown" },
    { label: "DATA INTEGRITY", value: "23%" },
    { label: "PACKET LOSS", value: "99.97%" },
    { label: "ACTIVE SERVICES", value: "none" },
  ],
  topRight: {
    handshake: "LAST HANDSHAKE",
    response: "1 RESPONSE",
  },
  bottomLeft: "00 / PRELUDE",
  bottomRight: {
    label: "ACTIVE USER",
    id: "00000001",
  },
};

// Floating archive fragments — dead pages, dialogs, logs, and the few
// human traces that carry the emotional weight of the scene.
export const archiveFragments = [
  {
    id: "404-window",
    type: "browser404",
    position: "upper-left",
    url: "last://unknown/page",
    heading: "404",
    subheading: "PAGE NOT FOUND",
  },
  {
    id: "disconnected-dialog",
    type: "dialog",
    position: "upper-right",
    title: "Disconnected",
    body: "The connection was lost\nSomewhere.",
    action: "Try again",
  },
  {
    id: "error-log",
    type: "log",
    position: "far-upper-right",
    title: "ERROR LOG",
    lines: [
      { key: "memories_found", value: "true" },
      { key: "context_corrupted", value: "true" },
      { key: "timeline_broken", value: "true" },
      { key: "recovery_possible", value: "maybe", warn: true },
    ],
  },
  {
    id: "archived-post-1",
    type: "post",
    position: "lower-left",
    handle: "@someone",
    timestamp: "2:14 AM · Jun 12, 2016",
    body: "made it home",
  },
  {
    id: "dead-video",
    type: "video",
    position: "left-of-crt",
    title: "how to fix a door hinge\nwithout tools",
    meta: "1.2M views · 8 years ago",
  },
  {
    id: "group-chat",
    type: "chat",
    position: "right",
    title: "GROUP CHAT // 2015",
    lines: ["where are you guys", "downstairs", "bring fries pls", "omw", "..."],
  },
  {
    id: "archived-post-2",
    type: "post",
    position: "lower-right-mid",
    handle: "@spacecadet",
    timestamp: "11:47 PM · Apr 3, 2017",
    body: "i wish i could disappear\nsometimes",
  },
  {
    id: "missing-attachment",
    type: "missing",
    position: "lower-right",
    title: "Attachment Unavailable",
    body: "file no longer exists\nor never did.",
  },
];
