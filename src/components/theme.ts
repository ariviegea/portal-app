/**
 * Design tokens for the component library. Colours point at CSS variables set
 * in GlobalStyle, so every component follows the light or dark scheme.
 */
export const theme = {
  color: {
    background: "var(--color-background)",
    surface: "var(--color-surface)",
    text: "var(--color-text)",
    muted: "var(--color-muted)",
    border: "var(--color-border)",
    accent: "var(--color-accent)",
    onAccent: "var(--color-on-accent)",
    danger: "var(--color-danger)",
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "40px",
  },
  radius: "8px",
  font: {
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
} as const;
