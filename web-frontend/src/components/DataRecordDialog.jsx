import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useEffect, useState } from "react";

const emptyForm = {
  consumption_kwh: "",
  generation_kwh: "",
  cost_usd: "",
  temperature_c: "",
  humidity_percent: "",
  timestamp: "",
};

const toFormValues = (record) => {
  if (!record) return emptyForm;
  return {
    consumption_kwh: record.consumption_kwh ?? "",
    generation_kwh: record.generation_kwh ?? "",
    cost_usd: record.cost_usd ?? "",
    temperature_c: record.temperature_c ?? "",
    humidity_percent: record.humidity_percent ?? "",
    timestamp: record.timestamp ? record.timestamp.slice(0, 16) : "",
  };
};

const DataRecordDialog = ({
  open,
  onClose,
  onSubmit,
  record,
  submitting,
  errorMessage,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(toFormValues(record));
      setLocalError(null);
    }
  }, [open, record]);

  const handleChange = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = () => {
    if (
      form.consumption_kwh === "" ||
      Number.isNaN(Number(form.consumption_kwh))
    ) {
      setLocalError("Consumption (kWh) is required.");
      return;
    }
    if (Number(form.consumption_kwh) < 0) {
      setLocalError("Consumption must be zero or greater.");
      return;
    }

    const payload = {
      consumption_kwh: Number(form.consumption_kwh),
    };
    if (form.generation_kwh !== "")
      payload.generation_kwh = Number(form.generation_kwh);
    if (form.cost_usd !== "") payload.cost_usd = Number(form.cost_usd);
    if (form.temperature_c !== "")
      payload.temperature_c = Number(form.temperature_c);
    if (form.humidity_percent !== "")
      payload.humidity_percent = Number(form.humidity_percent);
    if (!record && form.timestamp)
      payload.timestamp = new Date(form.timestamp).toISOString();

    setLocalError(null);
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {record ? "Edit reading" : "Log a new reading"}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {(localError || errorMessage) && (
            <Alert severity="error">{localError || errorMessage}</Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Consumption"
                type="number"
                fullWidth
                required
                value={form.consumption_kwh}
                onChange={handleChange("consumption_kwh")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">kWh</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Generation"
                type="number"
                fullWidth
                value={form.generation_kwh}
                onChange={handleChange("generation_kwh")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">kWh</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cost"
                type="number"
                fullWidth
                value={form.cost_usd}
                onChange={handleChange("cost_usd")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Temperature"
                type="number"
                fullWidth
                value={form.temperature_c}
                onChange={handleChange("temperature_c")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">°C</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Humidity"
                type="number"
                fullWidth
                value={form.humidity_percent}
                onChange={handleChange("humidity_percent")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                }}
              />
            </Grid>
            {!record && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Timestamp (optional)"
                  type="datetime-local"
                  fullWidth
                  value={form.timestamp}
                  onChange={handleChange("timestamp")}
                  InputLabelProps={{ shrink: true }}
                  helperText="Defaults to now"
                />
              </Grid>
            )}
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
        >
          {submitting ? "Saving…" : record ? "Save changes" : "Add reading"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataRecordDialog;
