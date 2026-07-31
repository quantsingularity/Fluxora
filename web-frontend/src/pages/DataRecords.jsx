import {
  AddRounded,
  DeleteOutlineRounded,
  EditOutlined,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import DataRecordDialog from "../components/DataRecordDialog";
import {
  createDataRecord,
  deleteDataRecord,
  getDataRecords,
  updateDataRecord,
} from "../utils/api";

const fmtKwh = (n) =>
  n != null
    ? `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`
    : "N/A";
const fmtUsd = (n) =>
  n != null
    ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "N/A";

const DataRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDataRecords({ skip: 0, limit: 200 });
      setRecords(res || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load your data records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingRecord(null);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setDialogError(null);
    try {
      if (editingRecord) {
        await updateDataRecord(editingRecord.id, payload);
      } else {
        await createDataRecord(payload);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setDialogError(
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
      console.error(err);
      setError("Could not delete this record.");
    } finally {
      setDeleting(false);
    }
  };

  const paginated = records.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Data Records
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add, edit, or remove any meter reading tied to your account.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Refresh">
            <IconButton onClick={load}>
              <RefreshRounded />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={openCreate}
          >
            New reading
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader
          title={`${records.length} record${records.length === 1 ? "" : "s"}`}
        />
        <CardContent sx={{ pt: 0 }}>
          {loading ? (
            <Stack spacing={1}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={44} />
              ))}
            </Stack>
          ) : records.length === 0 ? (
            <Stack
              spacing={1.5}
              alignItems="center"
              justifyContent="center"
              sx={{ py: 8 }}
            >
              <Typography variant="body2" color="text.secondary">
                No readings logged yet.
              </Typography>
              <Button variant="outlined" onClick={openCreate}>
                Log your first reading
              </Button>
            </Stack>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell align="right">Consumption</TableCell>
                      <TableCell align="right">Generation</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Temp.</TableCell>
                      <TableCell align="right">Humidity</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          {new Date(r.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {fmtKwh(r.consumption_kwh)}
                        </TableCell>
                        <TableCell align="right">
                          {fmtKwh(r.generation_kwh)}
                        </TableCell>
                        <TableCell align="right">
                          {fmtUsd(r.cost_usd)}
                        </TableCell>
                        <TableCell align="right">
                          {r.temperature_c != null
                            ? `${r.temperature_c}°C`
                            : "N/A"}
                        </TableCell>
                        <TableCell align="right">
                          {r.humidity_percent != null
                            ? `${r.humidity_percent}%`
                            : "N/A"}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => openEdit(r)}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={records.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
        </CardContent>
      </Card>

      <DataRecordDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        record={editingRecord}
        submitting={submitting}
        errorMessage={dialogError}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete this reading?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove the reading from{" "}
            {deleteTarget
              ? new Date(deleteTarget.timestamp).toLocaleString()
              : ""}
            . This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataRecords;
