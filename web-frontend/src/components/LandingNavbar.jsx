import { BoltRounded, Menu as MenuIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Platform", href: "#platform" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const LandingNavbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backdropFilter: "blur(10px)",
        backgroundColor: "rgba(11, 18, 32, 0.72)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ py: 1.75 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #10b981, #3b82f6)",
              }}
            >
              <BoltRounded sx={{ color: "#fff", fontSize: 20 }} />
            </Box>
            <Typography
              variant="h6"
              fontWeight={800}
              color="#fff"
              letterSpacing="-0.02em"
            >
              Fluxora
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={4}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {navLinks.map((link) => (
              <Typography
                key={link.label}
                component="a"
                href={link.href}
                variant="body2"
                sx={{
                  color: "rgba(255,255,255,0.72)",
                  fontWeight: 500,
                  "&:hover": { color: "#fff" },
                }}
              >
                {link.label}
              </Typography>
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            {isAuthenticated ? (
              <Button
                variant="contained"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate("/signin")}
                  sx={{ color: "rgba(255,255,255,0.85)" }}
                >
                  Sign in
                </Button>
                <Button variant="contained" onClick={() => navigate("/signup")}>
                  Get started
                </Button>
              </>
            )}
          </Stack>

          <IconButton
            sx={{ display: { xs: "flex", sm: "none" }, color: "#fff" }}
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </Stack>
      </Container>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260, p: 3 }}>
          <Stack spacing={2}>
            {navLinks.map((link) => (
              <Typography
                key={link.label}
                component="a"
                href={link.href}
                onClick={() => setOpen(false)}
                variant="body1"
                fontWeight={600}
              >
                {link.label}
              </Typography>
            ))}
            <Box sx={{ pt: 1 }}>
              {isAuthenticated ? (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <Stack spacing={1.5}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate("/signin")}
                  >
                    Sign in
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate("/signup")}
                  >
                    Get started
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
};

export default LandingNavbar;
