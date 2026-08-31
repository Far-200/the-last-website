// src/scenes/LastMessage/LastMessage.jsx
//
// The final scene. Implements docs/PROJECT_PLAN.md section 4.1 — "the
// single authoritative order for the ending" — as a single GSAP timeline
// driving an explicit phase machine, the same discipline as every other
// scene's own authored sequence (Prelude's depth machine, the
// Graveyard's verification machine, Memories' own extinction machine).
// GSAP owns only WHEN each phase begins; it never touches the camera
// (there isn't one to touch — see LastMessageScene.jsx) and never
// touches a light or material directly. Every visible fade is either a
// `useFrame` ramp inside the 3D layer (CRTTerminal's own glow, driven
// through crtPhaseFor) or a CSS `[data-phase="..."]` opacity rule here —
// the exact pattern Prelude's own HUD already uses
// (`.prelude-root[data-phase="archive"] .prelude-hud { opacity: ...;
// transition: opacity ...; }`), not a second animation system.
//
// No progression, no wheel listener. docs/PROJECT_PLAN.md is explicit
// that this area's "Interaction" is "Automatic proximity/progression
// trigger only — no manual interaction is required. Reaching the
// terminal is sufficient; the finale sequence plays on its own." Mounted
// is "reached" — the sequence starts itself.
//
// Mounts already fully black (Memories fades to `#000` before calling
// onMemoriesComplete — see Memories.jsx and its `.memories-leave-overlay`).
// This scene's own veil starts at that identical opaque value and is
// what performs the "almost nothing" first beat and, later, the
// "immediate blackout" beat (step 7) — one element serving both jobs
// rather than two overlays with the same colour.
//
// There is no "ended" scene in App.jsx's state. Nothing here is visually
// or structurally different enough from the rest of this scene to
// justify a separate mounted component just to show one faint button —
// `ended` is simply this machine's own final phase, and the restart
// affordance is gated on it exactly the way every other conditional
// element here is gated on a phase.

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import LastMessageScene from "./LastMessageScene";
import { lastMessageCopy, ctaCopy } from "../../data/terminalCopy";
import "./lastmessage.css";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// Mirrors each step of PROJECT_PLAN.md section 4.1 by name, so the
// mapping between that document and this code is legible without
// cross-referencing line numbers. Step 3 ("ambient sound drains") is
// now wired: it is not a phase, because nothing about it is visible —
// it is a single call on the timeline at the position the plan gives
// it, between the status beat and "See you tomorrow.", handed up to
// App's soundtrack engine through onSoundtrackDrain. This scene owns
// only WHEN the drain happens; it owns no audio instance and cannot
// restart one. The audio half of step 6 (a terminal-failure cue) stays
// absent — project-wide SFX remain deferred.
//
//   arriving      step 1 — reached the terminal; almost nothing yet
//   signal        the screen wakes — a weak surviving signal
//   status        step 2 — minimal terminal status appears
//   message       step 4 — "See you tomorrow." appears
//   silence       step 5 — a deliberate beat of true silence
//   failing       step 6 — terminal-failure cue (the screen visibly dies)
//   blackout      step 7 — immediate blackout
//   connectionLost step 8 — CONNECTION LOST appears (fades on its own
//                 CSS transition once phase moves on — step 9)
//   pause         step 10 — another restrained pause
//   thesis        step 11 — the thesis appears alone (fades via its own
//                 CSS transition on advancing — step 12)
//   ended         step 13 — only now may the reconnect affordance appear
const PHASE_NARRATION = {
  arriving: "A small, dark space. One machine remains, powered down.",
  signal: "Its screen flickers weakly awake.",
  status: "A status line resolves: files recovered, 4. Users online, 0. Network, offline.",
  message: "Beneath it, one more line appears: See you tomorrow.",
  silence: "A long silence follows.",
  failing: "The screen begins to fail.",
  blackout: "The screen goes dark. Nothing remains lit.",
  connectionLost: "Connection lost appears against the black, then fades.",
  pause: "Another pause, in total darkness.",
  thesis:
    "One final line appears alone: The internet didn't preserve history. It preserved people.",
  ended: "The line fades. A faint reconnect control is now available.",
};

export default function LastMessage({ onRestart, onSoundtrackDrain }) {
  const reduceMotion = usePrefersReducedMotion();
  const veilRef = useRef(null);
  const timelineRef = useRef(null);
  const [phase, setPhase] = useState("arriving");

  // Held in a ref, and read only from inside the timeline, so that a
  // change of callback identity can never land in the finale effect's
  // dependencies and rebuild the authored sequence mid-play. Seeded at
  // mount (which is the only value the timeline can ever need) and kept
  // current from an effect rather than during render.
  const drainRef = useRef(onSoundtrackDrain);
  useEffect(() => {
    drainRef.current = onSoundtrackDrain;
  }, [onSoundtrackDrain]);

  useEffect(() => {
    // "Do not rush. This is one of the few places where a several-second
    // hold is desirable." Reduced motion compresses these but keeps every
    // beat that contains text well clear of unreadable — never below
    // ~55% of the full hold, per the brief's explicit accessibility
    // requirement that reduced motion "must still preserve... enough
    // hold time."
    const d = reduceMotion
      ? {
          veilIn: 0.4,
          arriving: 0.7,
          signal: 0.7,
          status: 1.6,
          message: 2.2,
          silence: 1.4,
          failing: 0.7,
          drain: 2.4,
          veilOut: 0.35,
          postBlackout: 0.7,
          connectionLost: 1.6,
          pause: 1.3,
          thesis: 3.0,
        }
      : {
          veilIn: 1.4,
          arriving: 1.6,
          signal: 1.6,
          status: 2.2,
          message: 3.6,
          silence: 2.8,
          failing: 1.6,
          drain: 4.2,
          veilOut: 0.4,
          postBlackout: 1.1,
          connectionLost: 2.2,
          pause: 2.6,
          thesis: 4.5,
        };

    const tl = gsap.timeline();
    timelineRef.current = tl;

    const step = (next, duration) => {
      tl.call(() => setPhase(next));
      if (duration > 0) tl.to({}, { duration });
    };

    // Reveal from the black Memories handed over. This is Part 7's own
    // "Beat 1 — almost nothing": the veil lifts onto a scene that is, at
    // first, still a dead machine in the dark.
    tl.to(veilRef.current, { opacity: 0, duration: d.veilIn, ease: "power1.out" });

    step("arriving", d.arriving);
    step("signal", d.signal);
    step("status", d.status);

    // Step 3 — "ambient sound drains toward near-silence". Exactly
    // where the plan puts it: after the status line has resolved and
    // before "See you tomorrow." arrives. It begins partway back into
    // the status hold so the drain is already underway when the message
    // lands, and its length carries it across the message beat — which
    // makes step 5's "deliberate beat of true silence" literally
    // silent, and leaves the blackout, CONNECTION LOST and the thesis
    // with nothing playing under them at all.
    //
    // This adds no phase, no visible state and no time. It is a
    // zero-duration callback inserted into an existing hold via a
    // relative position, so the timeline's duration — and therefore
    // every text timing after it — is byte-for-byte what it was.
    tl.call(() => drainRef.current?.(d.drain), null, `-=${d.status * 0.5}`);

    step("message", d.message);
    step("silence", d.silence);
    step("failing", d.failing);

    // Step 7 — immediate blackout. Fast and hard, unlike every other
    // fade in this sequence: the point is that it is NOT another slow
    // dissolve, it is the machine simply stopping.
    tl.call(() => setPhase("blackout"));
    tl.to(veilRef.current, { opacity: 1, duration: d.veilOut, ease: "power2.in" });
    tl.to({}, { duration: d.postBlackout });

    step("connectionLost", d.connectionLost);
    step("pause", d.pause);
    step("thesis", d.thesis);
    step("ended", 0);

    return () => tl.kill();
  }, [reduceMotion]);

  return (
    <div className="lastmessage-root" data-phase={phase}>
      <div className="lastmessage-canvas-layer">
        <LastMessageScene phase={phase} reduceMotion={reduceMotion} />
      </div>

      <div ref={veilRef} className="lastmessage-veil" aria-hidden="true" />

      <div className="lastmessage-status" aria-hidden="true">
        {lastMessageCopy.statusLines.map((row) => (
          <div key={row.label} className="lastmessage-status-row">
            <span className="lastmessage-status-label">{row.label}</span>
            <span className="lastmessage-status-dots" aria-hidden="true" />
            <span className="lastmessage-status-value">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="lastmessage-goodbye" aria-hidden="true">
        {lastMessageCopy.goodbye}
      </div>

      <div className="lastmessage-connection-lost" aria-hidden="true">
        {lastMessageCopy.connectionLost}
      </div>

      <div className="lastmessage-thesis" aria-hidden="true">
        {ctaCopy.thesis.split("\n").map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* Always mounted rather than conditionally rendered — a control
          that only ever gets inserted into the DOM at the exact moment
          its own visibility attribute changes is a known CSS-transition
          race (both states can land in the same style recalculation with
          no paint between them, and the transition silently never
          fires). `disabled` does the gating work instead: it removes the
          button from the tab order and from the accessibility tree's
          interactive elements natively, with no custom aria bookkeeping,
          and reverts automatically the moment "ended" is reached. */}
      <button
        type="button"
        className="lastmessage-reconnect"
        disabled={phase !== "ended"}
        onClick={onRestart}
      >
        {lastMessageCopy.reconnect}
      </button>

      <p className="lastmessage-visually-hidden" role="status">
        {PHASE_NARRATION[phase]}
      </p>
    </div>
  );
}
