# Soft-Agri Frontend

React + Vite dashboard for the Soft-Agri smart agriculture system. It runs on **mock data by default**, so you can build every screen without waiting for the Django backend.

## Getting started

```bash
cd frontend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173 and sign in with any username and password (demo mode).

Requires Node.js 20.19 or newer (22 LTS recommended). Check with `node -v`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

## Project structure

```
src/
  config/        Reads environment variables (one place only)
  context/       Auth, theme and selected-field state
  hooks/         useAsync (data loading), usePersistentState
  layouts/       AppLayout: sidebar + top bar + page area
  components/
    layout/      Sidebar, Header, navigation list, ProtectedRoute
    ui/          Card, Dropdown, Toggle, Segmented, badges, loading/error/empty states
    charts/      Sparkline, LineChart (plain SVG, no chart library)
  pages/         One file per screen (Dashboard, Monitoring, History, Alerts, Devices, Settings, Login)
  services/      http.js (fetch + JWT), farmService.js (all data calls), authService.js
  mocks/         Mock data. Same shapes the API should return
  styles/        tokens.css (colours, radii, fonts), base, layout, components, pages
  utils/         Formatting helpers and the sensor icon map
docs/
  API_CONTRACT.md   Endpoints the backend needs to provide
```

## How to add a page

1. Create `src/pages/MyPage.jsx`.
2. Add a `<Route>` for it in `src/App.jsx`.
3. Add an entry in `src/components/layout/navigation.js` so it appears in the sidebar.

## Working with data

Pages never call `fetch` directly. They call functions from `src/services/farmService.js` through the `useAsync` hook:

```jsx
const alerts = useAsync(getAlerts, []);

<AsyncBoundary {...alerts} onRetry={alerts.reload}>
  {(data) => <AlertList alerts={data} />}
</AsyncBoundary>
```

`AsyncBoundary` shows the loading, error and empty states for you.

To connect the real backend:

1. Start Django (`python manage.py runserver`, port 8000).
2. In `.env` set `VITE_USE_MOCK_DATA=false`.
3. Requests to `/api/...` are proxied to Django by `vite.config.js`, so CORS is not a problem in development.

The endpoints and response shapes are described in `docs/API_CONTRACT.md`. If the backend returns a different shape, change it in `farmService.js` only, not in the pages.

## Styling

- All colours, radii, fonts and the dark theme live in `src/styles/tokens.css`. Change a value there and the whole app updates.
- Reuse the classes in `components.css` (`card`, `button`, `badge`, `pill`, `summary-grid`) before writing new CSS.
- Keep text at 13px or larger and keep the visible focus outline so the app stays readable and keyboard friendly.

## Git workflow

Work on the `frontend` branch only.

```bash
git checkout frontend
git pull
# ...make changes...
git add frontend/
git commit -m "Describe what you changed"
git push
```

Do not commit `.env` or `node_modules` (both are in `.gitignore`).
