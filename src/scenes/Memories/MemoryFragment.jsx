// src/scenes/Memories/MemoryFragment.jsx
//
// The single prototype memory for this pass. One fragment, not a
// collection — the question this has to answer is only whether the
// material reads as somebody's rather than as internet content.
//
// How it differs from a Feed fragment, deliberately
// -------------------------------------------------
// Feed's fragments are public residue: posts and group chats with
// handles and timestamps, framed as opaque cards with borders, scattered
// through a nave at architectural scale and readable from metres away.
// They are things that were addressed to everyone.
//
// This is a draft that was never sent. It has no handle, because there
// is no audience — only a recipient who never saw it. It is small enough
// (0.86 units) that the camera has to come within about two metres for
// it to resolve, so reading it is an act of leaning in rather than of
// passing by. It lies face-up on a surface where somebody put it down,
// lit by the room's one lamp rather than by its own screen, and its own
// emissive is barely above zero — a device on its last reserve, not a
// display demanding to be read.
//
// The copy is deliberately mundane. "are you still awake" carries the
// whole thing: someone was waiting up, wrote it, and did not send it.
// Nothing is explained and nothing is dramatised.
//
// Extinction: this is the first fragment found, and correspondingly the
// first to go dark once Memories' own ending begins — see the phase
// timeline in Memories.jsx. By the time the visitor is looking at the
// third fragment, this one (now well out of frame) has already faded.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MEMORY_POSITION } from "./layout";

// Enlarged for the draft stop's own legibility pass. At 0.86 x 0.56 the
// unfinished line rendered about 18 pixels tall at 1600x900 and the
// "DRAFT / NOT SENT" header was not readable at all — so the one thing
// the frame had to say, it could not say. 1.06 x 0.69 is the largest that
// still sits on this table's 1.9 x 1.05 top without looking placed for
// the camera, and it roughly doubles the line's height on screen.
const PANEL_W = 1.06;
const PANEL_H = 0.69;

// Raised with the size. This fragment is the hero of its own stop and it
// was reading dimmer than the table it sits on, because it happens to lie
// inside the lamp's brightest pool — the one place in the scene where a
// faint emissive cannot win. It now clearly leads its frame.
const EMISSIVE_BASE = 0.62;
// The fragment's own light. It already sits inside the lamp's pool, so
// this is the smallest of the three — just enough that the table
// immediately around the device is lifted by the DEVICE rather than only
// by the lamp, which is what makes the memory read as a source instead of
// as a lit object. Same phase table as the emissive above, so extinction
// takes the glow and the pool together in one beat.
const GLOW_INTENSITY = 1.15;
const GLOW_DISTANCE = 1.5;

// The caret reads a step above the line it sits at the end of, so the eye
// lands on the unfinished edge of the sentence rather than on its start.
const CARET_EMISSIVE = 1.5;

const EMISSIVE_BY_PHASE = { dimming1: 0, dimming2: 0, dark: 0, leaving: 0 };

// Canvas doubled and the type scaled with it. The words are unchanged —
// "DRAFT / NOT SENT", the timestamp and "are you still awake" are the
// scene's authored copy — only their size on the surface changed, which
// is what turns the panel from a warm smudge into a sentence the visitor
// can actually read at the stop the camera holds on.
const CANVAS_W = 1024;
const CANVAS_H = 666;

// Where the caret sits, as fractions of the panel, so the blinking mesh
// below and the drawn line can never drift apart.
const CARET_FX = 0.762;
const CARET_FY = 0.514;

function useMemoryTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#100c09";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Machine metadata stays in the system voice; the human line shifts
    // to the archive voice. Same split Prelude and Feed already use, so
    // the fragment sounds like it belongs to this archive.
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 38px 'Courier New', monospace";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
    ctx.fillStyle = "#8d7357";
    ctx.fillText("DRAFT · NOT SENT", 70, 100);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    ctx.font = "32px 'Courier New', monospace";
    ctx.fillStyle = "#6a5844";
    ctx.fillText("11:58 PM", 70, 160);

    ctx.fillStyle = "#43372a";
    ctx.fillRect(70, 212, CANVAS_W - 140, 2);

    // The line itself. Serif, lower case, no punctuation — typed quickly
    // by somebody who expected to press send. The caret that belongs at
    // the end of it is a separate mesh so that it can blink.
    ctx.font = "italic 74px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#d8bc93";
    ctx.fillText("are you still awake", 70, CANVAS_H * CARET_FY);

    // Degradation, same technique the CAPTCHA panel uses — dead rows on
    // a display that has been on far too long. Kept clear of the line
    // itself now that the line is the point of the frame.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    for (const [x, y, w, h] of [
      [0, 126, CANVAS_W, 5],
      [0, 258, CANVAS_W, 4],
      [0, 470, CANVAS_W, 7],
      [0, 560, CANVAS_W, 5],
    ]) {
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalCompositeOperation = "source-over";

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export default function MemoryFragment({ phase, reduceMotion }) {
  const map = useMemoryTexture();
  const materialRef = useRef(null);
  const glowRef = useRef(null);
  const caretRef = useRef(null);
  const clock = useRef(0);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const target = EMISSIVE_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    smoothed.current += (target - smoothed.current) * amount;
    mat.emissiveIntensity = EMISSIVE_BASE * smoothed.current;
    if (glowRef.current) glowRef.current.intensity = GLOW_INTENSITY * smoothed.current;
    // The caret is still blinking. It is the only thing in this scene
    // that is actively WAITING rather than merely left behind: a cursor
    // sitting at the end of an unfinished sentence, holding the line open
    // for somebody to come back and finish it. Slow — a little under one
    // cycle per second, and it dies with the rest of the fragment.
    if (caretRef.current) {
      clock.current += delta;
      const blink = Math.sin(clock.current * 3.1) > -0.35 ? 1 : 0.06;
      caretRef.current.emissiveIntensity =
        CARET_EMISSIVE * smoothed.current * (reduceMotion ? 0.75 : blink);
    }
  });

  return (
    // Face-up and turned slightly, the way something gets set down rather
    // than placed. The tilt also catches the lamp across the panel
    // instead of letting it read as a flat lit rectangle.
    <>
      {/* The memory as a light source — see GLOW_INTENSITY above.
          Deliberately NOT a shadow caster: three more shadow maps for
          a light this small would cost far more than it shows, and the
          lamp already owns every shadow in the scene. */}
      <pointLight
        ref={glowRef}
        position={[MEMORY_POSITION[0], MEMORY_POSITION[1] + 0.34, MEMORY_POSITION[2]]}
        intensity={GLOW_INTENSITY}
        distance={GLOW_DISTANCE}
        decay={2}
        color="#d9b184"
      />
      <group position={MEMORY_POSITION} rotation={[-Math.PI / 2 + 0.12, 0, 0.34]}>
      {/* The body of the device. */}
      <mesh position={[0, 0, -0.012]} castShadow receiveShadow>
        <boxGeometry args={[PANEL_W + 0.05, PANEL_H + 0.05, 0.022]} />
        <meshStandardMaterial color="#1b1613" roughness={0.72} metalness={0.12} />
      </mesh>
      {/* The caret, at the end of the line and still blinking. */}
      <mesh
        position={[(CARET_FX - 0.5) * PANEL_W, (0.5 - CARET_FY) * PANEL_H, 0.004]}
      >
        <planeGeometry args={[PANEL_W * 0.008, PANEL_H * 0.105]} />
        <meshStandardMaterial
          ref={caretRef}
          color="#100c09"
          emissive="#e6cda4"
          emissiveIntensity={CARET_EMISSIVE}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshStandardMaterial
          ref={materialRef}
          map={map}
          emissiveMap={map}
          emissive="#c98a4b"
          emissiveIntensity={EMISSIVE_BASE}
          color="#201913"
          roughness={0.46}
          metalness={0.08}
        />
      </mesh>
    </group>
    </>
  );
}
