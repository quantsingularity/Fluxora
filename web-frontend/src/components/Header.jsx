import {
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  VerifiedUser as VerifiedIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialsFromEmail = (email = "") => email.slice(0, 2).toUpperCase();

const Header = ({ handleDrawerToggle, title }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate("/");
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: "background.paper",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 1, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }} noWrap>
          {title || "Overview"}
        </Typography>

        {user?.is_superuser && (
          <Chip
            size="small"
            icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
            label="Admin"
            sx={{
              mr: 1,
              backgroundColor: "rgba(59,130,246,0.10)",
              color: "secondary.dark",
              fontWeight: 700,
            }}
          />
        )}

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Account">
            <IconButton edge="end" onClick={handleMenuOpen} sx={{ ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #10b981, #3b82f6)",
                }}
              >
                {user ? (
                  initialsFromEmail(user.email)
                ) : (
                  <PersonIcon fontSize="small" />
                )}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <Box sx={{ px: 2, py: 1.25, minWidth: 220 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {user?.email || "Signed in"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.is_superuser ? "Administrator" : "Member"}
          </Typography>
        </Box>
        <MenuItem
          onClick={() => {
            handleMenuClose();
            navigate("/dashboard/settings");
          }}
        >
          <SettingsIcon fontSize="small" sx={{ mr: 1.25 }} />
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} />
          Log out
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;
