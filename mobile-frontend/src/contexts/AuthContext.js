import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearTokens,
  deleteCurrentUser,
  fetchCurrentUser,
  getAccessToken,
  loginRequest,
  registerForcedLogoutHandler,
  registerRequest,
  setTokens,
  updateCurrentUser,
} from "../api/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

export function extractErrorMessage(err, fallback) {
  const data = err?.response?.data;
  return (
    data?.error?.message ||
    data?.detail ||
    (typeof data === "string" ? data : null) ||
    err?.message ||
    fallback
  );
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadCurrentUser = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      setIsInitializing(false);
      return;
    }
    try {
      const me = await fetchCurrentUser();
      setUser(me);
    } catch (err) {
      console.warn("Session expired or invalid, clearing tokens.", err);
      await clearTokens();
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
    registerForcedLogoutHandler(() => setUser(null));
    return () => registerForcedLogoutHandler(null);
  }, [loadCurrentUser]);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const tokens = await loginRequest(email, password);
      await setTokens(tokens);
      const me = await fetchCurrentUser();
      setUser(me);
      return { success: true };
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Unable to sign in. Check your credentials.",
      );
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      await registerRequest(email, password);
      const tokens = await loginRequest(email, password);
      await setTokens(tokens);
      const me = await fetchCurrentUser();
      setUser(me);
      return { success: true };
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Unable to create your account.",
      );
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    setAuthError(null);
    try {
      const result = await updateCurrentUser(payload);
      // When the email changes, the backend reissues fresh tokens (the
      // JWT subject is the email) so the session doesn't silently break
      // on the very next request. Persist them if present.
      if (result.access_token) {
        await setTokens(result);
      }
      setUser(result.user);
      return { success: true, user: result.user };
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Unable to update your profile.",
      );
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await deleteCurrentUser();
      await clearTokens();
      setUser(null);
      return { success: true };
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Unable to delete your account.",
      );
      return { success: false, error: message };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isInitializing,
      authError,
      setAuthError,
      login,
      register,
      logout,
      updateProfile,
      deleteAccount,
      refreshUser: loadCurrentUser,
    }),
    [
      user,
      isInitializing,
      authError,
      login,
      register,
      logout,
      updateProfile,
      deleteAccount,
      loadCurrentUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
