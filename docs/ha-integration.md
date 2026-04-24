# Home Assistant Integration

This page covers how to call External Dashboards from HA automations and how to deploy dashboards to kiosk / browser-mode devices. For dashboard access modes and interactive mode, see [user-guide/dashboards.md](user-guide/dashboards.md).

## Popup notifications from automations

External Dashboards exposes a REST endpoint for triggering popups. This integrates with HA's `rest_command` platform.

### Setup

Add to your `configuration.yaml`:

```yaml
rest_command:
  # Trigger a pre-configured popup by ID
  dashboard_popup:
    url: "http://localhost:8099/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"popupId": {{ popup_id }}}'

  # Send an ad-hoc text popup
  dashboard_message:
    url: "http://localhost:8099/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content": {"type": "text", "body": "{{ message }}"}, "timeout": {{ timeout | default(10) }}}'
```

### Usage in automations

```yaml
automation:
  - alias: "Doorbell notification on dashboards"
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: "on"
    action:
      - action: rest_command.dashboard_message
        data:
          message: "Someone is at the door!"
          timeout: 30

  - alias: "Show camera on doorbell"
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: "on"
    action:
      - action: rest_command.dashboard_popup
        data:
          popup_id: 3
```

### Targeting specific dashboards

By default, popups appear on all connected displays. To target specific dashboards, pass `targetDashboardIds` in the REST call:

```yaml
rest_command:
  kitchen_popup:
    url: "http://localhost:8099/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content": {"type": "text", "body": "{{ message }}"}, "timeout": 10, "targetDashboardIds": [1]}'
```

See [user-guide/popups.md](user-guide/popups.md) for the admin-side equivalent.

## Switch layout from automations

You can remotely switch a dashboard to a specific layout tab (e.g. flash a doorbell view on motion, then auto-return):

```yaml
rest_command:
  dashboard_switch_layout:
    url: "http://localhost:8099/api/trigger/switch-layout"
    method: POST
    content_type: "application/json"
    payload: >
      {
        "dashboardSlug": "{{ slug }}",
        "layoutLabel": "{{ label }}",
        "autoReturn": true,
        "autoReturnDelay": 15
      }

automation:
  - alias: "Flash doorbell tab on motion"
    trigger:
      - platform: state
        entity_id: binary_sensor.front_door_motion
        to: "on"
    action:
      - action: rest_command.dashboard_switch_layout
        data:
          slug: kitchen
          label: Doorbell
```

For the full list of tabs configurable on a dashboard (labels, hide-in-tab-bar, auto-return, visibility rules), see [user-guide/dashboards.md](user-guide/dashboards.md#editor--content-tab).

## Kiosk deployment

### Raspberry Pi + Chromium

```bash
# /etc/xdg/lxsession/LXDE-pi/autostart
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --disable-component-update --check-for-update-interval=31536000 \
  http://<ha-ip>:8099/d/<slug>
```

Flags worth knowing:

- `--kiosk` — fullscreen, no chrome.
- `--noerrdialogs --disable-infobars` — suppress the "Chrome didn't shut down cleanly" bubble and the info bar.
- `--disable-component-update` + `--check-for-update-interval=31536000` — stop background component updates that can wake the tab.

### Android tablet

Use Fully Kiosk Browser or WallPanel and set the URL to:

```
http://<ha-ip>:8099/d/<slug>
```

Useful options in Fully Kiosk:

- Enable **Keep Screen On** and **Fullscreen Mode**.
- Set **Start URL** to the dashboard URL so it loads on boot.
- Enable **Auto Reload on Network Disconnection** to recover after Wi-Fi hiccups.

### Fire TV / Stick

Use the Silk Browser or sideload Fully Kiosk Browser.

### Rotating display / auto-login

- On a rotated (portrait) wall display, set the screen rotation in the OS (e.g. `xrandr --output HDMI-1 --rotate left` on a Pi) rather than rotating inside the browser, so touch coordinates stay correct.
- For auto-login on boot, configure the OS to auto-login the user and launch the browser in the session startup scripts. The snippet above shows the LXDE pattern; systemd user services and `.desktop` autostart entries are alternatives.

## Backup

The add-on stores data in:

- `/config/external_dashboards.db` — SQLite database (included in HA backups)
- `/config/assets/` — Uploaded files (included in HA backups)

Both paths are within the `/config` directory mapped by the add-on, so standard HA backups capture everything. The admin panel also has in-app [Backup and restore](user-guide/backup-restore.md) for a definition-only JSON export.
