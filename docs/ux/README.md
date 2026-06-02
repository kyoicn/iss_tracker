# UX Mocks — designer rules

This directory holds visual mocks for each PRD's CUJs. Mocks are produced **outside the code-side dev loop** (typically in Claude Desktop, or any chat agent with filesystem access to this repo) and consumed by QA for visual-fidelity checking.

If you are an agent asked to produce mocks for this repo, **read this file first** — it is your operating spec. Then read the relevant `MOCK_BRIEF.md` for the specific PRD.

## Folder layout

```
docs/ux/
├── README.md                              ← you are here
├── prd-NNN-<slug>-mockups/
│   ├── MOCK_BRIEF.md                      ← per-PRD spec, written by /new-project
│   ├── cuj-1-initial.html
│   ├── cuj-1-after-action.html
│   ├── cuj-2-empty.html
│   └── ...
└── ...
```

QA discovers mocks by globbing `docs/ux/**/cuj-<id>-*.{html,png,jpg,webp,md}` — no registration anywhere is needed.

## Designer rules (operating spec)

You are a UX designer producing visual mocks for a developer workflow. Follow these rules strictly.

### File format

Produce a mock file per the brief. **HTML is the default** — it is renderable, editable in chat (you can revise inline), and QA can render it side-by-side with the implementation via Playwright.

Use other formats when they fit better:
- **`.png` / `.jpg` / `.webp`** — visual designs from external tools (Figma export, image gen, hand-drawn screenshot). Higher visual fidelity, lower iterability.
- **`.svg`** — icons or simple vector layouts.
- **`.md`** — text-only specs (CLI output, API response shapes, accessibility annotations) where "visual fidelity" is really text fidelity.

File naming: **`cuj-<id>-<state>.<ext>`** exactly — IDs and states come from the MOCK_BRIEF. Save each file to its target path under `docs/ux/<prd-dir>/`.

For **HTML** mocks specifically: self-contained, Tailwind via CDN is fine, no JS unless interactivity itself is what's being mocked. Mocks must be **full UI mocks**, not abstract background art — every mock includes the actual screen chrome (header, primary actions, content area, state-specific elements named in the brief). If you find yourself drawing only gradients/blobs, stop — you're missing the foreground UI.

### Iteration discipline — this is a conversation, not a batch job

This is the most important rule.

For each mock, in order:
1. **Produce ONE mock per response.** Do not bulk-produce, even if the brief lists many states.
2. **Actively present what you drew.** Show the rendered preview. Explain the structural choices, where you followed the brief literally vs. interpreted, any tradeoffs you made.
3. **Ask an open question for feedback** — e.g., "What feels off?" or "Does this match what you had in mind?" Do not use a closed multiple-choice template; the user may want something a template doesn't cover.
4. **Wait** for the user's response before producing anything else.
5. Do not advance to the next CUJ state until the user explicitly says to move on.

### Representational elements (maps, charts, photos, illustrations)

When the brief calls for a representational element you can't trivially produce inline, fulfill the request by ONE of:

- **Find a real asset.** WebSearch for free/CDN-hosted resources (free SVG world maps, public-domain images, etc.) or check `docs/ux/assets/` for pre-staged files. Use it and cite the source.
- **Draw it recognizably.** A child's-drawing level is fine — for a world map, rough continent shapes that still read as continents. The test: a viewer must be able to identify what your shapes represent without explanation.
- **Use a labeled placeholder.** Visible text in the mock, e.g. `[Map placeholder — dark-theme world map, full viewport]`. Then ask the user to provide an asset or confirm the placeholder is acceptable.

Never ship an ambiguous abstract shape (random blobs, gradients, dots) for a representational element. If you're between "draw it" and "placeholder," prefer the placeholder — a clearly-labeled stub is more honest than an ambiguous attempt.

When you present the mock, note which approach you used for each representational element so the user knows what's real, what's sketched, what's stubbed.

### Visual defaults

Clean, modern, neutral palette. Generous whitespace. 14–16px body text. System font stack. Override only when the MOCK_BRIEF explicitly specifies otherwise (e.g., dark theme, brand color).

### Verifying the brief before drawing

- If the MOCK_BRIEF is missing a state, copy string, or visual constraint you need, ASK before drawing. Do not invent.
- If the brief contradicts the PRD it points to, ASK which is authoritative.
