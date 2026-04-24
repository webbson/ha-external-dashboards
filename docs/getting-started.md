# Getting Started

This page covers installation and local-development setup only. For how to build your first dashboard once the add-on is running, jump to the user guide (link at the bottom).

## Installation

### HACS (Recommended)

1. Add this repository as a custom repository in HACS
2. Install "External Dashboards"
3. Restart Home Assistant
4. The add-on appears in the sidebar as **External Dashboards**

### Manual

1. Copy the repository into `/addons/external_dashboards/`
2. Go to **Settings → Add-ons → Local add-ons**
3. Install and start "External Dashboards"

## Ports

The add-on runs on two ports:

| Port | Purpose | Access |
|------|---------|--------|
| 8080 (ingress) | Management interface | HA sidebar only |
| 8099 (external) | Dashboard display | Any device on the network |

Port 8099 is exposed by default. Dashboards are accessed at:

```
http://<your-ha-ip>:8099/d/<dashboard-slug>
```

## Local development

You can run the project locally and connect to an external Home Assistant instance for development and testing.

### Prerequisites

- Node.js 20+
- pnpm
- A running Home Assistant instance accessible on your network

### Setup

1. **Create a Long-Lived Access Token** in Home Assistant:
   - Go to your HA instance → Profile → Security → Long-Lived Access Tokens → Create Token
   - Copy the token

2. **Create your `.env` file:**

   ```bash
   cp .env.example .env
   ```

3. **Edit `.env`** with your values:

   ```env
   NODE_ENV=development
   SUPERVISOR_TOKEN=<your-long-lived-access-token>
   HA_WS_URL=ws://<your-ha-ip>:8123/api/websocket
   ```

4. **Install dependencies and build:**

   ```bash
   pnpm install
   pnpm build
   ```

5. **Start the dev server:**

   ```bash
   pnpm dev
   ```

   This starts all packages in watch mode (shared, admin, display, and server with `tsx watch`). The admin UI is at `http://localhost:8080` and the display at `http://localhost:8099/d/<slug>`.

### What `NODE_ENV=development` changes

- Skips HA ingress authentication on the admin server (no `X-Ingress-Path` header required)
- Serves admin and display SPAs from their local `dist/` directories instead of the bundled production path

---

Once installed, see [docs/user-guide/index.md](user-guide/index.md) for how to build your first dashboard.
