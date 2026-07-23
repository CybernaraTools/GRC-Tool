---
name: Audit-Grade Precision
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-muted:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 260px
  gutter: 24px
  margin_container: 32px
  stack_sm: 8px
  stack_md: 16px
---

## Brand & Style

This design system is built for the high-stakes environment of B2B GRC (Governance, Risk, and Compliance). The aesthetic is **High-Contrast Minimalism**, prioritizing clarity, authority, and "audit-grade" precision. By stripping away all decorative hues and focusing on a strict monochromatic scale, the UI recedes to let the data and compliance status take center stage.

The emotional response is one of absolute reliability and neutrality. There is no ambiguity; the interface feels like a digital ledger—structured, immutable, and professional. The style avoids traditional "status colors" (red/green), instead using shape, weight, and contrast to denote importance and hierarchy.

## Colors

The palette is strictly achromatic. 

- **Primary:** Pure Black (#000000) for primary actions and key text.
- **Surface:** Pure White (#FFFFFF) for main content cards and workspace areas.
- **Grayscale:** #F5F5F5 is utilized for the global background to provide subtle separation from white cards. #E5E7EB serves as the universal border color for a crisp, technical look.
- **Sidebar/Dark Mode:** #0A0A0A is reserved for the persistent sidebar and serves as the primary surface color in Dark Mode.

**Theme Switching:**
- In **Light Mode**, the primary workspace is #F5F5F5 with #FFFFFF cards and #000000 text.
- In **Dark Mode**, the workspace becomes #000000 with #0A0A0A cards and #FFFFFF text. Borders should shift from #E5E7EB to #262626 (a dark charcoal) to maintain the "thin line" aesthetic without excessive glow.

## Typography

This design system utilizes **Inter** exclusively to leverage its systematic, utilitarian character. 

Hierarchy is established through weight rather than color. Headings are bold and tight-set to convey authority. Body text utilizes a **Medium (500)** weight instead of Regular to ensure high legibility against stark white or black backgrounds. For data-heavy views, use `label-caps` for table headers and `label-muted` for secondary metadata.

## Layout & Spacing

The layout follows a **Fixed Sidebar + Fluid Content** model. 

1. **Sidebar:** Fixed at 260px. It uses a dark background (#0A0A0A) to create a clear structural anchor on the left.
2. **Main Workspace:** A fluid container with 32px padding from the sidebar and screen edges. 
3. **Grid:** Content within the workspace should align to a 12-column grid for complex dashboards, but use simple vertical stacks for settings and document views.
4. **Responsive:** On tablet, the sidebar collapses to a 64px icon-only rail. On mobile, the sidebar becomes a hidden drawer, and workspace margins reduce to 16px.

## Elevation & Depth

This design system avoids traditional shadows to maintain a "flat/technical" aesthetic. Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines**:

- **Level 0 (Background):** #F5F5F5 (Light Mode) / #000000 (Dark Mode).
- **Level 1 (Cards/Sheets):** #FFFFFF (Light Mode) / #0A0A0A (Dark Mode). These must have a 1px solid border (#E5E7EB).
- **Interactive State:** Elements like hovered rows or cards may use a very subtle fill change (e.g., #FAFAFA) but should never "lift" off the page with a shadow. 
- **Separators:** Use 1px horizontal lines to divide sections within cards, ensuring they align perfectly with the grid.

## Shapes

The shape language balances the severity of the monochrome palette with approachable, modern geometry. 

- **Containers & Cards:** Use a 10px corner radius (defined as `rounded-lg` in this system) to soften the professional aesthetic.
- **Inputs & Buttons:** Use a standard 8px radius.
- **Status Tags:** Must be **Pill-shaped** (full radius). This distinct shape differentiates "status" or "category" metadata from interactive buttons or input fields.

## Components

### Buttons
- **Primary:** Solid #000000 background with #FFFFFF text. No border. On hover, reduce opacity to 90%.
- **Secondary:** Transparent background with 1px #000000 border and #000000 text.
- **Ghost:** No background or border; #000000 text. Used for less frequent actions.

### Chips / Status Tags
- **Style:** Pill-shaped, #F5F5F5 background, #000000 text. 
- **Indicator:** Since hues are not used, indicate "Critical" or "Alert" states by inverting the chip (Solid #000000 background with #FFFFFF text).

### Input Fields
- **Default:** 1px #E5E7EB border, 8px radius, #FFFFFF background.
- **Focus:** 1px #000000 border. No glow/shadow.

### Cards
- **Structure:** 1px #E5E7EB border, 10px radius, 24px internal padding. 
- **Header:** Cards should include a 48px height header section separated by a 1px horizontal line.

### Sidebar Items
- **Active State:** A 2px vertical stroke on the far left of the item and a subtle #FFFFFF (10% opacity) background highlight. Text remains white.