import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Resolve the backend base URL.
//
// - Android emulators reach the host machine via 10.0.2.2, not localhost.
// - Physical devices / Expo Go need the LAN IP of the machine running the
//   backend; that can be supplied through the EXPO_PUBLIC_API_BASE_URL env
//   var (see .env.example) and takes precedence over every default.
// ---------------------------------------------------------------------------
const ENV_URL = process.env.EXPO_PUBLIC_API_BASE_URL || null;

const DEFAULT_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

export const API_BASE_URL = ENV_URL || DEFAULT_URL;
export const API_TIMEOUT = 30000;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "fluxora_access_token",
  REFRESH_TOKEN: "fluxora_refresh_token",
};

export default {
  API_BASE_URL,
  API_TIMEOUT,
  STORAGE_KEYS,
};
