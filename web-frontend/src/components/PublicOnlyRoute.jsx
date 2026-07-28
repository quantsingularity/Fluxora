import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

// Guards sign-in / sign-up so that an already authenticated user is sent
// straight to the dashboard instead of seeing the auth forms again.
const PublicOnlyRoute = () => {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicOnlyRoute;
