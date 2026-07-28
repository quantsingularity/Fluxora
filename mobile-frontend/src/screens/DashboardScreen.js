import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Divider, FAB, Text, Title } from "react-native-paper";
import { LineChart } from "react-native-chart-kit";
import StatCard from "../components/StatCard";
import DataRecordModal from "../components/DataRecordModal";
import { useAuth } from "../contexts/AuthContext";
import {
  createDataRecord,
  getAnalytics,
  getAnalyticsSummary,
  getDataRecords,
  getPredictions,
} from "../api/api";
import { colors, fontSize, shadows, spacing } from "../styles/theme";

const screenWidth = Dimensions.get("window").width;

const fmtKwh = (n) =>
  `${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`;
const fmtUsd = (n) =>
  `$${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [weekSeries, setWeekSeries] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [nextPeak, setNextPeak] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [summaryRes, weekRes, recordsRes, predictionsRes] =
        await Promise.all([
          getAnalyticsSummary(),
          getAnalytics("week"),
          getDataRecords({ limit: 5 }),
          getPredictions(1).catch(() => []),
        ]);
      setSummary(summaryRes);
      setWeekSeries(weekRes || []);
      setRecentRecords(recordsRes || []);
      if (predictionsRes?.length) {
        setNextPeak(
          Math.max(...predictionsRes.map((p) => p.predicted_consumption)),
        );
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddRecord = async (payload) => {
    setSubmitting(true);
    setModalError(null);
    try {
      await createDataRecord(payload);
      setModalVisible(false);
      loadData();
    } catch (err) {
      setModalError(
        err?.response?.data?.error?.message || "Could not save this reading.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const chartLabels = weekSeries.map((d) => (d.label || "").slice(0, 3));
  const chartValues = weekSeries.map((d) => d.consumption || 0);

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
        <Text style={styles.greeting}>
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </Text>
        <Text style={styles.subGreeting}>
          Here&apos;s your energy usage over the last 30 days.
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon="lightning-bolt"
              label="Total Consumption"
              value={fmtKwh(summary?.total_consumption_kwh)}
              accent={colors.primary}
              style={styles.statCardHalf}
            />
            <StatCard
              icon="cash"
              label="Total Cost"
              value={fmtUsd(summary?.total_cost_usd)}
              accent={colors.secondary}
              style={styles.statCardHalf}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon="speedometer"
              label="Avg Daily Usage"
              value={fmtKwh(summary?.avg_daily_consumption_kwh)}
              accent={colors.warning}
              style={styles.statCardHalf}
            />
            <StatCard
              icon="chart-timeline-variant"
              label="Predicted Peak"
              value={nextPeak != null ? fmtKwh(nextPeak) : "—"}
              accent={colors.error}
              style={styles.statCardHalf}
            />
          </View>
        </View>

        <Card style={[styles.card, shadows.small]}>
          <Card.Content>
            <Title style={styles.cardTitle}>Consumption this week</Title>
            {chartValues.length > 0 ? (
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartValues }],
                }}
                width={screenWidth - spacing.lg * 2 - 32}
                height={200}
                bezier
                withInnerLines={false}
                chartConfig={{
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
                  labelColor: () => colors.textSecondary,
                  propsForDots: {
                    r: "3.5",
                    strokeWidth: "2",
                    stroke: colors.primary,
                  },
                }}
                style={{ marginLeft: -spacing.lg, borderRadius: 12 }}
              />
            ) : (
              <Text style={styles.emptyText}>No readings yet this week.</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, shadows.small]}>
          <Card.Content>
            <Title style={styles.cardTitle}>Quick actions</Title>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => navigation.navigate("Predictions")}
            >
              View forecasts
            </Button>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => navigation.navigate("Analytics")}
            >
              Explore analytics
            </Button>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => navigation.navigate("Data")}
            >
              Manage data records
            </Button>
          </Card.Content>
        </Card>

        <Card
          style={[styles.card, shadows.small, { marginBottom: spacing.xxl }]}
        >
          <Card.Content>
            <Title style={styles.cardTitle}>Recent readings</Title>
            {recentRecords.length === 0 ? (
              <Text style={styles.emptyText}>No readings logged yet.</Text>
            ) : (
              recentRecords.map((r, idx) => (
                <View key={r.id}>
                  <View style={styles.recordRow}>
                    <View>
                      <Text style={styles.recordDate}>
                        {new Date(r.timestamp).toLocaleDateString()}
                      </Text>
                      <Text style={styles.recordTime}>
                        {new Date(r.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.recordValue}>
                        {fmtKwh(r.consumption_kwh)}
                      </Text>
                      {r.cost_usd != null && (
                        <Text style={styles.recordSub}>
                          {fmtUsd(r.cost_usd)}
                        </Text>
                      )}
                    </View>
                  </View>
                  {idx < recentRecords.length - 1 && <Divider />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="plus"
        label="Log reading"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        loading={loading}
      />

      <DataRecordModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSubmit={handleAddRecord}
        submitting={submitting}
        errorMessage={modalError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },
  greeting: { fontSize: fontSize.xl, fontWeight: "800" },
  subGreeting: {
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  statsGrid: { marginBottom: spacing.sm },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  statCardHalf: { flex: 1 },
  card: { borderRadius: 16, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.md, marginBottom: spacing.sm },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  actionButton: { marginBottom: spacing.sm, borderRadius: 10 },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  recordDate: { fontWeight: "600" },
  recordTime: { color: colors.textMuted, fontSize: fontSize.xs },
  recordValue: { fontWeight: "700" },
  recordSub: { color: colors.textMuted, fontSize: fontSize.xs },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});
