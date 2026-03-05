import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api } from "../../api.js";

interface LivePreviewProps {
  template: string;
  styles: string;
  entityBindings: Record<string, string | string[]>;
  parameterValues: Record<string, string | number | boolean>;
  globalStyles?: Record<string, string>;
}

export function LivePreview({
  template,
  styles,
  entityBindings,
  parameterValues,
  globalStyles = {},
}: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);
  // Store latest props in refs so manual refresh always uses current values
  const bindingsRef = useRef(entityBindings);
  const paramsRef = useRef(parameterValues);
  const globalStylesRef = useRef(globalStyles);
  bindingsRef.current = entityBindings;
  paramsRef.current = parameterValues;
  globalStylesRef.current = globalStyles;

  const render = useCallback(() => {
    if (!template) return;
    setLoading(true);
    api
      .post<{ html: string; styles: string }>("/api/preview/render", {
        template,
        styles,
        entityBindings: bindingsRef.current,
        parameterValues: paramsRef.current,
        globalStyles: globalStylesRef.current,
      })
      .then(({ html, styles: css }) => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 8px; background: #1a1a2e; color: #eee; }
    ${css}
  </style>
</head>
<body>${html}</body>
</html>`);
        doc.close();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [template, styles]);

  // Auto-render when template or styles change (component editing)
  useEffect(() => {
    if (!template) return;
    const timer = setTimeout(render, 300);
    return () => clearTimeout(timer);
  }, [render]);

  return (
    <Card
      title="Live Preview"
      size="small"
      style={{ marginTop: 16 }}
      extra={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <Spin size="small" />}
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={render}
          >
            Refresh
          </Button>
        </span>
      }
    >
      <iframe
        ref={iframeRef}
        style={{
          width: "100%",
          height: 300,
          border: "1px solid #333",
          borderRadius: 4,
          background: "#1a1a2e",
        }}
        sandbox="allow-same-origin allow-scripts"
        title="Component Preview"
      />
    </Card>
  );
}
