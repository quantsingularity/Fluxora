import { BoltOutlined } from "@mui/icons-material";
import { Box, CircularProgress, Typography } from "@mui/material";

const LoadingScreen = ({ label = "Loading Fluxora…" }) => (
  <Box
    sx={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      background:
        "linear-gradient(160deg, #0b1220 0%, #0f2027 55%, #0b1220 100%)",
      color: "#fff",
    }}
  >
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #10b981, #3b82f6)",
      }}
    >
      <BoltOutlined sx={{ fontSize: 30 }} />
    </Box>
    <CircularProgress size={28} sx={{ color: "#10b981" }} />
    <Typography variant="body2" sx={{ color: "#94a3b8" }}>
      {label}
    </Typography>
  </Box>
);

export default LoadingScreen;
