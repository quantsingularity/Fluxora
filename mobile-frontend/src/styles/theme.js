import { DefaultTheme } from "react-native-paper";

// ---------------------------------------------------------------------------
// Fluxora design tokens (mobile)
// Mirrors the web app's palette: emerald primary, blue accent, deep ink
// neutrals, soft elevation. Keeps the app visually consistent across
// platforms.
// ---------------------------------------------------------------------------
export const colors = {
  primary: "#059669",
  primaryLight: "#10b981",
  primaryDark: "#047857",
  secondary: "#3b82f6",
  secondaryLight: "#60a5fa",
  secondaryDark: "#2563eb",
  ink: "#0b1220",
  ink2: "#0f172a",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  info: "#0ea5e9",
};

/**
 * Light theme configuration (react-native-paper MD3-compatible shape)
 */
export const lightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    text: colors.textPrimary,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    disabled: "#CBD5E1",
    placeholder: colors.textMuted,
    backdrop: "rgba(11, 18, 32, 0.5)",
    notification: colors.secondary,
  },
  roundness: 14,
};

/**
 * Common spacing scale
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Common font sizes
 */
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

/**
 * Common shadow / elevation presets
 */
export const shadows = {
  small: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  large: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};

export default {
  colors,
  lightTheme,
  spacing,
  fontSize,
  shadows,
};
