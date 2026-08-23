// src/scenes/Memories/MemoryFragmentPhoto.jsx
//
// The third and final private fragment — the "final surviving" one the
// visitor is left looking at when Memories begins to extinguish (see
// Memories.jsx's dimming1 -> dimming2 -> dark sequence). Physically
// distinct from the other two again: not a device at all, a printed
// scrap on the floor where it was dropped, so it is lit only by the
// room's own lamp rather than by anything of its own — a real
// photograph doesn't glow. A shallow backing box stands in for a torn
// edge: the darker box behind reads as a shadowed lip where the paper
// came away from whatever it was stuck to.
//
// Orientation: face-up, flat, not propped upright
// -------------------------------------------------
// The original design was a photo leaning upright against the wall it
// was found near. That fought the geometry of its own camera stop: this
// object sits at floor level and the camera looks steeply down at it
// (every stop in this scene does — see MemoriesCamera's header on why),
// so a vertical plane is nearly edge-on to that look angle almost
// regardless of which way it yaws. Two rounds of hand-solved yaw
// (checked against the real camera bearing, and later corrected again
// with `Object3D.lookAt`) both still rendered as a sliver or a
// trapezoid, confirmed by flooding the scene with light to isolate the
// framing from the lighting.
//
// It now lies flat, face up — the same orientation family as fragment
// one's device on the table (`-Math.PI/2` about X), which is the one
// fragment in this scene that never had a legibility problem, for
// exactly this reason: a camera looking down at something reads it best
// lying down, not standing up. A photo on the floor, dropped rather than
// propped, fits the "found among rubble" framing at least as well as
// leaning ever did.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PHOTO_POSITION } from "./layout";

const PHOTO_W = 0.5;
const PHOTO_H = 0.38;

// Emissive (0.8) ended up in the same range as the other two — voicemail
// at 1.0, fragment one at 0.34 — rather than staying the dimmest as
// originally intended: a photograph doesn't glow, but this fragment
// sits furthest from the lamp and carries the entire extinction beat, so
// legibility won out over that original ranking. It stays visually the
// smallest and least detailed of the three, which does most of the
// "quietest" work instead.
const EMISSIVE_BASE = 0.8;
// Holds through dimming1/dimming2 — this is the fragment still in frame
// while the other two go dark elsewhere in the room — and only
// extinguishes at "dark", the beat immediately before the scene fades
// out entirely.
const EMISSIVE_BY_PHASE = { dark: 0, leaving: 0 };

function usePhotoTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");

    // The "image" itself: an abstract pale field rather than an actual
    // picture — per the project's asset rules, no depicted photograph
    // of a person, generated or otherwise, and the point here is the
    // caption, not the image.
    ctx.fillStyle = "#3a3226";
    ctx.fillRect(0, 0, 512, 300);
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, "rgba(214,196,158,0.22)");
    grad.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 300);

    // The print's white border.
    ctx.fillStyle = "#e3d9c2";
    ctx.fillRect(0, 300, 512, 84);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillStyle = "#8a7a5c";
    ctx.fillText("IMG_0442.JPG · RECOVERED 61%", 22, 328);

    ctx.font = "italic 22px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#4a3f2c";
    ctx.fillText("first snow, finally", 22, 362);

    // A ragged band of loss across the image itself — most of what
    // "recovered 61%" actually means is visible, not just stated.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(0, 150, 210, 90);
    ctx.fillRect(340, 40, 172, 130);
    ctx.globalCompositeOperation = "source-over";

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export default function MemoryFragmentPhoto({ phase, reduceMotion }) {
  const map = usePhotoTexture();
  const materialRef = useRef(null);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const target = EMISSIVE_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.02, delta);
    smoothed.current += (target - smoothed.current) * amount;
    mat.emissiveIntensity = EMISSIVE_BASE * smoothed.current;
  });

  return (
    // Lying face up (-PI/2 about X) with a small tilt and a yaw for
    // orientation-only character, not for facing the camera — see the
    // file header for why this fragment stopped trying to stand upright.
    <group position={PHOTO_POSITION} rotation={[-Math.PI / 2 + 0.1, 0.4, 0.12]}>
      {/* The torn-edge shadow lip: a real box with actual depth (0.02),
          not a second coplanar-ish plane — an earlier version offset a
          second plane by only 0.006 units, which is a textbook
          z-fighting gap and produced a flickery, undecodable render. */}
      <mesh position={[0.01, -0.01, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[PHOTO_W + 0.03, PHOTO_H + 0.03, 0.02]} />
        <meshStandardMaterial color="#0a0806" roughness={0.95} metalness={0} />
      </mesh>
      {/* The photo itself, held proud of the backing box's own front
          face (box half-depth 0.01, so anything past Z = -0.01 clears
          it) rather than at the same depth. */}
      <mesh position={[0, 0, 0.03]} castShadow receiveShadow>
        <planeGeometry args={[PHOTO_W, PHOTO_H]} />
        <meshStandardMaterial
          ref={materialRef}
          map={map}
          emissiveMap={map}
          emissive="#c9b98a"
          emissiveIntensity={EMISSIVE_BASE}
          color="#c9b98a"
          roughness={0.86}
          metalness={0}
        />
      </mesh>
    </group>
  );
}
