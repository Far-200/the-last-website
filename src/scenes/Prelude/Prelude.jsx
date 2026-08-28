// src/scenes/Prelude/Prelude.jsx
//
// Top-level Prelude composition. Owns the narrative depth sequence —
// signal -> resolving -> system -> archive -> leaving — as a single
// GSAP timeline rather than a pile of independent setTimeouts. Each
// depth excavates one more layer of the story (SIGNAL: the network
// outside the machine; SYSTEM: the machine's own recovery; HUMAN: the
// document buried underneath both) instead of exposing all of it at
// once.
//
// `onConnected` remains the single completion boundary for a future
// Prelude -> Feed transition. It now fires only once the visitor has
// read the recovered human document and actively chosen to continue
// past it via [ ENTER ARCHIVE ] — not as soon as the handshake
// resolves.

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import PreludeScene from "./PreludeScene";
import PreludeHUD from "./PreludeHUD";
import SignalFrame from "./SignalFrame";
import SystemFrame from "./SystemFrame";
import ArchiveFrame from "./ArchiveFrame";
import "./prelude.css";

// The visual frames are decorative/aria-hidden throughout (the storyboard's
// packet dumps, boot lines, and document chrome are atmosphere, not the
// literal content a screen reader needs). This one visually-hidden summary
// per phase keeps the actual narrative beats — the recovered fragment, the
// reveal, the human document — available non-visually, so "keep the full
// narrative understandable" holds for keyboard/screen-reader visitors too,
// not only for prefers-reduced-motion.
const PHASE_NARRATION = {
  awakening:
    "Waking in darkness. A collapsed room resolves: wreckage nearby, a broken ceiling above, and one damaged console that still has power.",
  signal: "A dead network signal. A connect control is available.",
  resolving: "Connecting. One fragment resolves: \"...GONE.\"",
  system:
    "A recovery system wakes. THE INTERNET IS GONE. But something is still moving in the wreckage. Connection established.",
  archive:
    "A recovered document from a.kaplan: \"IF ANYONE FINDS THIS—\" The rest is unrecoverable. An enter-archive control is available.",
  leaving: "Entering the archive.",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

export default function Prelude({ onConnected }) {
  const [phase, setPhase] = useState("awakening");
  const [systemRevealStep, setSystemRevealStep] = useState(0);
  const reduceMotion = usePrefersReducedMotion();
  const timelineRef = useRef(null);
  const awakeningTlRef = useRef(null);
  const lidTopRef = useRef(null);
  const lidBottomRef = useRef(null);
  const canvasLayerRef = useRef(null);
  // Drives the awakening rise, fog opening and console lead-in inside
  // PreludeScene — see AwakeningDolly there. Same split as
  // leavingProgressRef below: GSAP writes a plain ref every tick, one
  // useFrame reads it, and React never re-renders for it.
  const awakeningProgressRef = useRef(0);
  // The machine's own state: 0 dead, ~0.22 standby, 1 awake. GSAP flickers
  // this at the moment of contact and PreludeScene's lights read it.
  const consoleWakeRef = useRef(0);
  // Drives the leaving-phase forward dolly, fog tightening and light
  // dimming in PreludeScene — see LeavingDolly there. A ref, not state,
  // for the same reason progressRef is a ref throughout the project:
  // GSAP writes to it every tick and a per-frame consumer reads it
  // directly, so this never needs to trigger a React render.
  const leavingProgressRef = useRef(0);

  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

  // --- AWAKENING ------------------------------------------------------
  // The opening beat: a human consciousness coming to on the floor of the
  // room, finding the one machine in it that still has power, and rising
  // toward it. It is a PHASE of this component, not a separate scene, and
  // that is the whole reason the handoff into SIGNAL costs nothing —
  // there is no second Canvas, no second WebGL context, no mount swap to
  // conceal. AwakeningDolly simply stops writing and CameraResponse picks
  // up at a pose it is already at (the last AWAKENING_KEYS entry is
  // CAMERA_BY_PHASE.signal exactly).
  //
  // GSAP owns the discrete beats — eyelid travel, the blink, the focus
  // hunt — as direct DOM tweens, and separately ramps the plain
  // awakeningProgressRef the render loop reads for the camera. That is the
  // project's standing split, not a new mechanism.
  //
  // The eyelids are DOM, deliberately. They are the cheapest honest
  // first-person device available: no hands, no body, no character, no
  // FPS controller — just the frame closing and opening the way an eye
  // does, with a curved inner edge so it never reads as a letterbox.
  useEffect(() => {
    const top = lidTopRef.current;
    const bottom = lidBottomRef.current;
    const canvasLayer = canvasLayerRef.current;
    if (!top || !bottom || !canvasLayer) return undefined;

    const focus = { blur: reduceMotion ? 7 : 13 };
    const applyBlur = () => {
      canvasLayer.style.filter = focus.blur < 0.08 ? "" : `blur(${focus.blur.toFixed(2)}px)`;
    };
    applyBlur();

    const tl = gsap.timeline({
      onComplete: () => {
        canvasLayer.style.filter = "";
        canvasLayer.style.willChange = "";
        setPhase("signal");
      },
    });
    awakeningTlRef.current = tl;

    // Reduced motion keeps ALL SIX BEATS — darkness, waking (including
    // the eyes failing once, which is a lid translate and carries no
    // vestibular load), orientation, discovery, the reach, and the
    // machine answering. What it drops is only what moves the whole
    // field of view: the camera never moves at all (see AwakeningDolly's
    // own reduceMotion branch), there is no blink, and focus settles once
    // instead of hunting. It runs at roughly half length and is a
    // shorter version of the same scene, not a fallback. It wakes close
    // to the CRT and keeps only a restrained orientation and short settle.
    if (reduceMotion) {
      tl.to(awakeningProgressRef, { current: 1, duration: 3.8, ease: "none" }, 0);
      // Waking, including the eyes failing once — a lid translate, no
      // vestibular load, and the most human thing in the sequence.
      tl.to([top, bottom], { scaleY: 0.8, duration: 0.7, ease: "power1.inOut" }, 0.5);
      tl.to([top, bottom], { scaleY: 0.92, duration: 0.32, ease: "power2.in" }, 1.55);
      tl.to([top, bottom], { scaleY: 0.07, duration: 1.3, ease: "power2.out" }, 2.1);
      tl.to(focus, { blur: 0, duration: 1.5, ease: "power2.out", onUpdate: applyBlur }, 2.1);
      // Discovery, then the same call-and-response as full motion: the
      // machine stirs, nothing happens for a beat, then it catches.
      tl.to(consoleWakeRef, { current: 0.24, duration: 0.18, ease: "none" }, 4.35);
      tl.to(consoleWakeRef, { current: 0.08, duration: 0.2, ease: "power1.out" }, 4.55);
      tl.to(consoleWakeRef, { current: 0.95, duration: 0.09, ease: "none" }, 5.05);
      tl.to(consoleWakeRef, { current: 0.2, duration: 0.08, ease: "none" }, 5.16);
      tl.to(consoleWakeRef, { current: 1, duration: 0.7, ease: "power2.out" }, 5.26);
      tl.to({}, { duration: 0.45 }, 6.05);
      return () => {
        tl.kill();
        canvasLayer.style.filter = "";
      };
    }

    canvasLayer.style.willChange = "filter";

    // Absolute positions rather than a sequential chain, so the six beats
    // and the silences between them are readable as a score. The previous
    // version chained everything back to back, and back-to-back is
    // exactly what made it feel mechanical: there was never a moment
    // where nothing was happening.
    // `open` is how far the eyes are open, 0 shut to 100 wide. Driven as
    // a scale toward each lid's own anchored edge rather than a
    // translate — see the note on .prelude-lid--top in prelude.css for
    // why a translate here scrolled the entire scene.
    const lids = (open, duration, ease, at) =>
      tl.to([top, bottom], { scaleY: 1 - open / 100, duration, ease }, at);
    const blurTo = (blur, duration, ease, at) =>
      tl.to(focus, { blur, duration, ease, onUpdate: applyBlur }, at);

    // 1 — DARKNESS. Longer than feels necessary, which is the point.
    // 2 — WAKING. The eyes crack open, fail, and close again before they
    //     manage it. That failure is the single most human thing in the
    //     sequence: consciousness does not arrive on a curve.
    lids(18, 1.0, "power1.inOut", 1.45);
    blurTo(11, 1.0, "none", 1.45);
    lids(7, 0.45, "power2.in", 2.95); // it doesn't hold — eyes fall shut
    blurTo(12.5, 0.45, "none", 2.95);

    // A second, successful attempt, slower and further.
    lids(46, 1.35, "power1.inOut", 4.35);
    blurTo(7.4, 1.5, "none", 4.35);

    // 3 — ORIENTATION. A blink, then all the way open, then focus hunts:
    //     sharp, soft again, sharp. An eye finding focus overshoots.
    lids(13, 0.14, "power2.in", 6.25);
    blurTo(9.5, 0.14, "none", 6.25);
    lids(64, 0.24, "power2.out", 6.39);
    lids(93, 1.7, "power2.out", 6.8);
    blurTo(1.5, 0.95, "power2.out", 6.8);
    blurTo(3.4, 0.55, "sine.inOut", 7.85);
    blurTo(0, 1.15, "power2.out", 8.4);

    // 4 — DISCOVERY. The machine comes up out of dead into a standby
    //     glow — noticeable, not readable — while the camera is still
    //     rising toward it.
    // 5 — ACCESS. The camera has just arrived at the lean (see the 0.76
    //     keyframe) and now holds. The machine STIRS — barely, once — as
    //     though it registered something, and then falls back. Nothing
    //     happens for most of a second after that.
    //
    //     That silence is the beat. It is the visitor deciding, and it is
    //     what an intentional act looks like when the actor is never
    //     shown: approach, a flicker of acknowledgement, a pause, and
    //     then commitment. The response below is an ANSWER to it.
    tl.to(consoleWakeRef, { current: 0.38, duration: 0.15, ease: "none" }, 14.9);
    tl.to(consoleWakeRef, { current: 0.08, duration: 0.24, ease: "power1.out" }, 15.07);

    // 6 — RESPONSE. Not a fade-up — a dead panel finding power, losing
    //     it, finding it again, and holding. Under half a second of
    //     flicker, and it is the emotional hinge of the whole opening.
    tl.to(consoleWakeRef, { current: 0.95, duration: 0.07, ease: "none" }, 15.55);
    tl.to(consoleWakeRef, { current: 0.12, duration: 0.06, ease: "none" }, 15.64);
    tl.to(consoleWakeRef, { current: 1, duration: 0.09, ease: "none" }, 15.72);
    tl.to(consoleWakeRef, { current: 0.38, duration: 0.08, ease: "none" }, 15.83);
    tl.to(consoleWakeRef, { current: 1, duration: 0.7, ease: "power2.out" }, 15.93);

    // The camera is already stopped on the physical screen normal before
    // the wake begins. After the stable catch the phase flips and output
    // arrives afterwards, in
    // stages, in CSS — see prelude.css.
    tl.to(awakeningProgressRef, { current: 1, duration: 14.2, ease: "none" }, 0);
    tl.to({}, { duration: 0.5 }, 16.65);

    return () => {
      tl.kill();
      canvasLayer.style.filter = "";
      canvasLayer.style.willChange = "";
    };
  }, [reduceMotion]);

  // The resolving -> system -> archive sequence, authored as a single
  // GSAP timeline of state-setter calls. Durations follow the pacing
  // guidance (resolve ~1s, system wake ~1.2s, recovery lines ~2.3s,
  // status ~1s, then hold on archive) but stay tunable in one place.
  // Under reduced motion, the same phase order plays with short, equal
  // steps so every state remains reachable and understandable.
  const runSequence = useCallback(() => {
    const tl = gsap.timeline();
    timelineRef.current = tl;

    const step = (fn, duration) => {
      tl.call(fn);
      if (duration > 0) tl.to({}, { duration });
    };

    const d = reduceMotion
      ? {
          resolve: 0.7,
          wake: 0.9,
          recovery: 1.25,
          title: 1.65,
          subtext: 1.35,
          status: 1.75,
          hold: 1.8,
        }
      : {
          resolve: 1,
          wake: 0.7,
          recovery: 1.05,
          title: 0.9,
          subtext: 0.7,
          status: 0.85,
          hold: 1.25,
        };

    step(() => setPhase("resolving"), d.resolve);
    step(() => {
      setPhase("system");
      setSystemRevealStep(1);
    }, d.wake);
    step(() => setSystemRevealStep(2), d.recovery);
    step(() => setSystemRevealStep(3), d.title);
    step(() => setSystemRevealStep(4), d.subtext);
    step(() => setSystemRevealStep(5), d.status);
    step(() => undefined, d.hold);
    step(() => setPhase("archive"), 0);
  }, [reduceMotion]);

  const handleConnect = useCallback(() => {
    if (phase !== "signal") return;
    runSequence();
  }, [phase, runSequence]);

  // The Prelude -> Feed match cut. Under full motion this is a real
  // forward dolly (see LeavingDolly in PreludeScene.jsx): the camera
  // pushes forward, levels its pitch and widens toward Feed's own FOV
  // while the scene's existing fog and lights darken toward the cut, so
  // the world itself occludes the frame rather than a DOM overlay doing
  // it. `onConnected` fires at leavingProgressRef reaching 1 — the
  // darkest, most-forward frame — which is also the least perceptible
  // moment for App.jsx's scene swap to land on.
  //
  // Reduced motion skips the dolly entirely (no translation, no FOV
  // change — see LeavingDolly's own reduceMotion branch) rather than
  // just playing it faster: a moving camera is exactly the vestibular
  // trigger prefers-reduced-motion exists to avoid. What's left is a
  // brief hold, short enough that it reads as a beat, not a stall.
  const handleEnterArchive = useCallback(() => {
    if (phase !== "archive") return;
    setPhase("leaving");

    const tl = gsap.timeline({ onComplete: () => onConnected?.() });
    timelineRef.current = tl;
    tl.to(leavingProgressRef, {
      current: 1,
      duration: reduceMotion ? 0.65 : 2.6,
      ease: "none",
    });
  }, [phase, onConnected, reduceMotion]);

  return (
    <div className="prelude-root" data-phase={phase}>
      <div className="prelude-canvas-layer" ref={canvasLayerRef}>
        <PreludeScene
          reduceMotion={reduceMotion}
          phase={phase}
          leavingProgressRef={leavingProgressRef}
          awakeningProgressRef={awakeningProgressRef}
          consoleWakeRef={consoleWakeRef}
        />
      </div>

      <div className="prelude-floor-glow" aria-hidden="true" />
      <div className="prelude-scanlines" aria-hidden="true" />
      <div className="prelude-grain" aria-hidden="true" />
      <div className="prelude-vignette" aria-hidden="true" />

      {/* The visitor's own eyelids. Above every other layer, including the
          depth frames, so nothing can render on top of a closed eye. They
          never fully retract — a few percent stays at each edge for the
          rest of the scene, which keeps the first-person read alive and
          doubles as a softer frame than the vignette alone. */}
      <div ref={lidTopRef} className="prelude-lid prelude-lid--top" aria-hidden="true" />
      <div ref={lidBottomRef} className="prelude-lid prelude-lid--bottom" aria-hidden="true" />

      <PreludeHUD phase={phase} />

      <p className="prelude-sr-narration" role="status">
        {PHASE_NARRATION[phase]}
      </p>

      <SignalFrame phase={phase} onConnect={handleConnect} />
      <SystemFrame phase={phase} revealStep={systemRevealStep} />
      <ArchiveFrame phase={phase} onEnter={handleEnterArchive} />
    </div>
  );
}
