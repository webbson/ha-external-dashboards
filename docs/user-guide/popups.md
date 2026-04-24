# Popups

An admin-only page for sending a one-off popup overlay to one or more displays — text, image, or video. Ephemeral: popups are not stored. This is the same mechanism the `POST /api/trigger/popup` endpoint uses.

![Popups page](images/popups.jpg)

## Form fields

- **Content Type** — dropdown: Text / Image / Video. Changes the rest of the form:
  - *Text*: multi-line body.
  - *Image* or *Video*: pick an asset (filtered by mime type) **or** paste an external URL.
- **Timeout** — seconds before the popup auto-dismisses. Default is 10.
- **Target Dashboards** — optional multi-select. If empty, the popup is broadcast to all displays. If set, only displays showing one of the chosen dashboards receive the popup.
- **Body** — the textarea that holds the message (for Text) or the URL / asset reference (for Image / Video).

Below the form there is an expandable **Home Assistant Integration Examples** section with copy-ready snippets for calling the endpoint from HA `rest_command:` — text, image, video, and targeted variants. Example payload:

```yaml
rest_command:
  popup_text:
    url: "http://external_dashboards:8080/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content":{"type":"text","body":"{{ message }}"},"timeout":10}'
```

For the full REST payload reference (all fields, authentication, rate limits), see [../api-reference.md](../api-reference.md).

## Gotchas

- The endpoint is admin-scoped (uses HA ingress auth) and **rate-limited to 10 requests/second**. Bursting more will drop requests.
- Videos must be a format the display browser can play (typically `.mp4`/H.264).
- There is no "close all popups" control — they clear themselves when the timeout elapses.
