import { BoltRounded } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(160deg, #0b1220 0%, #0f2027 55%, #0b1220 100%)",
        px: 3,
        textAlign: "center",
      }}
    >
      <Stack spacing={3} alignItems="center">
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
          <BoltRounded sx={{ fontSize: 30, color: "#fff" }} />
        </Box>
        <Typography variant="h1" sx={{ color: "#fff", fontSize: "5rem" }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ color: "rgba(255,255,255,0.8)" }}>
          This page has drifted off the grid.
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.5)", maxWidth: 420 }}
        >
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
        >
          {isAuthenticated ? "Back to Dashboard" : "Back to Homepage"}
        </Button>
      </Stack>
    </Box>
  );
};

export default NotFound;
