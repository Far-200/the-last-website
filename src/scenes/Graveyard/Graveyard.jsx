// src/scenes/Graveyard/Graveyard.jsx
//
// Top-level Graveyard composition. Mirrors Feed.jsx's pattern: owns the
// normalized progression value in a ref (not React state — wheel events
// fire far more often than a render needs to happen) and the scene's
// wheel input. Mounts only after Feed's own threshold-crossing fade
// completes (see Feed.jsx's onThresholdCrossed and App.jsx) — by the
// time this mounts the screen is already fully black from that fade, so
// the entrance overlay below is what actually reveals the Graveyard
// rather than a page-load flash, and the swap itself is never visible.
//
// It also owns the CAPTCHA's verification sequence, following the
// Prelude's pattern rather than inventing a second one: a single GSAP
// timeline drives an explicit phase machine, and each phase is owned in
// exactly one place.
//
//   idle      progression running, nothing interactive
//   armed     the visitor has arrived; the checkbox row accepts input
//   verifying beat 1 — the box ticks, the machine starts a process
//   reaching  beat 2 — for a moment it looks like it might work
//   failed    beat 3 — the verification service is not there any more
//   warming   the hold, then the first warm light appears off-axis
//   leaving   fade out, then hand off to Memories
//
// GSAP drives only these discrete beats. It never touches the camera —
// GraveyardCamera keeps sole continuous authority, per the project's
// standing separation.

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import GraveyardScene from "./GraveyardScene";
import "./graveyard.css";

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

const LINE_HEIGHT_PX = 16;
// Slower than Feed's (0.00012): the route is longer and the pace should
// read as heavier, not faster.
const PROGRESS_PER_PIXEL = 0.00007;

// Where the checkbox becomes live. The camera's damping lags progress
// slightly, so this sits just short of 1 rather than at it — by the time
// the visitor has pushed progress this far the camera has effectively
// arrived, and waiting for exactly 1.0 would leave the control dead at
// what already looks like the end of the route.
const ARM_AT = 0.99;

// The visual recognition curve — distant shape, then dead infrastructure,
// then the monument resolving into a CAPTCHA — is carried entirely by
// geometry, fog and an emissive ramp, none of which a screen reader can
// reach. These stages mirror it in text so the same narrative arrives
// non-visually. Deliberately coarse: three states across the whole route
// means at most two re-renders, so this never touches the per-frame path.
const NARRATION = [
  "The archive opens onto open, empty ground. Far ahead, one tall shape stands alone. Scroll to move forward.",
  "Collapsed relay towers and server racks pass in the dark. The shape ahead is too regular to be a ruin.",
  "The structure resolves into an enormous interface built as a monument. It reads: prove you are human. I am not a robot. Nothing is left to answer it.",
];
const STAGE_AT = [0, 0.3, 0.72];

// Spoken equivalents of the verification beats, so the sequence is
// followable without seeing the panel.
const PHASE_NARRATION = {
  armed:
    "The checkbox is now within reach. Activate it to tell the machine you are human.",
  verifying: "The machine begins verifying.",
  reaching: "It is looking for something to verify a human response against.",
  failed:
    "Verification service unavailable. No verification node responded. The machine cannot confirm anyone is here.",
  warming: "Far off to one side, in the dark beyond the monument, a small warm light appears.",
  leaving: "Moving toward the light.",
};

export default function Graveyard({ onVerificationComplete }) {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef(null);
  const progressRef = useRef(0);
  const entranceRef = useRef(null);
  const leaveRef = useRef(null);
  const entranceTlRef = useRef(null);
  const verifyTlRef = useRef(null);
  const [stage, setStage] = useState(0);

  // Phase lives in a ref as well as state. The ref is the guard the wheel
  // handler and the activation handler read, because both must make a
  // synchronous decision that cannot wait for a React render — that is
  // what makes the interaction genuinely single-fire rather than
  // single-fire-most-of-the-time.
  const phaseRef = useRef("idle");
  const [phase, setPhase] = useState("idle");

  const goto = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline();
    entranceTlRef.current = tl;
    tl.to(entranceRef.current, {
      opacity: 0,
      duration: reduceMotion ? 0.25 : 2.2,
      ease: "power1.out",
      delay: reduceMotion ? 0.05 : 0.3,
    });
    return () => tl.kill();
  }, [reduceMotion]);

  // Killed on unmount so no tween can write to a detached node and no
  // callback can fire against a component that is gone.
  useEffect(() => () => verifyTlRef.current?.kill(), []);

  const handleActivate = useCallback(() => {
    if (phaseRef.current !== "armed") return;

    // Reduced motion compresses the ramps and fades but NOT the holds
    // that exist for reading. Rushing the failure copy would remove the
    // beat rather than the motion.
    const d = reduceMotion
      ? { verify: 0.8, reach: 0.5, failed: 1.9, warm: 1.2, fade: 0.5 }
      : { verify: 1.3, reach: 0.8, failed: 1.9, warm: 2.4, fade: 2.2 };

    const tl = gsap.timeline();
    verifyTlRef.current = tl;

    const step = (fn, duration) => {
      tl.call(fn);
      if (duration > 0) tl.to({}, { duration });
    };

    step(() => goto("verifying"), d.verify);
    step(() => goto("reaching"), d.reach);
    step(() => goto("failed"), d.failed);
    step(() => goto("warming"), d.warm);
    step(() => goto("leaving"), 0);

    // Fades to a warm near-black rather than pure black. Feed handed the
    // Graveyard a cold, hard threshold; this one has to feel like cold
    // giving way to something else, and Memories mounts from this exact
    // value so the two scenes share a continuous surface across the swap.
    tl.to(leaveRef.current, {
      opacity: 1,
      duration: d.fade,
      ease: "power2.inOut",
      onComplete: () => onVerificationComplete?.(),
    });
  }, [goto, reduceMotion, onVerificationComplete]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;

    const handleWheel = (event) => {
      // Always prevented, even while locked — otherwise the page itself
      // would take over the gesture during verification.
      event.preventDefault();
      // Progression stops the moment the visitor commits. Letting the
      // camera keep travelling under a running verification sequence
      // would pull the monument out of frame mid-beat.
      if (phaseRef.current !== "idle" && phaseRef.current !== "armed") return;

      const pixelDelta = event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
      const next = Math.min(
        1,
        Math.max(0, progressRef.current + pixelDelta * PROGRESS_PER_PIXEL),
      );
      progressRef.current = next;

      let reached = 0;
      for (let i = STAGE_AT.length - 1; i > 0; i--) {
        if (next >= STAGE_AT[i]) {
          reached = i;
          break;
        }
      }
      setStage((current) => (reached > current ? reached : current));

      if (next >= ARM_AT && phaseRef.current === "idle") goto("armed");
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [goto]);

  return (
    <div className="graveyard-root" ref={rootRef}>
      <div className="graveyard-canvas-layer">
        <GraveyardScene
          progressRef={progressRef}
          reduceMotion={reduceMotion}
          captchaPhase={phase}
          onCaptchaActivate={handleActivate}
        />
      </div>

      <div className="graveyard-vignette" aria-hidden="true" />

      <div ref={entranceRef} className="graveyard-entrance-overlay" aria-hidden="true" />
      <div ref={leaveRef} className="graveyard-leave-overlay" aria-hidden="true" />

      <div className="graveyard-hud" aria-hidden="true">
        ARCHIVE // GRAVEYARD
      </div>

      {/* The checkbox itself is a mesh inside the canvas and so is
          unreachable by keyboard. This is the same control, as a real
          button, rendered only while the interaction is live — so the
          sequence can be started and followed without a pointer, and
          nothing is focusable before the visitor has arrived. It carries
          no visual weight; the world stays the interface. */}
      {phase === "armed" && (
        <button
          type="button"
          className="graveyard-visually-hidden graveyard-verify-button"
          onClick={handleActivate}
        >
          I&rsquo;m not a robot — begin verification
        </button>
      )}

      <p className="graveyard-visually-hidden" role="status">
        {PHASE_NARRATION[phase] ?? NARRATION[stage]}
      </p>
    </div>
  );
}
