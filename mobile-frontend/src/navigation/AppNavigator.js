import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  Avatar,
  Divider,
  Drawer as PaperDrawer,
  Text,
  Title,
} from "react-native-paper";
import { StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../contexts/AuthContext";
import { colors, spacing } from "../styles/theme";

import AnalyticsScreen from "../screens/AnalyticsScreen";
import DashboardScreen from "../screens/DashboardScreen";
import DataScreen from "../screens/DataScreen";
import PredictionsScreen from "../screens/PredictionsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import UsersScreen from "../screens/UsersScreen";

const Drawer = createDrawerNavigator();

const initialsFromEmail = (email = "") => email.slice(0, 2).toUpperCase();

function CustomDrawerContent(props) {
  const { user, logout } = useAuth();
  const activeRoute = props.state.routes[props.state.index]?.name;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Avatar.Text
          size={52}
          label={user ? initialsFromEmail(user.email) : "FX"}
          style={{ backgroundColor: colors.primary }}
        />
        <Title style={styles.headerTitle}>Fluxora</Title>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {user?.email || "Signed in"}
        </Text>
      </View>
      <Divider />
      <View style={{ flex: 1, paddingTop: spacing.sm }}>
        <PaperDrawer.Item
          label="Dashboard"
          icon="view-dashboard-outline"
          active={activeRoute === "Dashboard"}
          onPress={() => props.navigation.navigate("Dashboard")}
        />
        <PaperDrawer.Item
          label="Predictions"
          icon="chart-timeline-variant"
          active={activeRoute === "Predictions"}
          onPress={() => props.navigation.navigate("Predictions")}
        />
        <PaperDrawer.Item
          label="Analytics"
          icon="chart-bar"
          active={activeRoute === "Analytics"}
          onPress={() => props.navigation.navigate("Analytics")}
        />
        <PaperDrawer.Item
          label="Data Records"
          icon="database-outline"
          active={activeRoute === "Data"}
          onPress={() => props.navigation.navigate("Data")}
        />
        {user?.is_superuser && (
          <PaperDrawer.Item
            label="Users"
            icon="account-group-outline"
            active={activeRoute === "Users"}
            onPress={() => props.navigation.navigate("Users")}
          />
        )}
        <PaperDrawer.Item
          label="Settings"
          icon="cog-outline"
          active={activeRoute === "Settings"}
          onPress={() => props.navigation.navigate("Settings")}
        />
      </View>
      <Divider />
      <PaperDrawer.Item
        label="Log out"
        icon="logout"
        onPress={async () => {
          await logout();
        }}
        style={{ marginVertical: spacing.sm }}
      />
    </View>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700", color: colors.textPrimary },
        headerTintColor: colors.textPrimary,
        drawerActiveBackgroundColor: "rgba(5,150,105,0.1)",
        drawerActiveTintColor: colors.primaryDark,
        drawerLabelStyle: { fontWeight: "600" },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Overview",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Predictions"
        component={PredictionsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-timeline-variant"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-bar"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Data"
        component={DataScreen}
        options={{
          title: "Data Records",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="database-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      {user?.is_superuser && (
        <Drawer.Screen
          name="Users"
          component={UsersScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="account-group-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
      )}
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cog-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: {
    marginTop: spacing.sm,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
