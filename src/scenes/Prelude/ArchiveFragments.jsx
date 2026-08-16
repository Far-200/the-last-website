// src/scenes/Prelude/ArchiveFragments.jsx
//
// Floating "dead website" fragments rendered as plain DOM/CSS, not
// Three.js meshes — typography stays crisp and cheap. Positioning
// follows the reference composition:
//   404 window        -> upper-left
//   disconnected      -> upper-right
//   error log         -> far upper-right
//   archived post #1  -> lower-left
//   dead video        -> left of CRT / lower-left area
//   group chat        -> right-middle
//   @spacecadet post  -> far-right / lower-middle
//   missing attachment-> lower-right
//
// All fragments are decorative (aria-hidden) — they set atmosphere but
// carry no information the user needs to complete the primary task.

import { archiveFragments } from "../../data/terminalCopy";

function Fragment404({ data }) {
  return (
    <div className="frag frag-404 frag--clip-tr" aria-hidden="true">
      <div className="frag-browser-bar">
        <span className="frag-browser-dots">
          <span className="frag-browser-dot" />
          <span className="frag-browser-dot" />
        </span>
        <span className="frag-browser-url">{data.url}</span>
        <span className="frag-close">×</span>
      </div>
      <div className="frag-404-code">{data.heading}</div>
      <div className="frag-404-sub">{data.subheading}</div>
    </div>
  );
}

function FragmentDialog({ data }) {
  return (
    <div className="frag frag-dialog frag--border-broken" aria-hidden="true">
      <div className="frag-titlebar">
        <span className="frag-dot frag-dot--dead" />
        <span className="frag-dot" />
        <span className="frag-close">×</span>
      </div>
      <div className="frag-dialog-title">{data.title}</div>
      <div className="frag-dialog-body">
        {data.body.split("\n").map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <button className="frag-dialog-action" tabIndex={-1}>
        {data.action}
      </button>
    </div>
  );
}

function FragmentLog({ data }) {
  return (
    <div className="frag frag-log" aria-hidden="true">
      <div className="frag-titlebar frag-titlebar--plain">
        <span className="frag-log-glitch">{data.title}</span>
        <span className="frag-close">×</span>
      </div>
      <div className="frag-log-lines">
        {data.lines.map((l) => (
          <div key={l.key} className="frag-log-line">
            <span className="frag-log-key">{l.key}</span> ={" "}
            <span className={l.warn ? "frag-log-warn" : ""}>{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentPost({ data }) {
  return (
    <div className="frag frag-post" aria-hidden="true">
      <div className="frag-post-handle">{data.handle}</div>
      <div className="frag-post-time">{data.timestamp}</div>
      <div className="frag-post-body">
        {data.body.split("\n").map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function FragmentVideo({ data }) {
  return (
    <div className="frag frag-video frag--clip-tr" aria-hidden="true">
      <div className="frag-video-thumb">
        <span className="frag-play">▶</span>
      </div>
      <div className="frag-video-title">
        {data.title.split("\n").map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <div className="frag-video-meta">{data.meta}</div>
    </div>
  );
}

function FragmentChat({ data }) {
  return (
    <div className="frag frag-chat" aria-hidden="true">
      <div className="frag-titlebar frag-titlebar--plain">
        <span>{data.title}</span>
        <span className="frag-close">×</span>
      </div>
      <div className="frag-chat-lines">
        {data.lines.map((line, i) => (
          <div key={i} className="frag-chat-line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentMissing({ data }) {
  return (
    <div className="frag frag-missing frag--clip-bl" aria-hidden="true">
      <div className="frag-missing-title">{data.title}</div>
      <div className="frag-missing-icon">?</div>
      <div className="frag-missing-body">
        {data.body.split("\n").map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

const RENDERERS = {
  browser404: Fragment404,
  dialog: FragmentDialog,
  log: FragmentLog,
  post: FragmentPost,
  video: FragmentVideo,
  chat: FragmentChat,
  missing: FragmentMissing,
};

export default function ArchiveFragments() {
  return (
    <div className="archive-fragments">
      {archiveFragments.map((data) => {
        const Renderer = RENDERERS[data.type];
        if (!Renderer) return null;
        return (
          <div
            key={data.id}
            className={`frag-slot frag-slot--${data.position}`}
          >
            <Renderer data={data} />
          </div>
        );
      })}
    </div>
  );
}
