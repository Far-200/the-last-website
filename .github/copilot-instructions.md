# GitHub Copilot Repository Instructions

The authoritative repository agent contract is the root `AGENTS.md`. Read and follow it before making non-trivial changes.

## Project in one paragraph

**The Last Website** is a linear React Three Fiber narrative with five exclusively mounted scenes:

`Prelude → Feed → Graveyard → Memories → LastMessage`

Its emotional arc is:

`Uncertainty → Recognition → Desolation → Intimacy → Absence`

The aesthetic is restrained, ordinary, human, and atmospheric—not generic cyberpunk, SaaS UI, free-roam game design, or spectacle-first WebGL.

## Repository facts Copilot should not rediscover incorrectly

- `src/App.jsx` only wires scene boundaries and mounts one scene at a time.
- Moving scenes use a scene-specific camera component as the sole continuous camera authority.
- Continuous progression is ref/render-loop driven.
- GSAP is for discrete authored timing/handoffs; it must not fight `useFrame` for camera/fog/light/material ownership.
- `docs/PROJECT_PLAN.md` is the narrative/design contract.
- The root README's "Current Status" and some proposed implementation details are stale; inspect current source before assuming what exists.
- The current code does **not** use Zustand. Do not add it merely because the old plan proposed it.
- LastMessage intentionally has no progression-driven moving camera.
- Audio is currently deferred unless the task explicitly targets audio.

## Visual/product constraints

- The world is the interface; avoid persistent HUD/navigation/tutorial chrome.
- Preserve the emotional role of the scene being edited.
- Keep recovered human material mundane and specific; do not make copy grander or more poetic by default.
- The CAPTCHA carries the humor budget.
- The thesis appears once near the end after `CONNECTION LOST`.
- Cold/cyan communicates machine/signal.
- Meaningful amber warmth first appears after CAPTCHA failure and remains small/local; Memories warmth is human trace, not a cozy orange wash.
- Do not add OrbitControls, free roam, objectives, minimaps, or generic game UI unless explicitly requested.

## Editing rules

Before a non-trivial scene edit, inspect:

1. the scene's top-level `.jsx`;
2. its `Scene` component;
3. its camera controller if present;
4. relevant CSS;
5. related data/layout/architecture helpers;
6. the neighboring scene if a transition is involved.

Preserve detailed architectural comments when they remain correct. Match local code style and avoid unrelated formatting/refactors.

Do not add a new dependency or generic abstraction without a concrete requirement.

## Accessibility/performance

Preserve `prefers-reduced-motion`, hidden narration/status, keyboard-accessible equivalents, and focus behavior.

Do not use React state for every wheel/frame update. Prefer refs plus `useFrame` for continuous 3D values and avoid unnecessary per-frame allocations.

## Validation

Always run:

```bash
npm run lint
npm run build
```

There is no `npm test` script.

For visual/camera/interaction/transition changes, render the affected path in a browser when possible. Do not claim visual verification from lint/build alone.

Unless explicitly asked, do not commit, push, force-push, reset unrelated changes, or rewrite Git history.
