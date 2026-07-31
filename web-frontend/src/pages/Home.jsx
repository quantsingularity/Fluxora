import {
  AutoGraphRounded,
  BoltRounded,
  CheckCircleRounded,
  CloudSyncRounded,
  InsightsRounded,
  SecurityRounded,
  StorageRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LandingFooter from "../components/LandingFooter";
import LandingNavbar from "../components/LandingNavbar";
import { useAuth } from "../context/AuthContext";
import { getHealthStatus } from "../utils/api";

const features = [
  {
    icon: <AutoGraphRounded />,
    title: "Forecasting engine",
    desc: "Hourly consumption predictions with confidence intervals, powered by trained regression models with a safe mock fallback.",
  },
  {
    icon: <InsightsRounded />,
    title: "Analytics dashboards",
    desc: "Week, month and year rollups of consumption, cost and efficiency, computed straight from your recorded readings.",
  },
  {
    icon: <StorageRounded />,
    title: "Data management",
    desc: "Full CRUD control over every energy reading: consumption, cost, temperature and humidity, all scoped to your account.",
  },
  {
    icon: <SecurityRounded />,
    title: "JWT authentication",
    desc: "Secure access and refresh token flow keeps your session alive without ever re-sending your password.",
  },
  {
    icon: <CloudSyncRounded />,
    title: "Live backend sync",
    desc: "Every screen talks directly to the Fluxora FastAPI backend, with no static demo data once you're signed in.",
  },
  {
    icon: <TrendingUpRounded />,
    title: "Efficiency scoring",
    desc: "A normalized 0-100 efficiency score highlights where consumption is trending against your own historical peak.",
  },
];

const stats = [
  { label: "Prediction horizon", value: "Up to 90 days" },
  { label: "Analytics windows", value: "Week · Month · Year" },
  { label: "API response format", value: "REST + JSON" },
  { label: "Session security", value: "JWT access + refresh" },
];

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let mounted = true;
    getHealthStatus()
      .then((res) => mounted && setStatus(res?.status || "unknown"))
      .catch(() => mounted && setStatus("offline"));
    return () => {
      mounted = false;
    };
  }, []);

  const statusColor =
    status === "ok" || status === "healthy"
      ? "#10b981"
      : status === "checking"
        ? "#f59e0b"
        : "#ef4444";
  const statusLabel =
    status === "ok" || status === "healthy"
      ? "All systems operational"
      : status === "checking"
        ? "Checking backend status…"
        : "Backend unreachable";

  return (
    <Box sx={{ backgroundColor: "#0b1220", minHeight: "100vh" }}>
      <LandingNavbar />

      {/* Hero */}
      <Box
        id="product"
        sx={{
          position: "relative",
          overflow: "hidden",
          pt: { xs: 10, md: 14 },
          pb: { xs: 10, md: 16 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -140,
            left: -100,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(16,185,129,0.32), transparent)",
            animation: "floatBlob 10s ease-in-out infinite",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -160,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(59,130,246,0.28), transparent)",
            animation: "floatBlob 12s ease-in-out infinite",
          }}
        />

        <Container maxWidth="lg" sx={{ position: "relative" }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Chip
              icon={<CircleDot color={statusColor} />}
              label={statusLabel}
              sx={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
                px: 1,
              }}
            />
            <Typography
              variant="h1"
              sx={{
                color: "#fff",
                fontSize: { xs: "2.4rem", md: "3.75rem" },
                maxWidth: 820,
              }}
            >
              Deploy energy intelligence,{" "}
              <Box
                component="span"
                sx={{
                  background: "linear-gradient(90deg, #10b981, #3b82f6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                not spreadsheets.
              </Box>
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(255,255,255,0.65)",
                maxWidth: 620,
                fontSize: "1.15rem",
              }}
            >
              Fluxora forecasts consumption, tracks cost, and scores efficiency
              from your own metered data, with a real FastAPI backend behind
              every chart on this site.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ pt: 1 }}
            >
              <Button
                size="large"
                variant="contained"
                onClick={() =>
                  navigate(isAuthenticated ? "/dashboard" : "/signup")
                }
              >
                {isAuthenticated ? "Go to Dashboard" : "Start free"}
              </Button>
              <Button
                size="large"
                variant="outlined"
                onClick={() =>
                  navigate(isAuthenticated ? "/dashboard" : "/signin")
                }
                sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
              >
                {isAuthenticated ? "View Predictions" : "Sign in"}
              </Button>
            </Stack>
          </Stack>

          {/* Stats strip */}
          <Grid container spacing={2} sx={{ mt: { xs: 6, md: 10 } }}>
            {stats.map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Paper
                  sx={{
                    p: 2.5,
                    textAlign: "center",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 3,
                  }}
                  elevation={0}
                >
                  <Typography variant="h6" color="#fff" fontWeight={800}>
                    {s.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {s.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features */}
      <Box
        id="platform"
        sx={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg">
          <Stack
            spacing={1.5}
            alignItems="center"
            textAlign="center"
            sx={{ mb: 7 }}
          >
            <Chip
              label="Platform"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="h2" sx={{ color: "#fff", maxWidth: 640 }}>
              Everything you need to understand your energy footprint
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "rgba(255,255,255,0.65)", maxWidth: 560 }}
            >
              Every module below is wired to the live Fluxora API, so sign up to
              see your own data flow through it.
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            {features.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <Paper
                  sx={{
                    p: 3.5,
                    height: "100%",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  elevation={0}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      mb: 2,
                      background: "linear-gradient(135deg, #10b981, #3b82f6)",
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    gutterBottom
                    sx={{ color: "#fff" }}
                  >
                    {f.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {f.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How it works / pricing anchor */}
      <Box
        id="pricing"
        sx={{
          py: { xs: 8, md: 12 },
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              textAlign: "center",
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(59,130,246,0.14))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
            }}
          >
            <BoltRounded sx={{ fontSize: 40, color: "#10b981", mb: 1.5 }} />
            <Typography variant="h3" color="#fff" gutterBottom>
              Free while you evaluate
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}
            >
              Create an account, log your first reading, and watch predictions
              and analytics populate from real data within seconds.
            </Typography>
            <Stack
              spacing={1}
              sx={{ mb: 3, textAlign: "left", display: "inline-block" }}
            >
              {[
                "Unlimited energy data records",
                "Forecasts up to 90 days out",
                "Week/Month/Year analytics rollups",
              ].map((item) => (
                <Stack
                  key={item}
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                >
                  <CheckCircleRounded sx={{ color: "#10b981", fontSize: 20 }} />
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Box>
              <Button
                size="large"
                variant="contained"
                onClick={() =>
                  navigate(isAuthenticated ? "/dashboard" : "/signup")
                }
              >
                {isAuthenticated ? "Go to Dashboard" : "Create your account"}
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* FAQ */}
      <Box
        id="faq"
        sx={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          py: { xs: 8, md: 10 },
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h2"
            textAlign="center"
            sx={{ color: "#fff", mb: 5 }}
          >
            Frequently asked questions
          </Typography>
          <Stack spacing={2.5}>
            {[
              {
                q: "Is this connected to a real backend?",
                a: "Yes. Every authenticated screen calls the Fluxora FastAPI service for auth, data records, analytics and predictions, and there is no mock mode once you sign in.",
              },
              {
                q: "What happens if no trained model is available?",
                a: "Predictions gracefully fall back to a physically plausible mock forecast so the dashboard stays useful while a model is being trained.",
              },
              {
                q: "Can I edit or delete a reading after logging it?",
                a: "Yes. The Data Records page gives you full create, edit and delete control over every reading tied to your account.",
              },
            ].map((item) => (
              <Paper
                key={item.q}
                sx={{
                  p: 3,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                elevation={0}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  gutterBottom
                  sx={{ color: "#fff" }}
                >
                  {item.q}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.65)" }}
                >
                  {item.a}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Container>
      </Box>

      <LandingFooter />
    </Box>
  );
};

const CircleDot = ({ color }) => (
  <Box
    sx={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: color,
      ml: 1,
    }}
  />
);

export default Home;
