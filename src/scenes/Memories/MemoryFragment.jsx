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

const PANEL_W = 0.86;
const PANEL_H = 0.56;

const EMISSIVE_BASE = 0.34;
const EMISSIVE_BY_PHASE = { dimming1: 0, dimming2: 0, dark: 0, leaving: 0 };

function useMemoryTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 416;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#100c09";
    ctx.fillRect(0, 0, 640, 416);

    // Machine metadata stays in the system voice; the human line shifts
    // to the archive voice. Same split Prelude and Feed already use, so
    // the fragment sounds like it belongs to this archive.
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "22px 'Courier New', monospace";
    ctx.fillStyle = "#7a6650";
    ctx.fillText("DRAFT · NOT SENT", 44, 62);

    ctx.font = "20px 'Courier New', monospace";
    ctx.fillStyle = "#5d4e3d";
    ctx.fillText("11:58 PM", 44, 100);

    ctx.fillStyle = "#3a3026";
    ctx.fillRect(44, 132, 552, 1);

    // The line itself. Serif, lower case, no punctuation — typed quickly
    // by somebody who expected to press send.
    ctx.font = "italic 46px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#cbb08a";
    ctx.fillText("are you still awake", 44, 214);

    // A caret still sitting at the end of the line, because the message
    // was never finished with. Not blinking: nothing here is animated.
    ctx.fillStyle = "#8a7358";
    ctx.fillRect(468, 192, 3, 44);

    // Degradation, same technique the CAPTCHA panel uses — dead rows on
    // a display that has been on far too long.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    for (const [x, y, w, h] of [
      [0, 78, 640, 4],
      [0, 186, 640, 3],
      [0, 238, 640, 6],
      [0, 330, 640, 4],
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
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const target = EMISSIVE_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    smoothed.current += (target - smoothed.current) * amount;
    mat.emissiveIntensity = EMISSIVE_BASE * smoothed.current;
  });

  return (
    // Face-up and turned slightly, the way something gets set down rather
    // than placed. The tilt also catches the lamp across the panel
    // instead of letting it read as a flat lit rectangle.
    <group position={MEMORY_POSITION} rotation={[-Math.PI / 2 + 0.12, 0, 0.34]}>
      {/* The body of the device. */}
      <mesh position={[0, 0, -0.012]} castShadow receiveShadow>
        <boxGeometry args={[PANEL_W + 0.05, PANEL_H + 0.05, 0.022]} />
        <meshStandardMaterial color="#1b1613" roughness={0.72} metalness={0.12} />
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
  );
}
