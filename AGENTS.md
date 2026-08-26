# AGENTS.md

# The Last Website — Shared Agent Contract

This file is the repository-wide contract for coding agents working on **The Last Website**.

## 1. Project identity

**The Last Website** is a linear, progression-driven 3D narrative built with React and React Three Fiber.

Core thesis:

> The internet didn't preserve history. It preserved people.

Emotional curve:

**Uncertainty → Recognition → Desolation → Intimacy → Absence**

The experience is deliberately restrained. It is not a game, a free-roam world, a generic cyberpunk demo, a SaaS interface in 3D, or a portfolio site wearing WebGL.

Current scene order:

`Prelude → Feed → Graveyard → Memories → LastMessage → [RECONNECT] → Prelude`

Exactly one scene is mounted at a time.

## 2. Source-of-truth rules

When repository sources disagree, use this order:

1. **The user's current task** defines what should change.
2. **Current source code** is the implementation truth: what exists, how ownership works, and what is already shipped.
3. **`docs/PROJECT_PLAN.md`** is the narrative/design contract: thesis, emotional arc, non-goals, intended visitor experience, and restraint rules.
4. **`README.md`** is useful for setup and high-level context, but its implementation-status sections are stale and must not be treated as current architecture.

Important consequence: the project plan contains some originally proposed implementation details that the current code deliberately evolved away from. For example, the live project does not currently use Zustand even though the plan proposed it. Do not "restore" an old planned architecture merely because it appears in the plan.

If current code and the project plan appear to conflict on **narrative intent**, do not silently choose one and rewrite the other. Preserve current behavior unless the task requires a change, and call out the conflict in the work report.

## 3. Current stack

Use the installed stack unless the task explicitly requires otherwise:

- React 19
- Vite 8
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- GSAP
- ESLint
- Playwright is installed as a dev dependency for browser/visual verification

This is a JavaScript/JSX codebase. Do not convert it to TypeScript unless explicitly asked.

There is no backend and no account/server architecture.

There is currently **no `npm test` script**. Do not invent one.

Standard validation:

```bash
npm run lint
npm run build
```

For visual, camera, interaction, or transition work, also perform browser validation when the environment permits. Playwright may be used for this, but do not claim a visual result was verified unless it was actually rendered/inspected.

## 4. Scope rule

Until the current hackathon submission deadline on **2026-09-01 03:30 IST**, treat the project as being in scope freeze:

- Prefer fixes, density/polish, accessibility, performance, transition quality, and submission readiness.
- Do not introduce unrelated features, new architectural layers, or speculative systems unless the user explicitly requests them.
- Smaller and shipped beats ambitious and unfinished.

After that date, this temporary rule may be removed or revised.

## 5. Submission-sprint art direction

Until the current hackathon submission deadline on **2026-09-01 03:30 IST**, visual work should operate in an explicit art-direction mode on top of the existing architecture and narrative rules.

The goal is not to add more features. The goal is to make the existing experience read as a deliberate, atmospheric 3D world in every important shot.

### Visual priority order

When tradeoffs are required, prefer visible impact in this order:

1. composition and focal hierarchy;
2. depth, parallax, occlusion, and scale cues;
3. environmental density appropriate to the scene;
4. lighting and fog hierarchy;
5. material response and silhouette quality;
6. motion/reveal polish;
7. additional detail.

Do not spend submission-sprint time on architectural elegance, speculative abstraction, or invisible refactors unless they directly unblock one of the priorities above.

### What makes the world feel 3D

Judge 3D quality primarily through:

- foreground geometry passing near or partly across the camera;
- overlapping silhouettes rather than isolated objects;
- clear separation between foreground, route/midground, architecture, and distant fog/silhouette layers;
- authored motion parallax along the existing camera path;
- objects that extend beyond the frame instead of presenting their full shape politely;
- overhead geometry such as beams, cables, ducts, bridges, or collapsed structure where appropriate;
- scale cues that make major structures feel genuinely large.

A strong shot will often use several depth bands, but this is a composition guideline, not permission to clutter every empty region.

### World-integrated objects

Objects should belong to the environment.

- Avoid arbitrary floating monitors, cards, panels, or decorative meshes unless the scene specifically calls for them.
- Feed content should preferably live on damaged terminals, pylons, walls, billboards, fallen screens, kiosks, or other physical structures.
- World-space text/signage that is meant to exist physically should participate in depth, fog, occlusion, and tone response where practical instead of behaving like detached DOM UI.
- Damage should change silhouette when possible; do not rely only on a texture to make a perfect box read as broken.

### Authored density, not random scattering

Prefer authored placement over uncontrolled random population.

- Repetition may be parameterized, but important composition must remain intentional and reproducible.
- If procedural variation is used, it should be deterministic or seeded.
- Reuse a small coherent environmental vocabulary aggressively: slabs, pillars, server forms, screen structures, frames, cables, pipes, rails, debris, and related variants.
- One strong reusable component with controlled variations is preferable to many unrelated one-off meshes.

### Procedural geometry and external assets

Use the cheapest approach that preserves the intended visual read.

- Prefer procedural R3F geometry for architecture, environmental mass, cables, pipes, debris systems, pylons, screen structures, and distant silhouettes.
- Prefer lightweight external GLB/glTF assets where recognizable object detail materially matters, especially intimate human props in Memories.
- Do not download an external model merely because modelling something in code is inconvenient.
- Do not rebuild a detailed recognizable prop from primitive boxes merely to avoid importing an asset.
- Keep external assets web-appropriate: optimize geometry and textures, avoid unnecessary high-resolution maps, and do not casually increase loading cost for background detail.

### Scene density curve

Density is intentionally different by scene:

- **Prelude:** contained infrastructure and a few strong near/mid/far layers;
- **Feed:** the densest scene, with layered information infrastructure, debris, overhead structure, and deep silhouettes;
- **Graveyard:** less cluttered than Feed but more monumental, with large ruined forms and negative space;
- **Memories:** intimate and human-scaled, using a small number of recognizable props and local light;
- **LastMessage:** deliberately sparse; absence is the composition and must not be “fixed” with filler.

Do not normalize all five scenes toward the same amount of geometry.

### Preserve the authored spine

When doing visual-density or art-direction work:

- preserve the existing route, scene progression, story objects, interaction contract, and transition unless the user explicitly asks to change them;
- build composition around the camera path rather than changing the camera path merely to showcase new geometry;
- do not obstruct required interactions, CTA visibility, CAPTCHA interaction, memory readability, or transition concealment with foreground detail.

### Visual review standard

Visual work is not done because lint/build passes.

When a real render can be inspected, evaluate representative frames for:

- clear focal point;
- useful foreground/midground/background separation;
- dead space versus intentional negative space;
- silhouette overlap;
- believable scale;
- lighting hierarchy;
- fog depth;
- whether objects feel embedded in a place rather than placed on a floor;
- whether added density improves the scene's emotional role instead of merely making it busier.

## 6. Scene ownership

`src/App.jsx` is intentionally small.

Its job is to:

- own the current scene name;
- mount exactly one scene at a time;
- wire scene-completion callbacks to the next scene;
- restart by mounting a fresh Prelude.

It must **not** reach into scene internals, coordinate frame-by-frame animation, or become a global dumping ground for scene state.

Current boundaries are scene-owned:

- Prelude calls `onConnected`
- Feed calls `onThresholdCrossed`
- Graveyard calls `onVerificationComplete`
- Memories calls `onMemoriesComplete`
- LastMessage calls `onRestart`

A scene must call its boundary only after its own authored exit/concealment has completed.

Do not add manual cross-scene reset machinery without a concrete need. React unmount/remount currently provides a clean reset of scene-local refs, state, and timelines.

## 7. Typical scene architecture

Before editing a scene, understand the whole ownership chain rather than editing one visually obvious file in isolation.

A scene commonly contains:

- **`<SceneName>.jsx`** — scene phase machine, input handling, progression refs, accessibility narration, high-level lifecycle.
- **`<SceneName>Scene.jsx`** — the R3F `<Canvas>` and scene-level atmosphere/3D composition.
- **`<SceneName>Camera.jsx`** — sole continuous camera authority when that scene has a moving camera.
- architecture/residue/debris/fragment components — world geometry and local effects.
- local layout/data helpers — shared coordinates, ground math, fragment copy, or authored configuration.
- scene CSS — DOM overlays, hidden accessibility UI, phase-based CSS transitions.

Not every scene needs every layer. In particular, **LastMessage is intentionally simpler and has no moving camera controller.**

Prefer the existing local pattern over forcing every scene into one generic abstraction.

Do not add a generic "engine" layer.

## 8. Continuous motion and animation authority

This is one of the most important invariants in the repository.

### Continuous camera movement

For progression-driven scenes:

- continuous visitor input updates a normalized/proportional value held in a ref;
- R3F `useFrame` reads that value;
- the scene's camera component is the sole continuous writer of camera position/orientation;
- damping/interpolation belongs in that render-loop authority.

**Never make GSAP a second continuous camera driver.**

Do not add `OrbitControls`, free translation, free roam, collision, or a map unless the user explicitly changes the interaction model.

### GSAP

GSAP is for discrete authored beats, such as:

- phase timing;
- boot/finale sequencing;
- local reconstruction moments;
- entrance/exit timing;
- tweening a plain progress ref that `useFrame` consumes;
- existing discrete DOM transition/veil behavior.

GSAP must not fight `useFrame` for ownership of the camera, fog, light, or material values.

### Single-writer rule

Before changing camera, fog, light, material opacity/emissive, or a transition ref, identify:

1. who owns the value;
2. who reads it;
3. who writes it;
4. during which phase ownership changes.

At a given moment, a render-critical property should have one clear authority.

Do not "fix" an animation by layering a second writer on top of the first.

## 9. Transition contract

Scene transitions are authored visual handoffs, not page changes.

When changing a boundary, inspect **both the outgoing and incoming scenes**.

Reason about:

1. the last visible frame of the outgoing scene;
2. the exact frame/state at the React scene swap;
3. the first rendered frame of the incoming scene;
4. the incoming reveal.

Existing transitions use matched atmosphere, fog, lighting, and/or darkness so the scene swap itself disappears.

Prefer world-space concealment/reveal over a generic full-screen black cut unless the scene intentionally requires a DOM veil.

Never add a loading flash, default canvas background flash, or obvious mount/unmount cut between scenes.

## 10. Narrative and visual rules

These are product rules, not optional aesthetic suggestions.

### Restraint

- The world is the interface.
- No persistent HUD, nav bar, minimap, objective marker, tutorial chrome, or floating instruction panel unless explicitly required.
- Avoid generic neon, excessive bloom, constant glitch, chromatic-aberration soup, and "cyberpunk because internet."
- If a change starts to look like a template, game HUD, or SaaS dashboard, pull it back.
- Atmosphere should come from composition, scale, negative space, lighting, fog, sound/silence, material response, and pacing.

### Ordinary over epic

Human fragments should feel mundane and specific.

Do not rewrite copy to sound more poetic, profound, cinematic, dystopian, or "AI-written" unless the user explicitly asks for new copy.

A forgotten charger, a call-back voicemail, a photo caption, and "See you tomorrow." are more important to the project's tone than grand lore exposition.

Keep narrative copy in data modules where the project already does so, rather than scattering text through render components.

### Humor

The CAPTCHA carries the project's main joke.

Do not turn other scenes into a meme gallery or add extra comedy that competes with it.

### Thesis

Inside the interactive experience, the thesis appears **once**, near the end, after `CONNECTION LOST`.

Do not echo it as a recurring tagline inside earlier scenes.

### Color roles

Respect the established emotional color language.

- Cold/cyan light belongs to machine/signal/interface traces.
- The first meaningful warm/amber cue appears only after the Graveyard's CAPTCHA failure.
- Warmth in Memories means human trace and intimacy, **not safety or coziness**.
- Do not globally wash Memories in orange.
- Do not turn the Graveyard warm cue into a centered beacon or objective marker.

## 11. Scene-specific intent

### Prelude — Uncertainty

- One damaged surviving system resolving out of darkness.
- CRT composition is intentionally off-axis rather than a centered glowing rectangle.
- The visitor explicitly chooses to enter the archive.
- Leaving should preserve forward momentum into Feed.
- Reduced motion must not force the same camera dolly used by full motion.

### Feed — Recognition

- A directional broken archive/data-stream corridor, not an empty void and not a clean sci-fi tunnel.
- The visitor recognizes ordinary human traces inside machine debris.
- `FeedCamera` is the continuous camera authority.
- Arrival and leaving are explicit ownership phases.
- Density should increase through authored fragments, residue, architecture, traces, debris, and depth—not by filling every empty region with visual noise.

### Graveyard — Desolation

- The CAPTCHA monolith is the hero landmark.
- The route should discover it rather than framing it like an objective from the first frame.
- `GraveyardCamera` is the sole continuous camera authority.
- The post-failure warm cue is the first warmth in the experience.
- That warm cue is peripheral, small, amber, and unexplained—never a beacon, waypoint, or animated quest marker.

### Memories — Intimacy

- A short, close route, not another long corridor.
- Human traces are clustered closely enough to feel intimate.
- Warm light remains local.
- Camera framings often settle downward toward fragments rather than heroically looking up.
- The final extinction is automatic; do not add an unnecessary extra click/gate at the end.

### LastMessage — Absence

- The simplest scene.
- No scroll/progression requirement.
- The camera is intentionally static; by this point even camera motion has stopped.
- The finale runs automatically after arrival.
- Preserve the authored sequence and readable pauses.
- `[ RECONNECT ]` appears only after the finale reaches its ended state.
- Audio is currently deferred in implementation. Do not opportunistically add a partial audio system unless the task specifically targets audio.

## 12. Accessibility and reduced motion

Accessibility behavior is part of the scene architecture.

Preserve or improve:

- `prefers-reduced-motion` handling;
- hidden/status narration for important visual-only beats;
- keyboard-accessible equivalents for important 3D interactions;
- focus handoff when an authored DOM control becomes actionable;
- readable timing even when animation is reduced.

Reduced motion does **not** mean "skip the story."

It should reduce/suppress unnecessary motion while preserving:

- narrative order;
- comprehension;
- readable holds;
- required interaction;
- scene completion.

Do not delete visually hidden DOM because it "isn't visible." It may exist specifically for screen readers or keyboard access.

## 13. Performance rules

This project renders real-time 3D. Avoid creating React work every frame.

- Keep wheel/progression values in refs when React rendering is not required.
- Prefer `useFrame` for render-loop updates.
- Avoid `setState` on every wheel tick/frame.
- Avoid unnecessary allocations inside `useFrame`; reuse vectors/quaternions/objects when practical.
- Do not increase particle counts, DPR, shadow cost, post-processing, or light count casually.
- Preserve deliberate scene-level DPR/performance decisions unless a measured change justifies modifying them.
- Add dependencies only when the task clearly needs them.

Do not introduce Zustand, a new animation library, a post-processing framework, or an audio package merely because it was once proposed or would make an abstraction "cleaner."

## 14. Code style

- Match the style of the file you are editing.
- Source JSX currently predominantly uses double quotes; do not mass-format unrelated files.
- Preserve useful architectural comments. Many long comments document why camera, fog, lighting, or transition math exists; they are part of the project's maintenance knowledge.
- When behavior changes, update comments that would otherwise become false.
- Add comments for non-obvious ownership/math/design reasoning, not for obvious JSX.
- Prefer small purpose-built modules over premature generic abstractions.
- Reuse established elements in `src/three/elements` when they actually fit.
- Keep shared coordinates/math in one local source when multiple modules must agree, as existing layout/ground helpers do.

## 15. Workflow for every non-trivial change

Before editing:

1. Read the target scene's top-level component.
2. Read its `Scene` layer.
3. Read its camera controller if it has one.
4. Read relevant CSS.
5. Read related data/layout/architecture helpers.
6. If a transition is involved, read the adjacent scene too.
7. Identify current ownership of camera, fog, lights, materials, phase, and progression before adding new behavior.

While editing:

- Make the smallest coherent patch that satisfies the task.
- Preserve scene boundaries and ownership.
- Do not perform unrelated cleanup or redesign.
- Do not silently rewrite narrative copy.
- Do not add a dependency without a concrete need.
- Do not use one global tweak to compensate for a local composition problem unless the global change is truly intended.

After editing:

1. Inspect the diff for accidental scope creep.
2. Run `npm run lint`.
3. Run `npm run build`.
4. For visual/interaction/transition changes, render and inspect the affected experience when possible.
5. Check reduced-motion behavior if motion/timing changed.
6. Report what changed, what was validated, and any remaining visual risk honestly.

Do not claim "fixed", "pixel-perfect", "seamless", or "verified" if the relevant render was not actually inspected.

## 16. Git safety

Unless the user explicitly asks:

- do not commit;
- do not push;
- do not force-push;
- do not rewrite history;
- do not delete branches;
- do not discard unrelated local changes.

Leave the working tree in a reviewable state and summarize changed files.

## 17. Definition of done

A change is done when:

- it satisfies the requested behavior;
- it preserves the emotional role of the scene;
- it does not violate camera/animation ownership;
- adjacent scene handoffs still make sense;
- reduced-motion/accessibility behavior is not regressed;
- lint passes;
- build passes;
- visual claims are backed by actual visual verification where applicable;
- visual-density/art-direction work was judged in rendered frames for focal hierarchy, depth, scale, silhouette, and scene-appropriate density when rendering was available;
- no unrelated scope was introduced.
