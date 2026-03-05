# Getting Started

## Installation

### HACS (Recommended)

1. Add this repository as a custom repository in HACS
2. Install "External Dashboards"
3. Restart Home Assistant
4. The add-on appears in the sidebar as **External Dashboards**

### Manual

1. Copy the repository into `/addons/external_dashboards/`
2. Go to **Settings → Add-ons → Local add-ons**
3. Install and start "External Dashboards"

## Configuration

The add-on runs on two ports:

| Port | Purpose | Access |
|------|---------|--------|
| 8080 (ingress) | Management interface | HA sidebar only |
| 8099 (external) | Dashboard display | Any device on the network |

Port 8099 is exposed by default. Dashboards are accessed at:

```
http://<your-ha-ip>:8099/d/<dashboard-slug>
```

## Quick Start

### 1. Create a Component

Go to **Components → New Component** and create your first component:

- **Name:** Temperature Display
- Switch to the **Template** tab and enter:

```handlebars
<div class="temp-display">
  <div class="label">{{param "label"}}</div>
  <div class="value">{{state (param "entity")}}°C</div>
</div>
```

- Switch to the **Styles** tab:

```css
.temp-display {
  text-align: center;
  padding: 20px;
}
.label {
  color: var(--text-secondary, #aaa);
  font-size: 0.9em;
}
.value {
  font-size: 2.5em;
  font-weight: 300;
  color: var(--text-color, #fff);
}
```

- In the **Visual** tab, add a parameter `label` (String, default: "Temperature") and an entity selector `entity` (Single).

### 2. Create a Layout

Go to **Layouts → New Layout**:

- **Name:** Simple Grid
- **CSS Grid Template:** `"header header" auto "left right" 1fr / 1fr 1fr`
- Add regions:
  - `header` / "Header" / grid area `header`
  - `left` / "Left Column" / grid area `left`
  - `right` / "Right Column" / grid area `right`

The preview updates live as you edit.

### 3. Create a Dashboard

Go to **Dashboards → New Dashboard**:

- **Name:** Living Room
- **Slug:** `living-room`
- **Access Mode:** Public (or Password for security)
- Save, then switch to the **Layouts** tab to assign your layout
- Switch to the **Components** tab, select the dashboard layout, and add component instances to regions

### 4. View the Dashboard

Open in any browser:

```
http://<your-ha-ip>:8099/d/living-room
```

Entity values update in real-time via WebSocket. Saving the dashboard in the admin UI automatically reloads all connected displays.

## Local Development

You can run the project locally and connect to an external Home Assistant instance for development and testing.

### Prerequisites

- Node.js 20+
- pnpm
- A running Home Assistant instance accessible on your network

### Setup

1. **Create a Long-Lived Access Token** in Home Assistant:
   - Go to your HA instance → Profile → Security → Long-Lived Access Tokens → Create Token
   - Copy the token

2. **Create your `.env` file:**

```bash
cp .env.example .env
```

3. **Edit `.env`** with your values:

```env
NODE_ENV=development
SUPERVISOR_TOKEN=<your-long-lived-access-token>
HA_WS_URL=ws://<your-ha-ip>:8123/api/websocket
```

4. **Install dependencies and build:**

```bash
pnpm install
pnpm build
```

5. **Start the dev server:**

```bash
pnpm dev
```

This starts all packages in watch mode (shared, admin, display, and server with `tsx watch`). The admin UI is at `http://localhost:8080` and the display at `http://localhost:8099/d/<slug>`.

### What `NODE_ENV=development` changes

- Skips HA ingress authentication on the admin server (no `X-Ingress-Path` header required)
- Serves admin and display SPAs from their local `dist/` directories instead of the bundled production path

## Kiosk Mode (Tablets/TVs)

For wall-mounted displays, open the dashboard URL in Chromium kiosk mode:

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  http://<your-ha-ip>:8099/d/living-room
```

The display app is designed to be lightweight and works on Raspberry Pi 3B+.
