import {
  BoltRounded,
  LockOutlined,
  MailOutline,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        background:
          "linear-gradient(160deg, #0b1220 0%, #0f2027 55%, #0b1220 100%)",
      }}
    >
      {/* Left brand panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          px: 8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(16,185,129,0.28), transparent)",
          }}
        />
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #10b981, #3b82f6)",
            }}
          >
            <BoltRounded sx={{ color: "#fff" }} />
          </Box>
          <Typography variant="h5" color="#fff" fontWeight={800}>
            Fluxora
          </Typography>
        </Stack>
        <Typography variant="h2" color="#fff" sx={{ maxWidth: 480, mb: 2 }}>
          Welcome back to your energy command center.
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "rgba(255,255,255,0.6)", maxWidth: 420 }}
        >
          Pick up right where you left off — live forecasts, analytics and your
          full data history are waiting.
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box
        sx={{
          flex: { xs: 1, md: "0 0 480px" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Paper
          sx={{ p: { xs: 3.5, sm: 5 }, width: "100%", maxWidth: 420 }}
          elevation={0}
        >
          <Stack spacing={0.5} sx={{ mb: 3.5 }}>
            <Typography variant="h4">Sign in</Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your credentials to access your dashboard.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutline fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                      >
                        {showPassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">Remember me</Typography>}
                />
                <Typography variant="body2" color="text.disabled">
                  Forgot password?
                </Typography>
              </Stack>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={
                  submitting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : null
                }
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              New to Fluxora?
            </Typography>
          </Divider>

          <Button
            component={RouterLink}
            to="/signup"
            fullWidth
            variant="outlined"
          >
            Create an account
          </Button>

          <Typography
            variant="caption"
            display="block"
            textAlign="center"
            sx={{ mt: 3 }}
          >
            <Link
              component={RouterLink}
              to="/"
              underline="hover"
              color="text.secondary"
            >
              ← Back to homepage
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default SignIn;
