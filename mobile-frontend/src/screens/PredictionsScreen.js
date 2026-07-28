import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  SegmentedButtons,
  Snackbar,
  Text,
  Title,
} from "react-native-paper";
import { LineChart } from "react-native-chart-kit";
import StatCard from "../components/StatCard";
import { useAuth } from "../contexts/AuthContext";
import { getPredictions, triggerTraining } from "../api/api";
import { colors, fontSize, shadows, spacing } from "../styles/theme";

const screenWidth = Dimensions.get("window").width;
const HORIZONS = [
  { value: "1", label: "1d" },
  { value: "7", label: "7d" },
  { value: "14", label: "14d" },
  { value: "30", label: "30d" },
];

const fmtKwh = (n) =>
  `${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;

export default function PredictionsScreen() {
  const { user } = useAuth();
  const [days, setDays] = useState("7");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [training, setTraining] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const load = useCallback(async (d) => {
    try {
      const res = await getPredictions(Number(d));
      setPredictions(res || []);
    } catch (err) {
      console.error("Failed to load predictions", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(days);
    }, [load, days]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load(days);
  };

  const handleTrain = async () => {
    setTraining(true);
    try {
      const res = await triggerTraining();
      setSnackbar(`Model retrained (status: ${res.status}).`);
    } catch (err) {
      setSnackbar(
        err?.response?.data?.error?.message ||
          "Training failed or requires admin access.",
      );
    } finally {
      setTraining(false);
    }
  };

  const values = predictions.map((p) => p.predicted_consumption);
  const avg = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
  const peak = values.length ? Math.max(...values) : 0;
  const low = values.length ? Math.min(...values) : 0;

  const maxPoints = 14;
  const step = Math.max(1, Math.ceil(predictions.length / maxPoints));
  const sampled = predictions.filter((_, i) => i % step === 0);
  const chartLabels = sampled.map((p) =>
    new Date(p.timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  );
  const chartValues = sampled.map((p) => p.predicted_consumption);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.heading}>Predictions</Text>
        <Text style={styles.subheading}>
          Forecasted consumption with confidence intervals.
        </Text>

        <SegmentedButtons
          value={days}
          onValueChange={setDays}
          style={styles.segmented}
          buttons={HORIZONS}
        />

        {user?.is_superuser && (
          <Button
            mode="outlined"
            icon="brain"
            onPress={handleTrain}
            loading={training}
            disabled={training}
            style={styles.trainButton}
          >
            {training ? "Training…" : "Retrain model"}
          </Button>
        )}

        <View style={styles.statsRow}>
          <StatCard
            icon="chart-line"
            label="Average"
            value={fmtKwh(avg)}
            accent={colors.primary}
            style={styles.statCardThird}
          />
          <StatCard
            icon="trending-up"
            label="Peak"
            value={fmtKwh(peak)}
            accent={colors.error}
            style={styles.statCardThird}
          />
          <StatCard
            icon="trending-down"
            label="Lowest"
            value={fmtKwh(low)}
            accent={colors.secondary}
            style={styles.statCardThird}
          />
        </View>

        <Card
          style={[styles.card, shadows.small, { marginBottom: spacing.xxl }]}
        >
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <Title style={styles.cardTitle}>
                Forecast — next {days} day{days !== "1" ? "s" : ""}
              </Title>
              <Chip compact style={styles.chip} textStyle={styles.chipText}>
                Model
              </Chip>
            </View>
            {chartValues.length > 0 ? (
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartValues }],
                }}
                width={screenWidth - spacing.lg * 2 - 32}
                height={220}
                bezier
                withInnerLines={false}
                chartConfig={{
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
                  labelColor: () => colors.textSecondary,
                  propsForDots: {
                    r: "3",
                    strokeWidth: "2",
                    stroke: colors.primary,
                  },
                }}
                style={{ marginLeft: -spacing.lg, borderRadius: 12 }}
              />
            ) : (
              <Text style={styles.emptyText}>
                {loading ? "Loading…" : "No forecast data available."}
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar(null)}
        duration={3500}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },
  heading: { fontSize: fontSize.xl, fontWeight: "800" },
  subheading: {
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  segmented: { marginBottom: spacing.md },
  trainButton: { marginBottom: spacing.md, borderRadius: 10 },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  statCardThird: { flex: 1 },
  card: { borderRadius: 16, marginTop: spacing.sm },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: fontSize.md, flexShrink: 1 },
  chip: { backgroundColor: "rgba(59,130,246,0.12)" },
  chipText: {
    color: colors.secondaryDark,
    fontWeight: "700",
    fontSize: fontSize.xs,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
