import {
  BoltRounded,
  CheckCircleRounded,
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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MIN_PASSWORD_LENGTH = 8;

const perks = [
  "Full CRUD control over your energy readings",
  "Forecasts up to 90 days with confidence bands",
  "Week / month / year analytics rollups",
];

const SignUp = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    if (!email || !password || !confirmPassword) {
      return "Please fill in every field.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    if (!agree) {
      return "Please accept the terms to continue.";
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await register(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate("/dashboard", { replace: true });
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
            bottom: -140,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(59,130,246,0.28), transparent)",
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
          Create your account and meet your data.
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {perks.map((perk) => (
            <Stack
              key={perk}
              direction="row"
              spacing={1.25}
              alignItems="center"
            >
              <CheckCircleRounded sx={{ color: "#10b981", fontSize: 20 }} />
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.75)" }}
              >
                {perk}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

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
            <Typography variant="h4">Create your account</Typography>
            <Typography variant="body2" color="text.secondary">
              Takes less than a minute — no credit card required.
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
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
              <TextField
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                fullWidth
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    I agree to the Terms of Service and Privacy Policy
                  </Typography>
                }
              />
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
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Already have an account?
            </Typography>
          </Divider>

          <Button
            component={RouterLink}
            to="/signin"
            fullWidth
            variant="outlined"
          >
            Sign in instead
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

export default SignUp;
