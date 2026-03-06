import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Spin } from "antd";
import { api } from "../../api.js";

interface LivePreviewProps {
  template: string;
  styles: string;
  entityBindings: Record<string, string | string[]>;
  parameterValues: Record<string, string | number | boolean>;
  globalStyles?: Record<string, string>;
  standardVariables?: Record<string, string>;
}

export function LivePreview({
  template,
  styles,
  entityBindings,
  parameterValues,
  globalStyles = {},
  standardVariables = {},
}: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);

  const bgColor = standardVariables.backgroundColor || "#000000";
  const bgType = standardVariables.backgroundType || "color";
  const bgImage = standardVariables.backgroundImage || "";

  const render = useCallback(() => {
    if (!template) return;
    setLoading(true);
    api
      .post<{ html: string; styles: string }>("/api/preview/render", {
        template,
        styles,
        entityBindings,
        parameterValues,
        globalStyles,
        standardVariables,
      })
      .then(({ html, styles: css }) => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        // Scope :host to the preview wrapper, same as display runtime
        const scopedCss = css.replaceAll(":host", "[data-preview]");

        const bodyBg =
          bgType === "image" && bgImage
            ? `background-image: url(/assets/${bgImage}); background-size: cover; background-position: center;`
            : `background-color: ${bgColor};`;

        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body { font-family: system-ui, sans-serif; ${bodyBg} padding: 16px; }
    [data-chrome] {
      background: var(--db-component-bg, transparent);
      border: var(--db-border-style, none);
      border-radius: var(--db-border-radius, 0px);
      padding: var(--db-component-padding, 0px);
      font-family: var(--db-font-family, inherit);
      font-size: var(--db-font-size, 16px);
      height: 100%;
    }
    [data-preview] { height: 100%; }
    ${scopedCss}
  </style>
</head>
<body><div data-chrome><div data-preview>${html.replace(/<script>/g, '<script type="text/x-component">')}</div></div>
<script>
document.querySelectorAll('script[type="text/x-component"]').forEach(function(s) {
  var comp = document.querySelector('[data-preview]');
  try { (new Function('comp', s.textContent))(comp); } catch(e) { console.error(e); }
});
</script>
</body>
</html>`);
        doc.close();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [template, styles, entityBindings, parameterValues, globalStyles, standardVariables, bgColor, bgType, bgImage]);

  // Auto-render on any dependency change, debounced
  useEffect(() => {
    const timer = setTimeout(render, 300);
    return () => clearTimeout(timer);
  }, [render]);

  return (
    <Card
      title="Live Preview"
      size="small"
      extra={loading ? <Spin size="small" /> : null}
      styles={{ body: { padding: 0, height: "100%" } }}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <iframe
        ref={iframeRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 300,
          border: "none",
          borderRadius: "0 0 8px 8px",
          background: bgColor,
          display: "block",
        }}
        sandbox="allow-same-origin allow-scripts"
        title="Component Preview"
      />
    </Card>
  );
}
