// src/scenes/Prelude/ArchiveFrame.jsx
//
// DEPTH 03 — HUMAN / DEAD ARCHIVE. One recovered document dominates the
// composition — not the eight-fragment cloud from ArchiveFragments.jsx.
// System chrome recedes to a faint footnote beneath the document.
// Emotional hierarchy: human document first, machine metadata second.
//
// This frame holds once visible — it does not advance on its own. The
// visitor activates [ ENTER ARCHIVE ] to complete the Prelude.

import { useEffect, useRef } from "react";
import { archiveCopy } from "../../data/terminalCopy";

export default function ArchiveFrame({ phase, onEnter }) {
  const ctaRef = useRef(null);
  const isActive = phase === "archive" || phase === "leaving";
  const isLeaving = phase === "leaving";

  useEffect(() => {
    if (phase === "archive") ctaRef.current?.focus({ preventScroll: true });
  }, [phase]);

  if (!isActive) return null;

  return (
    <div
      className={`archive-frame${isLeaving ? " archive-frame--leaving" : ""}`}
    >
      <div className="archive-frame-index" aria-hidden="true">
        <div className="archive-index-line">{archiveCopy.indexLine}</div>
        <div className="archive-index-file">
          {archiveCopy.fileLine}{" "}
          <span className="archive-index-meta">{archiveCopy.fileMeta}</span>
        </div>
      </div>

      <div className="archive-document" aria-hidden="true">
        <div className="archive-document-header">
          <div className="archive-header-row">
            <span className="archive-header-label">FROM:</span>{" "}
            {archiveCopy.from}
          </div>
          <div className="archive-header-row">
            <span className="archive-header-label">DATE:</span>{" "}
            {archiveCopy.date}
          </div>
          <div className="archive-header-row">
            <span className="archive-header-label">SUBJECT:</span>{" "}
            {archiveCopy.subject}
          </div>
        </div>

        <div className="archive-document-body">
          <div className="archive-body-title">{archiveCopy.bodyTitle}</div>
          <div className="archive-body-subtext">
            {archiveCopy.bodySubtext}
          </div>
          <div className="archive-body-closing">
            {archiveCopy.bodyClosing}
            <span className="archive-body-truncated">
              {archiveCopy.bodyTruncated}
            </span>
          </div>
        </div>

        <div className="archive-attachment">
          <div className="archive-attachment-box">
            <span className="archive-attachment-corner" />
          </div>
          <div className="archive-attachment-label">
            {archiveCopy.attachmentName}
          </div>
          <div className="archive-attachment-state">
            {archiveCopy.attachmentState}
          </div>
        </div>
      </div>

      <div className="archive-footer-meta" aria-hidden="true">
        {archiveCopy.footerMeta.join("  ")}
      </div>

      <div className="archive-cta-block">
        <button
          type="button"
          ref={ctaRef}
          className="depth-cta archive-cta"
          onClick={onEnter}
          aria-label="Enter the archive"
        >
          {archiveCopy.cta}
        </button>
      </div>
    </div>
  );
}
