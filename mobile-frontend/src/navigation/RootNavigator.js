import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../styles/theme";
import HomeScreen from "../screens/HomeScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import AppNavigator from "./AppNavigator";

const Stack = createNativeStackNavigator();

// Guards the protected drawer: bounces back to Home if the session isn't
// authenticated (e.g. after a token expiry or a direct deep link).
function ProtectedMain({ navigation }) {
  const { isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    }
  }, [isAuthenticated, isInitializing, navigation]);

  if (isInitializing || !isAuthenticated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AppNavigator />;
}

export default function RootNavigator() {
  const { isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Main" component={ProtectedMain} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
});
