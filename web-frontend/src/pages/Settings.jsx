import {
  BadgeOutlined,
  DarkModeOutlined,
  DeleteForeverRounded,
  EmailOutlined,
  LogoutRounded,
  NotificationsOutlined,
  ShieldOutlined,
  VerifiedUser,
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
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialsFromEmail = (email = "") => email.slice(0, 2).toUpperCase();

const Settings = () => {
  const { user, isInitializing, logout, updateProfile, deleteAccount } =
    useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

  // Profile edit form
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Danger zone
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handlePreferenceChange = (setter) => (event) => {
    setter(event.target.checked);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 1800);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

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
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 1800);
      return;
    }

    setProfileSubmitting(true);
    const result = await updateProfile(payload);
    setProfileSubmitting(false);

    if (result.success) {
      setNewPassword("");
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
    } else {
      setProfileError(result.error);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAccount();
    setDeleting(false);
    if (result.success) {
      navigate("/");
    } else {
      setDeleteError(result.error);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account and application preferences.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardHeader title="Account" />
            <CardContent sx={{ pt: 0 }}>
              {isInitializing ? (
                <Stack spacing={2}>
                  <Skeleton variant="circular" width={64} height={64} />
                  <Skeleton width="80%" />
                  <Skeleton width="60%" />
                </Stack>
              ) : (
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #10b981, #3b82f6)",
                      }}
                    >
                      {initialsFromEmail(user?.email)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {user?.email}
                      </Typography>
                      <Chip
                        size="small"
                        icon={
                          user?.is_superuser ? (
                            <VerifiedUser sx={{ fontSize: 14 }} />
                          ) : undefined
                        }
                        label={user?.is_superuser ? "Administrator" : "Member"}
                        sx={{
                          mt: 0.5,
                          backgroundColor: user?.is_superuser
                            ? "rgba(59,130,246,0.1)"
                            : "rgba(5,150,105,0.1)",
                          color: user?.is_superuser
                            ? "secondary.dark"
                            : "primary.dark",
                          fontWeight: 700,
                        }}
                      />
                    </Box>
                  </Stack>

                  <Divider />

                  <Stack spacing={1.75}>
                    <InfoRow
                      icon={<BadgeOutlined fontSize="small" />}
                      label="User ID"
                      value={`#${user?.id}`}
                    />
                    <InfoRow
                      icon={<EmailOutlined fontSize="small" />}
                      label="Email"
                      value={user?.email}
                    />
                    <InfoRow
                      icon={<ShieldOutlined fontSize="small" />}
                      label="Account status"
                      value={
                        <Chip
                          size="small"
                          label={user?.is_active ? "Active" : "Inactive"}
                          color={user?.is_active ? "success" : "default"}
                          sx={{ fontWeight: 700 }}
                        />
                      }
                    />
                  </Stack>

                  <Divider />

                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LogoutRounded />}
                    onClick={handleLogout}
                    fullWidth
                  >
                    Log out
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader
              title="Edit profile"
              subheader="Update your email or password"
            />
            <CardContent sx={{ pt: 0 }}>
              {profileError && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setProfileError(null)}
                >
                  {profileError}
                </Alert>
              )}
              {profileSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Profile updated.
                </Alert>
              )}
              <Box component="form" onSubmit={handleProfileSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    helperText="Leave blank to keep your current password"
                    fullWidth
                  />
                  <Box>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={profileSubmitting}
                    >
                      {profileSubmitting ? "Saving…" : "Save changes"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5 }}>
            <CardHeader
              title="Preferences"
              subheader="Applied locally to this browser"
            />
            <CardContent sx={{ pt: 0 }}>
              {savedMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Preference saved.
                </Alert>
              )}
              <Stack divider={<Divider />} spacing={2}>
                <PreferenceRow
                  icon={<DarkModeOutlined />}
                  title="Dark mode"
                  description="Switch the interface to a darker palette (coming soon)."
                  checked={darkMode}
                  onChange={handlePreferenceChange(setDarkMode)}
                  disabled
                />
                <PreferenceRow
                  icon={<NotificationsOutlined />}
                  title="Email notifications"
                  description="Receive a summary when unusual consumption is detected."
                  checked={notifications}
                  onChange={handlePreferenceChange(setNotifications)}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5, borderColor: "error.main" }}>
            <CardHeader
              title="Danger zone"
              titleTypographyProps={{ color: "error.main", fontWeight: 700 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Delete account
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Permanently deletes your account and every energy reading
                    you&apos;ve logged.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverRounded />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete account
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This permanently deletes your account and all of your energy data.
            This cannot be undone. Type <strong>DELETE</strong> to confirm.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleteConfirmText !== "DELETE" || deleting}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between">
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      color="text.secondary"
    >
      {icon}
      <Typography variant="body2">{label}</Typography>
    </Stack>
    {typeof value === "string" ? (
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    ) : (
      value
    )}
  </Stack>
);

const PreferenceRow = ({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    spacing={2}
  >
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box sx={{ color: "text.secondary", mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
    <Switch checked={checked} onChange={onChange} disabled={disabled} />
  </Stack>
);

export default Settings;
