# User Guide

Welcome to the External Dashboards admin user guide. This guide walks through every screen of the admin panel and how to build your first dashboard.

## What this is

External Dashboards is a Home Assistant add-on for building dashboards that are served outside the normal Home Assistant frontend. Typical uses are wall-mounted tablets, kiosks, shared TV displays, and public-facing information screens. Each dashboard has its own URL, its own access rules, and its own look and feel, and can be opened in any browser without a Home Assistant login.

The add-on runs two HTTP listeners inside the same process:

- The **admin panel** on port **8080**, reached through the Home Assistant ingress sidebar (the "External Dashboards" entry). Everything in this guide happens here.
- The **external display server** on port **8099**, which is what your wall tablets and kiosks actually load. Dashboards are reached at `http://<host>:8099/d/<slug>`.

The content model has three reusable building blocks plus the dashboard that ties them together:

- **Themes** define colors, typography, borders, spacing and background — applied as CSS variables.
- **Layouts** define a CSS grid with named regions.
- **Components** are small Handlebars templates with their own CSS, parameters and entity bindings.
- **Dashboards** pick a theme, one or more layouts, and place component instances into layout regions. Each dashboard has its own slug, access mode, and (optional) blackout schedule.

## Getting started

The shortest happy path is:

1. **Create a theme.** Go to *Themes → New Theme*, give it a name, pick your colors and fonts, save.
2. **Create a layout.** Go to *Layouts → New Layout*, enter a CSS grid template like `"header" 60px "main" 1fr / 1fr`. Regions are detected automatically from the template.
3. **Create (or pick) a component.** Go to *Components*. The add-on ships with a library of prebuilt components (entity card, clock, weather, graph, etc.) — you can duplicate one and edit the copy, or start from scratch via *New Component*.
4. **Create a dashboard.** Go to *Dashboards → New Dashboard*. Fill in the Settings tab (name, slug, access mode, theme). Switch to the Content tab, add your layout as a tab, drop component instances into each region, and save.
5. **Open it.** Back on the dashboard list, click the *Open* icon (requires `EXTERNAL_BASE_URL` to be set — the add-on auto-detects it in most HA installs). The URL format is `http://<host>:8099/d/<slug>`.

You can iterate freely: saving a component, layout, theme, or dashboard triggers an automatic reload on every display showing that dashboard.

## Table of contents

- [Dashboards](./dashboards.md) — create and configure the pages your tablets open.
- [Themes](./themes.md) — colors, typography, chrome and custom CSS variables.
- [Layouts](./layouts.md) — CSS grid templates and named regions.
- [Components](./components.md) — reusable Handlebars templates with parameters and entity bindings.
- [Assets](./assets.md) — uploaded images, videos and fonts.
- [Popups](./popups.md) — one-off overlays triggered from the admin panel or Home Assistant.
- [Diagnostics](./diagnostics.md) — health, connection state, display client inventory.
- [MCP](./mcp.md) — Model Context Protocol server for AI agents.
- [Backup and restore](./backup-restore.md) — export and import the full definition set.
- [Troubleshooting](./troubleshooting.md) — common problems and fixes.
