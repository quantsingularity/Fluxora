import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Snackbar,
  Switch,
  Text,
} from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import {
  activateUserById,
  deactivateUserById,
  deleteUserById,
  getUsers,
} from "../api/api";
import { colors, fontSize, spacing } from "../styles/theme";

const initialsFromEmail = (email = "") => email.slice(0, 2).toUpperCase();

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getUsers({ limit: 200 });
      setUsers(res || []);
    } catch (err) {
      console.error("Failed to load users", err);
      setSnackbar("Unable to load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleToggleActive = async (targetUser) => {
    setBusyId(targetUser.id);
    try {
      if (targetUser.is_active) {
        await deactivateUserById(targetUser.id);
      } else {
        await activateUserById(targetUser.id);
      }
      await load();
    } catch (err) {
      setSnackbar(
        err?.response?.data?.error?.message || "Could not update this user.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserById(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setSnackbar(
        err?.response?.data?.error?.message || "Could not delete this user.",
      );
    } finally {
      setDeleting(false);
    }
  };

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
        <Text style={styles.heading}>Users</Text>
        <Text style={styles.subheading}>
          {loading
            ? "Loading…"
            : `${users.length} account${users.length === 1 ? "" : "s"}`}
        </Text>

        {users.map((u, idx) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <View key={u.id}>
              <View style={styles.userRow}>
                <Avatar.Text
                  size={40}
                  label={initialsFromEmail(u.email)}
                  style={{ backgroundColor: colors.primary }}
                />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {u.email}
                    {isSelf ? " (you)" : ""}
                  </Text>
                  <View style={styles.chipRow}>
                    <Chip
                      compact
                      style={styles.roleChip}
                      textStyle={styles.roleChipText}
                    >
                      {u.is_superuser ? "Administrator" : "Member"}
                    </Chip>
                    <Chip
                      compact
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: u.is_active
                            ? "rgba(22,163,74,0.12)"
                            : "rgba(100,116,139,0.12)",
                        },
                      ]}
                      textStyle={{
                        color: u.is_active
                          ? colors.success
                          : colors.textSecondary,
                        fontWeight: "700",
                        fontSize: fontSize.xs,
                      }}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </Chip>
                  </View>
                </View>
                <Switch
                  value={u.is_active}
                  disabled={isSelf || busyId === u.id}
                  onValueChange={() => handleToggleActive(u)}
                  color={colors.primary}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={20}
                  iconColor={colors.error}
                  disabled={isSelf}
                  onPress={() => setDeleteTarget(u)}
                />
              </View>
              {idx < users.length - 1 && <Divider />}
            </View>
          );
        })}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={!!deleteTarget}
          onDismiss={() => setDeleteTarget(null)}
        >
          <Dialog.Title>Delete this account?</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will permanently delete {deleteTarget?.email} and all of
              their energy data. This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onPress={handleDelete}
              loading={deleting}
              textColor={colors.error}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  userEmail: { fontWeight: "600" },
  chipRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  roleChip: { backgroundColor: "rgba(15,23,42,0.06)", height: 24 },
  roleChipText: { fontSize: fontSize.xs, fontWeight: "700" },
  statusChip: { height: 24 },
});
