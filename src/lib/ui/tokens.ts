/**
 * Design System Tokens
 * Single source of truth for all UI styling.
 * Apple-clean, zwart/wit/oranje minimal.
 */

export const colors = {
  // Backgrounds
  bg: "#0A0A0A",
  surface: "#111111",
  surfaceHover: "#161616",
  surfaceActive: "#1A1A1A",
  
  // Borders
  border: "rgba(255, 255, 255, 0.08)",
  borderHover: "rgba(255, 255, 255, 0.15)",
  borderActive: "rgba(255, 255, 255, 0.20)",
  
  // Text
  text: "#F5F5F5",
  textSecondary: "rgba(255, 255, 255, 0.75)",
  textMuted: "rgba(255, 255, 255, 0.50)",
  textDisabled: "rgba(255, 255, 255, 0.30)",
  
  // Accent (Orange)
  accent: "#FF7A00",
  accentHover: "#FF8C1A",
  accentMuted: "rgba(255, 122, 0, 0.15)",
  accentSubtle: "rgba(255, 122, 0, 0.08)",
  
  // Status
  success: "#22C55E",
  successMuted: "rgba(34, 197, 94, 0.15)",
  warning: "#F59E0B",
  warningMuted: "rgba(245, 158, 11, 0.15)",
  error: "#EF4444",
  errorMuted: "rgba(239, 68, 68, 0.15)",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
} as const;

export const motion = {
  fast: "150ms",
  normal: "220ms",
  slow: "350ms",
  ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export const shadows = {
  // Prefer border-based shadows for cleaner look
  sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
  md: "0 2px 8px rgba(0, 0, 0, 0.4)",
  lg: "0 4px 16px rgba(0, 0, 0, 0.5)",
  glow: `0 0 20px ${colors.accentMuted}`,
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: "11px",
    sm: "13px",
    base: "14px",
    md: "15px",
    lg: "17px",
    xl: "20px",
    "2xl": "24px",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.7",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: "32px",
      md: "40px",
      lg: "48px",
    },
    padding: {
      sm: "0 12px",
      md: "0 16px",
      lg: "0 24px",
    },
  },
  input: {
    height: "40px",
    padding: "0 12px",
  },
  sidebar: {
    widthExpanded: "240px",
    widthCollapsed: "64px",
    itemHeight: "44px",
  },
  panel: {
    padding: spacing.lg,
    gap: spacing.md,
  },
} as const;

// CSS variable generator for Tailwind integration
export const cssVariables = `
  --color-bg: ${colors.bg};
  --color-surface: ${colors.surface};
  --color-surface-hover: ${colors.surfaceHover};
  --color-border: ${colors.border};
  --color-border-hover: ${colors.borderHover};
  --color-text: ${colors.text};
  --color-text-secondary: ${colors.textSecondary};
  --color-text-muted: ${colors.textMuted};
  --color-accent: ${colors.accent};
  --color-accent-hover: ${colors.accentHover};
  --color-accent-muted: ${colors.accentMuted};
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --motion-fast: ${motion.fast};
  --motion-normal: ${motion.normal};
  --motion-ease: ${motion.ease};
`;

