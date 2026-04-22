# External Dashboards

Create and host custom dashboards outside Home Assistant, backed by live HA entity state.

## What it does

Two servers run side-by-side inside this add-on:

- **Admin panel** (port `8080`, exposed via HA ingress) — author dashboards, manage themes and layouts, upload assets, preview components. Lives in the HA sidebar.
- **Display runtime** (port `8099`, exposed on your LAN) — renders dashboards in any browser, subscribes to HA entity updates over WebSocket, supports interactive service calls when enabled per-dashboard.

Dashboards are composed of reusable Handlebars components, organised into layouts and themed independently of HA. The add-on proxies HA's WebSocket so each display only sees the entities the dashboard explicitly binds.

## Configuration

Open **Configuration** on the add-on page.

| Option | Default | Notes |
| --- | --- | --- |
| `jwt_secret` | _auto-generated_ | Signing secret for display cookies and dashboard-password JWTs. Leave blank and a random secret is generated on first boot and persisted to `/data/secrets.json` — that's usually what you want. Set it explicitly only if you need to share secrets across installs. |
| `mcp_api_key` | _empty_ | Bearer token required on `/mcp`. Leave blank to disable the MCP endpoint. Pick a long random string if you want to drive the admin from Claude Desktop / MCP clients. |

Both fall back to the `JWT_SECRET` / `MCP_API_KEY` environment variables if set (used for local development).

## Quick start

1. Install the add-on and start it.
2. Open the **External Dashboards** entry in the HA sidebar. Create your first dashboard: **+ New**, pick a slug, choose a theme.
3. Add a layout and drop a component onto it. The library includes clocks, weather, light cards, media player, map, graph card, thermostat, brightness slider, scene selector, and more.
4. Save. The display URL is `http://<ha-host>:8099/d/<slug>`.
5. Open that URL on any LAN device to see the live dashboard.

## Networking

### Why two ports?

- **Ingress (`8080`)** is the admin panel. HA Supervisor auth gates it — only HA users reach it.
- **External (`8099`)** is for display clients — kiosks, tablets, TV browsers. It has to be directly reachable so devices without an HA account can load it.

Each dashboard has its own `accessKey` (UUID) in the URL. Dashboards can additionally require a password, a header, or be marked public or disabled.

### Reverse proxies

If you front your HA with Nginx / Traefik / Caddy, expose **both** ports or terminate TLS in front of the add-on on a subdomain pointing to `8099`. The admin panel is reached through the usual HA ingress; you don't need to proxy `8080` externally.

### MAC-based client tracking (optional)

The Diagnostics page lists persistent clients. By default they're keyed by IP
address. If you want MAC-based identity so the same kiosk keeps its alias
across DHCP changes, MAC resolution uses the Linux ARP cache — which is only
visible in host-network mode.

Host networking is a build-time property of the add-on and can't be toggled
from the Supervisor UI. A future release will publish a second branch of this
repository with `host_network: true` baked in, reachable by appending `#next`
to the repository URL when adding it in Supervisor:

```
https://github.com/webbson/ha-external-dashboards#next
```

Users on the `main` branch stay on bridge networking (IP-only identity);
users on `#next` get host networking (MAC identity, wider host visibility).
Until that branch exists, clients show up as `ip:<addr>` in Diagnostics.

## Data & backups

- Database: `/config/external_dashboards.db` (SQLite, managed by Drizzle migrations).
- Assets: `/config/assets/`.
- Bootstrap secrets: `/data/secrets.json` (auto-generated JWT secret).
- Use **Admin → Backup** to download a full JSON export before each upgrade during the pre-1.0 period.

## MCP endpoint

When `mcp_api_key` is set, the add-on exposes a Streamable-HTTP MCP endpoint at `http://<ha-host>:8099/mcp`. Every admin CRUD operation (dashboards, themes, layouts, components, assets, backup/restore, diagnostics, client management) is a tool. Add it to an MCP client with:

```json
{
  "mcpServers": {
    "external-dashboards": {
      "url": "http://<ha-host>:8099/mcp",
      "headers": { "Authorization": "Bearer <mcp_api_key>" }
    }
  }
}
```

## Troubleshooting

**HA WebSocket shows "Disconnected" on the Diagnostics page.**
Check the add-on log. Most common causes: a misconfigured `SUPERVISOR_TOKEN` (should be auto-provided by HA), or the add-on not running under Supervisor (local dev flow). Restart the add-on.

**Admin panel 404s on reload of a deep URL.**
Fixed in 0.1.0. Upgrade if you see this.

**Display shows "Disconnected — reconnecting…" on a healthy LAN.**
The display's 15-second heartbeat timer tripped. The add-on sends app-level heartbeats every 10 seconds; if they're not arriving, there's a real link problem (check firewalls, the display's network, or WebSocket interference from a reverse proxy that doesn't support WS upgrades).

**Display clients all appear as `ip:` rather than `mac:` in Diagnostics.**
Expected without `host_network`. Enable it if you care about MAC identity (see Networking above).

**Migrations fail on upgrade.**
Back up via the admin panel, then post the add-on log in the GitHub repo's issue tracker.

## Source

https://github.com/webbson/ha-external-dashboards — contributions welcome.
