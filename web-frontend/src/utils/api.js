import axios from "axios";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

const ACCESS_TOKEN_KEY = "fluxora_access_token";
const REFRESH_TOKEN_KEY = "fluxora_refresh_token";

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------
export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = ({ access_token, refresh_token }) => {
  if (access_token) localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.headers?.["X-Skip-Auth"]) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

const performRefresh = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");
  const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
    refresh_token: refreshToken,
  });
  setTokens(response.data);
  return response.data;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint =
      originalRequest?.url?.includes("/v1/auth/token") ||
      originalRequest?.url?.includes("/v1/auth/refresh") ||
      originalRequest?.url?.includes("/v1/auth/register");

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      getRefreshToken()
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise || performRefresh();
        const tokens = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearTokens();
        window.dispatchEvent(new CustomEvent("fluxora:logout"));
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && isAuthEndpoint === false && !getRefreshToken()) {
      clearTokens();
      window.dispatchEvent(new CustomEvent("fluxora:logout"));
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginRequest = async (email, password) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const response = await apiClient.post("/v1/auth/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
};

export const registerRequest = async (email, password) => {
  const response = await apiClient.post("/v1/auth/register", {
    email,
    password,
  });
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await apiClient.get("/v1/auth/me");
  return response.data;
};

export const updateCurrentUser = async (payload) => {
  const response = await apiClient.patch("/v1/auth/me", payload);
  return response.data;
};

export const deleteCurrentUser = async () => {
  await apiClient.delete("/v1/auth/me");
  return true;
};

// ---------------------------------------------------------------------------
// Admin: user management (superuser only)
// ---------------------------------------------------------------------------
export const getUsers = async ({ skip = 0, limit = 100 } = {}) => {
  const response = await apiClient.get("/v1/users/", {
    params: { skip, limit },
  });
  return response.data;
};

export const updateUserById = async (id, payload) => {
  const response = await apiClient.patch(`/v1/users/${id}`, payload);
  return response.data;
};

export const deleteUserById = async (id) => {
  await apiClient.delete(`/v1/users/${id}`);
  return true;
};

export const activateUserById = async (id) => {
  const response = await apiClient.post(`/v1/users/${id}/activate`);
  return response.data;
};

export const deactivateUserById = async (id) => {
  const response = await apiClient.post(`/v1/users/${id}/deactivate`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Energy data records (CRUD)
// ---------------------------------------------------------------------------
export const getDataRecords = async ({ skip = 0, limit = 100 } = {}) => {
  const response = await apiClient.get("/v1/data/", {
    params: { skip, limit },
  });
  return response.data;
};

export const getDataRecordsInRange = async (startTime, endTime) => {
  const response = await apiClient.get("/v1/data/query", {
    params: { start_time: startTime, end_time: endTime },
  });
  return response.data;
};

export const createDataRecord = async (payload) => {
  const response = await apiClient.post("/v1/data/", payload);
  return response.data;
};

export const updateDataRecord = async (id, payload) => {
  const response = await apiClient.patch(`/v1/data/${id}`, payload);
  return response.data;
};

export const deleteDataRecord = async (id) => {
  await apiClient.delete(`/v1/data/${id}`);
  return true;
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export const getAnalytics = async (period = "month") => {
  const response = await apiClient.get("/v1/analytics/", {
    params: { period },
  });
  return response.data;
};

export const getAnalyticsSummary = async () => {
  const response = await apiClient.get("/v1/analytics/summary");
  return response.data;
};

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------
export const getPredictions = async (days = 7) => {
  const response = await apiClient.get("/v1/predictions/", {
    params: { days },
  });
  return response.data;
};

export const triggerTraining = async () => {
  const response = await apiClient.post("/v1/predictions/train");
  return response.data;
};

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------
export const getHealthStatus = async () => {
  const response = await apiClient.get("/health", {
    headers: { "X-Skip-Auth": "1" },
  });
  return response.data;
};

export default apiClient;
