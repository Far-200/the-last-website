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
import { terminalStates } from "../../data/terminalCopy";
import "./prelude.css";

// The visual frames are decorative/aria-hidden throughout (the storyboard's
// packet dumps, boot lines, and document chrome are atmosphere, not the
// literal content a screen reader needs). This one visually-hidden summary
// per phase keeps the actual narrative beats — the recovered fragment, the
// reveal, the human document — available non-visually, so "keep the full
// narrative understandable" holds for keyboard/screen-reader visitors too,
// not only for prefers-reduced-motion.
const PHASE_NARRATION = {
  signal: "A dead network signal. A connect control is available.",
  resolving: "Connecting. One fragment resolves: \"...GONE.\"",
  system:
    "A recovery system wakes. THE INTERNET IS GONE. But something is still moving in the wreckage. Connection established.",
  archive:
    "A recovered document from a.kaplan: THE INTERNET IS GONE. But something is still moving in the wreckage. An enter-archive control is available.",
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
  const [phase, setPhase] = useState("signal");
  const [systemRevealStep, setSystemRevealStep] = useState(0);
  const reduceMotion = usePrefersReducedMotion();
  const timelineRef = useRef(null);

  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

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

  const handleEnterArchive = useCallback(() => {
    if (phase !== "archive") return;
    setPhase("leaving");

    const tl = gsap.timeline({ onComplete: () => onConnected?.() });
    timelineRef.current = tl;
    tl.to({}, { duration: reduceMotion ? 0.05 : 0.65 });
  }, [phase, onConnected, reduceMotion]);

  const sceneLines = terminalStates[phase] ?? terminalStates.signal;

  return (
    <div className="prelude-root" data-phase={phase}>
      <div className="prelude-canvas-layer">
        <PreludeScene
          reduceMotion={reduceMotion}
          phase={phase}
          terminalLines={sceneLines}
        />
      </div>

      <div className="prelude-floor-glow" aria-hidden="true" />
      <div className="prelude-scanlines" aria-hidden="true" />
      <div className="prelude-grain" aria-hidden="true" />
      <div className="prelude-vignette" aria-hidden="true" />

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
