export const COLORS = {
  // Screen background (warm taupe) — surfaces behind text stay cream.
  // Dark text lives on cream AND on taupe; cream is reserved for
  // text on dark fills and outlines.
  primary: '#2B1E12',
  background: '#A5907B',
  card: '#F6EFDA',
  textPrimary: '#1E140C',
  textSecondary: '#6B5B45',
  textOnPrimary: '#F6EFDA',
  surface: '#F6EFDA',
  border: '#1E140C',
  shadow: '#000000',
  // Semantic states — dark on cream (distinction via fill: dark vs cream)
  warning: '#1E140C',
  success: '#1E140C',
  danger: '#1E140C',
  // Text for content sitting directly on the taupe background (dark = readable)
  textOnBackground: '#1E140C',
  mutedOnBackground: '#4A3A28',
  outline: '#F6EFDA',
  // Progress-bar track on cream cards
  track: '#D9CBA6',
} as const;
