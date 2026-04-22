# Changelog

All notable changes to External Dashboards are recorded here. This project
uses [Semantic Versioning](https://semver.org/).

## 0.1.0 — Initial release

First public release as a Home Assistant add-on.

### Features

- **Dual-server architecture:** ingress-authenticated admin panel on port
  `8080`, LAN-accessible display runtime on port `8099`.
- **Admin authoring:** Handlebars template editor with Monaco, Ant Design
  UI, component/layout/theme libraries, live preview, import/export,
  Ctrl+S save, entity-ID autocomplete, duplicate action on every list.
- **Display runtime:** React 19 SPA with theme chrome, Handlebars render,
  lazy-loaded uPlot for graph components, MapLibre for maps, Markdown,
  blackout overlay, auto-rotate tabs, connection-lost banner with
  heartbeat detection.
- **HA integration:** WebSocket proxy with per-dashboard entity isolation,
  glob patterns with attribute/state filters, derived entities, image
  and history proxies with caching, service-call path for interactive
  dashboards.
- **Prebuilt components:** clock, weather, entity list, entity value,
  light card, light switch, media player, scene/script button, graph
  card, map, markdown, camera, tabs container, auto-rotate, input
  number/select/boolean, brightness slider, thermostat, service button,
  mini history, scene selector.
- **MCP endpoint:** every admin CRUD operation available over MCP
  (Streamable-HTTP transport) when `mcp_api_key` is set.
- **Diagnostics:** HA WS state, DB size, connected clients, persistent
  known-clients table with aliases, hostname lookups, and "Forget"
  action.
- **Backup/restore:** admin-side JSON export/import of the entire data
  set, with MCP tools.
- **Zero-config secrets:** JWT secret auto-generated and persisted on
  first boot; MCP key opt-in.

### Architectures

- `amd64`, `aarch64`, `armv7`.

### Known issues

- Branding assets (`icon.png`, `logo.png`) are not yet checked in; the
  add-on store will show a generic tile until they land.
- MAC-based client identification requires `host_network: true`; without
  it, clients are tracked by IP only.
