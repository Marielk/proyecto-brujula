---
name: Serene Brújula
colors:
  surface: '#f4fafc'
  surface-dim: '#d5dbdd'
  surface-bright: '#f4fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5f7'
  surface-container: '#F0FBFC'
  surface-container-high: '#e3e9eb'
  surface-container-highest: '#dde3e5'
  on-surface: '#161d1e'
  on-surface-variant: '#3e494b'
  inverse-surface: '#2b3133'
  inverse-on-surface: '#ecf2f4'
  outline: '#6e797c'
  outline-variant: '#bdc8cc'
  surface-tint: '#006877'
  primary: '#006877'
  on-primary: '#ffffff'
  primary-container: '#8edbec'
  on-primary-container: '#00616f'
  inverse-primary: '#86d2e3'
  secondary: '#2c694e'
  on-secondary: '#ffffff'
  secondary-container: '#aeeecb'
  on-secondary-container: '#316e52'
  tertiary: '#605691'
  on-tertiary: '#ffffff'
  tertiary-container: '#d3c8ff'
  on-tertiary-container: '#5a508a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a4eeff'
  primary-fixed-dim: '#86d2e3'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e5a'
  secondary-fixed: '#b1f0ce'
  secondary-fixed-dim: '#95d4b3'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#0e5138'
  tertiary-fixed: '#e6deff'
  tertiary-fixed-dim: '#cabeff'
  on-tertiary-fixed: '#1c1149'
  on-tertiary-fixed-variant: '#483f77'
  background: '#f4fafc'
  on-background: '#161d1e'
  surface-variant: '#dde3e5'
  aqua-mist: '#BBE8EE'
  crystal-lagoon: '#7ADDF2'
  water-lily: '#CBB7F5'
  lotus-pink: '#F2C7DB'
  mint-bloom: '#BFE8CB'
  soft-teal: '#2D6A4F'
  soft-lavender: '#5E548E'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 64px
    fontWeight: '300'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Newsreader
    fontSize: 52px
    fontWeight: '500'
    lineHeight: 60px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-md:
    fontFamily: Newsreader
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
  body-lg:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Newsreader
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  quote:
    fontFamily: Newsreader
    fontSize: 26px
    fontWeight: '400'
    lineHeight: 40px
  label-md:
    fontFamily: Newsreader
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  margin-desktop: 48px
  margin-mobile: 16px
  gutter: 32px
  stack-sm: 1rem
  stack-md: 2rem
  stack-lg: 4rem
  section-gap: 6rem
---

## Brand & Style

Serene Brújula is a wellness-oriented design system that prioritizes mental clarity, emotional balance, and a sense of "home." It target individuals seeking a sanctuary from digital noise, blending **Glassmorphism** with **Minimalism**. 

The aesthetic is ethereal and organic, characterized by soft mesh gradients, translucent surfaces, and generous whitespace. It avoids sharp edges and high-energy contrasts in favor of a soothing, low-stimulus environment. The visual language uses "breathable" layouts and literary typography to evoke a feeling of a premium, quiet journal or a peaceful garden.

## Colors

The palette is rooted in "Nature's Neutrals"—desaturated teals, lavenders, and mints. 

- **Primary & Secondary:** Use `soft-teal` and `soft-lavender` to distinguish between functional "paths" or modes.
- **Backgrounds:** Utilize a nearly-white `neutral-color` (#F7FDFF) as the base, overlaid with subtle mesh gradients (`crystal-lagoon` to `water-lily`) to create depth without using solid blocks of color.
- **Functional Accents:** `mint-bloom` and `water-lily` serve as soft action colors for buttons and highlights, ensuring they stand out through hue rather than aggressive value contrast.
- **Typography:** Text uses `on-surface` (#1A3C40) for high legibility and `on-surface-variant` (#4E6164) for secondary information and quotes.

## Typography

The system exclusively uses **Newsreader**, a versatile serif font that provides a literary, high-end editorial feel. 

- **Display & Headlines:** Use lighter weights (300-400) for large displays to maintain elegance, moving to medium (500) for hierarchy in titles.
- **Serif Body:** Unlike standard SaaS tools, body text is serif-based to encourage slow, intentional reading.
- **Labels:** Labels use a bold weight and wide letter-spacing (0.1em to 0.4em) to create a clean, modern contrast against the classic serif style.
- **Quotes:** Large, italicized serif text is used for "Promise" sections and anchors to ground the user experience in a philosophical tone.

## Layout & Spacing

The system follows a **Fixed Grid** approach for desktop, centering content within a 1200px container to prevent eye strain. 

- **Vertical Rhythm:** A "stack" system defines vertical spacing between related elements (`stack-md`) versus distinct sections (`section-gap`). 
- **Margins:** Generous side margins (48px on desktop) ensure the content feels like a page in a book.
- **Grid:** On desktop, a 2-column layout is used for primary selection paths. On mobile, elements stack vertically with reduced horizontal margins (16px).
- **Safe Areas:** Navigation and headers use `backdrop-blur` and fixed positioning to maintain context while the user scrolls through the fluid, airy canvas.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layering** rather than traditional drop shadows.

- **Surface Layers:** The primary navigation bar and auxiliary sections use `white/40` or `white/60` opacity with a `backdrop-blur-md` to appear floating above the mesh background.
- **Cards:** "Ethereal Cards" use subtle mesh backgrounds and very soft, low-opacity shadows (`shadow-lg` at 20% opacity of the accent color) to feel integrated with the environment rather than heavy.
- **Borders:** Extremely thin, semi-transparent white borders (`border-white/40`) are used to define edges on translucent surfaces without adding visual weight.

## Shapes

The shape language is defined by **organic, pill-shaped geometries**. 

- **Containers:** Standard cards use `rounded-xl` (1.5rem), while specialized sections like the "Promise Anchor" or primary action buttons use full pill-shaped rounding (`rounded-full`).
- **Icons:** Icons should be rendered with a light stroke weight (200) to match the delicate nature of the Newsreader font and rounded corners.
- **Interactions:** Hover states should involve a gentle scale (active:scale-95) to mimic a tactile, squishy feel.

## Components

- **Buttons:** Large, pill-shaped buttons with significant horizontal padding (px-12) and vertical padding (py-5). Use a high letter-spacing on the label. Include a small, trailing icon that animates on hover (e.g., `translate-x-1`).
- **Ethereal Cards:** Large containers (min-h: 520px) featuring a mesh gradient background, high-weight serif headlines, and ample internal padding (p-12 to p-16).
- **Navigation Bar:** A fixed, top-aligned bar with a blur effect. Active links are indicated by a soft, rounded underline (`mint-bloom`) rather than a color change.
- **Promise Anchors:** A decorative section for quotes, featuring a wide, pill-shaped border-radius and centered typography to create a moment of pause.
- **Avatars:** Circular, with a thin white border and a soft shadow to separate from the blurred header background.