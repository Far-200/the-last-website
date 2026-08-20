// src/scenes/Prelude/SystemFrame.jsx
//
// DEPTH 02 — SYSTEM. The machine wakes and reconstructs what it
// received. This is the ONLY place "THE INTERNET IS GONE." is first
// revealed — it must not have been visible during SignalFrame. The
// quieter follow-on line ("but something is still moving...") arrives
// after, and CONNECTION ESTABLISHED gets the single accent color.
//
// Lines reveal progressively rather than all at once, driven by a
// small step counter rather than a pile of independent setTimeouts —
// the parent sequence controller in Prelude.jsx owns pacing and simply
// tells this component how far to reveal via `revealStep`.

import { systemCopy } from "../../data/terminalCopy";

const WAKE_LINE_COUNT = 4;

// Reveal steps, in order:
//   0 — nothing yet
//   1 — machine wake fragment
//   2 — remaining recovery fragments
//   3 — title reveal ("THE INTERNET IS GONE.")
//   4 — quiet subtext
//   5 — subordinate status evidence
export default function SystemFrame({ phase, revealStep = 0 }) {
  if (phase !== "system") return null;

  return (
    <div className="system-frame" aria-hidden="true">
      <div className="system-recovery">
        {systemCopy.recoveryLines
          .slice(0, revealStep >= 2 ? undefined : WAKE_LINE_COUNT)
          .map((line, i) => (
          <div
            key={i}
            className={`system-line system-line--recovered${
              line === "" ? " system-line--spacer" : ""
            }`}
          >
            {line}
          </div>
          ))}
      </div>

      {revealStep >= 3 && (
        <div className="system-reveal">
          <div className="system-reveal-title">{systemCopy.revealTitle}</div>
          {revealStep >= 4 && (
            <div className="system-reveal-subtext">
              {systemCopy.revealSubtext}
            </div>
          )}
        </div>
      )}

      {revealStep >= 5 && (
        <div className="system-status">
          {systemCopy.statusLines.map((row) => (
            <div key={row.label} className="system-status-row">
              <span className="system-status-label">{row.label}</span>
              <span className="system-status-dots" aria-hidden="true" />
              <span
                className={`system-status-value${
                  row.accent ? " system-status-value--accent" : ""
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
