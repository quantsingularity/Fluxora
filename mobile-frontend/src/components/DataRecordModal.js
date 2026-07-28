import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  HelperText,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { colors, spacing } from "../styles/theme";

const emptyForm = {
  consumption_kwh: "",
  generation_kwh: "",
  cost_usd: "",
  temperature_c: "",
  humidity_percent: "",
};

const toFormValues = (record) => {
  if (!record) return emptyForm;
  return {
    consumption_kwh:
      record.consumption_kwh != null ? String(record.consumption_kwh) : "",
    generation_kwh:
      record.generation_kwh != null ? String(record.generation_kwh) : "",
    cost_usd: record.cost_usd != null ? String(record.cost_usd) : "",
    temperature_c:
      record.temperature_c != null ? String(record.temperature_c) : "",
    humidity_percent:
      record.humidity_percent != null ? String(record.humidity_percent) : "",
  };
};

const DataRecordModal = ({
  visible,
  onDismiss,
  onSubmit,
  record,
  submitting,
  errorMessage,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (visible) {
      setForm(toFormValues(record));
      setLocalError(null);
    }
  }, [visible, record]);

  const handleChange = (field) => (value) =>
    setForm({ ...form, [field]: value });

  const handleSubmit = () => {
    const consumption = Number(form.consumption_kwh);
    if (
      form.consumption_kwh === "" ||
      Number.isNaN(consumption) ||
      consumption < 0
    ) {
      setLocalError("Enter a valid consumption value (kWh).");
      return;
    }
    const payload = { consumption_kwh: consumption };
    if (form.generation_kwh !== "")
      payload.generation_kwh = Number(form.generation_kwh);
    if (form.cost_usd !== "") payload.cost_usd = Number(form.cost_usd);
    if (form.temperature_c !== "")
      payload.temperature_c = Number(form.temperature_c);
    if (form.humidity_percent !== "")
      payload.humidity_percent = Number(form.humidity_percent);
    setLocalError(null);
    onSubmit(payload);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {record ? "Edit reading" : "Log a new reading"}
          </Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
          {(localError || errorMessage) && (
            <HelperText
              type="error"
              visible
              style={{ marginBottom: spacing.xs }}
            >
              {localError || errorMessage}
            </HelperText>
          )}

          <TextInput
            label="Consumption (kWh)"
            mode="outlined"
            keyboardType="numeric"
            value={form.consumption_kwh}
            onChangeText={handleChange("consumption_kwh")}
            style={styles.input}
          />
          <TextInput
            label="Generation (kWh)"
            mode="outlined"
            keyboardType="numeric"
            value={form.generation_kwh}
            onChangeText={handleChange("generation_kwh")}
            style={styles.input}
          />
          <TextInput
            label="Cost ($)"
            mode="outlined"
            keyboardType="numeric"
            value={form.cost_usd}
            onChangeText={handleChange("cost_usd")}
            style={styles.input}
          />
          <TextInput
            label="Temperature (°C)"
            mode="outlined"
            keyboardType="numeric"
            value={form.temperature_c}
            onChangeText={handleChange("temperature_c")}
            style={styles.input}
          />
          <TextInput
            label="Humidity (%)"
            mode="outlined"
            keyboardType="numeric"
            value={form.humidity_percent}
            onChangeText={handleChange("humidity_percent")}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
            contentStyle={{ paddingVertical: 6 }}
          >
            {submitting ? "Saving…" : record ? "Save changes" : "Add reading"}
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 20,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700" },
  input: { marginBottom: spacing.sm, backgroundColor: colors.surface },
  submitButton: { marginTop: spacing.sm, borderRadius: 12 },
});

export default DataRecordModal;
