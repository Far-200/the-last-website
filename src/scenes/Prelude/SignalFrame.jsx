// src/scenes/Prelude/SignalFrame.jsx
//
// DEPTH 01 — SIGNAL. The initial screen: a restrained packet capture,
// almost entirely black, with the machine barely present in the
// darkness behind it. No title, no thesis, no boot log — only the
// signal outside the machine, and one word resolving out of the noise
// once the visitor connects.
//
// Two sub-phases live here: "signal" (idle, pre-click) and "resolving"
// (the brief checksum/fragment beat after click, before the SYSTEM
// frame takes over). Both are handled by this component so the
// packet-dump text doesn't jump-cut between frames.

import { signalCopy } from "../../data/terminalCopy";

export default function SignalFrame({ phase, onConnect }) {
  const isResolving = phase === "resolving";
  const isActive = phase === "signal" || phase === "resolving";

  if (!isActive) return null;

  return (
    <div className="signal-frame">
      {/* Decorative packet-dump text only — aria-hidden is scoped to this
          block, not the frame root, so the CTA button below stays in the
          accessibility tree and reachable by keyboard. */}
      <div className="signal-dump" aria-hidden="true">
        {/* --line drives the per-line print stagger in prelude.css. The
            machine puts the capture out a line at a time; it does not
            appear as a block. */}
        {signalCopy.promptLines.map((line, i) => (
          <div
            key={i}
            className={`signal-line${line === "" ? " signal-line--spacer" : ""}`}
            style={{ "--line": i }}
          >
            {line}
          </div>
        ))}

        <div
          className={`signal-hex${isResolving ? " signal-hex--active" : ""}`}
        >
          {signalCopy.hexLines.map((line, i) => (
            <div
              key={i}
              className="signal-line signal-line--hex"
              style={{ "--line": signalCopy.promptLines.length + i }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          className={`signal-fragment${
            isResolving ? " signal-fragment--visible" : ""
          }`}
        >
          [{signalCopy.fragmentLabel} {signalCopy.fragmentValue}]
        </div>
      </div>

      <div className="signal-cta-block">
        <button
          type="button"
          className="depth-cta signal-cta"
          onClick={onConnect}
          disabled={isResolving}
          aria-label="Connect to the last surviving signal"
        >
          {isResolving ? signalCopy.ctaResolving : signalCopy.cta}
        </button>
      </div>
    </div>
  );
}
