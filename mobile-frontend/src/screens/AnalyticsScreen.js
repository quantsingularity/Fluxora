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
  Card,
  DataTable,
  SegmentedButtons,
  Text,
  Title,
} from "react-native-paper";
import { BarChart } from "react-native-chart-kit";
import StatCard from "../components/StatCard";
import { getAnalytics } from "../api/api";
import { colors, fontSize, shadows, spacing } from "../styles/theme";

const screenWidth = Dimensions.get("window").width;

const fmtKwh = (n) =>
  `${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
const fmtUsd = (n) =>
  `$${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p) => {
    try {
      const res = await getAnalytics(p);
      setData(res || []);
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(period);
    }, [load, period]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load(period);
  };

  const totals = data.reduce(
    (acc, d) => ({
      consumption: acc.consumption + (d.consumption || 0),
      cost: acc.cost + (d.cost || 0),
      efficiencySum: acc.efficiencySum + (d.efficiency || 0),
    }),
    { consumption: 0, cost: 0, efficiencySum: 0 },
  );
  const avgEfficiency = data.length ? totals.efficiencySum / data.length : 0;

  const chartLabels = data.map((d) => (d.label || "").slice(0, 3));
  const chartValues = data.map((d) => d.consumption || 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={styles.heading}>Analytics</Text>
      <Text style={styles.subheading}>
        Consumption, cost and efficiency rollups.
      </Text>

      <SegmentedButtons
        value={period}
        onValueChange={setPeriod}
        style={styles.segmented}
        buttons={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
        ]}
      />

      <View style={styles.statsRow}>
        <StatCard
          icon="lightning-bolt"
          label="Consumption"
          value={fmtKwh(totals.consumption)}
          accent={colors.primary}
          style={styles.statCardHalf}
        />
        <StatCard
          icon="cash"
          label="Cost"
          value={fmtUsd(totals.cost)}
          accent={colors.secondary}
          style={styles.statCardHalf}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="speedometer"
          label="Avg Efficiency"
          value={`${avgEfficiency.toFixed(1)}%`}
          accent={colors.warning}
          style={styles.statCardHalf}
        />
      </View>

      <Card style={[styles.card, shadows.small]}>
        <Card.Content>
          <Title style={styles.cardTitle}>Consumption by {period}</Title>
          {chartValues.length > 0 ? (
            <BarChart
              data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
              width={screenWidth - spacing.lg * 2 - 32}
              height={220}
              fromZero
              showValuesOnTopOfBars
              chartConfig={{
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: () => colors.textSecondary,
              }}
              style={{ marginLeft: -spacing.lg, borderRadius: 12 }}
            />
          ) : (
            <Text style={styles.emptyText}>
              {loading ? "Loading…" : "No analytics data for this period."}
            </Text>
          )}
        </Card.Content>
      </Card>

      <Card style={[styles.card, shadows.small, { marginBottom: spacing.xxl }]}>
        <Card.Content>
          <Title style={styles.cardTitle}>Breakdown</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Period</DataTable.Title>
              <DataTable.Title numeric>kWh</DataTable.Title>
              <DataTable.Title numeric>Cost</DataTable.Title>
              <DataTable.Title numeric>Eff.</DataTable.Title>
            </DataTable.Header>
            {data.map((row) => (
              <DataTable.Row key={row.label}>
                <DataTable.Cell>{row.label}</DataTable.Cell>
                <DataTable.Cell numeric>
                  {Number(row.consumption).toFixed(0)}
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  ${Number(row.cost).toFixed(0)}
                </DataTable.Cell>
                <DataTable.Cell numeric>{row.efficiency}%</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>
    </ScrollView>
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
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  statCardHalf: { flex: 1 },
  card: { borderRadius: 16, marginTop: spacing.sm, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.md, marginBottom: spacing.sm },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
