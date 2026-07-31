import {
  AddRounded,
  BoltRounded,
  PaidRounded,
  SpeedRounded,
  TimelineRounded,
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
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import DataRecordDialog from "../components/DataRecordDialog";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import {
  createDataRecord,
  getAnalytics,
  getAnalyticsSummary,
  getDataRecords,
  getPredictions,
} from "../utils/api";

const fmtKwh = (n) =>
  `${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
const fmtUsd = (n) =>
  `$${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [weekSeries, setWeekSeries] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [nextPeak, setNextPeak] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, weekRes, recordsRes, predictionsRes] =
        await Promise.all([
          getAnalyticsSummary(),
          getAnalytics("week"),
          getDataRecords({ limit: 6 }),
          getPredictions(1).catch(() => []),
        ]);
      setSummary(summaryRes);
      setWeekSeries(weekRes || []);
      setRecentRecords(recordsRes || []);
      if (predictionsRes?.length) {
        const peak = predictionsRes.reduce(
          (max, p) =>
            p.predicted_consumption > max ? p.predicted_consumption : max,
          0,
        );
        setNextPeak(peak);
      }
    } catch (err) {
      console.error(err);
      setError(
        "We couldn't load your dashboard data. Pull to retry or check the API connection.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRecord = async (payload) => {
    setSubmitting(true);
    setDialogError(null);
    try {
      await createDataRecord(payload);
      setDialogOpen(false);
      loadData();
    } catch (err) {
      setDialogError(
        err?.response?.data?.error?.message || "Could not save this reading.",
      );
    } finally {
      setSubmitting(false);
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
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here&apos;s what&apos;s happening with your energy usage over the
            last 30 days.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() => setDialogOpen(true)}
        >
          Log reading
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<BoltRounded />}
            label="Total Consumption"
            value={fmtKwh(summary?.total_consumption_kwh)}
            hint="Last 30 days"
            accent="#059669"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaidRounded />}
            label="Total Cost"
            value={fmtUsd(summary?.total_cost_usd)}
            hint="Last 30 days"
            accent="#3b82f6"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SpeedRounded />}
            label="Avg Daily Usage"
            value={fmtKwh(summary?.avg_daily_consumption_kwh)}
            hint={`${summary?.record_count ?? 0} readings logged`}
            accent="#d97706"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TimelineRounded />}
            label="Predicted Peak (24h)"
            value={nextPeak !== null ? fmtKwh(nextPeak) : "N/A"}
            hint="From forecasting model"
            accent="#dc2626"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              title="Consumption this week"
              subheader="Daily kWh totals from your logged readings"
              action={
                <Chip
                  size="small"
                  label="Live"
                  sx={{
                    backgroundColor: "rgba(5,150,105,0.1)",
                    color: "primary.dark",
                    fontWeight: 700,
                  }}
                />
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : weekSeries.length === 0 ? (
                <EmptyChartState onAdd={() => setDialogOpen(true)} />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={weekSeries}
                    margin={{ top: 10, right: 10, left: -14, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="consumptionGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      stroke="#94A3B8"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                    <ChartTooltip
                      formatter={(value, name) => [
                        name === "cost" ? fmtUsd(value) : fmtKwh(value),
                        name,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="consumption"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#consumptionGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardHeader title="Quick actions" />
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={1.5}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate("/dashboard/predictions")}
                >
                  View forecasts
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate("/dashboard/analytics")}
                >
                  Explore analytics
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate("/dashboard/data")}
                >
                  Manage data records
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => setDialogOpen(true)}
                >
                  + Log a new reading
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Recent readings"
              action={
                <Button
                  size="small"
                  onClick={() => navigate("/dashboard/data")}
                >
                  View all
                </Button>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {loading ? (
                <Skeleton variant="rounded" height={180} />
              ) : recentRecords.length === 0 ? (
                <EmptyChartState onAdd={() => setDialogOpen(true)} />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell align="right">Consumption</TableCell>
                        <TableCell align="right">Generation</TableCell>
                        <TableCell align="right">Cost</TableCell>
                        <TableCell align="right">Temp.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentRecords.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            {new Date(r.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            {fmtKwh(r.consumption_kwh)}
                          </TableCell>
                          <TableCell align="right">
                            {r.generation_kwh != null
                              ? fmtKwh(r.generation_kwh)
                              : "N/A"}
                          </TableCell>
                          <TableCell align="right">
                            {r.cost_usd != null ? fmtUsd(r.cost_usd) : "N/A"}
                          </TableCell>
                          <TableCell align="right">
                            {r.temperature_c != null
                              ? `${r.temperature_c}°C`
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <DataRecordDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddRecord}
        submitting={submitting}
        errorMessage={dialogError}
      />
    </Box>
  );
};

const EmptyChartState = ({ onAdd }) => (
  <Stack
    spacing={1.5}
    alignItems="center"
    justifyContent="center"
    sx={{ py: 6 }}
  >
    <Typography variant="body2" color="text.secondary" textAlign="center">
      No readings yet. Log your first one to see it here.
    </Typography>
    <Button size="small" variant="outlined" onClick={onAdd}>
      Log a reading
    </Button>
  </Stack>
);

export default Dashboard;
