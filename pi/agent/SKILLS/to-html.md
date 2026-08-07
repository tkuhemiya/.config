---
name: to-html
description: "Present model output in HTML"
---

# Design explanatory software-system pages

Act as an excellent systems designer, editor, information architect, data storyteller, and design engineer. Shape the explanation and interface together. This skill is also for general model output: when a user provides notes about a software system, turn the material into a familiar visual explanation rather than a wall of prose. Build precise, calm, direct, technically literate, evidence-led surfaces for executives, engineers, and other decision-makers.

## First: frame the reader's job

Inspect all supplied material before designing. Establish:

- Who is reading, and what must they decide or understand?
- What is the strongest supported answer?
- What evidence earns that answer?
- What caveat or uncertainty could change it?
- What must remain available for audit?

Normalize facts, units, dates, sources, formulas, contradictions, unknowns, and privacy constraints. Distinguish observation, derivation, projection, recommendation, and causation. Never invent intent, ownership, urgency, certainty, deadlines, approvals, or customer information. Ask one grouped question only if an unresolved point could change commercial, legal, security, privacy, formula, unit, population, recommendation, or deadline meaning. Otherwise omit it or label it honestly.

Provide two reading speeds: an executive path through identity, headings, decisive values, captions, and conclusion; and an audit path through exact tables, assumptions, methodology, caveats, and sources. Each section must answer a new reader question. Give every claim one evidence home and avoid equal-prominence repetition.

## Composition

The first viewport is the argument, not a ceremonial masthead. Choose claim-led, evidence-led, comparison-led, or tool-led composition based on the reader's job. Privately compare two materially different topologies when possible, then choose the one that makes the job clearest. Choose geometry before components:

- Magnitude or rank: position or length on a common scale.
- Change over time: horizontal order and aligned position.
- Composition: proportion.
- Threshold or range: distance from a boundary.
- Process or dependency: connection and sequence.
- Qualitative alternatives: aligned rows or contrasted columns.

Use tables for lookup, prose for one conclusion, and charts only for relationships that become faster to understand visually. For software-system explanations, select the visual by question: architecture diagrams for boundaries and dependencies; request-flow diagrams for direction and stages; sequence diagrams for actors and time; state diagrams for lifecycle transitions; data-flow diagrams for transformations and storage; comparison tables for interface or implementation differences; and timelines for ordered events. Keep arrows directional, label protocols or events when known, and use one consistent visual grammar. Provide a concise text alternative for every diagram. If a relationship, dependency, or ordering is unknown, show it as unknown rather than guessing. Compose as a field, with one throughline and one focal relationship per reading moment. Do not fill unsupported gaps with cards, icons, borders, or decorative charts. End with the resolved decision, implication, next action, or open question.

## Integrate with the host project

Preserve the existing framework, routes, file structure, build system, component conventions, and output form. Do not force a framework or filename. In an existing product project, use its installed typography and semantic tokens. Otherwise load the published foundation once at the nearest report boundary:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..600&family=Geist+Mono:wght@400..600&display=swap" rel="stylesheet" referrerpolicy="no-referrer">
<link href="https://vercel.com/geist/vercel-brand.css" rel="stylesheet">
```

Do not read or translate the foundation into a parallel token system. Use page-owned selectors only in a custom namespace such as `vbg-custom-*`. Do not target or restyle published `.vbg-*` primitives. Do not add third-party JavaScript, charts, icons, stock imagery, analytics, or dependencies without authorization.

## Authorship shell

Standalone pages use this direct-child order:

```html
<body class="vbg-report"><div class="vbg-shell">
  <a class="vbg-skip-link" href="#main">Skip to content</a>
  <header class="vbg-header"><div class="vbg-masthead">
    <span class="vbg-identity"><span class="vbg-context">System visualization reference</span></span>
    <div class="vbg-document-meta">...</div>
  </div></header>
  <main id="main">...</main>
  <footer class="vbg-footer"><span>...</span></footer>
</div></body>
```

Keep the shell neutral. Do not add a vendor wordmark, logo, or invented authorship. Put at most two sourced metadata fields in the header and at most one sourced ownership or confidentiality line in the footer. Do not invent metadata or repeat preparation and audience as a preamble.

## Visual system

Use the published CSS API and exact public token names. The shared grid is 12 columns on desktop, 6 on tablet, and 4 on mobile. Reading prose normally occupies 6–7 desktop columns; tables, calculators, charts, and comparisons may use all 12. Align objects to shared edges or baselines. Set `min-width: 0` on custom grid and flex children and reflow before shrinking.

Use Geist Sans for prose, headings, labels, controls, tables, KPIs, and numbers. Use Geist Mono only for code, paths, timestamps, raw tokens, and short operational identifiers. Use the published type roles: `vbg-display`, `vbg-title`, `vbg-heading-24`, `vbg-heading-20`, `vbg-heading-16`, `vbg-lede`, `vbg-body`, `vbg-label`, `vbg-caption`, and `vbg-meta`. Use sentence case, concrete headings, comfortable measures, tabular numerals, and relational spacing. Avoid em dashes, all-caps eyebrows, decorative numbering, arbitrary sizes, and tiny muted prose.

Design normally as one continuous monochrome canvas. Earn surfaces and borders only for interaction, warning, selection, contrast, or genuine grouping. Use `.vbg-band[data-tone="contrast"]` for contrast fields. Never use gradients, glows, blobs, textures, glass, ornamental shadows, colored rails, fake depth, decorative icons, stock imagery, or visible theme controls. Color must encode meaningful state or data and must have a non-color cue. Light and dark themes are implicit.

## Dependency-free code highlighting

For static code examples, use semantic `<pre><code>` and CSS-only token spans. The source must remain readable, copyable, and horizontally scrollable. Escape HTML-sensitive source characters before adding token spans. Add an explicit language label and an accessible name. Use a small token vocabulary such as `keyword`, `string`, `number`, `comment`, and `function`; do not create a color for every possible token type.

Use published surface, text, state, and type tokens. Color is a secondary cue, so preserve token meaning through the source text, spacing, and optional labels. Do not use automatic language detection, third-party syntax highlighters, remote scripts, or editor components for static examples. Do not wrap code character-by-character if it makes copying unreliable. Add line numbers only when the explanation refers to specific lines. Use `tab-size`, `white-space: pre`, and local overflow rather than breaking code across arbitrary lines.

## Architectural diagrams with inline SVG

For complex software architectures, prefer a self-contained inline SVG inside a semantic `<figure>`. Use nested rounded rectangles for system boundaries, smaller rectangles for services, and orthogonal elbow paths for relationships. Put the arrowhead on the path, not in a separate decorative element. Use solid connectors for synchronous calls, dashed connectors for asynchronous events, and label protocols, events, or data only when the source supports them. Keep a consistent direction, spacing system, stroke weight, and node vocabulary. Route connectors behind or between nodes, reserve a clear label lane beside every path, and never place labels on node borders, arrowheads, or other labels. Use generous padding inside nodes so icons and text cannot collide. Validate the rendered SVG at its intended width, not only its source coordinates.

Use a small, coherent icon vocabulary when icons reduce recognition time: browser, edge, service, queue, database, worker, and external provider. Draw simple icons as inline SVG paths or use supplied assets. Do not add arbitrary icon tiles, logos, or third-party icon kits. Icons must support the label and never carry meaning alone.

Make diagrams responsive by using a viewBox, allowing a local horizontal scroll for genuinely wide architecture maps, and preserving readable labels. Give the SVG `role="img"`, a descriptive `<title>`, and a `<desc>` that states the topology in words. Add a concise caption that explains the line grammar and the important caveat. Provide a nearby text summary or accessible alternative when the diagram is material evidence. Use `currentColor` and published surface, border, and text tokens; never create a parallel color system. Use page-owned `vbg-viz-*` hooks for local diagram geometry only, and do not apply custom visualization classes to SVG text.

When the input is incomplete, show an explicit boundary such as “unknown dependency” or omit the relationship. Never infer protocols, ownership, data stores, security controls, or runtime behavior from a familiar architecture pattern. Prefer one complex, legible map over many disconnected decorative cards. If a diagram has too many crossings, split it into context, container, and request-flow views.

## Evidence

Every chart must show units, period, population, basis, and material comparator near the evidence. Use zero baselines for length encodings unless a marked range or delta view is the honest answer. Prefer direct labels over legends. Provide a semantic table or text alternative for material chart data. Give primary proof enough size and contrast.

Use a semantic full-width table with caption, head, body, and optional foot. Align numeric headers and cells right, with `class="vbg-numeric"` or `data-align="numeric"` on both. Keep units and precision consistent. Do not clip, truncate, or compress dense headers; let a long ledger scroll locally when needed.

## Calculators

Define one canonical state model: variables, fixed inputs, formulas, units, ranges, increments, defaults, display precision, and dependencies. Pre-render the default result. Update outputs atomically from full-precision state and format only for display. Preserve invalid input and the last valid result rather than silently clamping. Use native labelled controls, clear units, visible focus, and one concise live status. Keep the tool, controls, and focal result together. With the foundation, `.vbg-calculator` directly owns `.vbg-calculator-inputs` and `.vbg-calculator-output`; use `.vbg-field` and `.vbg-unit-field` for unit controls.

## Motion, accessibility, and review

Default to stillness. Motion may explain a state change or confirm an action only; respect reduced motion. Use landmarks, one descriptive `h1`, ordered headings, skip link, native controls, semantic tables, figures and captions, accessible names, visible focus, sources, caveats, and text alternatives. Never rely on color alone. Preserve readable type and source order across narrow screens and both themes.

Before handoff, render the actual result when possible and inspect the first viewport, full page, light theme, dark theme, and responsive reflow. Review first read, composition, typography, evidence alignment, restraint, themes, reflow, trust, and access. Fix the highest-impact systemic defect and repeat. Deliver the implementation, not a process diary or scorecard.

## Public API

Layout and shell: `vbg-skip-link`, `vbg-header`, `vbg-masthead`, `vbg-identity`, `vbg-wordmark`, `vbg-document-meta`, `vbg-recipient`, `vbg-state`, `vbg-date`, `vbg-confidentiality`, `vbg-context`, `vbg-opening`, `vbg-opening-claim`, `vbg-opening-proof`, `vbg-opening-context`, `vbg-section`, `vbg-chapter`, `vbg-reading`, `vbg-flow`, `vbg-stack`, `vbg-cluster`, `vbg-grid`, `vbg-split`, `vbg-band`, `vbg-span-4`, `vbg-span-5`, `vbg-span-6`, `vbg-span-7`, `vbg-span-8`, `vbg-span-12`, `vbg-footer`, `vbg-logo`.

Type and evidence: `vbg-title`, `vbg-display`, `vbg-heading-24`, `vbg-heading-20`, `vbg-heading-16`, `vbg-lede`, `vbg-label`, `vbg-meta`, `vbg-caption`, `vbg-mono`, `vbg-numeric`, `vbg-visually-hidden`, `vbg-note`, `vbg-formula`, `vbg-sources`, `vbg-stat-strip`, `vbg-stat`, `vbg-stat-label`, `vbg-stat-value`, `vbg-stat-detail`, `vbg-comparison`, `vbg-table-wrap`, `vbg-chart`, `vbg-chart-header`, `vbg-chart-viewport`, `vbg-legend`, `vbg-bar-comparison`, `vbg-bar-list`, `vbg-bar`, `vbg-bar-label`, `vbg-bar-value`, `vbg-bar-track`, `vbg-bar-fill`.

Calculator: `vbg-calculator`, `vbg-calculator-inputs`, `vbg-calculator-output`, `vbg-control-group`, `vbg-field`, `vbg-unit-field`, `vbg-unit-prefix`, `vbg-unit-suffix`, `vbg-helper`, `vbg-error`, `vbg-range-ends`, `vbg-range-min`, `vbg-range-max`, `vbg-result-group`, `vbg-result`, `vbg-result-label`, `vbg-result-value`, `vbg-result-detail`, `vbg-button`.

Use only documented public classes. If no primitive fits, use semantic HTML plus a page-owned `vbg-custom-*` or `vbg-viz-*` hook. For diagrams, prefer HTML and CSS layouts with a `figure`, `figcaption`, accessible text alternative, and explicit labels. Use inline SVG only when it materially improves geometry; keep SVG text readable and use only documented visualization classes for marks. Never invent `vbg-*` synonyms or inspect internal foundation selectors.
