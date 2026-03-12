import Handlebars from "handlebars";
import * as mdiIcons from "@mdi/js";
import { isGlobPattern } from "@ha-external-dashboards/shared";
import { marked } from "marked";

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface TemplateContext {
  entities: Record<string, EntityState>;
  params: Record<string, string | number | boolean>;
  globalStyles: Record<string, string>;
  globExpansions?: Record<string, string[]>;
}

function mdiNameToPath(name: string): string | undefined {
  if (!name || typeof name !== "string") return undefined;
  // Normalize: strip "mdi:" or "mdi-" prefix
  const stripped = name.replace(/^mdi[:\-]/, "");
  const camelKey =
    "mdi" +
    stripped
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  return (mdiIcons as Record<string, string>)[camelKey];
}

Handlebars.registerHelper("mdiIcon", function (...args: unknown[]) {
  const options = args[args.length - 1] as Handlebars.HelperOptions;
  const name = args[0] as string;
  const size = options.hash?.size ?? 24;
  const color = options.hash?.color ?? "currentColor";
  const svgClass = options.hash?.class ?? "";

  const path = mdiNameToPath(name);
  if (!path) return new Handlebars.SafeString(`<!-- unknown icon: ${Handlebars.Utils.escapeExpression(String(name ?? ""))} -->`);

  const classAttr = svgClass ? ` class="${Handlebars.Utils.escapeExpression(svgClass)}"` : "";
  return new Handlebars.SafeString(
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="fill: ${Handlebars.Utils.escapeExpression(color)}; vertical-align: middle"${classAttr}><path d="${path}"/></svg>`
  );
});

Handlebars.registerHelper(
  "stateEquals",
  function (this: unknown, entityId: string, value: string, options: Handlebars.HelperOptions) {
    const ctx = options.data?.root as TemplateContext;
    const entity = ctx?.entities?.[entityId];
    if (entity?.state === String(value)) return options.fn(this);
    return options.inverse(this);
  }
);

Handlebars.registerHelper(
  "stateGt",
  function (this: unknown, entityId: string, value: number, options: Handlebars.HelperOptions) {
    const ctx = options.data?.root as TemplateContext;
    const entity = ctx?.entities?.[entityId];
    if (entity && parseFloat(entity.state) > value) return options.fn(this);
    return options.inverse(this);
  }
);

Handlebars.registerHelper(
  "stateLt",
  function (this: unknown, entityId: string, value: number, options: Handlebars.HelperOptions) {
    const ctx = options.data?.root as TemplateContext;
    const entity = ctx?.entities?.[entityId];
    if (entity && parseFloat(entity.state) < value) return options.fn(this);
    return options.inverse(this);
  }
);

Handlebars.registerHelper("formatNumber", (value: unknown, decimals: unknown) => {
  const num = parseFloat(String(value));
  const dec = typeof decimals === "number" ? decimals : 1;
  return isNaN(num) ? String(value) : num.toFixed(dec);
});

Handlebars.registerHelper("relativeTime", (isoString: string) => {
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
});

const DOMAIN_ICONS: Record<string, string> = {
  light: "mdi-lightbulb", switch: "mdi-toggle-switch", sensor: "mdi-eye",
  binary_sensor: "mdi-checkbox-blank-circle", climate: "mdi-thermostat",
  media_player: "mdi-play-circle", camera: "mdi-video",
  cover: "mdi-window-shutter", fan: "mdi-fan", lock: "mdi-lock",
  vacuum: "mdi-robot-vacuum", weather: "mdi-weather-partly-cloudy",
};

Handlebars.registerHelper("iconFor", (domain: string) => {
  return DOMAIN_ICONS[domain] ?? "mdi-help-circle";
});

Handlebars.registerHelper("iconForEntity", (entityId: string, options: Handlebars.HelperOptions) => {
  const ctx = options.data?.root as TemplateContext;
  const entity = ctx?.entities?.[entityId];
  const entityIcon = entity?.attributes?.icon as string | undefined;
  if (entityIcon) return entityIcon;
  const domain = entityId.split(".")[0];
  return DOMAIN_ICONS[domain] ?? "mdi-help-circle";
});

Handlebars.registerHelper("attr", (entityId: string, attrName: string, options: Handlebars.HelperOptions) => {
  const ctx = options.data?.root as TemplateContext;
  return ctx?.entities?.[entityId]?.attributes?.[attrName] ?? "";
});

Handlebars.registerHelper("state", (entityId: string, options: Handlebars.HelperOptions) => {
  const ctx = options.data?.root as TemplateContext;
  return ctx?.entities?.[entityId]?.state ?? "unavailable";
});

Handlebars.registerHelper("param", (paramName: string, options: Handlebars.HelperOptions) => {
  const ctx = options.data?.root as TemplateContext;
  return ctx?.params?.[paramName] ?? "";
});

Handlebars.registerHelper("style", (styleName: string, options: Handlebars.HelperOptions) => {
  const ctx = options.data?.root as TemplateContext;
  return ctx?.globalStyles?.[styleName] ?? "";
});

Handlebars.registerHelper("deriveEntity", (entityId: string, newDomain: string, suffix?: string) => {
  if (typeof entityId !== "string") return "";
  const dotIdx = entityId.indexOf(".");
  if (dotIdx < 0) return entityId;
  const baseName = entityId.substring(dotIdx + 1);
  return `${newDomain}.${baseName}${typeof suffix === "string" ? suffix : ""}`;
});

Handlebars.registerHelper("markdownToHtml", (content: unknown, options: Handlebars.HelperOptions) => {
  if (!content) return "";
  try {
    // Evaluate the content string as a Handlebars template so {{state}}/{{attr}} etc. work
    let evaluated = String(content);
    try {
      const compiled = Handlebars.compile(evaluated);
      evaluated = compiled(options.data?.root);
    } catch {
      // leave as-is if content has invalid Handlebars
    }
    const result = marked.parse(evaluated);
    if (typeof result === "string") return new Handlebars.SafeString(result);
    return evaluated;
  } catch {
    return String(content);
  }
});

Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));
Handlebars.registerHelper("lt", (a: unknown, b: unknown) => Number(a) < Number(b));

Handlebars.registerHelper("eachEntity", function (this: unknown, selectorName: string, options: Handlebars.HelperOptions) {
  const ctx = options.data?.root as TemplateContext;
  const binding = ctx?.params?.[selectorName];
  if (!binding) return "";

  // Resolve entity IDs — expand glob patterns via server-provided expansions
  let entityIds: string[];
  if (typeof binding === "string" && isGlobPattern(binding)) {
    entityIds = ctx?.globExpansions?.[binding] ?? [];
  } else {
    entityIds = Array.isArray(binding) ? binding.map(String) : [String(binding)];
  }

  // Hash param filters for render-time filtering
  const filterDomain = options.hash?.domain as string | undefined;
  const filterState = options.hash?.state as string | undefined;
  const filterStateNot = options.hash?.stateNot as string | undefined;
  const filterAttr = options.hash?.attr as string | undefined;
  const filterAttrValue = options.hash?.attrValue as string | undefined;
  const sortBy = options.hash?.sortBy as string | undefined;
  const sortDir = (options.hash?.sortDir as string) ?? "asc";

  // Build filtered list
  const items: { entityId: string; entity: EntityState | undefined; domain: string }[] = [];
  for (const entityId of entityIds) {
    const entity = ctx?.entities?.[entityId];
    const domain = entityId.split(".")[0];

    if (filterDomain && domain !== filterDomain) continue;
    if (filterState && entity?.state !== filterState) continue;
    if (filterStateNot && entity?.state === filterStateNot) continue;
    if (filterAttr && filterAttrValue !== undefined) {
      if (String(entity?.attributes?.[filterAttr] ?? "") !== filterAttrValue) continue;
    }

    items.push({ entityId, entity, domain });
  }

  // Sort if requested
  if (sortBy) {
    items.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      if (sortBy === "state") {
        aVal = a.entity?.state ?? "";
        bVal = b.entity?.state ?? "";
      } else if (sortBy === "entity_id") {
        aVal = a.entityId;
        bVal = b.entityId;
      } else {
        aVal = String(a.entity?.attributes?.[sortBy] ?? "");
        bVal = String(b.entity?.attributes?.[sortBy] ?? "");
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }

  let result = "";
  for (let i = 0; i < items.length; i++) {
    const { entityId, entity, domain } = items[i];
    const data = {
      entity_id: entityId,
      state: entity?.state ?? "unavailable",
      attributes: entity?.attributes ?? {},
      domain,
      last_changed: (entity as unknown as Record<string, unknown>)?.last_changed ?? "",
      last_updated: (entity as unknown as Record<string, unknown>)?.last_updated ?? "",
    };
    result += options.fn(data, {
      data: { ...options.data, index: i, first: i === 0, last: i === items.length - 1 },
    });
  }

  return result;
});
