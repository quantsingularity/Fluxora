import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  HelperText,
  Portal,
  Snackbar,
  Switch,
  Text,
  TextInput,
  Title,
} from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../constants/config";
import { colors, fontSize, shadows, spacing } from "../styles/theme";

const initialsFromEmail = (email = "") => email.slice(0, 2).toUpperCase();

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  // Profile edit form
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [profileError, setProfileError] = useState(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Danger zone
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handlePreferenceChange = (setter) => (value) => {
    setter(value);
    setSnackbar("Preference saved");
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  const handleProfileSave = async () => {
    setProfileError(null);
    const payload = {};
    if (email && email !== user?.email) payload.email = email;
    if (newPassword) {
      if (newPassword.length < 8) {
        setProfileError("New password must be at least 8 characters long.");
        return;
      }
      payload.password = newPassword;
    }
    if (Object.keys(payload).length === 0) {
      setSnackbar("Nothing to update");
      return;
    }
    setProfileSubmitting(true);
    const result = await updateProfile(payload);
    setProfileSubmitting(false);
    if (result.success) {
      setNewPassword("");
      setSnackbar("Profile updated");
    } else {
      setProfileError(result.error);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    if (result.success) {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } else {
      setDeleteDialogVisible(false);
      setSnackbar(result.error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.heading}>Settings</Text>
        <Text style={styles.subheading}>
          Manage your account and app preferences.
        </Text>

        <Card style={[styles.card, shadows.small]}>
          <Card.Content>
            <View style={styles.profileRow}>
              <Avatar.Text
                size={56}
                label={user ? initialsFromEmail(user.email) : "FX"}
                style={{ backgroundColor: colors.primary }}
              />
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={styles.email} numberOfLines={1}>
                  {user?.email}
                </Text>
                <Chip
                  compact
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 4,
                    backgroundColor: user?.is_superuser
                      ? "rgba(59,130,246,0.12)"
                      : "rgba(5,150,105,0.12)",
                  }}
                  textStyle={{
                    color: user?.is_superuser
                      ? colors.secondaryDark
                      : colors.primaryDark,
                    fontWeight: "700",
                    fontSize: fontSize.xs,
                  }}
                >
                  {user?.is_superuser ? "Administrator" : "Member"}
                </Chip>
              </View>
            </View>

            <Divider style={{ marginVertical: spacing.md }} />

            <InfoRow
              label="User ID"
              value={user?.id != null ? `#${user.id}` : "N/A"}
            />
            <InfoRow
              label="Account status"
              value={user?.is_active ? "Active" : "Inactive"}
            />

            <Button
              mode="outlined"
              icon="logout"
              textColor={colors.error}
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              Log out
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, shadows.small]}>
          <Card.Content>
            <Title style={styles.cardTitle}>Edit profile</Title>
            {profileError && (
              <HelperText
                type="error"
                visible
                style={{ marginBottom: spacing.xs }}
              >
                {profileError}
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
            />
            <TextInput
              label="New password"
              mode="outlined"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Leave blank to keep current password"
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleProfileSave}
              loading={profileSubmitting}
              disabled={profileSubmitting}
              style={{ borderRadius: 10, marginTop: spacing.xs }}
            >
              Save changes
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, shadows.small]}>
          <Card.Content>
            <Title style={styles.cardTitle}>Preferences</Title>
            <Text style={styles.cardSubtitle}>
              Applied locally on this device
            </Text>

            <PreferenceRow
              icon="weather-night"
              title="Dark mode"
              description="Coming soon"
              value={darkMode}
              onChange={handlePreferenceChange(setDarkMode)}
              disabled
            />
            <Divider />
            <PreferenceRow
              icon="bell-outline"
              title="Push notifications"
              description="Alerts for unusual consumption"
              value={notifications}
              onChange={handlePreferenceChange(setNotifications)}
            />
          </Card.Content>
        </Card>

        <Card
          style={[
            styles.card,
            shadows.small,
            { borderColor: colors.error, borderWidth: 1 },
          ]}
        >
          <Card.Content>
            <Title style={[styles.cardTitle, { color: colors.error }]}>
              Danger zone
            </Title>
            <Text style={styles.cardSubtitle}>
              Permanently deletes your account and every energy reading
              you&apos;ve logged.
            </Text>
            <Button
              mode="outlined"
              icon="delete-forever-outline"
              textColor={colors.error}
              style={{
                borderColor: colors.error,
                borderRadius: 10,
                marginTop: spacing.sm,
              }}
              onPress={() => setDeleteDialogVisible(true)}
            >
              Delete account
            </Button>
          </Card.Content>
        </Card>

        <Card
          style={[styles.card, shadows.small, { marginBottom: spacing.xxl }]}
        >
          <Card.Content>
            <Title style={styles.cardTitle}>API connection</Title>
            <InfoRow label="Backend" value={API_BASE_URL} />
            <InfoRow label="Auth method" value="JWT (access + refresh)" />
            <InfoRow label="API version" value="v1" />
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete your account?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: spacing.sm }}>
              This permanently deletes your account and all of your energy data.
              This cannot be undone. Type DELETE to confirm.
            </Text>
            <TextInput
              mode="outlined"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleDeleteAccount}
              loading={deleting}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              textColor={colors.error}
            >
              Delete my account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar(null)}
        duration={2200}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const PreferenceRow = ({
  icon,
  title,
  description,
  value,
  onChange,
  disabled,
}) => (
  <View style={styles.prefRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.prefTitle}>{title}</Text>
      <Text style={styles.prefDesc}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      color={colors.primary}
    />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  heading: { fontSize: fontSize.xl, fontWeight: "800" },
  subheading: {
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  card: { borderRadius: 16, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.md },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  profileRow: { flexDirection: "row", alignItems: "center" },
  email: { fontWeight: "700", fontSize: fontSize.md },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  infoLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  infoValue: {
    fontWeight: "600",
    fontSize: fontSize.sm,
    flexShrink: 1,
    marginLeft: spacing.sm,
  },
  logoutButton: {
    marginTop: spacing.md,
    borderRadius: 10,
    borderColor: colors.error,
  },
  input: { marginBottom: spacing.sm, backgroundColor: colors.surface },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  prefTitle: { fontWeight: "600" },
  prefDesc: { color: colors.textMuted, fontSize: fontSize.xs },
});
