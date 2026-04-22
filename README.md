# External Dashboards — Home Assistant add-on

Build and host custom dashboards **outside** Home Assistant — on kiosks, wall displays, tablets, or any LAN-connected browser — while still subscribing to live HA entity state and calling services.

- **Admin panel** in the HA sidebar (via ingress) to author dashboards with a Handlebars template editor, Ant Design UI, component library, themes, and live preview.
- **Display runtime** served on a separate LAN port (default `8099`) for browser clients; no HA account needed on the device.
- **WebSocket proxy** to HA with per-dashboard entity isolation, glob subscriptions, and interactive-mode service calls.
- **MCP endpoint** for automation — every admin CRUD operation is exposed to MCP clients.
- **Pre-built components**: clock, weather, light cards, media player, map, graph card, thermostat, brightness slider, scene selector, and more.

## Install

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fwebbson%2Fha-external-dashboards)

Or manually:

1. Open **Settings → Add-ons → Add-on Store**.
2. Click the **⋮** menu (top right) → **Repositories**.
3. Paste `https://github.com/webbson/ha-external-dashboards` and hit **Add**.
4. Find **External Dashboards** in the store, click **Install**.
5. Start the add-on. **External Dashboards** appears in the sidebar.

See [external_dashboards/DOCS.md](./external_dashboards/DOCS.md) for configuration, kiosk setup, networking notes, and MCP usage. [CHANGELOG](./external_dashboards/CHANGELOG.md).

## Status

Early release (`stage: experimental`). The data model, APIs, and prebuilt component library are still evolving. Breaking schema changes are migrated automatically via Drizzle; please back up via **Admin → Backup** before upgrading between pre-1.0 versions.

## Development

This repository is also the full monorepo source tree. To run locally against a real HA instance:

```bash
pnpm install
# Copy .env.example to .env and fill SUPERVISOR_TOKEN and HA_WS_URL
pnpm dev
```

Open http://localhost:8180 for admin (dev ports differ from production; see [CLAUDE.md](./CLAUDE.md) for the full architecture).

## Contributing

Issues and PRs welcome. For larger changes please open an issue first to discuss direction.

## License

[O'Saasy](./LICENSE) — MIT with a SaaS-non-compete clause.
