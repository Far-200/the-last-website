// src/scenes/Memories/Memories.jsx
//
// Top-level Memories composition. Follows the same shape Feed and the
// Graveyard already established — progress in a ref, wheel input owned
// here, a GSAP entrance overlay, a `role="status"` narration layer — so
// the scene architecture stays uniform even though the space itself is
// the opposite of the one before it.
//
// Arrival
// -------
// Mounts only after the Graveyard's verification sequence has taken the
// visitor through a service door beside the CAPTCHA monument and part-way
// down the stairwell behind it (see GraveyardExit.jsx and
// GraveyardCamera's exit branch). This scene therefore no longer resolves
// out of a warm overlay — it CONTINUES THE DESCENT. It opens standing on
// the seventh tread of the last flight of that same stair, with the same
// interior width, the same pitch, the same headroom and the same aim as
// the frame the Graveyard handed over on, and eases the remaining six and
// a half units down into the room's normal opening pose (see
// MemoriesArrival.jsx, MemoriesCamera's arrival branch, and layout.js for
// the measurements that make those two frames the same shot).
//
// The entrance overlay survives, at half a second instead of three, and
// its job has changed: it no longer IS the transition, it only covers the
// single frame on which React swaps one Canvas for another. It still
// starts at exactly `#0b0806`, which is the value the Graveyard's own fog,
// backdrop and leave overlay have all arrived at by then, so the swap
// happens behind a colour that does not move.
//
// Arrival timing starts from MemoriesScene's first actually-rendered
// frame, not from mount — the same discipline Feed and the Graveyard
// already use. This scene builds a room, an archive layer, three
// fragments and a shadow-casting lamp on mount; measuring a two-and-a-
// half-second entrance against wall-clock time while that is still being
// uploaded would leave it visibly part-finished on the first frame the
// visitor sees. Input is discarded outright during arrival rather than
// buffered, so nothing accumulated jumps the camera the instant it ends.
//
// Extinction and the Memories -> Last Message handoff
// -----------------------------------------------------
// Progress now covers three stops (see MemoriesCamera's STOPS/KEYFRAMES)
// instead of one. Reaching the end auto-triggers the ending — mirroring
// Feed's own threshold pattern (progress hits 1, input freezes, a single
// GSAP sequence plays), NOT the Graveyard's click-to-activate pattern:
// nothing here requires an interaction, because by this point the
// visitor has already interacted with the archive and the brief is
// explicit that the ending should not require another click.
//
// The GSAP timeline drives an explicit phase machine, same discipline as
// the Graveyard's verification sequence: idle -> dimming1 -> dimming2 ->
// dark -> leaving. Each of the three fragments and the lamp read this
// phase via useFrame ramps (see MemoriesScene.jsx and the fragment
// files) — GSAP only decides WHEN each phase starts, never touches a
// light or material directly, and never touches the camera.
//
// Unlike the warm Graveyard -> Memories handoff, this one fades to pure
// black rather than to a shared warm value. That is deliberate: warmth
// is the thing being extinguished here, so the handoff should not carry
// it forward the way the previous one did. Last Message mounts already
// black, exactly as the Graveyard made Memories mount already
// warm-dark.

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import MemoriesScene from "./MemoriesScene";
import { STOPS } from "./layout";
import "./memories.css";

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
// Roughly eighteen times slower per unit travelled than the Graveyard's
// (0.00007 across 236 units, against this across under 9). The route is
// short on purpose and the pace has to match it: this is a scene about
// looking at something, not about covering ground.
const PROGRESS_PER_PIXEL = 0.00016;

// Touch-drag input reuses the wheel progression core unchanged (see the
// input effect below); only the device-to-pixel conversion differs. Raw
// finger travel in CSS pixels advances progress far more slowly than a
// wheel notch does, so touch deltas are scaled by this multiplier before
// being handed to the shared handler. PROGRESS_PER_PIXEL is deliberately
// left alone so desktop wheel/trackpad pacing is identical to before.
const TOUCH_PROGRESS_MULTIPLIER = 3;
// A gesture must travel at least this far vertically before it is treated
// as a scrub. Under this distance it stays a tap: no preventDefault, no
// progress change — so a plain tap does nothing.
const TOUCH_DRAG_THRESHOLD_PX = 6;

// Arrival duration across the 6.8 units remaining on the flight. The
// speed matching that keeps this one continuous move rather than two
// lives in MemoriesCamera's easing exponent, not here; this only sets how
// long the visitor is on the stair, and three seconds is what it takes
// for the descent to be something they watch rather than something that
// has already happened.
const ARRIVAL_DURATION = 3;
const ARRIVAL_DURATION_REDUCED = 0.3;
// Overlay time on this side of the swap. Short, because what it covers is
// a frame that has almost stopped changing rather than a cut.
const ENTRANCE_FADE = 0.45;
const ENTRANCE_FADE_REDUCED = 0.25;
// Safety net for the readiness signal, matching the Graveyard's. Memories
// has no asynchronous asset at all, so this should never fire; it exists
// so a lost frame callback degrades to a slightly early entrance rather
// than to a scene that never starts.
const READY_TIMEOUT_MS = 3000;

// Spoken while the camera is still on the stair. The visual beat — the
// stairwell opening out into a small lit corner — is geometry and light,
// neither of which a screen reader can reach.
const ARRIVAL_NARRATION =
  "The stairs come down into a small room below ground. It is warm, and much smaller than the place above.";

// One narration stage per camera stop (see MemoriesCamera's STOPS),
// mirroring the Graveyard's own STAGE_AT/NARRATION split — carried non-
// visually since the visual recognition here is a camera move and an
// emissive ramp, neither of which a screen reader can reach.
const NARRATION = [
  "A small corner survives in the dark. One lamp is still lit. Scroll to move closer.",
  "On a low surface beside the lamp lies a device, still showing a message that was written but never sent. It reads: draft, not sent, 11:58 PM. Are you still awake.",
  "Near the wall, a small machine holds a transcribed voicemail. It reads: hey, call me back when you get this, it's not urgent.",
  "Against the far wall, a torn photograph, partly recovered. It reads: first snow, finally. This is the last of it.",
];

// Spoken equivalents of the extinction beats.
const PHASE_NARRATION = {
  dimming1: "The device with the unsent message goes dark.",
  dimming2: "The voicemail machine goes dark.",
  dark: "The lamp dims. The last photograph fades with it.",
  leaving: "The room goes fully dark.",
};

export default function Memories({ onMemoriesComplete }) {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef(null);
  const progressRef = useRef(0);
  const overlayRef = useRef(null);
  const leaveRef = useRef(null);
  const entranceTlRef = useRef(null);
  const extinctionTlRef = useRef(null);
  const arrivalProgressRef = useRef(0);
  const arrivalTweenRef = useRef(null);
  const arrivalStartedRef = useRef(false);
  const arrivingRef = useRef(true);
  const [arrivalPhase, setArrivalPhase] = useState("arrival");
  const [stage, setStage] = useState(0);

  // Single-fire guard for the extinction trigger — mirrors Feed's
  // crossingRef exactly. A ref because the wheel handler must decide
  // synchronously whether the sequence has already started; waiting on
  // a React state read/render here would let a burst of wheel events
  // between mount and the next render re-fire it.
  const endingRef = useRef(false);
  const [phase, setPhase] = useState("idle");

  // Started from MemoriesScene's onReady — its first actually-rendered
  // frame — not from a mount effect. Guarded to fire once: React
  // StrictMode double-invokes effects in development, and the timeout
  // safety net below can race the real signal.
  const handleSceneReady = useCallback(() => {
    if (arrivalStartedRef.current) return;
    arrivalStartedRef.current = true;

    // The overlay and the camera run together rather than in sequence.
    // The point of the overlay is to cover the mount swap, not to be the
    // entrance, so the visitor is already moving down the last of the
    // stairs while it clears.
    entranceTlRef.current = gsap.to(overlayRef.current, {
      opacity: 0,
      duration: reduceMotion ? ENTRANCE_FADE_REDUCED : ENTRANCE_FADE,
      ease: "power1.out",
    });

    // Linear, exactly like Feed's and the Graveyard's: MemoriesCamera
    // applies its own ease-out remap, and MemoriesArrival its own
    // light-fade window, to this one raw value.
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

  useEffect(() => () => entranceTlRef.current?.kill(), []);
  useEffect(() => () => arrivalTweenRef.current?.kill(), []);

  useEffect(() => {
    const id = window.setTimeout(handleSceneReady, READY_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [handleSceneReady]);

  useEffect(() => {
    if (arrivalPhase === "interactive") rootRef.current?.focus({ preventScroll: true });
  }, [arrivalPhase]);

  // Killed on unmount so no tween can write to a detached node and no
  // callback can fire against a component that is gone.
  useEffect(() => () => extinctionTlRef.current?.kill(), []);

  const beginExtinction = useCallback(() => {
    // "Do not rush" governs the holds, not the ramps within each phase
    // (those are handled by each fragment's own useFrame lerp) — these
    // durations are how long the GSAP timeline waits before calling the
    // next goto, i.e. how long each state is actually held on screen.
    const d = reduceMotion
      ? { d1: 0.5, d2: 0.7, dark: 1.0, fade: 0.6 }
      : { d1: 1.1, d2: 1.1, dark: 1.7, fade: 2.4 };

    const tl = gsap.timeline();
    extinctionTlRef.current = tl;

    const step = (next, duration) => {
      tl.call(() => setPhase(next));
      if (duration > 0) tl.to({}, { duration });
    };

    step("dimming1", d.d1);
    step("dimming2", d.d2);
    step("dark", d.dark);
    step("leaving", 0);

    tl.to(leaveRef.current, {
      opacity: 1,
      duration: d.fade,
      ease: "power2.inOut",
      onComplete: () => onMemoriesComplete?.(),
    });
  }, [reduceMotion, onMemoriesComplete]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;

    // Shared progression core. Wheel and touch each resolve their own
    // device input down to a pixel-space delta and hand it here, so the
    // ending gate, the stage narration and the extinction trigger live in
    // exactly one place and touch obeys precisely the same gates as wheel.
    const applyPixelDelta = (pixelDelta) => {
      // Arrival is not route progress. Input during it is discarded
      // outright rather than queued, so nothing accumulated jumps the
      // camera the instant the descent finishes.
      if (arrivingRef.current) return;
      // Progression stops the instant the ending begins, exactly like
      // Feed's own threshold: nothing should be able to keep nudging the
      // already-settled final camera position while the room is fading.
      if (endingRef.current) return;

      const next = Math.min(
        1,
        Math.max(0, progressRef.current + pixelDelta * PROGRESS_PER_PIXEL),
      );
      progressRef.current = next;

      let reached = 0;
      for (let i = STOPS.length - 1; i > 0; i--) {
        if (next >= STOPS[i]) {
          reached = i;
          break;
        }
      }
      setStage((current) => (reached > current ? reached : current));

      if (next >= 1) {
        endingRef.current = true;
        beginExtinction();
      }
    };

    const handleWheel = (event) => {
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
      // the gesture completely alone: no preventDefault, no progress —
      // which is what makes a plain tap a no-op.
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
  }, [beginExtinction]);

  return (
    <div
      className="memories-root"
      ref={rootRef}
      tabIndex={-1}
      data-arrival={arrivalPhase}
    >
      <div className="memories-canvas-layer">
        <MemoriesScene
          progressRef={progressRef}
          reduceMotion={reduceMotion}
          phase={phase}
          arrival={arrivalPhase === "arrival"}
          arrivalProgressRef={arrivalProgressRef}
          onReady={arrivalPhase === "arrival" ? handleSceneReady : undefined}
        />
      </div>

      <div className="memories-vignette" aria-hidden="true" />

      <div ref={overlayRef} className="memories-entrance-overlay" aria-hidden="true" />
      <div ref={leaveRef} className="memories-leave-overlay" aria-hidden="true" />

      <div className="memories-hud" aria-hidden="true">
        ARCHIVE // MEMORIES
      </div>

      <p className="memories-visually-hidden" role="status">
        {arrivalPhase === "arrival"
          ? ARRIVAL_NARRATION
          : (PHASE_NARRATION[phase] ?? NARRATION[stage])}
      </p>
    </div>
  );
}
