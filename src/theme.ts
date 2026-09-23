/**
 * Shared design tokens for Scanvexa — a single source of truth for color,
 * spacing and radius so every screen reads as one consistent, considered
 * product instead of a pile of one-off hex codes.
 *
 * Palette mirrors the app icon (indigo → violet → fuchsia bloom on a deep
 * navy base), so the icon on the home screen and the UI inside it feel like
 * the same brand rather than two different apps stitched together.
 */

export const colors = {
  // Surfaces
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceRaised: "#243049",
  border: "#334155",
  borderSoft: "#2A3752",

  // Text
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",

  // Brand — violet/fuchsia, matches the app icon
  primary: "#8B5CF6",
  primaryDark: "#6D28D9",
  primarySoft: "rgba(139, 92, 246, 0.16)",
  primarySoftBorder: "rgba(139, 92, 246, 0.35)",
  accent: "#EC4899",
  onPrimary: "#FFFFFF",

  // Semantic
  success: "#4ADE80",
  successSoft: "rgba(74, 222, 128, 0.14)",
  warning: "#FBBF24",
  warningSoft: "rgba(251, 191, 36, 0.14)",
  danger: "#F87171",
} as const;

/** Gradient stops — pass straight into <LinearGradient colors={...}>. */
export const gradients = {
  brand: ["#6D28D9", "#8B5CF6", "#EC4899"] as const,
  brandSoft: ["#4C1D95", "#7C3AED"] as const,
  success: ["#16A34A", "#4ADE80"] as const,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Reusable shadow presets (iOS shadow* + Android elevation). */
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  glow: {
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
} as const;
