# Troubleshooting

**The display shows nothing / "cannot connect".**
Check *Diagnostics*: is the HA WebSocket connected? If not, the add-on can't fetch state. If it is, open *Diagnostics → Known display clients* and confirm the tablet appears — if it's there but offline, the tablet reached the add-on at least once; if it's missing, you likely have a network/port issue reaching port 8099 from the tablet.

**The URL in the *Open* button is blank / disabled.**
`EXTERNAL_BASE_URL` is not set and couldn't be auto-detected. Set the `external_base_url` option in the add-on's configuration (for example `http://192.168.1.100:8099`) and restart the add-on.

**Entities aren't updating on the display.**
Every dashboard only subscribes to entities it actually needs — bound in a component, referenced in a visibility rule, or the blackout entity. If an entity is missing, confirm it is bound somewhere on the dashboard (check the *Entities* column on the dashboard list for the total count). For glob bindings, open the component instance config and verify the pattern matches — the server re-expands the pattern on every state change.

**Template edits don't appear on the display.**
Saving a component should trigger an auto-reload. If it doesn't, force-reload the tablet's browser. Remember that `<script>` blocks re-run on every entity update unless you mark an element with `data-script-once` — a script that tracks timers or subscriptions without that attribute can behave unexpectedly.

**"Cannot delete, in use" errors.**
Themes, layouts, and components can't be deleted while referenced anywhere. The error response includes a usage count. Remove references (or delete the referencing dashboard) first. This is by design to prevent orphaned dashboards.

**Password-protected dashboard keeps asking for the password.**
The login sets a 24-hour cookie. If the browser blocks cookies or the displayed page is inside a sandboxed iframe with `SameSite` restrictions, the cookie won't persist. Use header auth instead for that case, or open the dashboard in a top-level browser tab.

**Popup didn't appear.**
Check the rate limit (10/sec). Check that the `targetDashboardIds` list (if any) matches a dashboard that currently has a display connected. If you're sending video, verify the asset's mime type and that the browser supports it.
