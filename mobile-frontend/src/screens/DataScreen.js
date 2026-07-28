import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  Divider,
  FAB,
  IconButton,
  Portal,
  Text,
} from "react-native-paper";
import DataRecordModal from "../components/DataRecordModal";
import {
  createDataRecord,
  deleteDataRecord,
  getDataRecords,
  updateDataRecord,
} from "../api/api";
import { colors, fontSize, spacing } from "../styles/theme";

const fmtKwh = (n) =>
  n != null
    ? `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`
    : "—";
const fmtUsd = (n) =>
  n != null
    ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "—";

export default function DataScreen() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getDataRecords({ limit: 200 });
      setRecords(res || []);
    } catch (err) {
      console.error("Failed to load data records", err);
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

  const openCreate = () => {
    setEditingRecord(null);
    setModalError(null);
    setModalVisible(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setModalError(null);
    setModalVisible(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingRecord) {
        await updateDataRecord(editingRecord.id, payload);
      } else {
        await createDataRecord(payload);
      }
      setModalVisible(false);
      load();
    } catch (err) {
      setModalError(
        err?.response?.data?.error?.message || "Could not save this reading.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDataRecord(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error("Failed to delete record", err);
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
        <Text style={styles.heading}>Data Records</Text>
        <Text style={styles.subheading}>
          {loading
            ? "Loading…"
            : `${records.length} reading${records.length === 1 ? "" : "s"} logged`}
        </Text>

        {records.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No readings logged yet.</Text>
            <Button
              mode="outlined"
              onPress={openCreate}
              style={{ marginTop: spacing.sm, borderRadius: 10 }}
            >
              Log your first reading
            </Button>
          </View>
        ) : (
          records.map((r, idx) => (
            <View key={r.id}>
              <View style={styles.recordCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordDate}>
                    {new Date(r.timestamp).toLocaleString()}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {fmtKwh(r.consumption_kwh)}
                    </Text>
                    {r.cost_usd != null && (
                      <Text style={styles.metaText}>
                        · {fmtUsd(r.cost_usd)}
                      </Text>
                    )}
                    {r.temperature_c != null && (
                      <Text style={styles.metaText}>· {r.temperature_c}°C</Text>
                    )}
                  </View>
                </View>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  onPress={() => openEdit(r)}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={20}
                  iconColor={colors.error}
                  onPress={() => setDeleteTarget(r)}
                />
              </View>
              {idx < records.length - 1 && <Divider />}
            </View>
          ))
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <FAB
        icon="plus"
        label="New reading"
        style={styles.fab}
        onPress={openCreate}
      />

      <DataRecordModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        record={editingRecord}
        submitting={submitting}
        errorMessage={modalError}
      />

      <Portal>
        <Dialog
          visible={!!deleteTarget}
          onDismiss={() => setDeleteTarget(null)}
        >
          <Dialog.Title>Delete this reading?</Dialog.Title>
          <Dialog.Content>
            <Text>This action cannot be undone.</Text>
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
  emptyState: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyText: { color: colors.textMuted },
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  recordDate: { fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 4, marginTop: 2 },
  metaText: { color: colors.textSecondary, fontSize: fontSize.xs },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});
