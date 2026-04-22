# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-04-22

First public release as a Home Assistant add-on.

### Added

- Dual-server runtime: ingress-authenticated admin panel on port `8080` and a
  LAN-accessible display runtime on port `8099`.
- Admin authoring SPA (React 19 + Ant Design) with a Handlebars template
  editor, Monaco integration, Ctrl+S save, entity-ID autocomplete, and
  duplicate actions on every list.
- Display runtime SPA (React 19) with theme chrome, Handlebars rendering,
  lazy-loaded uPlot for graphs, MapLibre for maps, Markdown rendering,
  blackout overlay, auto-rotate tabs, and a connection-lost banner with
  heartbeat detection.
- Home Assistant integration: WebSocket proxy with per-dashboard entity
  isolation, glob patterns with attribute/state filters, derived entities,
  image and history proxies with caching, and a service-call path for
  interactive dashboards.
- Prebuilt component library: clock, weather, entity list, entity value,
  light card, light switch, media player, scene/script button, graph card,
  map, markdown, camera, tabs container, auto-rotate, input number/select/
  boolean, brightness slider, thermostat, service button, mini history,
  scene selector.
- MCP endpoint: every admin CRUD operation available over MCP
  (Streamable-HTTP transport) when `mcp_api_key` is set.
- Diagnostics page: HA WebSocket state, database size, connected clients,
  persistent known-clients table with aliases, hostname lookups, and a
  "Forget" action.
- Admin-side JSON backup/restore of the entire data set (endpoints + UI +
  MCP tools).
- Zero-config secrets: `jwt_secret` auto-generated and persisted on first
  boot; `mcp_api_key` opt-in.
- App identity persisted across reboots via MAC-address resolution when
  `host_network` is enabled; IP-based fallback otherwise.

### Security

- Custom AppArmor profile (`apparmor.txt`) restricts the container's
  filesystem and capability surface.
- Admin server rejects non-ingress source IPs at the network layer in
  production (belt-and-braces with the `X-Ingress-Path` header check).
- Structured request-ID logging across both servers with log lines on JWT
  verification failures.

### Supported architectures

- `amd64`, `aarch64`. (Pi 4/5 default install.) `armv7` is intentionally
  omitted for this release — qemu-emulated builds of the Node monorepo
  are prohibitively slow in CI. Can be re-enabled later if there's
  demand.

### Known issues

- MAC-based client identification requires `host_network: true`; without it,
  clients are tracked by IP only.

[Unreleased]: https://github.com/webbson/ha-external-dashboards/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/webbson/ha-external-dashboards/releases/tag/v0.1.0
