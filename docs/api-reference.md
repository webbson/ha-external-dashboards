# API Reference

## Admin API (Ingress Port 8080)

All admin endpoints require HA ingress authentication (handled by Supervisor).

### Dashboards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboards` | List all dashboards |
| `GET` | `/api/dashboards/:id` | Get dashboard with its layouts |
| `POST` | `/api/dashboards` | Create dashboard |
| `PUT` | `/api/dashboards/:id` | Update dashboard (triggers display reload) |
| `DELETE` | `/api/dashboards/:id` | Delete dashboard |
| `POST` | `/api/dashboards/:id/regenerate-key` | Generate new WebSocket access key |
| `PUT` | `/api/dashboards/:id/layouts` | Set dashboard layouts (array of `{layoutId, sortOrder, label}`) |

#### Create/Update Dashboard Body

```json
{
  "name": "Living Room",
  "slug": "living-room",
  "accessMode": "public",
  "password": "optional-for-password-mode",
  "headerName": "optional-for-header-mode",
  "headerValue": "optional-for-header-mode",
  "interactiveMode": false,
  "globalStyles": { "text-color": "#fff", "card-bg": "rgba(255,255,255,0.05)" },
  "layoutSwitchMode": "tabs",
  "layoutRotateInterval": 30
}
```

### Layouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/layouts` | List all layouts |
| `GET` | `/api/layouts/:id` | Get layout |
| `POST` | `/api/layouts` | Create layout |
| `PUT` | `/api/layouts/:id` | Update layout |
| `DELETE` | `/api/layouts/:id` | Delete layout |

#### Layout Body

```json
{
  "name": "Two Column",
  "structure": {
    "gridTemplate": "\"header header\" auto \"left right\" 1fr / 1fr 1fr",
    "regions": [
      { "id": "header", "label": "Header", "gridArea": "header" },
      { "id": "left", "label": "Left", "gridArea": "left" },
      { "id": "right", "label": "Right", "gridArea": "right" }
    ]
  }
}
```

### Components

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/components` | List all components |
| `GET` | `/api/components/:id` | Get component |
| `POST` | `/api/components` | Create component |
| `PUT` | `/api/components/:id` | Update component |
| `DELETE` | `/api/components/:id` | Delete component |

#### Component Body

```json
{
  "name": "Temperature Card",
  "template": "<div>{{state (param \"entity\")}}°C</div>",
  "styles": "div { font-size: 2em; }",
  "parameterDefs": [
    { "name": "label", "label": "Label", "type": "string", "default": "Temp" }
  ],
  "entitySelectorDefs": [
    { "name": "entity", "label": "Sensor", "mode": "single" }
  ],
  "isContainer": false,
  "containerConfig": null
}
```

### Component Instances

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard-layouts/:dlId/instances` | List instances for a dashboard layout |
| `POST` | `/api/dashboard-layouts/:dlId/instances` | Add instance to dashboard layout |
| `PUT` | `/api/instances/:id` | Update instance |
| `DELETE` | `/api/instances/:id` | Delete instance |

#### Instance Body

```json
{
  "componentId": 1,
  "regionId": "header",
  "sortOrder": 0,
  "parameterValues": { "label": "Living Room" },
  "entityBindings": { "entity": "sensor.temperature" },
  "visibilityRules": [
    { "entityId": "binary_sensor.home", "operator": "eq", "value": "on" }
  ],
  "parentInstanceId": null
}
```

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assets` | List all assets |
| `GET` | `/api/assets/:id` | Get asset metadata |
| `GET` | `/api/assets/:id/file` | Serve asset file (for admin preview) |
| `POST` | `/api/assets/upload` | Upload asset (multipart/form-data) |
| `DELETE` | `/api/assets/:id` | Delete asset and file |

### Popups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/popups` | List all popups |
| `GET` | `/api/popups/:id` | Get popup |
| `POST` | `/api/popups` | Create popup |
| `PUT` | `/api/popups/:id` | Update popup |
| `DELETE` | `/api/popups/:id` | Delete popup |

### Home Assistant Proxy

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ha/entities` | List all HA entities (id, state, attributes) |
| `GET` | `/api/ha/entities/:entityId` | Get single entity state |
| `GET` | `/api/ha/status` | HA WebSocket connection status |

### Preview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/preview/render` | Render a component template with entity data |

---

## External API (Port 8099)

### Display Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/display/:slug` | Full dashboard config (layouts, instances, components) |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/d/:slug/login` | Login with password, returns JWT |

### Popup Trigger

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/trigger/popup` | Trigger a popup on displays |

#### Trigger Body

```json
{
  "popupId": 1
}
```

Or inline content:

```json
{
  "content": { "type": "text", "body": "Doorbell rang!" },
  "timeout": 15,
  "targetDashboardIds": [1, 2]
}
```

### Static Files

| Path | Description |
|------|-------------|
| `/d/:slug` | Dashboard display app |
| `/assets/:fileName` | Uploaded asset files |

### WebSocket

Connect to `ws://<host>:8099/ws?slug=<slug>&accessKey=<key>`

#### Server → Client Messages

```json
{ "type": "state_changed", "entity_id": "sensor.temp", "state": { ... } }
{ "type": "reload" }
{ "type": "popup", "content": { "type": "text", "body": "Hello" }, "timeout": 10 }
{ "type": "error", "message": "Rate limited" }
```

#### Client → Server Messages

```json
{ "type": "call_service", "domain": "light", "service": "toggle", "data": { "entity_id": "light.bedroom" } }
```

Requires interactive mode enabled. Rate-limited to 10 requests/second. Only entities subscribed by the dashboard are allowed.
