---
name: to-html
description: Opinionated CSS design system with reset, spacing, shadows, gradients, layout, and typography conventions. Use when writing or reviewing CSS, designing UI components, or styling any web project.
---

# CSS Design

These are opinionated CSS/styling conventions. Apply them when writing CSS, designing UI components, or reviewing styling.

## CSS Reset (Baseline)

Always start with this reset:

```css
/* 1. Use a more-intuitive box-sizing model */
*, *::before, *::after {
  box-sizing: border-box;
}

/* 2. Remove default margin */
*:not(dialog) {
  margin: 0;
}

/* 3. Enable keyword animations */
@media (prefers-reduced-motion: no-preference) {
  html {
    interpolate-size: allow-keywords;
  }
}

body {
  /* 4. Increase line-height */
  line-height: 1.5;
  /* 5. Improve text rendering */
  -webkit-font-smoothing: antialiased;
}

/* 6. Improve media defaults */
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

/* 7. Inherit fonts for form controls */
input, button, textarea, select {
  font: inherit;
}

/* 8. Avoid text overflows */
p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

/* 9. Improve line wrapping */
p {
  text-wrap: pretty;
}
h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
}

/*
  10. Create a root stacking context
*/
#root, #__next {
  isolation: isolate;
}
```

## Design Principles

### Text Sizing

- Do **not** set custom text sizes. Derive them from `rem` to inherit the user's default font size.

### Margin

- **Avoid margin** — it is a side effect. Use `gap` on flex/grid containers or `padding` on parent elements instead.

### Padding & Spacing

- **Consistency above everything else.** Establish a spacing scale and stick to it.
- For **grouping** related items: use spacing `< 1rem` (inside a group)
- For **separating** distinct groups: use spacing `> 1rem` (between groups)
- Think in terms of **groups**, separated by: size, color, padding, and sometimes shapes.
- **Small elements** (buttons, badges, chips): use more horizontal inner padding than vertical.

### Example: Writing/Reading Typography

```css
/* line-height: 1.5rem */
/* paragraph separation: 2rem */
/* letter-spacing: 0.12rem */
/* word-spacing: 0.16rem */
```

### Content Width

Lines of text that span the full viewport are hard to read. Use a centered fixed-width column, but allow media and custom widgets to break free (full-bleed).

```css
.wrapper {
  display: grid;
  grid-template-columns:
    minmax(1rem, 1fr)
    min(60rem, 100%)
    minmax(1rem, 1fr);
}

.wrapper > * {
  grid-column: 2;
}

.wrapper > .full-bleed {
  grid-column: 1 / -1;
}
```

```html
<main class="wrapper">
  <h1>Some Heading</h1>
  <p>Some content and stuff</p>
  <img/ video/ hero sections/ special widgests like diagrams class="full-bleed" alt="cute meerkat" src="/meerkat.jpg" />
</main>
```

Pair with disappearing sidebars at wider viewports:

```css
.panel {
  opacity: 0;
  transition: opacity .2s, display .2s allow-discrete;
}
@media (min-width: 1280px) {
  .panel { display: flex; opacity: 1; }
  @starting-style { .panel { opacity: 0; } }
}
```

### Layering Shadows

Layer multiple shadows for natural, vibrant depth. Shadow count and spread increase with perceived elevation:

```css
/* Low elevation */
.box-low {
  box-shadow:
    0.5px 1px 1px hsl(220deg 60% 50% / 0.7);
}

/* Medium elevation */
.box-mid {
  box-shadow:
    1px 2px 2px hsl(220deg 60% 50% / 0.333),
    2px 4px 4px hsl(220deg 60% 50% / 0.333),
    3px 6px 6px hsl(220deg 60% 50% / 0.333);
}

/* High elevation */
.box-high {
  box-shadow:
    1px 2px 2px hsl(220deg 60% 50% / 0.2),
    2px 4px 4px hsl(220deg 60% 50% / 0.2),
    4px 8px 8px hsl(220deg 60% 50% / 0.2),
    8px 16px 16px hsl(220deg 60% 50% / 0.2),
    16px 32px 32px hsl(220deg 60% 50% / 0.2);
}
```

The hue in `hsl()` should match the background color tint. More layers = higher perceived elevation.

### Gradients

HSL gradients produce overly bright and vivid midpoints because HSL doesn't account for human color perception. HCL would be better but isn't supported in CSS. Workaround: manually define intermediate color stops to avoid the unnatural mid-gradient colors.

```css
background-image: linear-gradient(
  45deg,
  hsl(240deg 100% 20%) 0%,
  hsl(281deg 100% 21%) 8%,
  hsl(304deg 100% 23%) 17%,
  hsl(319deg 100% 30%) 25%,
  hsl(329deg 100% 36%) 33%,
  hsl(336deg 100% 41%) 42%,
  hsl(346deg 83% 51%) 50%,
  hsl(3deg 95% 61%) 58%,
  hsl(17deg 100% 59%) 67%,
  hsl(30deg 100% 55%) 75%,
  hsl(40deg 100% 50%) 83%,
  hsl(48deg 100% 50%) 92%,
  hsl(55deg 100% 50%) 100%
);
```

These are example colors — use appropriate colors for the design, but follow the same manual-stop pattern.

### Selection

Style `::selection` with something visually pleasing (avoid the default blue):

```css
::selection {
  background: /* accent color */;
  color: /* contrasting text */;
}
```
