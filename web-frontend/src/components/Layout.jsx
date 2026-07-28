import { Box, useMediaQuery, useTheme } from "@mui/material";
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar, { drawerWidth } from "./Sidebar";

const TITLES = {
  "/dashboard": "Overview",
  "/dashboard/predictions": "Predictions",
  "/dashboard/analytics": "Analytics",
  "/dashboard/data": "Data Records",
  "/dashboard/users": "Users",
  "/dashboard/settings": "Settings",
};

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const title = TITLES[location.pathname] || "Fluxora";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          backgroundColor: "background.default",
        }}
      >
        <Header handleDrawerToggle={handleDrawerToggle} title={title} />
        <Box sx={{ mt: 8, p: { xs: 2, md: 3.5 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
