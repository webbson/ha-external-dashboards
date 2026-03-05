# Themes, Region Chrome, Asset Folders & Cleanup Design

## Overview

Seven coordinated changes to improve styling architecture, asset management, and system consistency.

## 1. Themes

Extract dashboard styling into a standalone entity.

**New `themes` table:**
- `id`, `name`, `standardVariables` (JSON), `globalStyles` (JSON), `createdAt`, `updatedAt`

**Dashboard changes:**
- Remove `standardVariables` and `globalStyles` columns
- Add `themeId` (FK to themes, nullable)
- Dashboard editor gets a theme selector dropdown
- No theme = CSS vars fall back to defaults

**Copy:** `POST /api/themes/:id/copy` duplicates with name "Copy of {name}"

**Migration:** Existing dashboard standardVariables/globalStyles auto-migrated into per-dashboard themes, then linked via `themeId`.

## 2. Region-Level Theme Chrome

Move base styling (bg, border, radius, padding) out of components and into region-level application.

**Region interface changes:**
- Remove `label` field
- Add `applyChromeTo: "components" | "region"` (default: `"components"`)

**Layout editor:** Remove label input, add toggle per region for chrome application target.

**Display rendering:**
- `applyChromeTo === "components"`: theme chrome CSS applied to each ComponentRenderer wrapper
- `applyChromeTo === "region"`: theme chrome CSS applied to the region container, components get none

**Prebuilt component cleanup:** Strip `:host { background, border, border-radius, padding, font-family, font-size }` from all prebuilt styles. Components retain only internal layout/content styles. Theme chrome applied externally by renderer.

## 3. Asset Virtual Folders

**Schema:** Add `folder` column to `assets` (text, nullable, default null = root).

**API:**
- `GET /api/assets` — optional `?folder=` filter
- `GET /api/assets/folders` — distinct folder list
- `POST /api/assets/upload` — optional `folder` field
- `PUT /api/assets/:id` — allow changing folder

**UI:** Folder tree/breadcrumb navigation, create folders, move assets, upload targets current folder.

**No changes to:** disk storage (flat), serving URLs (`/assets/{fileName}`), asset references.

## 4. Popup Simplification

**Remove:** `popups` table, CRUD routes, popup list/editor UI.

**Keep:** Single trigger endpoint `POST /api/popups/trigger` with Zod-validated body:
```typescript
{ type: "text" | "image" | "video", body?: string, mediaUrl?: string, timeout: number, targetDashboardIds: number[] }
```

Broadcasts via WebSocket immediately, nothing persisted.

**Admin UI:** Simple "Send Popup" form replacing the popup manager.

**Display:** No changes (PopupOverlay handles the WS message identically).

## 5. Cascade Reloads

New reload triggers beyond dashboard save:

- **Component save** (`PUT /api/components/:id`) — query component_instances -> dashboard_layouts for affected dashboard IDs
- **Layout save** (`PUT /api/layouts/:id`) — query dashboard_layouts for affected dashboard IDs
- **Theme save** (`PUT /api/themes/:id`) — query dashboards where themeId matches

Shared helper: `broadcastReloadForDashboards(dashboardIds: number[])`.

## 6. Delete Protection & Usage Counts

**Delete protection (409 if in use):**
- `DELETE /api/components/:id` — blocked if component_instances exist
- `DELETE /api/layouts/:id` — blocked if dashboard_layouts exist
- `DELETE /api/themes/:id` — blocked if dashboards reference it

**Usage counts on list endpoints (computed, not stored):**
- Components: count of component_instances
- Layouts: count of dashboard_layouts
- Themes: count of dashboards

## 7. Image Slideshow Removal

Remove from prebuilt seed list in `prebuilt/index.ts`. Existing instances left untouched.
