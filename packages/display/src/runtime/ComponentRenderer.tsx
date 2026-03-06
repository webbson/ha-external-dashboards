import { memo, useEffect, useMemo, useRef } from "react";
import { renderTemplate, type EntityState, type TemplateContext } from "../template/engine.js";

interface ComponentRendererProps {
  template: string;
  styles: string;
  entities: Record<string, EntityState>;
  parameterValues: Record<string, string | number | boolean>;
  globalStyles: Record<string, string>;
  instanceId: number;
  fillRegion?: boolean;
  applyChrome?: boolean;
}

export const ComponentRenderer = memo(function ComponentRenderer({
  template,
  styles,
  entities,
  parameterValues,
  globalStyles,
  instanceId,
  fillRegion,
  applyChrome,
}: ComponentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    if (!template) return "";
    const ctx: TemplateContext = { entities, params: parameterValues, globalStyles };
    try {
      return renderTemplate(template, ctx);
    } catch (err) {
      return `<div style="color:red">Render error: ${(err as Error).message}</div>`;
    }
  }, [template, entities, parameterValues, globalStyles]);

  // Execute <script> tags after innerHTML is set (innerHTML doesn't run scripts)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      newScript.textContent = `(function(comp){${oldScript.textContent}})(document.querySelector('[data-instance="${instanceId}"]'));`;
      oldScript.replaceWith(newScript);
    });
  }, [html]);

  return (
    <>
      {styles && (
        <style
          dangerouslySetInnerHTML={{
            __html: styles.replaceAll(":host", `[data-instance="${instanceId}"]`),
          }}
        />
      )}
      <div
        ref={containerRef}
        data-instance={instanceId}
        style={{
          ...(fillRegion ? { flex: 1, minHeight: 0 } : {}),
          ...(applyChrome !== false ? {
            background: "var(--db-component-bg, transparent)",
            border: "var(--db-border-style, none)",
            borderRadius: "var(--db-border-radius, 0px)",
            padding: "var(--db-component-padding, 0px)",
            fontFamily: "var(--db-font-family, inherit)",
            fontSize: "var(--db-font-size, 16px)",
          } : {}),
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
});
