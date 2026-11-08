/**
 * Memento design tokens.
 *
 * Components must use the semantic tokens (`colors.light` / `colors.dark`), never raw hex values.
 * Source: PRD §10.2 (confirmed palette, decision D-004) and SDD §7.2 (semantic token names).
 *
 * Contrast is enforced by `__tests__/tokens.test.ts` (WCAG 2.x: 4.5:1 for text, 3:1 for
 * interactive elements and state indicators).
 *
 * Color roles (O-042, confirmed): burgundy carries important text, interactive elements, and state
 * indicators in the light theme; coral is decorative only.
 */

/** The five confirmed palette colors (D-004). Do not add colors here without a decision. */
export const palette = {
  burgundy: '#5D2A42',
  coral: '#FB6376',
  softCoral: '#FCB1A6',
  peach: '#FFDCCC',
  cream: '#FFF9EC',
} as const;

export type ColorSchemeName = 'light' | 'dark';

export type SemanticColors = {
  /** App background. */
  background: string;
  /** Cards and secondary surfaces. */
  surface: string;
  /** Subtle highlights and supporting surfaces. Not a background for secondary text. */
  highlight: string;
  textPrimary: string;
  /** Secondary text; meets 4.5:1 on `background` and `surface`. */
  textSecondary: string;
  /** Important text, interactive elements (buttons, control outlines, focus), and state indicators. */
  primary: string;
  /** Text and icons placed on `primary`. */
  onPrimary: string;
  /**
   * Decorative only (O-042). Never used for text, interactive elements, or to communicate a state,
   * because coral on cream is 2.80:1. Any state shown near coral must also use `primary` or text.
   */
  accent: string;
  /** Decorative dividers only. Interactive control boundaries use `primary`. */
  border: string;
};

/** Light theme: confirmed palette; `textSecondary` is burgundy blended 80% over cream. */
const light: SemanticColors = {
  background: palette.cream,
  surface: palette.peach,
  highlight: palette.softCoral,
  textPrimary: palette.burgundy,
  textSecondary: '#7D5364',
  primary: palette.burgundy,
  onPrimary: palette.cream,
  accent: palette.coral,
  border: palette.softCoral,
};

/**
 * Dark theme: PROVISIONAL. Exact dark values are open decision O-004 and must be designed and
 * validated before dark-theme acceptance. Background and surface are burgundy-tinted near-blacks;
 * foregrounds reuse palette colors.
 */
const dark: SemanticColors = {
  background: '#1F1218',
  surface: '#2D1B23',
  highlight: palette.burgundy,
  textPrimary: palette.cream,
  textSecondary: '#BCB4AC',
  primary: palette.softCoral,
  onPrimary: '#1F1218',
  accent: palette.coral,
  border: palette.burgundy,
};

export const colors: Record<ColorSchemeName, SemanticColors> = { light, dark };

/** Spacing scale in density-independent pixels. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
