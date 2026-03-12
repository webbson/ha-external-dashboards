import { memo, useEffect, useMemo, useRef } from "react";
import { renderTemplate, requestMissingDerivedEntities, type EntityState, type TemplateContext } from "../template/engine.js";

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
  const mountedRef = useRef(false);

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

  // Detect if template uses data-script-once (run script only on first mount)
  const scriptOnce = template.includes("data-script-once");

  const { html, derivedEntityIds } = useMemo(() => {
    if (!template) return { html: "", derivedEntityIds: [] };
    const ctx: TemplateContext = { entities, params: parameterValues, globalStyles, globExpansions: instanceGlobExpansions };
    try {
      return renderTemplate(template, ctx);
    } catch (err) {
      return { html: `<div style="color:red">Render error: ${(err as Error).message}</div>`, derivedEntityIds: [] };
    }
  }, [template, entities, parameterValues, globalStyles, instanceGlobExpansions]);

  // After render, request any derived entities missing from context
  useEffect(() => {
    if (derivedEntityIds.length === 0) return;
    // Tell the entity subset hook to include these
    if (onDerivedEntities) onDerivedEntities(derivedEntityIds);
    // Request missing ones from server via WS
    const missing = derivedEntityIds.filter((id) => !(id in entities));
    if (missing.length > 0) {
      requestMissingDerivedEntities(missing);
    }
  }, [html, derivedEntityIds, entities, onDerivedEntities]);

  // Set innerHTML and execute scripts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // For script-once components that are already mounted, skip re-execution
    if (scriptOnce && mountedRef.current) return;

    // For script-once, set innerHTML manually (React won't via dangerouslySetInnerHTML)
    if (scriptOnce) {
      container.innerHTML = html;
    }

    // Execute <script> tags (innerHTML doesn't run scripts)
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      newScript.textContent = `(function(comp){${oldScript.textContent}})(document.querySelector('[data-instance="${instanceId}"]'));`;
      oldScript.replaceWith(newScript);
    });

    if (scriptOnce) {
      mountedRef.current = true;
    }

    return () => {
      if (scriptOnce) {
        const mapCleanupFn = (container as any).__mapCleanup;
        if (typeof mapCleanupFn === "function") {
          mapCleanupFn();
        }
      }
    };
  }, [html, scriptOnce, instanceId]);

  // For script-once components: pass entity state updates to __updateMap hook
  useEffect(() => {
    if (!scriptOnce || !mountedRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const updateFn = (container as any).__updateMap;
    if (typeof updateFn === "function") {
      updateFn(entities);
    }
  }, [entities, scriptOnce]);

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
        {...(scriptOnce ? {} : { dangerouslySetInnerHTML: { __html: html } })}
      />
    </>
  );
});
