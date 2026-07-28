# Mobile Frontend — Fluxora

The React Native (Expo) client for Fluxora, an energy intelligence platform. It mirrors
the web app: a public welcome screen, email/password authentication, and a protected
drawer app — all fully wired to the FastAPI backend in `code/backend`.

## Features

- Public welcome screen with a live backend status indicator
- Sign in / sign up backed by real JWT auth (access + refresh tokens in AsyncStorage,
  with automatic silent refresh and forced logout on expiry)
- Protected drawer app: Dashboard, Predictions, Analytics, Data Records (full CRUD),
  Settings
- Shared design language with the web app (emerald primary `#059669`, blue accent
  `#3b82f6`, `react-native-paper` MD3 theme)

## Tech stack

- **Framework**: React Native with Expo SDK 52
- **UI library**: React Native Paper
- **Navigation**: React Navigation v7 — a native-stack for Home/SignIn/SignUp/Main, and
  a drawer for the authenticated app
- **Charts**: React Native Chart Kit
- **State**: React Context (`AuthContext`) + AsyncStorage for token persistence
- **HTTP client**: Axios, with request/response interceptors for auth + token refresh

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm
- Expo CLI (`npx expo`, no global install required)
- iOS: macOS + Xcode. Android: Android Studio + SDK. Or just use Expo Go on a physical device.

## Installation

```bash
cd mobile-frontend
npm install
```

No `--legacy-peer-deps` flag is needed — the dependency tree (React Navigation v7,
`react-native-screens`, `react-test-renderer`) is fully aligned.

### Configure the backend URL

```bash
cp .env.example .env
```

| Platform                  | `EXPO_PUBLIC_API_BASE_URL`                         |
| ------------------------- | -------------------------------------------------- |
| Android emulator          | `http://10.0.2.2:8000` (also the default if unset) |
| iOS simulator             | `http://localhost:8000`                            |
| Physical device / Expo Go | `http://<your-machine-LAN-IP>:8000`                |

Make sure the backend is running first (see the repo root docs / `code/backend`).

## Running the app

```bash
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with
Expo Go on a physical device.

The app always opens on the **Home** screen. From there:

- Signed out → "Get started" / "Sign in" take you to `SignUp` / `SignIn`
- Signed in → "Go to Dashboard" takes you straight into the protected drawer app (`Main`)

If a session expires (refresh token invalid), the app automatically returns you to
Home.

## Project structure

```
mobile-frontend/
├── App.js                       # Root: providers + NavigationContainer
├── src/
│   ├── api/api.js               # Axios client, token storage, every backend call
│   ├── constants/config.js      # API base URL resolution
│   ├── contexts/AuthContext.js  # Login/register/logout, session bootstrap
│   ├── navigation/
│   │   ├── RootNavigator.js     # Home / SignIn / SignUp / Main (auth-gated)
│   │   └── AppNavigator.js      # Protected drawer: Dashboard, Predictions, Analytics, Data, Settings
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   ├── SignInScreen.js
│   │   ├── SignUpScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── AnalyticsScreen.js
│   │   ├── PredictionsScreen.js
│   │   ├── DataScreen.js        # Full CRUD over energy readings
│   │   └── SettingsScreen.js
│   ├── components/              # StatCard, DataRecordModal (shared create/edit form)
│   └── styles/theme.js          # Design tokens / react-native-paper theme
```

## Backend integration

Every network call lives in `src/api/api.js`:

- `loginRequest` / `registerRequest` / `fetchCurrentUser` → `/v1/auth/*`
- `getDataRecords` / `createDataRecord` / `updateDataRecord` / `deleteDataRecord` → `/v1/data/*`
- `getAnalytics` / `getAnalyticsSummary` → `/v1/analytics/*`
- `getPredictions` / `triggerTraining` → `/v1/predictions/*`
- `getHealthStatus` → `/health`

## Testing

The previous test suite covered a local-only "tasks" feature that no longer exists in
this version of the app. It's been removed rather than left failing; the Jest config
and RTL/AsyncStorage mocks in `src/tests/setup.js` are still in place if you want to
add new tests for the current screens.
