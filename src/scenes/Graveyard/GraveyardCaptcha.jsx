// src/scenes/Graveyard/GraveyardCaptcha.jsx
//
// The Graveyard's hero landmark: a machine still asking a dead world to
// prove it's human. A dead interface that became a monument.
//
// Why this was rebuilt rather than retuned
// ----------------------------------------
// The blockout was a 13 x 76 x 3 slab — a 1:5.8 needle — lit by a single
// pointLight with decay 2 aimed at its flat front face, with the
// interface carried by a 200px `<Html>` card. In the render that
// resolved to exactly what it was: a dark rectangle with a circular
// flashlight blob on it and a small web card floating against it. Three
// things were structurally wrong, and none of them were numbers:
//
//   1. NO ARCHITECTURE. A single box has one visible face. There were no
//      returns, no reveals, no depth for light to rake across — so no
//      amount of relighting could have produced anything but a flat
//      rectangle. The monument is now built as a frame standing proud of
//      a recessed core: jambs, lintel and sill project 4 units forward of
//      the back face, which creates a genuine 4-unit-deep reveal with
//      real interior side surfaces. Those surfaces are what catch the
//      grazing key and read as mass.
//   2. NO FOUNDATION. It met the ground at a hairline. It now stands on
//      a two-step plinth 54 units across — wider than the body, so the
//      silhouette reads as something built rather than something
//      dropped.
//   3. THE INTERFACE WAS DOM. An `<Html>` card is not lit, not fogged and
//      not tone mapped, so by construction it could never be part of the
//      building — it could only ever sit in front of it. The interface is
//      now a canvas texture on a panel inset *inside* the reveal, lit and
//      fogged with everything else, at a size set by the architecture
//      (20 units wide) rather than by a CSS pixel width.
//
// Fog exemption is also gone. The blockout used `fog={false}` to stay
// visible at distance, which made it a crisp unchanging cut-out. It is
// now fogged like everything else, so at the route's start it is a faint
// abnormal vertical value against the horizon and it *emerges* over the
// approach — which is the recognition curve the scene is built around.

// Staging note (aftermath pass)
// -----------------------------
// The machine is intact and the world around it is not. That contrast is
// the point of the scene, so the monument's own geometry stays precise
// and vertical while its FOUNDATION and surroundings carry the damage:
// a chunk broken off one corner of the plinth and slid clear, rubble
// drifted against one side only, a trunk conduit still entering the base
// where it always did. Nothing here is mirrored — a symmetric monument
// with matching debris either side is temple staging, and the brief for
// this scene is a machine left running because nobody was left to
// switch it off.

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAPTCHA_X, CAPTCHA_Z, GROUND_Y } from "./GraveyardArchitecture";
import { groundHeightAt } from "./groundHeight";

// --- Proportions ------------------------------------------------------
// Authored as a monument, not a screen: 34 wide against 58 tall is
// roughly 1:1.7, which reads as a standing stone. The blockout's 1:5.8
// read as a pole.
const BASE_LOWER = { w: 54, h: 3, d: 26 };
const BASE_UPPER = { w: 44, h: 4, d: 20 };
const BASE_H = BASE_LOWER.h + BASE_UPPER.h; // 7

const BODY_W = 34;
const BODY_H = 51;
const BODY_D = 13;

const FRAME_D = 4; // how far the frame stands proud of the recessed core
const JAMB_W = 6;
const LINTEL_H = 7;
const SILL_H = 6;

export const CAPTCHA_TOTAL_H = BASE_H + BODY_H; // 58

const BODY_FRONT = BODY_D / 2; // +6.5
const CORE_FRONT = BODY_FRONT - FRAME_D; // +2.5 — the back of the reveal
const CORE_D = BODY_D - FRAME_D; // 9, spanning z -6.5 .. +2.5
const BODY_MID_Y = BASE_H + BODY_H / 2;

// The interface panel sits in the upper half of the reveal, leaving the
// space below it empty and dark — a machine with one thing left lit.
//
// Narrowed from 20 to 18 in the staging pass. The camera now closes on
// the monument from ~18 degrees off its face normal rather than head-on,
// and across a 4-unit-deep reveal that obliquity puts the near jamb over
// about 1.3 units of the opening's width. At 20 wide inside a 22-wide
// opening the jamb clipped the panel's edge; at 18 there are 2 units of
// margin a side and the interface stays whole.
const PANEL_W = 18;
const PANEL_H = 11.25;
const PANEL_Y = BASE_H + BODY_H * 0.59;

// Recognition timing, pushed late. The CAPTCHA is the punchline of the
// Graveyard, not its objective: the visitor should spend the first half
// of the route reading the aftermath, register an unnaturally regular
// structure somewhere in it, and only near the end resolve what it
// actually says. Earlier values (0.5 -> 0.88) had the text arriving
// while the visitor was still crossing the middle of the site.
const REVEAL_START = 0.62;
const REVEAL_END = 0.93;
const EMISSIVE_MIN = 0.015;
const EMISSIVE_MAX = 1.25;

const CONCRETE_LIGHT = "#20252a";
const CONCRETE_MID = "#171b1f";
const CONCRETE_DARK = "#101315";

// --- Verification states ----------------------------------------------
// The status copy the machine puts on its own display. Deliberately flat
// system language: the failure is infrastructural, and it never suggests
// the visitor got anything wrong. "SERVICE UNAVAILABLE" says the service
// is gone; a phrasing like "verification failed" would have said the
// person failed, which is the opposite of this scene's point.
//
// The second line inverts the Prelude's own "1 NODE RESPONDED". At the
// start of the experience exactly one node answered; here none do.
const FAILED_STATUS = [
  "VERIFICATION SERVICE UNAVAILABLE",
  "no verification node responded",
];
// Once the machine has failed it KEEPS reporting the failure, unchanged,
// through every remaining phase — including the ones in which the service
// door opens and the visitor walks away down the stairs. Nothing about
// the exit is the machine relenting; it is still saying the same sentence
// to nobody while the camera leaves.
const STATUS = {
  verifying: ["VERIFYING...", null],
  reaching: ["VERIFYING HUMAN RESPONSE...", null],
  failed: FAILED_STATUS,
  seam: FAILED_STATUS,
  opening: FAILED_STATUS,
  descending: FAILED_STATUS,
  leaving: FAILED_STATUS,
};
const FAILED_PHASES = new Set(["failed", "seam", "opening", "descending", "leaving"]);
// Once the visitor has ticked the box it STAYS ticked, including through
// the failure. The human asserted themselves; it is the machine that
// cannot confirm it. Draining the tick back out would have read as the
// visitor's input being rejected.
const TICKED = new Set([
  "verifying",
  "reaching",
  "failed",
  "seam",
  "opening",
  "descending",
  "leaving",
]);

// The checkbox row's extent on the 1024x640 canvas. Exported as fractions
// because the hit target in world space is derived from exactly these
// numbers — see CHECKBOX_HIT below. Keeping one source for both means the
// clickable region cannot drift away from the thing that looks clickable.
const ROW = { x0: 292, x1: 753, y0: 392, y1: 456 };

// The interface, drawn to a canvas. Canvas 2D rather than a 3D text
// helper on purpose: it needs no font fetched at runtime (the project
// self-hosts and takes no CDN font dependency), it costs one texture, and
// it allows the paint to be degraded, which geometry text cannot be.
// Redrawn on each phase change — six redraws across the whole scene, so
// this never touches the per-frame path.
function drawInterface(ctx, phase) {
  // Near-black ground so the emissive map contributes only where the
  // marks actually are.
  ctx.fillStyle = "#050708";
  ctx.fillRect(0, 0, 1024, 640);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Letter spacing is what stops this reading as body copy and starts
  // it reading as signage. Guarded because support is uneven; without
  // it the line simply sets tighter, which still works.
  if ("letterSpacing" in ctx) ctx.letterSpacing = "7px";
  ctx.font = "bold 66px 'Courier New', monospace";
  ctx.fillStyle = "#cfd8db";
  ctx.fillText("PROVE YOU ARE HUMAN", 512, 196);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  // A hairline rule, the way an old form separated its prompt from its
  // control.
  ctx.fillStyle = "#394346";
  ctx.fillRect(232, 286, 560, 2);

  // The checkbox: stroked geometry rather than a glyph, so it renders
  // identically regardless of what font actually resolved. When the
  // control is live it brightens a little, and a little more under the
  // cursor — the only affordance this scene gets. No button chrome, no
  // instruction text: the world stays the interface.
  const live = phase === "armed";
  ctx.strokeStyle = live ? "#c2ced2" : "#9aa7ab";
  ctx.lineWidth = live ? 5 : 4;
  ctx.strokeRect(292, 396, 56, 56);

  if (TICKED.has(phase)) {
    ctx.fillStyle = "rgba(154,167,171,0.22)";
    ctx.fillRect(296, 400, 48, 48);
    ctx.strokeStyle = "#cfd8db";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(303, 421);
    ctx.lineTo(316, 437);
    ctx.lineTo(339, 407);
    ctx.stroke();
  }

  ctx.textAlign = "left";
  ctx.font = "42px 'Courier New', monospace";
  ctx.fillStyle = "#b3bfc3";
  ctx.fillText("I'm not a robot", 378, 426);

  const status = STATUS[phase];
  if (status) {
    ctx.textAlign = "center";
    // Sized up from 34/26 after the first render: this is the emotional
    // payoff of the whole scene and at the closing camera distance the
    // smaller setting was legible but effortful, and the second line
    // barely resolved at all.
    ctx.font = "40px 'Courier New', monospace";
    // The failure reads no louder than the prompt above it. No red, no
    // emphasis — the machine reports it the way it would report anything.
    ctx.fillStyle = FAILED_PHASES.has(phase) ? "#9aa6aa" : "#a9b5b9";
    ctx.fillText(status[0], 512, 528);
    if (status[1]) {
      ctx.font = "30px 'Courier New', monospace";
      ctx.fillStyle = "#6b787c";
      ctx.fillText(status[1], 512, 580);
    }
  }

  // Degradation. Irregular dead bands knocked out of the paint — a
  // display with rows that stopped reporting a long time ago. Bands
  // deliberately clip the title and the checkbox row rather than
  // sitting in empty space, so the damage reads as damage.
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  const bands = [
    [0, 168, 1024, 7],
    [0, 214, 1024, 4],
    [0, 300, 1024, 10],
    [0, 408, 1024, 5],
    [0, 452, 1024, 8],
    [0, 545, 1024, 6],
  ];
  for (const [x, y, w, h] of bands) ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = "source-over";
}

// The canvas is painted BEFORE the texture is constructed from it, so
// there is never a mutation of a value a hook handed back — no
// `needsUpdate`, no ref written during render. The memo is keyed on
// phase alone, which is at most six paints across the whole scene; the
// effect disposes each previous texture as it is replaced.
//
// Hover deliberately does NOT key this. Routing a pointer-over through a
// texture rebuild would allocate and free a 1024x640 texture every time
// the cursor crossed the control, so the hover affordance lives on the
// material instead (see InterfacePanel).
function useInterfaceTexture(phase) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    drawInterface(canvas.getContext("2d"), phase);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [phase]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// The clickable region, derived from ROW so it matches the checkbox and
// its label and nothing else. Explicitly NOT the monument: a 34x58 slab
// that responds to a click anywhere on it would make the whole landmark
// a button, which is neither honest about what is interactive nor
// consistent with the world staying the interface.
const CHECKBOX_HIT = {
  x: ((ROW.x0 + ROW.x1) / 2 / 1024 - 0.5) * PANEL_W,
  y: PANEL_Y + (0.5 - (ROW.y0 + ROW.y1) / 2 / 640) * PANEL_H,
  // Padded a little past the drawn row so touch has a fair target.
  w: ((ROW.x1 - ROW.x0) / 1024) * PANEL_W + 1.2,
  h: ((ROW.y1 - ROW.y0) / 640) * PANEL_H + 0.8,
};

function InterfacePanel({ progressRef, reduceMotion, phase, onActivate }) {
  const [hovered, setHovered] = useState(false);
  const map = useInterfaceTexture(phase);
  const materialRef = useRef(null);
  const smoothed = useRef(0);
  const hoverLift = useRef(0);

  const armed = phase === "armed";

  // Restore the cursor on unmount as well as on pointer-out: the scene
  // swaps away the moment verification completes, and a stale "pointer"
  // left on document.body would outlive this component.
  useEffect(() => {
    if (!armed) return undefined;
    return () => {
      document.body.style.cursor = "";
    };
  }, [armed]);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const target = THREE.MathUtils.smoothstep(
      progressRef.current,
      REVEAL_START,
      REVEAL_END,
    );
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.002, delta);
    smoothed.current += (target - smoothed.current) * amount;

    // The hover affordance: the panel lifts fractionally under the
    // cursor. Applied here rather than through a texture repaint so
    // crossing the control costs nothing, and kept very small — a dying
    // display responding a little to being touched, not a button state.
    const wantLift = hovered ? 0.22 : 0;
    hoverLift.current += (wantLift - hoverLift.current) * (reduceMotion ? 1 : 1 - Math.pow(0.02, delta));

    mat.emissiveIntensity =
      EMISSIVE_MIN + (EMISSIVE_MAX - EMISSIVE_MIN) * smoothed.current + hoverLift.current;
  });

  return (
    <>
      <mesh position={[0, PANEL_Y, CORE_FRONT + 0.06]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshStandardMaterial
          ref={materialRef}
          map={map}
          emissiveMap={map}
          emissive="#c6d2d6"
          emissiveIntensity={EMISSIVE_MIN}
          color="#0b0e10"
          roughness={0.42}
          metalness={0.12}
        />
      </mesh>

      {/* Mounted only while armed, so there is no raycast cost and no
          way to trigger verification early or twice. Invisible via
          opacity rather than `visible={false}`, which would remove it
          from raycasting too. */}
      {armed && (
        <mesh
          position={[CHECKBOX_HIT.x, CHECKBOX_HIT.y, CORE_FRONT + 0.12]}
          onClick={(e) => {
            e.stopPropagation();
            onActivate?.();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "";
          }}
        >
          <planeGeometry args={[CHECKBOX_HIT.w, CHECKBOX_HIT.h]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

// Once verification has failed the monument's own uplight eases off, so
// the machine visibly stops holding itself up while the first warm cue
// rises somewhere behind the visitor's shoulder. Ramped in useFrame from
// the phase rather than tweened by GSAP: this is continuous scene state,
// and keeping GSAP to the discrete beats is the project's standing rule.
// The machine visibly stops holding itself up across the whole exit: the
// uplight steps down as the seam appears, again as the door opens, and
// again as the camera walks away, so by the time the visitor is at the
// threshold the monument behind them is close to unlit. It is not
// switching off — it is losing the frame.
const SPOT_BY_PHASE = { seam: 0.48, opening: 0.34, descending: 0.16, leaving: 0.1 };

function MonumentLight({ spotRef, phase, reduceMotion }) {
  useFrame((_, delta) => {
    const spot = spotRef.current;
    if (!spot) return;
    const target = SPOT_BY_PHASE[phase] ?? 1;
    const want = SPOT_BASE * target;
    if (reduceMotion) {
      spot.intensity = want;
      return;
    }
    spot.intensity += (want - spot.intensity) * (1 - Math.pow(0.15, delta));
  });
  return null;
}

const SPOT_BASE = 19000;

export default function GraveyardCaptcha({ progressRef, reduceMotion, phase, onActivate }) {
  const spotRef = useRef(null);
  const spotTargetRef = useRef(null);

  // three.js resolves a spotlight's aim through `light.target`, which has
  // to be a real object in the scene graph for its world matrix to be
  // current. Assigning it after mount is the reliable R3F pattern.
  useEffect(() => {
    if (!spotRef.current || !spotTargetRef.current) return;
    spotRef.current.target = spotTargetRef.current;
    spotTargetRef.current.updateMatrixWorld();
  }, []);

  return (
    // Settled into the terrain rather than resting on an implied flat
    // plane at y = 0: the ground here undulates, so a base sitting at
    // exactly zero would show daylight under one edge.
    <group position={[CAPTCHA_X, GROUND_Y + groundHeightAt(CAPTCHA_X, CAPTCHA_Z) - 0.5, CAPTCHA_Z]}>
      {/* --- Foundation: two steps, both wider than the body --- */}
      <mesh position={[0, BASE_LOWER.h / 2, 0]}>
        <boxGeometry args={[BASE_LOWER.w, BASE_LOWER.h, BASE_LOWER.d]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.94} metalness={0.06} />
      </mesh>
      <mesh position={[0, BASE_LOWER.h + BASE_UPPER.h / 2, 0]}>
        <boxGeometry args={[BASE_UPPER.w, BASE_UPPER.h, BASE_UPPER.d]} />
        <meshStandardMaterial color={CONCRETE_MID} roughness={0.9} metalness={0.07} />
      </mesh>

      {/* --- The world's damage, all of it on the near-left side so the
              foundation reads as settled and broken rather than as a
              symmetrical plinth. The body above is untouched. --- */}

      {/* A slab broken off the lower step's left front corner and slid
          clear, leaving the step's line interrupted. */}
      <mesh position={[-29.5, 1.1, 9.4]} rotation={[0.07, 0.24, -0.16]}>
        <boxGeometry args={[10, 2.6, 8]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.96} metalness={0.05} />
      </mesh>
      {/* Rubble drifted against that same side, part-burying the step. */}
      <mesh position={[-24, 0.9, 2]} rotation={[0.04, -0.3, 0.09]}>
        <boxGeometry args={[13, 2.2, 11]} />
        <meshStandardMaterial color="#20262a" roughness={1} metalness={0.02} />
      </mesh>
      <mesh position={[-31, 0.6, -6]} rotation={[0.1, 0.5, -0.06]}>
        <boxGeometry args={[8, 1.5, 7]} />
        <meshStandardMaterial color="#1b2124" roughness={1} metalness={0.02} />
      </mesh>

      {/* The trunk conduit still entering the base where it always did —
          the one piece of evidence that this machine was ever connected
          to anything. Part-buried, running out toward the site. */}
      <mesh position={[-22, 0.5, 17]} rotation={[0.2, 0.34, 1.5]}>
        <cylinderGeometry args={[1.15, 1.3, 22, 10]} />
        <meshStandardMaterial color="#22282b" roughness={0.9} metalness={0.14} />
      </mesh>

      {/* A collapsed frame come to rest against the left flank. Leaning
          for a structural reason, not placed for composition. */}
      <mesh position={[-21, 7, 5.5]} rotation={[0.06, 0.3, 0.86]}>
        <boxGeometry args={[17, 0.9, 0.9]} />
        <meshStandardMaterial color="#242a2c" roughness={0.74} metalness={0.3} />
      </mesh>
      <mesh position={[-19.5, 6.2, 3.2]} rotation={[0.1, 0.22, 0.95]}>
        <boxGeometry args={[14, 0.7, 0.7]} />
        <meshStandardMaterial color="#242a2c" roughness={0.74} metalness={0.3} />
      </mesh>

      {/* --- Recessed core. Its front face is the back of the reveal. --- */}
      <mesh position={[0, BODY_MID_Y, CORE_FRONT - CORE_D / 2]}>
        <boxGeometry args={[BODY_W, BODY_H, CORE_D]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.86} metalness={0.1} />
      </mesh>

      {/* --- Frame standing proud of the core: jambs, lintel, sill.
              These are what give the monument returns for light to rake
              across, and what turn the interface into an inset rather
              than a sticker. --- */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (BODY_W / 2 - JAMB_W / 2), BODY_MID_Y, CORE_FRONT + FRAME_D / 2]}
        >
          <boxGeometry args={[JAMB_W, BODY_H, FRAME_D]} />
          <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.88} metalness={0.08} />
        </mesh>
      ))}
      <mesh
        position={[0, BASE_H + BODY_H - LINTEL_H / 2, CORE_FRONT + FRAME_D / 2]}
      >
        <boxGeometry args={[BODY_W, LINTEL_H, FRAME_D]} />
        <meshStandardMaterial color={CONCRETE_LIGHT} roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh position={[0, BASE_H + SILL_H / 2, CORE_FRONT + FRAME_D / 2]}>
        <boxGeometry args={[BODY_W, SILL_H, FRAME_D]} />
        <meshStandardMaterial color={CONCRETE_MID} roughness={0.9} metalness={0.08} />
      </mesh>

      <InterfacePanel
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        phase={phase}
        onActivate={onActivate}
      />
      <MonumentLight spotRef={spotRef} phase={phase} reduceMotion={reduceMotion} />

      {/* --- Light. A narrow vertical wash from low and in front, raking
              up the face: architectural uplighting, so the reveal's own
              returns cast the shadows that describe the form. This
              replaces the blockout's single decayed point light, which
              could only ever paint a circular blob on a flat plane. --- */}
      {/* Offset to the left of the face rather than square in front of
          it, so the wash rakes across the reveal and the near jamb
          throws a shadow into it. A dead-centre uplight lit the monument
          symmetrically, which is half of what made the closing frame
          read as ceremonial. */}
      <object3D ref={spotTargetRef} position={[3, 44, 0]} />
      <spotLight
        ref={spotRef}
        position={[-11, 6, BODY_FRONT + 24]}
        angle={0.74}
        penumbra={1}
        intensity={SPOT_BASE}
        distance={135}
        decay={2}
        color="#a8b4b9"
      />

      {/* Cold spill pooling on the ground at the foot of the monument —
          the only lit ground in the scene, so the base reads as standing
          on something rather than floating on black. Kept well under the
          wash: at higher intensity it blew out into a bright disc that
          read as a lamp on the floor rather than as spill. */}
      <pointLight
        position={[0, 3.2, BODY_FRONT + 15]}
        intensity={850}
        distance={70}
        decay={2}
        color="#8d989d"
      />
    </group>
  );
}
