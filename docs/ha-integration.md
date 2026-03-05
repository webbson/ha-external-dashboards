# Home Assistant Integration

## Popup Notifications from Automations

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

### Usage in Automations

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

### Targeting Specific Dashboards

By default, popups appear on all connected displays. To target specific dashboards, configure `targetDashboardIds` in the popup editor or pass them in the REST call:

```yaml
rest_command:
  kitchen_popup:
    url: "http://localhost:8099/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content": {"type": "text", "body": "{{ message }}"}, "timeout": 10, "targetDashboardIds": [1]}'
```

## Dashboard Access Modes

### Public

No authentication required. Suitable for local network displays.

### Password Protected

Displays show a password prompt. After login, a JWT cookie is stored for 30 days.

### Header Authentication

Requires a specific HTTP header and value. Useful for reverse proxy setups:

```nginx
location /d/secure-dashboard/ {
    proxy_pass http://localhost:8099;
    proxy_set_header X-Dashboard-Auth my-secret-value;
}
```

Configure the header name and value in the dashboard settings.

## Interactive Mode

When enabled, the display app can send `call_service` commands to Home Assistant through the WebSocket proxy.

**Security considerations:**
- Only entities used in the dashboard can be controlled
- Rate limited to 10 commands per second per connection
- A warning is shown in the admin if a public dashboard has interactive mode enabled
- The access key provides WebSocket authentication

## Kiosk Deployment

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

### Android Tablet

Use Fully Kiosk Browser or WallPanel and set the URL to:
```
http://<ha-ip>:8099/d/<slug>
```

### Fire TV / Stick

Use the Silk Browser or sideload Fully Kiosk Browser.

## Backup

The add-on stores data in:
- `/config/external_dashboards.db` — SQLite database (included in HA backups)
- `/config/assets/` — Uploaded files (included in HA backups)

Both paths are within the `/config` directory mapped by the add-on, so standard HA backups capture everything.
