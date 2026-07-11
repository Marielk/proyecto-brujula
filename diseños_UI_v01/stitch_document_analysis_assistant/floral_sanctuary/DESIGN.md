---
name: Floral Sanctuary
colors:
  surface: '#f6fafd'
  surface-dim: '#d6dadd'
  surface-bright: '#f6fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f7'
  surface-container: '#eaeef1'
  surface-container-high: '#e5e9ec'
  surface-container-highest: '#dfe3e6'
  on-surface: '#181c1f'
  on-surface-variant: '#4e444a'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f4'
  outline: '#80747a'
  outline-variant: '#d2c2ca'
  surface-tint: '#7d5070'
  primary: '#7d5070'
  on-primary: '#ffffff'
  primary-container: '#cb96ba'
  on-primary-container: '#562e4c'
  inverse-primary: '#eeb6db'
  secondary: '#56624e'
  on-secondary: '#ffffff'
  secondary-container: '#dae7cd'
  on-secondary-container: '#5c6854'
  tertiary: '#595c7b'
  on-tertiary: '#ffffff'
  tertiary-container: '#a1a4c6'
  on-tertiary-container: '#363a57'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd7f0'
  primary-fixed-dim: '#eeb6db'
  on-primary-fixed: '#310d2a'
  on-primary-fixed-variant: '#633958'
  secondary-fixed: '#dae7cd'
  secondary-fixed-dim: '#becbb2'
  on-secondary-fixed: '#141e0f'
  on-secondary-fixed-variant: '#3f4a37'
  tertiary-fixed: '#dfe0ff'
  tertiary-fixed-dim: '#c1c4e8'
  on-tertiary-fixed: '#151934'
  on-tertiary-fixed-variant: '#414562'
  background: '#f6fafd'
  on-background: '#181c1f'
  surface-variant: '#dfe3e6'
typography:
  headline-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '300'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system is defined by an **ethereal, magical, and serene** personality. It is designed to evoke a sense of calm, wonder, and organic beauty, reminiscent of a hidden botanical garden at twilight.

The visual style blends **Glassmorphism** with **Soft Minimalism**. Surfaces are treated as semi-translucent veils, allowing soft colors to bleed through, creating depth without heavy shadows. The overall aesthetic is dreamy and high-end, targeting users who value wellness, creativity, and a peaceful digital environment.

## Colors
The palette is derived from natural floral and mineral tones.
- **Mauve Dust (Primary):** Used for key actions, highlights, and primary brand expression.
- **Green Beryl (Secondary):** Used for success states, secondary buttons, and organic accents.
- **Bluebell Frost (Tertiary):** Used for informative accents and soft decorative elements.
- **Venus Flower (Neutral):** The foundation for surface backgrounds and subtle borders.
- **Duck Egg & Forest Frolic:** Reserved for deep accents, typography contrast, and grounded structural elements.

The color application should remain "airy." Use high-transparency washes (8–15% opacity) of the primary and secondary colors for large background areas to maintain the ethereal atmosphere.

## Typography
This design system utilizes a sophisticated typographic pairing to balance tradition and modernity.
- **Headlines:** `Newsreader` provides a literary, authoritative, and slightly nostalgic feel. It should be set with generous leading and occasional italics for emphasis.
- **Body & Interface:** `Plus Jakarta Sans` offers a soft, rounded contrast that ensures high legibility and maintains the "friendly" aspect of the brand.

Avoid all-caps for headlines. Use sentence case to maintain a gentle, conversational tone.

## Layout & Spacing
The layout follows a **fluid grid** model with a heavy emphasis on "negative space as a feature." 

- **Desktop:** 12-column grid with wide 32px margins to let content breathe.
- **Mobile:** 4-column grid with 20px margins.
- **Rhythm:** Use a soft 8px baseline. Elements should be grouped with generous padding inside containers to emphasize the "sanctuary" feel—never crowd the edges of a card or a section.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Backdrop Blurs** rather than traditional shadows.
- **Surfaces:** Use `Venus Flower` (#E0E4E7) at 60-80% opacity with a `20px` background blur (glassmorphism).
- **Outlines:** Use very thin (1px) borders in a slightly darker shade of the surface color (e.g., 10% opacity `Forest Frolic`) to define edges without adding visual weight.
- **Shadows:** When necessary, use "Ambient Glows"—shadows with a large spread (30px+), very low opacity (5-8%), and tinted with the `Bluebell Frost` hex to simulate a soft light source.

## Shapes
The shape language is **ultra-rounded**, bordering on organic and pebble-like.
- **Standard UI Elements:** Use a `1rem` base radius.
- **Cards and Large Containers:** Use `2rem` (`rounded-lg`) to create a soft, non-aggressive frame.
- **Buttons and Chips:** Use `pill-shaped` (fully rounded) geometry.

Strictly avoid sharp 90-degree corners to maintain the serene and fluid aesthetic.

## Components
- **Buttons:** Primary buttons use a gradient from `Mauve Dust` to `Bluebell Frost`. They should have a subtle "squishy" scale effect on tap.
- **Input Fields:** Semi-transparent white backgrounds with a `1px` border that transitions to `Mauve Dust` on focus. Labels should use `Plus Jakarta Sans` in a medium weight.
- **Cards:** Glassmorphic backgrounds with `2rem` corner radius. Content inside should be center-aligned for an editorial feel when possible.
- **Chips/Tags:** Small, pill-shaped elements using `Green Beryl` or `Bluebell Frost` with 20% opacity backgrounds and 100% opacity text of the same hue.
- **Lists:** Use wide spacing between items, separated by soft, fading dividers rather than solid lines.
- **Navigation:** A floating, pill-shaped navigation bar centered at the bottom of the screen, utilizing a strong backdrop blur to separate it from the content.