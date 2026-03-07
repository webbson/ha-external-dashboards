import { memo, useEffect, useMemo, useRef } from "react";
import { renderTemplate, getDerivedEntityIds, requestMissingDerivedEntities, type EntityState, type TemplateContext } from "../template/engine.js";

interface ComponentRendererProps {
  template: string;
  styles: string;
  entities: Record<string, EntityState>;
  parameterValues: Record<string, string | number | boolean>;
  globalStyles: Record<string, string>;
  globExpansions: Record<string, string[]>;
  instanceId: number;
  fillRegion?: boolean;
  applyChrome?: boolean;
  onDerivedEntities?: (ids: string[]) => void;
}

export const ComponentRenderer = memo(function ComponentRenderer({
  template,
  styles,
  entities,
  parameterValues,
  globalStyles,
  globExpansions,
  instanceId,
  fillRegion,
  applyChrome,
  onDerivedEntities,
}: ComponentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Remap instance-scoped expansion keys (instanceId:selectorName) back to pattern strings
  // so the Handlebars eachEntity helper can look up by pattern
  const instanceGlobExpansions = useMemo(() => {
    const prefix = `${instanceId}:`;
    const result: Record<string, string[]> = {};
    for (const [key, ids] of Object.entries(globExpansions)) {
      if (key.startsWith(prefix)) {
        const selectorName = key.slice(prefix.length);
        // Look up the pattern from parameterValues (entityBindings are merged into params)
        const pattern = parameterValues[selectorName];
        if (typeof pattern === "string") {
          result[pattern] = ids;
        }
      }
    }
    return result;
  }, [globExpansions, instanceId, parameterValues]);

  const html = useMemo(() => {
    if (!template) return "";
    const ctx: TemplateContext = { entities, params: parameterValues, globalStyles, globExpansions: instanceGlobExpansions };
    try {
      return renderTemplate(template, ctx);
    } catch (err) {
      return `<div style="color:red">Render error: ${(err as Error).message}</div>`;
    }
  }, [template, entities, parameterValues, globalStyles, instanceGlobExpansions]);

  // After render, request any derived entities missing from context
  useEffect(() => {
    const derived = getDerivedEntityIds();
    if (derived.size === 0) return;
    const ids = Array.from(derived);
    // Tell the entity subset hook to include these
    if (onDerivedEntities) onDerivedEntities(ids);
    // Request missing ones from server via WS
    requestMissingDerivedEntities(entities);
  }, [html, entities, onDerivedEntities]);

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
