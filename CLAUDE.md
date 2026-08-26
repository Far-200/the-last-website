# CLAUDE.md

# Claude Code — Project-Specific Working Rules

Before non-trivial work, read the root `AGENTS.md`; it is the shared architecture, narrative, validation, and safety contract for this repository. This file adds Claude-specific working behavior rather than duplicating that contract.

If another coding agent also loads this file, `AGENTS.md` remains authoritative for shared project facts and invariants.

## 1. Do not onboard from the README's status section

The root `README.md` still contains early-foundation status text and proposed structure from before the current five-scene implementation existed.

For every implementation task:

1. inspect the current source tree;
2. read the files that currently own the behavior;
3. use `docs/PROJECT_PLAN.md` for narrative intent;
4. use the README mainly for setup/high-level framing.

Never conclude that a scene, transition, state system, or feature is missing solely because the README says it was "planned."

## 2. Start visual tasks by mapping ownership

Before changing anything that "looks wrong," determine what actually creates the pixels.

For the affected shot, inspect the relevant combination of:

- top-level scene phase/progression;
- camera pose and look target;
- fog/background/backdrop;
- ambient/key/local lights;
- material albedo/emissive/opacity;
- geometry placement/scale;
- DOM overlays and CSS;
- transition phase;
- neighboring scene handoff when applicable.

Do not fix visual problems by blindly stacking brightness, opacity, fog-distance, emissive, or camera offsets until the screenshot looks less wrong.

First identify the cause.

## 3. Treat architectural comments as design documentation

This repository intentionally contains detailed comments around camera authority, lighting math, atmosphere matching, and transition ownership.

Do not delete those comments merely to make files shorter.

When modifying the behavior they describe:

- preserve still-correct rationale;
- update comments that become inaccurate;
- add a concise "why" comment when introducing non-obvious ownership or visual math.

A shorter file with false or missing rationale is not an improvement.

## 4. Diagnose transitions as four frames

For any transition task, reason explicitly about:

1. outgoing scene before concealment;
2. outgoing scene's final visible frame;
3. incoming scene's first painted frame;
4. incoming scene after reveal.

Inspect both sides before editing either side.

The goal is usually to make the React mount swap visually disappear, not to hide it with an arbitrary black DOM overlay.

Preserve forward momentum when the authored transition depends on it.

## 5. Respect the single-writer model

Before adding animation, identify the existing writer.

Particularly for camera/fog/light/material work:

- do not let GSAP and `useFrame` both own the same property;
- do not create a second camera controller;
- do not add controls that silently override an authored camera;
- do not introduce a global atmosphere controller that competes with scene-local atmosphere.

If a phase handoff requires tweening, prefer the existing pattern: GSAP changes a plain ref/timing signal, and the render-loop owner interprets it.

## 6. Preserve local character instead of normalizing scenes

The five scenes intentionally do not behave identically.

Do not refactor differences away simply because two components could share an abstraction.

Examples:

- Feed and Graveyard are long progression spaces with their own camera behavior.
- Memories is shorter, slower, and more intimate.
- LastMessage intentionally stops progression and camera movement.
- Different scene transitions use different conceal/reveal techniques.

Shared code is useful only when it preserves authored differences.

## 7. Copy is product behavior

Do not casually rewrite terminal lines, recovered fragments, captions, voicemail text, CAPTCHA language, or the finale.

When the task is not explicitly about copy:

- preserve existing copy;
- keep new copy mundane and restrained only when new copy is truly required;
- prefer the established data modules;
- never repeat the thesis in earlier scenes.

"More cinematic" is usually the wrong direction for this project.

## 8. Do not opportunistically add deferred systems

Unless the current task explicitly asks for them, do not use nearby work as an excuse to add:

- Zustand/global state;
- a generic scene engine;
- a new post-processing stack;
- OrbitControls/free roam;
- backend/services;
- a new animation dependency;
- an audio framework;
- partial audio wiring.

The current LastMessage implementation explicitly leaves project-wide audio for later. Keep it deferred unless audio itself is the task.

## 9. Implementation mode

When asked to implement/fix/refine code, perform the change rather than returning only a design proposal.

Use investigation proportionate to the task:

- small local defect: inspect the owning files and patch narrowly;
- visual/composition issue: inspect the whole rendered cause chain;
- transition/camera change: inspect both scenes and all relevant writers;
- architectural change: inspect every dependent scene before touching shared behavior.

Avoid speculative rewrites.

## 10. Validation and reporting

After code changes:

```bash
npm run lint
npm run build
```

There is no repository `npm test` script; do not report one as if it exists.

For visual changes, use an actual browser render/Playwright when available. Do not infer visual success from a clean build.

In the final work report, state:

- files changed;
- the actual cause of the issue;
- the implementation approach;
- validation commands/results;
- whether a real render was inspected;
- any remaining risk or intentionally deferred work.

Do not pad the report with generic praise or restate the entire prompt.

## 11. Git behavior

Never commit or push unless the user explicitly asks for it.

Do not discard unrelated working-tree changes. If unrelated changes already exist, work around them and mention them rather than resetting them.
