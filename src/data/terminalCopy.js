// src/data/terminalCopy.js
//
// Centralized copy for the Prelude's terminal, HUD, and depth sequence.
// Keeping this as data (rather than inline JSX strings) means the tone
// and pacing of the "archive" voice can be tuned in one place.
//
// The Prelude now excavates in three depths — SIGNAL, SYSTEM, HUMAN —
// rather than exposing everything at once. Each depth owns its own copy
// block below. `terminalStates` (CRT screen readout) is keyed by the
// same phase names as the state machine in Prelude.jsx.

// --- CRT screen readout, per phase -----------------------------------
// SIGNAL: the machine barely exists yet, so the screen stays near-blank.
// SYSTEM: this is where the boot-remnant text actually lives.
// ARCHIVE / LEAVING: the CRT recedes, so the readout goes quiet again.
export const terminalStates = {
  signal: ["last://connection", "", "_"],
  resolving: ["last://connection", "", "checksum stabilizing...", "_"],
  system: [
    "inbound handshake wakes",
    "local recovery process...",
    "",
    "mounting /srv/the_last_website",
    "........ OK (read-only)",
  ],
  archive: ["last://connection", "", "session held open."],
  leaving: ["last://connection", "", "session held open."],
};

// --- DEPTH 01 — SIGNAL / LAST TRANSMISSION ----------------------------
// Restrained packet-capture language. Nothing here reveals the human
// document or the machine's identity yet — only that something answered.
export const signalCopy = {
  promptLines: [
    "tcpdump -i wan0 -X",
    "listening on wan0: RSSI ---- (weak)",
    "",
    "14:22:07 IP 10.0.0.1 > the_last_website.arpa.443:",
    "  Flags [S], seq 88213004",
    "14:22:48 IP the_last_website.arpa.443 > 10.0.0.1:",
    "  Flags [S.], ack 1",
    "",
    "payload dump, seq 88213812 — checksum failed",
    "(3 of 4 fragments lost)",
  ],
  hexLines: [
    "0x0000  ff 08 3f 3f 00 12 8a bb 4c 91 00 00 47 4f ??",
    "0x0010  2e 00 00 01 02 03 04 05 06 07 08 09 00 00  ..........",
  ],
  fragmentLabel: "fragment recovered:",
  fragmentValue: '"...GONE."',
  cta: "[ CONNECT TO SIGNAL ]",
  ctaResolving: "[ RESOLVING... ]",
};

// --- DEPTH 02 — SYSTEM / BOOT REMNANT ----------------------------------
// This is the ONLY place "THE INTERNET IS GONE." is first revealed in
// full. It must not appear during signalCopy above.
export const systemCopy = {
  recoveryLines: [
    "inbound handshake wakes local recovery process...",
    "",
    "mounting /srv/the_last_website ........ OK (read-only)",
    "",
    "checking volume integrity .............",
    "REBUILDING INDEX 61%",
    "[stalled 3,822 days]",
    "",
    ">> unparseable string recovered at sector 0xB04FF2A",
  ],
  revealTitle: "THE INTERNET IS GONE.",
  revealSubtext: "but something is still moving in the wreckage.",
  statusLines: [
    { label: "VOLUME LABEL", value: "THE_LAST_WEBSITE" },
    { label: "NODE AGE", value: "UNKNOWN" },
    { label: "LAST HUMAN ACTIVITY", value: "3,417 DAYS AGO" },
    { label: "SESSION STATE", value: "CONNECTION ESTABLISHED", accent: true },
  ],
};

// --- DEPTH 03 — HUMAN / DEAD ARCHIVE -----------------------------------
// One recovered document, not a cloud of fragments. Machine chrome is
// reduced to a metadata footnote beneath it.
export const archiveCopy = {
  indexLine: "index of /archive/recovered/",
  fileLine: "→ the_last_website.html",
  fileMeta: "[2019-04-17 03:41, partial]  4.2k — opened",
  from: "a.kaplan",
  date: "2019-Apr-17 03:44 (partial)",
  subject: "(untitled)",
  bodyTitle: "THE INTERNET IS GONE.",
  bodySubtext: "but something is still moving in the wreckage.",
  bodyClosing: "if anyone finds this— ",
  bodyTruncated: "[truncated]",
  attachmentName: "photo.jpg",
  attachmentState: "corrupted",
  footerMeta: [
    "status=CONNECTION_ESTABLISHED",
    "node=the_last_website.arpa",
    "last_activity=3417d_ago",
    "checksum=partial",
  ],
  cta: "[ ENTER ARCHIVE ]",
};

// The thesis is a narrative reveal, not a tagline — it surfaces exactly
// once, after the visitor has already read the human document, never on
// the initial signal screen.
export const ctaCopy = {
  warning:
    "⚠ Warning: Connection may restore unrecoverable memory.\nProceed only if you are ready to remember.",
  thesis: "The internet didn't preserve history.\nIt preserved people.",
};

export const heroCopy = {
  title: "THE LAST WEBSITE",
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
