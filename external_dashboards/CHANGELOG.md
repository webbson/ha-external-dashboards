# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.5] — 2026-04-23

### Added

- **Image Card** now has `Padding (px)` and `Max width` parameters (e.g. `400px`,
  `50%`). Padding is applied inside the card wrapper with `box-sizing: border-box`
  so it doesn't overflow the region; max-width defaults to `none`.

### Fixed

- Derived entities (`{{state (deriveEntity ...)}}`) no longer fail to subscribe
  in production when the WebSocket is still connecting on first render. Two
  changes combined: `subscribeEntities` now only calls `send()` when
  `readyState === OPEN` (previously threw a DOMException in CONNECTING state),
  and `requestedEntities` is cleared on every WS `open` event so derived entity
  IDs are re-sent after each (re)connect rather than being permanently skipped.
  This was the root cause of the Employee list status dot not updating in HA
  while appearing to work in dev (where localhost connects fast enough that
  the socket is usually OPEN by the time the first effect fires).

## [0.1.4] — 2026-04-23

### Added

- **Visibility rules** now support targeting entity `state` directly (in addition to
  attributes) via an explicit State/Attribute radio in the editor. Two new operators
  `isTruthy` / `isFalsy` cover "has any value" / "is off/empty" cases without
  needing to type an exact match value. Falsy set: `""`, `"0"`, `"false"`, `"off"`,
  `"no"`, `"unavailable"`, `"unknown"`.
- **Visibility rule entity field** now uses the existing `EntitySelector` autocomplete
  instead of a plain text input.
- **`external_base_url` addon config option** — set explicitly in the add-on UI, or
  leave blank to auto-detect: the server queries the HA Supervisor network API at
  startup and derives `http://<host-ip>:<EXTERNAL_PORT>`. The "Open dashboard" button
  in the admin panel is now usable on most installs without manual config.
- **Prebuilt Image Card** component — place an uploaded asset as a full-bleed image.
  Supports cover/contain/fill/none object-fit and alt text.
- **`asset` parameter type** — component authors can declare a parameter of type
  `"asset"` to get a searchable dropdown of uploaded assets instead of a text field.
  Applies in both the component test panel and the dashboard component editor.
- **Clock font size parameters** — `timeSize` (default 4 em) and `dateSize`
  (default 1.2 em) are now editable per instance.

### Fixed

- Admin SPA opens correctly when launched from the Home Assistant sidebar (ingress
  URL). `<BrowserRouter>` now derives its `basename` from the server-injected
  `<base href>` so React Router matches routes under
  `/api/hassio_ingress/<token>/`. A root-path redirect ensures `/` → `/dashboards`.
- Dashboard editor regions now use `minmax(120px, auto)` row heights instead of the
  layout's fixed pixel values, so all placed components are visible while editing.
  The display runtime (port 8099) continues to use the real grid proportions.
- Component preview in the admin panel now rewrites absolute-path asset and proxy
  URLs (`/assets/…`, `/api/image_proxy/…`, `/api/camera_proxy/…`, `/api/icons/…`)
  to include the HA ingress prefix, so images and icons render correctly when the
  admin is opened via HA ingress.
- MAC address and hostname columns are hidden from the Diagnostics page by default.
  Both columns (and the underlying ARP/DNS resolution calls) are skipped unless the
  add-on is started with `HOST_NETWORK=true`. Existing installs see a cleaner
  Diagnostics table with no permanently empty columns.
- Server version shown in Diagnostics now matches the add-on version tag
  (`packages/server/package.json` kept in sync with `config.yaml`).

## [0.1.3] — 2026-04-22

### Fixed

- Admin SPA no longer sends `/api/*` fetches to the Home Assistant root
  when loaded via HA ingress. The server now injects
  `<base href="<X-Ingress-Path>/">` into `index.html` so
  `document.baseURI` points at the add-on root across React Router
  navigations; the client `api` helper and the handful of bare
  `fetch(...)` / `<img src>` call sites resolve their paths against
  that base via a new `apiUrl()` helper. Observed symptom: the
  Diagnostics page showed a stream of
  `https://<ha-host>/api/admin/clients 404` entries in the console.

## [0.1.2] — 2026-04-22

### Fixed

- Container starts. 0.1.1 failed at boot with
  `Cannot find package 'fastify'` because the Dockerfile copied pnpm's
  workspace-root `node_modules` — pnpm stores real deps under `.pnpm/`
  with per-package symlinks, so top-level `/app/node_modules/fastify`
  never existed. Rebuilt the image around `pnpm deploy`, which emits a
  self-contained tree with workspace refs resolved, symlinks gone, and
  only production dependencies included.

### Changed

- Node runtime upgraded from 20.15 (Alpine-bundled) to 24 (current LTS).
  Runtime base switched from `ghcr.io/home-assistant/{arch}-base:3.20`
  to `node:24-alpine` — we don't use s6-overlay or bashio
  (`init: false` in config.yaml) so the HA base's extras weren't
  earning their keep. Multi-arch is handled natively by Docker Buildx.
- `packages/shared/package.json` declares `files: ["dist"]` so
  `pnpm deploy` packs the built artefact for the consuming server.
- AppArmor profile updated for the new container layout
  (`/usr/local/bin/node`). The legacy HA-base paths are retained as
  harmless no-ops so a future rebase stays compatible.

## [0.1.1] — 2026-04-22

### Fixed

- Images published at the correct path. The 0.1.0 release pushed under
  `ghcr.io/webbson/ghcr.io/webbson/{arch}-external-dashboards` because
  `home-assistant/builder` re-prefixed the `--image` value with its
  own registry path. The release workflow now uses
  `docker/build-push-action` directly, so tags are verbatim and images
  land at `ghcr.io/webbson/{arch}-external-dashboards:0.1.1` — the path
  `config.yaml`'s `image:` field points at.

### Changed

- Repository restructured into the canonical HA add-on layout: add-on
  files live in `external_dashboards/`, with `repository.yaml` at the
  root. Required to satisfy Supervisor's "is this a valid add-on
  repository?" validation.

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

[Unreleased]: https://github.com/webbson/ha-external-dashboards/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/webbson/ha-external-dashboards/releases/tag/v0.1.5
[0.1.4]: https://github.com/webbson/ha-external-dashboards/releases/tag/v0.1.4
[0.1.3]: https://github.com/webbson/ha-external-dashboards/releases/tag/v0.1.3
[0.1.2]: https://github.com/webbson/ha-external-dashboards/releases/tag/v0.1.2
[0.1.1]: https://github.com/webbson/ha-external-dashboards/releases/tag/v0.1.1
[0.1.0]: https://github.com/webbson/ha-external-dashboards/releases/tag/v0.1.0
