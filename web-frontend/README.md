# Web Frontend — Fluxora

The React web client for Fluxora, an energy intelligence platform. It ships a public
marketing homepage, email/password authentication, and a protected dashboard shell —
all fully wired to the FastAPI backend in `code/backend`.

## What's here

- **Public site**: Homepage (`/`), Sign in (`/signin`), Sign up (`/signup`)
- **Protected app** (behind `/dashboard/*`): Overview, Predictions, Analytics, Data
  Records (full CRUD), Settings
- **Auth**: JWT access + refresh tokens, persisted in `localStorage`, with automatic
  silent refresh on 401 responses and forced logout when the refresh token expires
- **Design system**: a single set of tokens (emerald primary `#059669`, blue accent
  `#3b82f6`, Inter typeface) shared conceptually with the mobile app

## Structure

```
web-frontend/
├── src/
│   ├── components/       # Shell (Header, Sidebar, Layout), route guards, shared UI
│   ├── context/
│   │   └── AuthContext.jsx   # Login/register/logout, session bootstrap
│   ├── pages/
│   │   ├── Home.jsx           # Public marketing landing page (default route)
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   ├── Dashboard.jsx      # Overview: summary stats, weekly chart, recent readings
│   │   ├── Analytics.jsx      # Week/Month/Year rollups
│   │   ├── Predictions.jsx    # Forecast chart + admin "retrain" action
│   │   ├── DataRecords.jsx    # Full CRUD over energy readings
│   │   ├── Settings.jsx       # Account profile + local preferences
│   │   └── NotFound.jsx
│   ├── utils/api.js       # Axios client, token storage, every backend call
│   ├── App.jsx             # Routing (public vs. protected)
│   └── theme.js            # MUI theme / design tokens
├── .env.example
└── vite.config.js
```

## Getting started

```bash
cd web-frontend
npm install
cp .env.example .env   # defaults to http://localhost:8000
npm run dev
```

The app starts on the homepage. From there you can sign up, sign in, and you'll land
on `/dashboard`. Visiting `/dashboard/*` while signed out redirects you to `/signin`;
visiting `/signin` or `/signup` while already signed in redirects you to `/dashboard`.

Make sure the backend is running first (see `code/backend/README.md` or the repo
root docs) — every screen after sign-in calls the real API, there is no mock mode.

### Environment variables

| Variable            | Default                 | Description                     |
| ------------------- | ----------------------- | ------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |
| `VITE_API_TIMEOUT`  | `30000`                 | Request timeout in ms           |

## Building for production

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Backend integration

Every network call lives in `src/utils/api.js`:

- `loginRequest` / `registerRequest` / `fetchCurrentUser` → `/v1/auth/*`
- `getDataRecords` / `createDataRecord` / `updateDataRecord` / `deleteDataRecord` → `/v1/data/*`
- `getAnalytics` / `getAnalyticsSummary` → `/v1/analytics/*`
- `getPredictions` / `triggerTraining` → `/v1/predictions/*`
- `getHealthStatus` → `/health` (used on the public homepage to show live system status)

Requests automatically attach the stored access token; a 401 triggers a silent
refresh-token exchange, and if that also fails the user is signed out and returned
to the homepage.
