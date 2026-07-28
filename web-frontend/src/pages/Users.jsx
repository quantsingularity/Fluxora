import {
  BlockRounded,
  CheckCircleRounded,
  DeleteOutlineRounded,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  activateUserById,
  deactivateUserById,
  deleteUserById,
  getUsers,
} from "../utils/api";

const initialsFromEmail = (email = "") => email.slice(0, 2).toUpperCase();

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsers({ limit: 200 });
      setUsers(res || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (targetUser) => {
    setBusyId(targetUser.id);
    setError(null);
    try {
      if (targetUser.is_active) {
        await deactivateUserById(targetUser.id);
      } else {
        await activateUserById(targetUser.id);
      }
      await load();
    } catch (err) {
      setError(
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
      setError(
        err?.response?.data?.error?.message || "Could not delete this user.",
      );
    } finally {
      setDeleting(false);
    }
  };

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
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage every account on this Fluxora instance. Administrator access
            only.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={load}>
            <RefreshRounded />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader
          title={`${users.length} account${users.length === 1 ? "" : "s"}`}
        />
        <CardContent sx={{ pt: 0 }}>
          {loading ? (
            <Stack spacing={1}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={56} />
              ))}
            </Stack>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background:
                                  "linear-gradient(135deg, #10b981, #3b82f6)",
                              }}
                            >
                              {initialsFromEmail(u.email)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {u.email}
                                {isSelf && (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {" "}
                                    (you)
                                  </Typography>
                                )}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                #{u.id}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={u.is_superuser ? "Administrator" : "Member"}
                            sx={{
                              backgroundColor: u.is_superuser
                                ? "rgba(59,130,246,0.1)"
                                : "rgba(15,23,42,0.06)",
                              color: u.is_superuser
                                ? "secondary.dark"
                                : "text.secondary",
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={
                              u.is_active ? (
                                <CheckCircleRounded sx={{ fontSize: 14 }} />
                              ) : (
                                <BlockRounded sx={{ fontSize: 14 }} />
                              )
                            }
                            label={u.is_active ? "Active" : "Inactive"}
                            color={u.is_active ? "success" : "default"}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="flex-end"
                            alignItems="center"
                          >
                            <Tooltip
                              title={
                                isSelf
                                  ? "You cannot deactivate your own account"
                                  : u.is_active
                                    ? "Deactivate"
                                    : "Activate"
                              }
                            >
                              <span>
                                <Switch
                                  size="small"
                                  checked={u.is_active}
                                  disabled={isSelf || busyId === u.id}
                                  onChange={() => handleToggleActive(u)}
                                />
                              </span>
                            </Tooltip>
                            <Tooltip
                              title={
                                isSelf
                                  ? "Use Settings to delete your own account"
                                  : "Delete user"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={isSelf}
                                  onClick={() => setDeleteTarget(u)}
                                >
                                  <DeleteOutlineRounded fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete this account?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete {deleteTarget?.email} and all of their
            energy data. This action cannot be undone.
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

export default Users;
