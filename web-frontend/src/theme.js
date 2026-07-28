import { createTheme } from "@mui/material/styles";

// ---------------------------------------------------------------------------
// Fluxora design tokens
// Shared visual language with the mobile app: emerald primary, blue accent,
// deep ink neutrals, Inter typography, soft elevation.
// ---------------------------------------------------------------------------
export const tokens = {
  primary: "#059669",
  primaryLight: "#10b981",
  primaryDark: "#047857",
  secondary: "#3b82f6",
  secondaryLight: "#60a5fa",
  secondaryDark: "#2563eb",
  ink: "#0b1220",
  ink2: "#0f172a",
  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  info: "#0ea5e9",
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: tokens.primary,
      light: tokens.primaryLight,
      dark: tokens.primaryDark,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: tokens.secondary,
      light: tokens.secondaryLight,
      dark: tokens.secondaryDark,
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF",
    },
    error: { main: tokens.error },
    warning: { main: tokens.warning },
    info: { main: tokens.info },
    success: { main: tokens.success },
    text: {
      primary: "#0F172A",
      secondary: "#475569",
    },
    divider: "#E2E8F0",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, fontSize: "3rem", letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.01em" },
    h4: { fontWeight: 700, fontSize: "1.5rem" },
    h5: { fontWeight: 600, fontSize: "1.25rem" },
    h6: { fontWeight: 600, fontSize: "1.05rem" },
    subtitle1: { fontSize: "1rem", fontWeight: 500 },
    subtitle2: { fontSize: "0.875rem", fontWeight: 500 },
    body1: { fontSize: "1rem" },
    body2: { fontSize: "0.875rem" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "9px 20px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0px 6px 16px rgba(5, 150, 105, 0.18)",
          },
        },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, ${tokens.primaryLight}, ${tokens.primary})`,
        },
        sizeLarge: {
          padding: "12px 28px",
          fontSize: "1rem",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow:
            "0px 1px 2px rgba(15, 23, 42, 0.04), 0px 8px 24px rgba(15, 23, 42, 0.05)",
          border: "1px solid #EEF2F6",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow:
            "0px 1px 2px rgba(15, 23, 42, 0.04), 0px 8px 24px rgba(15, 23, 42, 0.05)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0px 1px 0px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { padding: "14px 16px", borderColor: "#EEF2F6" },
        head: {
          fontWeight: 700,
          backgroundColor: "#F8FAFC",
          color: "#475569",
          fontSize: "0.78rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "medium" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});

export default theme;
