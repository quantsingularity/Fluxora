import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminRoute from "./components/AdminRoute";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import { AuthProvider } from "./context/AuthContext";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import DataRecords from "./pages/DataRecords";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Predictions from "./pages/Predictions";
import Settings from "./pages/Settings";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Users from "./pages/Users";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* App always starts on the public homepage */}
          <Route path="/" element={<Home />} />

          {/* Auth routes: redirect away if already signed in */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* Protected application shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/analytics" element={<Analytics />} />
              <Route path="/dashboard/predictions" element={<Predictions />} />
              <Route path="/dashboard/data" element={<DataRecords />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route element={<AdminRoute />}>
                <Route path="/dashboard/users" element={<Users />} />
              </Route>
            </Route>
          </Route>

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
