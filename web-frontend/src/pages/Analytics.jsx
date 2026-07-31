import {
  PaidRounded,
  SpeedRounded,
  ThermostatRounded,
  BoltRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "../components/StatCard";
import { getAnalytics } from "../utils/api";

const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const fmtKwh = (n) =>
  `${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
const fmtUsd = (n) =>
  `$${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const Analytics = () => {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getAnalytics(period)
      .then((res) => mounted && setData(res || []))
      .catch(
        () => mounted && setError("Unable to load analytics for this period."),
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [period]);

  const totals = useMemo(() => {
    if (!data.length)
      return { consumption: 0, cost: 0, avgEfficiency: 0, avgTemp: null };
    const consumption = data.reduce((sum, d) => sum + (d.consumption || 0), 0);
    const cost = data.reduce((sum, d) => sum + (d.cost || 0), 0);
    const avgEfficiency =
      data.reduce((sum, d) => sum + (d.efficiency || 0), 0) / data.length;
    const temps = data
      .filter((d) => d.temperature != null)
      .map((d) => d.temperature);
    const avgTemp = temps.length
      ? temps.reduce((s, t) => s + t, 0) / temps.length
      : null;
    return { consumption, cost, avgEfficiency, avgTemp };
  }, [data]);

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
            Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Consumption, cost and efficiency rollups computed from your logged
            data.
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, val) => val && setPeriod(val)}
          size="small"
        >
          {PERIODS.map((p) => (
            <ToggleButton
              key={p.value}
              value={p.value}
              sx={{ px: 2.5, textTransform: "none", fontWeight: 600 }}
            >
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<BoltRounded />}
            label="Total Consumption"
            value={fmtKwh(totals.consumption)}
            accent="#059669"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaidRounded />}
            label="Total Cost"
            value={fmtUsd(totals.cost)}
            accent="#3b82f6"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SpeedRounded />}
            label="Avg Efficiency"
            value={`${totals.avgEfficiency.toFixed(1)}%`}
            accent="#d97706"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ThermostatRounded />}
            label="Avg Temperature"
            value={
              totals.avgTemp != null ? `${totals.avgTemp.toFixed(1)}°C` : "N/A"
            }
            accent="#dc2626"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 2.5 }}>
        <CardHeader
          title="Consumption vs. cost"
          subheader={`Aggregated by ${period}`}
        />
        <CardContent sx={{ pt: 0 }}>
          {loading ? (
            <Skeleton variant="rounded" height={320} />
          ) : data.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: 6, textAlign: "center" }}
            >
              No analytics data for this period yet.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={data}
                margin={{ top: 10, right: 10, left: -14, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="#94A3B8"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  stroke="#94A3B8"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="#94A3B8"
                />
                <ChartTooltip
                  formatter={(value, name) => [
                    name === "cost" ? fmtUsd(value) : fmtKwh(value),
                    name,
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="consumption"
                  fill="#a7f3d0"
                  radius={[6, 6, 0, 0]}
                  barSize={22}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Breakdown" />
        <CardContent sx={{ pt: 0 }}>
          {loading ? (
            <Skeleton variant="rounded" height={220} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Consumption</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Avg. Temp</TableCell>
                    <TableCell align="right">Efficiency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.label} hover>
                      <TableCell>{row.label}</TableCell>
                      <TableCell align="right">
                        {fmtKwh(row.consumption)}
                      </TableCell>
                      <TableCell align="right">{fmtUsd(row.cost)}</TableCell>
                      <TableCell align="right">
                        {row.temperature != null
                          ? `${row.temperature}°C`
                          : "N/A"}
                      </TableCell>
                      <TableCell align="right">{row.efficiency}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Analytics;
