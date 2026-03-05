# Open Dashboard from Admin List

## Summary

Add an "Open" button to the admin dashboards list that opens the external dashboard in a new browser tab. The external base URL is configured via the `EXTERNAL_BASE_URL` environment variable.

## Changes

### Server: `GET /api/settings` endpoint (ingress)

Returns `{ externalBaseUrl: string | null }`, read from `EXTERNAL_BASE_URL` env var. Returns `null` if not set.

### Admin UI: DashboardList

- Fetch `externalBaseUrl` from `/api/settings` on mount
- Add "Open" button in the actions column for each dashboard
- Button opens `{externalBaseUrl}/d/{slug}` in a new tab (`target="_blank"`)
- Button disabled with tooltip when `externalBaseUrl` is not configured

### Environment Variable

`EXTERNAL_BASE_URL` - Full base URL for the external server (e.g. `http://192.168.1.100:8099`). No trailing slash.

## Not Changed

- Database schema
- Display app
- Existing routes
