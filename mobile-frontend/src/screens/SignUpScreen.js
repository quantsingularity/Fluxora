import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, HelperText, Text, TextInput, Title } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../contexts/AuthContext";
import { colors, fontSize, spacing } from "../styles/theme";

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen({ navigation }) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    if (!email || !password || !confirmPassword)
      return "Please fill in every field.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    }
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await register(email, password);
    setSubmitting(false);
    if (result.success) {
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } else {
      setError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoBadge}>
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={26}
            color="#fff"
          />
        </View>
        <Title style={styles.title}>Create your account</Title>
        <Text style={styles.subtitle}>
          Takes less than a minute, no credit card required.
        </Text>

        {error && (
          <HelperText type="error" visible style={styles.errorText}>
            {error}
          </HelperText>
        )}

        <TextInput
          label="Email address"
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          left={<TextInput.Icon icon="email-outline" />}
        />
        <TextInput
          label="Password"
          mode="outlined"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
        />
        <TextInput
          label="Confirm password"
          mode="outlined"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          left={<TextInput.Icon icon="lock-check-outline" />}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
          contentStyle={{ paddingVertical: 6 }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Text
            style={styles.link}
            onPress={() => navigation.navigate("SignIn")}
          >
            Sign in
          </Text>
        </View>

        <Text
          style={styles.backLink}
          onPress={() => navigation.navigate("Home")}
        >
          ← Back to homepage
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  scrollContent: { flexGrow: 1, padding: spacing.lg, justifyContent: "center" },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { color: "#fff", fontSize: fontSize.xxl, fontWeight: "800" },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  errorText: { marginBottom: spacing.sm, fontSize: fontSize.sm },
  submitButton: { marginTop: spacing.sm, borderRadius: 12 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  footerText: { color: "rgba(255,255,255,0.6)" },
  link: { color: colors.primaryLight, fontWeight: "700" },
  backLink: {
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
  },
});
