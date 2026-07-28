import { BoltRounded } from "@mui/icons-material";
import {
  Box,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

const columns = [
  {
    title: "Product",
    links: ["Overview", "Predictions", "Analytics", "Data records"],
  },
  {
    title: "Platform",
    links: ["Documentation", "API reference", "Status", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
];

const LandingFooter = () => (
  <Box
    sx={{
      backgroundColor: "#0b1220",
      color: "rgba(255,255,255,0.7)",
      pt: 8,
      pb: 4,
    }}
  >
    <Container maxWidth="lg">
      <Grid container spacing={6}>
        <Grid item xs={12} md={4}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ mb: 2 }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #10b981, #3b82f6)",
              }}
            >
              <BoltRounded sx={{ color: "#fff", fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} color="#fff">
              Fluxora
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            sx={{ maxWidth: 320, color: "rgba(255,255,255,0.55)" }}
          >
            An energy intelligence platform for forecasting consumption,
            tracking cost, and spotting efficiency opportunities in real time.
          </Typography>
        </Grid>
        {columns.map((col) => (
          <Grid item xs={6} md={2.4} key={col.title}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color="#fff"
              sx={{ mb: 2 }}
            >
              {col.title}
            </Typography>
            <Stack spacing={1.25}>
              {col.links.map((link) => (
                <Typography
                  key={link}
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.55)",
                    "&:hover": { color: "#fff" },
                    cursor: "pointer",
                  }}
                >
                  {link}
                </Typography>
              ))}
            </Stack>
          </Grid>
        ))}
      </Grid>
      <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.08)" }} />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
          © {new Date().getFullYear()} Fluxora. All rights reserved.
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
          Built with FastAPI, React &amp; React Native.
        </Typography>
      </Stack>
    </Container>
  </Box>
);

export default LandingFooter;
