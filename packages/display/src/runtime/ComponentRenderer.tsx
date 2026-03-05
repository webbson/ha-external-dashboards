import { useMemo } from "react";
import { renderTemplate, type EntityState, type TemplateContext } from "../template/engine.js";

interface ComponentRendererProps {
  template: string;
  styles: string;
  entities: Record<string, EntityState>;
  parameterValues: Record<string, string | number | boolean>;
  globalStyles: Record<string, string>;
  instanceId: number;
}

export function ComponentRenderer({
  template,
  styles,
  entities,
  parameterValues,
  globalStyles,
  instanceId,
}: ComponentRendererProps) {
  const html = useMemo(() => {
    if (!template) return "";
    const ctx: TemplateContext = { entities, params: parameterValues, globalStyles };
    try {
      return renderTemplate(template, ctx);
    } catch (err) {
      return `<div style="color:red">Render error: ${(err as Error).message}</div>`;
    }
  }, [template, entities, parameterValues, globalStyles]);

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
        data-instance={instanceId}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
