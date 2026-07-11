---
name: Ensueño Etéreo
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#434841'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#737970'
  outline-variant: '#c3c8be'
  surface-tint: '#4b6547'
  primary: '#4b6547'
  on-primary: '#ffffff'
  primary-container: '#a7c4a0'
  on-primary-container: '#385235'
  inverse-primary: '#b1cfaa'
  secondary: '#655a72'
  on-secondary: '#ffffff'
  secondary-container: '#e9daf7'
  on-secondary-container: '#6a5e77'
  tertiary: '#51606f'
  on-tertiary: '#ffffff'
  tertiary-container: '#aebecf'
  on-tertiary-container: '#3e4d5b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cdebc5'
  primary-fixed-dim: '#b1cfaa'
  on-primary-fixed: '#092009'
  on-primary-fixed-variant: '#344d31'
  secondary-fixed: '#ecddfa'
  secondary-fixed-dim: '#d0c1de'
  on-secondary-fixed: '#21172c'
  on-secondary-fixed-variant: '#4d425a'
  tertiary-fixed: '#d4e4f6'
  tertiary-fixed-dim: '#b8c8d9'
  on-tertiary-fixed: '#0d1d2a'
  on-tertiary-fixed-variant: '#394856'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
  parchment-cream: '#FDFBF7'
  misty-blue: '#9BA8B8'
  soft-sage: '#8FA989'
  pale-lavender: '#E6E0ED'
typography:
  headline-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Newsreader
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  page-margin: 4rem
  gutter: 2rem
  section-gap: 6rem
---

## Brand & Style

The design system is anchored in the metaphor of an **interactive illustrated book**. It moves away from the cold efficiency of digital dashboards and toward a warm, contemplative, and deeply human experience. The primary goal is to evoke feelings of hope, calm, and curiosity, acting as a gentle companion rather than a clinical tool.

Drawing heavy inspiration from Studio Ghibli, Claude Monet, and the "cottagecore" aesthetic, the visual style is **Tactile and Illustrative**. The UI should feel like a series of watercolor pages, utilizing generous white space (breathing room) and natural transitions. Every element is designed to reduce anxiety—exchanging technical data for organic storytelling.

**Key Stylistic Pillars:**
- **Narrative-First:** Every screen answers a single, meaningful question.
- **Organic Evolution:** Progress is shown through botanical growth (buds, blooms, trees) rather than progress bars.
- **Analog Textures:** Backgrounds should resemble high-quality paper or parchment.
- **Gentle Motion:** Transitions are slow, mimicking the falling of a leaf or the turning of a physical page.

## Colors

The palette is strictly composed of **low-saturation pastels**. Saturated or "neon" colors are strictly forbidden to maintain a peaceful atmosphere. The color scheme focuses on soft greens (growth), lavendas (spirituality/calm), and grayish-blues (depth/trust), all resting on a warm cream base.

- **Primary (Soft Green):** Used for growth elements, positive paths, and "recommended" highlights.
- **Secondary (Lavender):** Used for reflective elements, rituals, and the character "Sue."
- **Tertiary (Grayish Blue):** Used for secondary paths, "hidden" options, and structural depth.
- **Neutral (Cream):** Replaces white as the primary background color to reduce eye strain and provide a "book paper" feel.

## Typography

The design system uses **Newsreader** exclusively for all typographic roles. This serif choice reinforces the "literary" and "authoritative yet warm" personality of the system.

- **Hierarchy:** High contrast between sizes is used to guide the eye through the narrative.
- **Legibility:** Generous line-height (1.6 - 1.7) is mandatory for body text to create a relaxed reading experience.
- **Letter Spacing:** Headlines utilize slightly tight spacing for an editorial look, while labels use expanded spacing for clarity and a "caption" feel.
- **Emphasis:** Italic variants should be used for quotes from Sue or internal reflections to differentiate the "voice" of the interface.

## Layout & Spacing

This design system follows a **Fixed Grid** model that centers content within a readable column (ideally 700px-900px for text-heavy sections), mimicking the proportions of a book page. 

- **Generous Whitespace:** Margins and section gaps are intentionally large to encourage "respiration" and prevent visual overwhelm.
- **Single Question Focus:** Only one major conceptual block should be visible at a time.
- **Mobile Reflow:** On mobile, margins reduce to 1.5rem, and the layout stacks vertically into a single-column scroll that feels like a continuous scroll of parchment.
- **Visual Rhythm:** Elements should never feel "packed." If in doubt, increase the spacing.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layers** and **Subtle Transparency** rather than harsh shadows. 

- **The Page Metaphor:** The primary surface is the "Paper." Elements on top of it use slightly lighter or darker tints of the base cream or pastel colors.
- **Watercolor Blurs:** Instead of standard drop shadows, use very soft, color-tinted glows (e.g., a soft green glow behind a recommended path card).
- **Interactive Depth:** When a card is hovered or selected, it should feel like it's being gently lifted or highlighted by a wash of color, not by a mechanical shadow.
- **Glassmorphism:** Use only for floating navigation or overlays to suggest a "mist" or "vellum" layer over the page.

## Shapes

The shape language is strictly **Organic and Full**. There are no sharp corners in the design system.

- **Full Rounds:** Buttons, chips, and small interactive elements are pill-shaped (`ROUND_FULL`).
- **Container Curvature:** Large cards and section containers use maximum roundedness to feel like smooth stones or hand-cut paper.
- **Irregularity:** Where possible, use slightly asymmetrical SVG masks for illustrations to reinforce the hand-drawn, watercolor aesthetic.

## Components

### Cards (The "Storybook" Page)
Cards should not have borders. Use subtle background color shifts (e.g., a very pale sage for a "Recommended Path") and large corner radii. They should feel like sheets of paper resting on a table.

### Buttons (The "Ritual" Toggle)
Buttons are always pill-shaped. The primary action should use a soft wash of the `primary_color` (Sage) with dark serif text. Hover states should be a gentle fade into a slightly deeper tint.

### Botanical Indicators (The "Anti-Progress Bar")
Technical bars are replaced by illustrations. A 50% completion state might show a small sprout, while 100% shows a blooming flower. These should be high-quality watercolor assets.

### The "Carta de Sue" (The Letter)
A specific component that uses a `parchment-cream` background, a small hand-drawn signature at the bottom, and a slightly different line-height to feel distinct from the rest of the UI.

### Navigation (The Floating Compass)
A floating, pill-shaped bottom navigation bar with high backdrop-blur (mist effect) allows the user to jump between "Summary," "History," and "Rituals" without breaking the immersion of the page.

### Ritual Cards
Small, friendly cards containing an icon (e.g., a coffee cup), a title, and a "benefit" label. These should feel like collectible cards within the book.