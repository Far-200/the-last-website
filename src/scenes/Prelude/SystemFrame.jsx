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

// Reveal steps, in order:
//   0 — nothing yet
//   1 — recovery lines
//   2 — + title reveal ("THE INTERNET IS GONE.")
//   3 — + quiet subtext
//   4 — + status block (VOLUME LABEL ... CONNECTION ESTABLISHED)
export default function SystemFrame({ phase, revealStep = 0 }) {
  if (phase !== "system") return null;

  return (
    <div className="system-frame" aria-hidden="true">
      <div className="system-recovery">
        {systemCopy.recoveryLines.map((line, i) => (
          <div
            key={i}
            className={`system-line${line === "" ? " system-line--spacer" : ""}`}
          >
            {line}
          </div>
        ))}
      </div>

      {revealStep >= 2 && (
        <div className="system-reveal">
          <div className="system-reveal-title">{systemCopy.revealTitle}</div>
          {revealStep >= 3 && (
            <div className="system-reveal-subtext">
              {systemCopy.revealSubtext}
            </div>
          )}
        </div>
      )}

      {revealStep >= 4 && (
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
