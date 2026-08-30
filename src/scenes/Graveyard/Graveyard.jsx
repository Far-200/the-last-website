// src/scenes/Graveyard/Graveyard.jsx
//
// Top-level Graveyard composition. Mirrors Feed.jsx's pattern: owns the
// normalized progression value in a ref (not React state — wheel events
// fire far more often than a render needs to happen) and the scene's
// wheel input. Mounts only after Feed has swallowed itself into its own
// cold haze. Its own arrival ref then carries the other side of that
// spatial match cut: GraveyardScene owns the camera/atmosphere reveal,
// while this component only owns timing and input gating.
//
// It also owns the CAPTCHA's verification sequence, following the
// Prelude's pattern rather than inventing a second one: a single GSAP
// timeline drives an explicit phase machine, and each phase is owned in
// exactly one place.
//
//   idle       progression running, nothing interactive
//   armed      the visitor has arrived; the checkbox row accepts input
//   verifying  beat 1 — the box ticks, the machine starts a process
//   reaching   beat 2 — for a moment it looks like it might work
//   failed     beat 3 — the verification service is not there any more,
//              and the screen is HELD there long enough to read it
//   seam       a thin warm line appears beside the monument: light
//              leaking from the seals of a door that has been standing
//              there the whole scene
//   opening    the door swings; a stairwell becomes visible below it
//   descending the camera notices it, walks to it, crosses the threshold
//              and starts down
//   leaving    the last half second, underground, then hand off
//
// The scene's exit used to be: hold the failure, raise a warm light on
// the ground somewhere off to the left, fade the whole page out, mount
// Memories. Every part of that except the fade is kept — the failure copy
// is untouched, the checkbox stays ticked, the warmth still appears
// peripherally and unexplained at almost exactly the same bearing — but
// the warmth now has a physical source the visitor walks into, and the
// scene hands over because the camera is inside a small dark stairwell,
// not because a black rectangle covered the page. The overlay still
// exists and still runs, at half a second instead of two and a bit, as
// insurance behind a frame that is already the colour it fades to.
//
// The machine has NOT accepted anybody. It is still reporting
// VERIFICATION SERVICE UNAVAILABLE while the door opens, and its own
// uplight is dropping away at the same time. The door is a separate
// surviving mechanism and the scene never explains the coincidence.
//
// GSAP drives only these discrete beats, plus ONE plain number:
// exitProgressRef, a linear 0-1 that GraveyardCamera reads in useFrame
// and turns into the authored exit shot. It never touches the camera —
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

// Touch-drag input reuses the wheel progression core unchanged (see the
// input effect below); only the device-to-pixel conversion differs. Raw
// finger travel in CSS pixels advances progress far more slowly than a
// wheel notch does, so touch deltas are scaled by this multiplier before
// being handed to the shared handler. PROGRESS_PER_PIXEL is deliberately
// left alone so desktop wheel/trackpad pacing is identical to before.
const TOUCH_PROGRESS_MULTIPLIER = 3;
// A gesture must travel at least this far vertically before it is treated
// as a scrub. Under this distance it stays a tap: no preventDefault, no
// progress change — which is what keeps a tap on the CAPTCHA (a mesh in
// the canvas) reaching the raycaster instead of being swallowed here.
const TOUCH_DRAG_THRESHOLD_PX = 6;

// Where the checkbox becomes live. The camera's damping lags progress
// slightly, so this sits just short of 1 rather than at it — by the time
// the visitor has pushed progress this far the camera has effectively
// arrived, and waiting for exactly 1.0 would leave the control dead at
// what already looks like the end of the route.
const ARM_AT = 0.99;

// The phases during which GraveyardCamera runs its authored exit route
// instead of route progression. It captures the actually-rendered pose on
// the first of these frames, so the set has to start exactly where the
// exit tween starts and never re-enter afterwards.
const EXIT_PHASES = new Set(["descending", "leaving"]);
const ARRIVAL_DURATION = 1.55;
const ARRIVAL_DURATION_REDUCED = 0.35;

// The visual recognition curve — strange rows of markers among dead
// infrastructure, then individual graves becoming readable, then the
// rows multiplying into the fog, then the monument resolving into a
// CAPTCHA — is carried entirely by geometry, fog and an emissive ramp,
// none of which a screen reader can reach. These stages mirror it in text
// so the same narrative arrives non-visually. Deliberately coarse: three
// states across the whole route means at most two re-renders, so this
// never touches the per-frame path, and it never lists the individual
// graves by name — the visual scene doesn't either.
const NARRATION = [
  "The archive opens onto open ground. Low stone markers stand in irregular rows among the wreckage, some leaning, some half buried. Far ahead, one tall shape stands alone. Scroll to move forward.",
  "Passing close, the markers resolve into names, dates and small worn symbols — things that were, for a while, everywhere. Collapsed relay towers and server racks stand among them. The shape ahead is too regular to be a ruin.",
  "The rows multiply into the fog, closer together the further they go. The structure resolves into an enormous interface built as a monument. It reads: prove you are human. I am not a robot. Nothing is left to answer it.",
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
  seam:
    "Off to the left of the monument, low down, a thin line of warm light appears where nothing was before.",
  opening:
    "The light is leaking around the edges of a service door set into a concrete structure beside the machine. The door swings slowly open. Behind it a flight of steps leads down below ground.",
  descending:
    "Turning away from the machine, crossing to the doorway, and starting down the stairs.",
  leaving: "The stairwell closes in — narrow, warm and quiet.",
};

// How long to wait for GraveyardScene's readiness signal before starting
// the arrival anyway. That signal now waits on the grave-marker kit as
// well as on the first rendered frame (see GraveyardScene's AssetGate), so
// a failed or very slow asset fetch would otherwise leave the scene held
// at its opening near-black frame indefinitely. Generous, because the
// frame being waited on is the same colour Feed handed over at and a
// short wait is invisible; bounded, because an unbounded one is a hang.
const READY_TIMEOUT_MS = 4000;

export default function Graveyard({ onVerificationComplete }) {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef(null);
  const progressRef = useRef(0);
  const leaveRef = useRef(null);
  const verifyTlRef = useRef(null);
  const arrivalProgressRef = useRef(0);
  const arrivalTweenRef = useRef(null);
  const arrivalStartedRef = useRef(false);
  const arrivingRef = useRef(true);
  // Plain number, tweened by the verification timeline and read every
  // frame by GraveyardCamera (the shot), GraveyardScene's Atmosphere (fog
  // and general lights) and the backdrop shader (the sky). One value,
  // three readers, no second writer.
  const exitProgressRef = useRef(0);
  const [stage, setStage] = useState(0);
  const [arrivalPhase, setArrivalPhase] = useState("arrival");

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

  // Killed on unmount so no tween can write to a detached node and no
  // callback can fire against a component that is gone.
  useEffect(() => () => verifyTlRef.current?.kill(), []);
  useEffect(() => () => arrivalTweenRef.current?.kill(), []);

  // Starts from GraveyardScene's first actual rendered frame rather than
  // mount, so geometry creation and GPU upload cannot consume the visible
  // duration of this side of the match cut.
  const handleSceneReady = useCallback(() => {
    if (arrivalStartedRef.current) return;
    arrivalStartedRef.current = true;
    arrivalTweenRef.current = gsap.to(arrivalProgressRef, {
      current: 1,
      duration: reduceMotion ? ARRIVAL_DURATION_REDUCED : ARRIVAL_DURATION,
      ease: "none",
      onComplete: () => {
        arrivalProgressRef.current = 1;
        arrivingRef.current = false;
        setArrivalPhase("interactive");
      },
    });
  }, [reduceMotion]);

  useEffect(() => {
    const id = window.setTimeout(handleSceneReady, READY_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [handleSceneReady]);

  useEffect(() => {
    if (arrivalPhase === "interactive") rootRef.current?.focus({ preventScroll: true });
  }, [arrivalPhase]);

  const handleActivate = useCallback(() => {
    if (phaseRef.current !== "armed") return;

    // Reduced motion compresses the ramps and the travel but NOT the
    // holds that exist for reading. Rushing the failure copy would remove
    // the beat rather than the motion. `exit` collapses hardest of all,
    // because under reduced motion GraveyardCamera holds position and
    // only turns (see its exit branch) — there is no walk to pace.
    const d = reduceMotion
      ? { verify: 0.8, reach: 0.5, failed: 2.4, seam: 1.4, opening: 1.6, exit: 3.6, fade: 1.3 }
      : { verify: 1.3, reach: 0.8, failed: 2.4, seam: 2, opening: 2.8, exit: 13, fade: 0.5 };

    const tl = gsap.timeline();
    verifyTlRef.current = tl;

    const step = (fn, duration) => {
      tl.call(fn);
      if (duration > 0) tl.to({}, { duration });
    };

    step(() => goto("verifying"), d.verify);
    step(() => goto("reaching"), d.reach);
    // Beat A. The failure is left on screen with nothing happening, long
    // enough to land: I proved I am human, and the machine has nobody
    // left to ask.
    step(() => goto("failed"), d.failed);
    // Beat B, then C and D. The seam, then the door.
    step(() => goto("seam"), d.seam);
    step(() => goto("opening"), d.opening);
    // Beats F through I. The door is still finishing its swing for about
    // another second while the camera turns onto it, which is deliberate:
    // we catch the last of the movement rather than arriving to a door
    // that is simply open.
    step(() => goto("descending"), 0);

    const exitAt = tl.duration();
    tl.to(exitProgressRef, { current: 1, duration: d.exit, ease: "none" }, exitAt);

    // Beat J. The overlay is layered over the LAST half second of the
    // descent rather than played after it, so the camera is still moving
    // downward through the whole of it — the handoff happens mid-motion,
    // not from a standstill. It fades to the same warm near-black the fog
    // and the backdrop have already arrived at by that point (see
    // exitLayout's UNDERGROUND_DARK), and Memories mounts at that same
    // value, so what it actually conceals is a frame that has stopped
    // changing rather than a cut.
    const handoffAt = exitAt + d.exit - d.fade;
    tl.call(() => goto("leaving"), null, handoffAt);
    tl.to(
      leaveRef.current,
      {
        opacity: 1,
        duration: d.fade,
        ease: "power2.inOut",
        onComplete: () => onVerificationComplete?.(),
      },
      handoffAt,
    );
  }, [goto, reduceMotion, onVerificationComplete]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;

    // Shared progression core. Wheel and touch each resolve their own
    // device input down to a pixel-space delta and hand it here, so the
    // arrival lock, the verification lock, the stage narration and the
    // arm threshold live in exactly one place and touch obeys precisely
    // the same gates as wheel.
    const applyPixelDelta = (pixelDelta) => {
      // Arrival is not route progress. Input during it is deliberately
      // discarded so the normal route still begins at its authored start.
      if (arrivingRef.current) return;
      // Progression stops the moment the visitor commits. Letting the
      // camera keep travelling under a running verification sequence
      // would pull the monument out of frame mid-beat.
      if (phaseRef.current !== "idle" && phaseRef.current !== "armed") return;

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

    const handleWheel = (event) => {
      // Always prevented, even while locked — otherwise the page itself
      // would take over the gesture during verification.
      event.preventDefault();

      const pixelDelta = event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
      applyPixelDelta(pixelDelta);
    };

    // Vertical touch-drag is the phone equivalent of the wheel. A swipe
    // UP (finger travels toward a smaller clientY) produces a positive
    // delta and advances progress, matching a downward wheel notch; a
    // swipe DOWN produces a negative delta and reverses it wherever
    // applyPixelDelta already permits reverse movement.
    let touchStartY = null;
    let touchLastY = null;
    let touchDragging = false;

    const handleTouchStart = (event) => {
      // Single-finger only; a second finger (pinch) cancels the scrub.
      if (event.touches.length !== 1) {
        touchStartY = null;
        touchLastY = null;
        touchDragging = false;
        return;
      }
      touchStartY = event.touches[0].clientY;
      touchLastY = touchStartY;
      touchDragging = false;
    };

    const handleTouchMove = (event) => {
      if (touchLastY === null) return;
      const currentY = event.touches[0].clientY;

      // Until the finger has moved a meaningful vertical distance, leave
      // the gesture completely alone: no preventDefault, no progress. A
      // tap on the CAPTCHA checkbox stays under the threshold, so it is
      // never cancelled here and reaches the canvas raycaster as normal.
      if (!touchDragging) {
        if (Math.abs(currentY - touchStartY) < TOUCH_DRAG_THRESHOLD_PX) return;
        touchDragging = true;
        touchLastY = currentY;
        return;
      }

      // passive:false — this preventDefault is what suppresses page
      // scroll / rubber-banding for the drag itself.
      event.preventDefault();
      const deltaY = touchLastY - currentY;
      touchLastY = currentY;
      applyPixelDelta(deltaY * TOUCH_PROGRESS_MULTIPLIER);
    };

    const handleTouchEnd = () => {
      touchStartY = null;
      touchLastY = null;
      touchDragging = false;
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    node.addEventListener("touchstart", handleTouchStart, { passive: true });
    node.addEventListener("touchmove", handleTouchMove, { passive: false });
    node.addEventListener("touchend", handleTouchEnd, { passive: true });
    node.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [goto]);

  return (
    <div
      className="graveyard-root"
      ref={rootRef}
      tabIndex={-1}
      data-arrival={arrivalPhase}
    >
      <div className="graveyard-canvas-layer">
        <GraveyardScene
          progressRef={progressRef}
          reduceMotion={reduceMotion}
          captchaPhase={phase}
          onCaptchaActivate={handleActivate}
          arrival={arrivalPhase === "arrival"}
          arrivalProgressRef={arrivalProgressRef}
          exit={EXIT_PHASES.has(phase)}
          exitProgressRef={exitProgressRef}
          onReady={arrivalPhase === "arrival" ? handleSceneReady : undefined}
        />
      </div>

      <div className="graveyard-vignette" aria-hidden="true" />

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
