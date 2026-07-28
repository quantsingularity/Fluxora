import {
  BarChart as BarChartIcon,
  BoltRounded as EnergyIcon,
  Dashboard as DashboardIcon,
  ListAlt as DataIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const drawerWidth = 248;

const baseMenuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  {
    text: "Predictions",
    icon: <TimelineIcon />,
    path: "/dashboard/predictions",
  },
  { text: "Analytics", icon: <BarChartIcon />, path: "/dashboard/analytics" },
  { text: "Data Records", icon: <DataIcon />, path: "/dashboard/data" },
  { text: "Settings", icon: <SettingsIcon />, path: "/dashboard/settings" },
];

const Sidebar = ({ mobileOpen, handleDrawerToggle, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const menuItems = user?.is_superuser
    ? [
        ...baseMenuItems.slice(0, 4),
        { text: "Users", icon: <PeopleIcon />, path: "/dashboard/users" },
        baseMenuItems[4],
      ]
    : baseMenuItems;

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 3,
          py: 2.5,
        }}
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #10b981, #3b82f6)",
          }}
        >
          <EnergyIcon sx={{ color: "#fff", fontSize: 20 }} />
        </Box>
        <Typography
          variant="h6"
          noWrap
          fontWeight={800}
          letterSpacing="-0.02em"
        >
          Fluxora
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ mt: 2, px: 1.5, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.text}
              onClick={() => {
                navigate(item.path);
                if (isMobile) handleDrawerToggle();
              }}
              sx={{
                mb: 0.5,
                borderRadius: 2.5,
                py: 1.1,
                color: active ? "primary.dark" : "text.secondary",
                backgroundColor: active
                  ? "rgba(5, 150, 105, 0.10)"
                  : "transparent",
                "&:hover": {
                  backgroundColor: active
                    ? "rgba(5, 150, 105, 0.14)"
                    : "rgba(15, 23, 42, 0.04)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 38,
                  color: active ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: active ? 700 : 500,
                  fontSize: "0.92rem",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 2.5, mt: "auto" }}>
        <Box
          sx={{
            borderRadius: 3,
            p: 2,
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(59,130,246,0.10))",
            border: "1px solid rgba(16,185,129,0.18)",
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            FLUXORA · v2.0
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Energy intelligence platform
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            border: "none",
          },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            border: "none",
            borderRight: "1px solid #EEF2F6",
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
