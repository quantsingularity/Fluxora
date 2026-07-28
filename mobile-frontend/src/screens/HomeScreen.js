import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text, Title } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { StatusBar } from "expo-status-bar";
import { getHealthStatus } from "../api/api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, shadows, spacing } from "../styles/theme";

const FEATURES = [
  {
    icon: "chart-line",
    title: "Forecasting engine",
    desc: "Hourly consumption predictions with confidence intervals.",
  },
  {
    icon: "chart-areaspline",
    title: "Analytics dashboards",
    desc: "Week, month and year rollups computed from your readings.",
  },
  {
    icon: "database-outline",
    title: "Data management",
    desc: "Full control over every logged reading, right from your phone.",
  },
  {
    icon: "shield-check-outline",
    title: "Secure by default",
    desc: "JWT access and refresh tokens keep your session safe.",
  },
];

export default function HomeScreen({ navigation }) {
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

  const isHealthy = status === "ok" || status === "healthy";
  const statusColor = isHealthy
    ? colors.success
    : status === "checking"
      ? colors.warning
      : colors.error;
  const statusLabel = isHealthy
    ? "All systems operational"
    : status === "checking"
      ? "Checking backend…"
      : "Backend unreachable";

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={22}
                color="#fff"
              />
            </View>
            <Title style={styles.brandTitle}>Fluxora</Title>
          </View>

          <Chip
            icon={() => (
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
            )}
            style={styles.statusChip}
            textStyle={styles.statusChipText}
          >
            {statusLabel}
          </Chip>

          <Title style={styles.heroTitle}>
            Deploy energy intelligence, not spreadsheets.
          </Title>
          <Text style={styles.heroSubtitle}>
            Fluxora forecasts consumption, tracks cost, and scores efficiency
            from your own metered data — fully synced with a real backend.
          </Text>

          <View style={styles.ctaRow}>
            {isAuthenticated ? (
              <Button
                mode="contained"
                onPress={() => navigation.navigate("Main")}
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate("SignUp")}
                  style={styles.primaryButton}
                  contentStyle={styles.buttonContent}
                >
                  Get started
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate("SignIn")}
                  style={styles.secondaryButton}
                  contentStyle={styles.buttonContent}
                  textColor="#fff"
                >
                  Sign in
                </Button>
              </>
            )}
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionEyebrow}>PLATFORM</Text>
          <Title style={styles.sectionTitle}>
            Everything you need to understand your energy footprint
          </Title>

          {FEATURES.map((f) => (
            <Card key={f.title} style={styles.featureCard}>
              <Card.Content style={styles.featureContent}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={22}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Fluxora. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  scrollContent: { flexGrow: 1 },
  hero: {
    paddingTop: spacing.xxl + 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  brandTitle: { color: "#fff", fontWeight: "800", fontSize: fontSize.xl },
  statusChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: spacing.lg,
  },
  statusChipText: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.xs },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  heroTitle: {
    color: "#fff",
    fontSize: fontSize.xxxl,
    fontWeight: "800",
    lineHeight: 42,
    marginBottom: spacing.md,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  ctaRow: { gap: spacing.sm },
  primaryButton: { borderRadius: 12 },
  secondaryButton: { borderRadius: 12, borderColor: "rgba(255,255,255,0.35)" },
  buttonContent: { paddingVertical: 6 },
  featuresSection: {
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sectionEyebrow: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: fontSize.xs,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  featureCard: { marginBottom: spacing.md, borderRadius: 16, ...shadows.small },
  featureContent: { flexDirection: "row", alignItems: "center" },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  featureTitle: { fontWeight: "700", fontSize: fontSize.md, marginBottom: 2 },
  featureDesc: { color: colors.textSecondary, fontSize: fontSize.sm },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
  },
  footerText: { color: colors.textMuted, fontSize: fontSize.xs },
});
