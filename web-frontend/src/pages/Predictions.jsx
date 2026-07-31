import {
  AutoGraphRounded,
  ModelTrainingRounded,
  TimelineRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { getPredictions, triggerTraining } from "../utils/api";

const HORIZONS = [1, 3, 7, 14, 30, 90];

const fmtKwh = (n) =>
  `${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;

const Predictions = () => {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getPredictions(days)
      .then((res) => mounted && setPredictions(res || []))
      .catch(
        () => mounted && setError("Unable to generate predictions right now."),
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [days]);

  const chartData = useMemo(
    () =>
      predictions.map((p) => ({
        timestamp: new Date(p.timestamp).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: days <= 3 ? "numeric" : undefined,
        }),
        predicted: p.predicted_consumption,
        lower: p.confidence_interval?.lower,
        upper: p.confidence_interval?.upper,
      })),
    [predictions, days],
  );

  const stats = useMemo(() => {
    if (!predictions.length) return { avg: 0, peak: 0, low: 0 };
    const values = predictions.map((p) => p.predicted_consumption);
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      peak: Math.max(...values),
      low: Math.min(...values),
    };
  }, [predictions]);

  const handleTrain = async () => {
    setTraining(true);
    setTrainingResult(null);
    try {
      const res = await triggerTraining();
      setTrainingResult({
        type: "success",
        message: `Model retrained (status: ${res.status}).`,
      });
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        "Training failed or requires admin access.";
      setTrainingResult({ type: "error", message });
    } finally {
      setTraining(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Predictions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Forecasted consumption with confidence intervals.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            select
            size="small"
            label="Horizon"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{ minWidth: 140 }}
          >
            {HORIZONS.map((h) => (
              <MenuItem key={h} value={h}>
                {h} day{h > 1 ? "s" : ""}
              </MenuItem>
            ))}
          </TextField>
          {user?.is_superuser && (
            <Button
              variant="outlined"
              startIcon={<ModelTrainingRounded />}
              onClick={handleTrain}
              disabled={training}
            >
              {training ? "Training…" : "Retrain model"}
            </Button>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {trainingResult && (
        <Alert
          severity={trainingResult.type}
          sx={{ mb: 3 }}
          onClose={() => setTrainingResult(null)}
        >
          {trainingResult.message}
        </Alert>
      )}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<AutoGraphRounded />}
            label="Average forecast"
            value={fmtKwh(stats.avg)}
            accent="#059669"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<TrendingUpRounded />}
            label="Peak forecast"
            value={fmtKwh(stats.peak)}
            accent="#dc2626"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<TimelineRounded />}
            label="Lowest forecast"
            value={fmtKwh(stats.low)}
            accent="#3b82f6"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title={`Forecast: next ${days} day${days > 1 ? "s" : ""}`}
          action={
            <Chip
              size="small"
              label="Model + confidence band"
              sx={{
                backgroundColor: "rgba(59,130,246,0.1)",
                color: "secondary.dark",
                fontWeight: 700,
              }}
            />
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {loading ? (
            <Skeleton variant="rounded" height={340} />
          ) : chartData.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: 6, textAlign: "center" }}
            >
              No forecast data available.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -14, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 11 }}
                  stroke="#94A3B8"
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <ChartTooltip formatter={(value) => fmtKwh(value)} />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="url(#bandGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="#fff"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Predictions;
