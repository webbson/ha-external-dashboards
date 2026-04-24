# Backup and restore

At the bottom of the sidebar, above the dark mode toggle, there is a **Backup / Restore** pair of buttons.

- **Backup** — downloads a JSON file containing your themes, layouts, components, dashboards and dashboard-layout links. Assets (files on disk) are not included — back those up separately if they matter.
- **Restore** — upload a previously-downloaded backup JSON. Restore is destructive: it replaces the existing definitions. Take a fresh backup first if you're unsure.

Use this before major edits, before upgrading, and to move a setup between HA installations.

## Dark mode toggle

The small sun/moon button at the bottom of the sidebar switches the **admin panel's** theme between light and dark. It has no effect on what your external dashboards render — that is controlled entirely by the *dashboard's* assigned Theme. The preference is stored in the browser.
