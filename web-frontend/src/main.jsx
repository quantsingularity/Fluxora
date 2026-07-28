import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import theme from "./theme.js";
import "./index.css";

// Error boundary component to catch and handle errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React error boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            color: "#333",
          }}
        >
          <h1>Fluxora - Energy Prediction System</h1>
          <p>Something went wrong loading the application.</p>
          <p>
            Please try refreshing the page or contact support if the issue
            persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap the entire application in a try-catch to handle initialization errors
try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
} catch (error) {
  console.error("Failed to initialize React application:", error);

  // Render a fallback UI if React initialization fails
  document.getElementById("root").innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Inter, sans-serif; color: #333;">
      <h1>Fluxora - Energy Prediction System</h1>
      <p>Unable to initialize the application.</p>
      <p>Please try refreshing the page or contact support if the issue persists.</p>
      <button
        onclick="window.location.reload()"
        style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;"
      >
        Refresh Page
      </button>
    </div>
  `;
}
