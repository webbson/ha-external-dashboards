# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                         │
│                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────┐  │
│  │   Admin Server (:8080)   │  │  External Server (:8099) │  │
│  │                          │  │                          │  │
│  │  ┌──────┐  ┌──────────┐ │  │  ┌───────┐  ┌─────────┐ │  │
│  │  │ API  │  │ Admin SPA│ │  │  │Display│  │   WS    │ │  │
│  │  │Routes│  │ (React)  │ │  │  │  SPA  │  │  Proxy  │ │  │
│  │  └──┬───┘  └──────────┘ │  │  └───────┘  └────┬────┘ │  │
│  │     │                    │  │                   │      │  │
│  └─────┼────────────────────┘  └───────────────────┼──────┘  │
│        │                                           │         │
│  ┌─────┴──────────────────────────────────────────┬┘         │
│  │              Shared Services                   │          │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────┐  │          │
│  │  │  SQLite  │  │ HA Client │  │ Connection │  │          │
│  │  │ (Drizzle)│  │(WebSocket)│  │  Manager   │  │          │
│  │  └──────────┘  └─────┬─────┘  └────────────┘  │          │
│  └───────────────────────┼────────────────────────┘          │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │ Home        │
                    │ Assistant   │
                    │ WebSocket   │
                    │ API         │
                    └─────────────┘
```

## Data Flow

### Entity State Updates

1. **HA WebSocket API** sends `state_changed` events to `ha-client.ts`
2. `ha-client.ts` maintains a full state map and calls `onStateChanged` callback
3. Callback in `index.ts` routes the update to `connectionManager.sendStateUpdate()`
4. `ConnectionManager` checks each display connection's `subscribedEntities` set
5. Only connections subscribed to that entity receive the update
6. Display app receives the WebSocket message and updates React state
7. Components re-render with new entity data via Handlebars

### Dashboard Display Loading

1. Display app extracts slug from URL (`/d/:slug`)
2. Fetches `/api/display/:slug` — returns full dashboard config
3. Config includes: dashboard settings, layouts with structures, component instances, component definitions
4. `DashboardRenderer` renders the active layout with CSS Grid
5. `RegionRenderer` places component instances per region
6. `VisibilityGate` evaluates visibility rules against entity state
7. `ComponentRenderer` compiles Handlebars templates with entity data
8. WebSocket connects with dashboard's access key for real-time updates

### Admin Preview

1. User edits template/styles in HybridEditor
2. `LivePreview` sends `POST /api/preview/render` with template + entity bindings
3. Server compiles Handlebars with real entity data from `ha-client`
4. Returns rendered HTML + CSS
5. Admin iframe displays the result (debounced at 300ms)

## Package Dependencies

```
shared ──────────────────────────────┐
   │                                 │
   ├── admin (React + Vite)          │
   │    └── builds to dist/          │
   │                                 │
   ├── display (React + Vite)        │
   │    └── builds to dist/          │
   │                                 │
   └── server (Node.js + Fastify) ◄──┘
        ├── serves admin/dist/
        ├── serves display/dist/
        └── all API + WS logic
```

## Database Schema

```
dashboards ──< dashboard_layouts >── layouts
                      │
              component_instances ──> components
                      │
              (self-referencing via parentInstanceId for containers)

assets (standalone, files in /config/assets/)
popups (standalone, targets dashboards by ID array)
```

### Key Design Decisions

- **SQLite** — Single-file database, included in HA backups, no external dependencies
- **Drizzle ORM** — Type-safe schema with auto-migration support
- **Handlebars** — Lightweight, works client-side on low-power devices (Pi 3B)
- **Dual servers** — Admin isolated behind HA ingress auth, display accessible externally
- **Access keys** — Per-dashboard UUID for WebSocket auth, separate from user credentials
- **Entity isolation** — Display connections only receive state updates for entities used in their dashboard

## File Structure

```
packages/server/src/
  index.ts              # Entry point, dual server setup
  db/
    schema.ts           # Drizzle table definitions
    connection.ts       # SQLite connection + Drizzle instance
    migrate.ts          # Migration runner
  routes/
    dashboards.ts       # Dashboard CRUD + layout/instance management
    layouts.ts          # Layout CRUD
    components.ts       # Component CRUD
    assets.ts           # Asset CRUD + file upload/serve
    popups.ts           # Popup CRUD
    ha-proxy.ts         # HA entity list/status proxy
    preview.ts          # Template render preview
    display-data.ts     # Full dashboard config for display app
    popup-trigger.ts    # Popup trigger endpoint (external + admin)
  ws/
    ha-client.ts        # Persistent HA WebSocket connection
    manager.ts          # Display connection tracking
    proxy.ts            # WebSocket upgrade handler + entity proxy
    popup-broadcast.ts  # Popup + reload broadcasting
  middleware/
    auth.ts             # HA ingress auth check
    dashboard-auth.ts   # Password/header auth for external dashboards
    error-handler.ts    # Zod + global error handling
  template/
    helpers.ts          # Server-side Handlebars helpers (for preview)
  prebuilt/
    index.ts            # Pre-built component seeding
```
