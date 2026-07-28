import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { fontSize, shadows, spacing } from "../styles/theme";

const StatCard = ({ icon, label, value, hint, accent = "#059669", style }) => (
  <Card style={[styles.card, shadows.small, style]}>
    <Card.Content style={styles.content}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  card: { borderRadius: 16, flex: 1 },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  label: { fontSize: fontSize.xs, fontWeight: "600", color: "#64748B" },
  value: { fontSize: fontSize.xl, fontWeight: "800", marginTop: 2 },
  hint: { fontSize: fontSize.xs, color: "#94A3B8", marginTop: 2 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default StatCard;
