// src/scenes/Memories/Memories.jsx
//
// Top-level Memories composition. Follows the same shape Feed and the
// Graveyard already established — progress in a ref, wheel input owned
// here, a GSAP entrance overlay, a `role="status"` narration layer — so
// the scene architecture stays uniform even though the space itself is
// the opposite of the one before it.
//
// Mounts only after the Graveyard's verification sequence has faded to
// `#0b0806` (see Graveyard.jsx and graveyard.css). This scene's entrance
// overlay starts at that identical value rather than at black, so the
// two scenes share one continuous surface across the React swap: the
// mount change happens behind a colour that never moves, and what the
// visitor sees is warmth resolving out of the dark they were already in
// — not a page becoming another page.
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
  const [stage, setStage] = useState(0);

  // Single-fire guard for the extinction trigger — mirrors Feed's
  // crossingRef exactly. A ref because the wheel handler must decide
  // synchronously whether the sequence has already started; waiting on
  // a React state read/render here would let a burst of wheel events
  // between mount and the next render re-fire it.
  const endingRef = useRef(false);
  const [phase, setPhase] = useState("idle");

  const runEntrance = useCallback(() => {
    const tl = gsap.timeline();
    entranceTlRef.current = tl;
    // Slower than the Graveyard's entrance and starting from a warm dark
    // rather than black: the Graveyard arrived as a hard threshold, this
    // one has to arrive as something thawing.
    tl.to(overlayRef.current, {
      opacity: 0,
      duration: reduceMotion ? 0.3 : 3.2,
      ease: "power1.inOut",
      delay: reduceMotion ? 0.05 : 0.5,
    });
  }, [reduceMotion]);

  useEffect(() => {
    runEntrance();
    return () => entranceTlRef.current?.kill();
  }, [runEntrance]);

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

    const handleWheel = (event) => {
      event.preventDefault();
      // Progression stops the instant the ending begins, exactly like
      // Feed's own threshold: nothing should be able to keep nudging the
      // already-settled final camera position while the room is fading.
      if (endingRef.current) return;

      const pixelDelta = event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
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

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [beginExtinction]);

  return (
    <div className="memories-root" ref={rootRef}>
      <div className="memories-canvas-layer">
        <MemoriesScene progressRef={progressRef} reduceMotion={reduceMotion} phase={phase} />
      </div>

      <div className="memories-vignette" aria-hidden="true" />

      <div ref={overlayRef} className="memories-entrance-overlay" aria-hidden="true" />
      <div ref={leaveRef} className="memories-leave-overlay" aria-hidden="true" />

      <div className="memories-hud" aria-hidden="true">
        ARCHIVE // MEMORIES
      </div>

      <p className="memories-visually-hidden" role="status">
        {PHASE_NARRATION[phase] ?? NARRATION[stage]}
      </p>
    </div>
  );
}
