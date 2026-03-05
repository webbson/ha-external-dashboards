import Handlebars from "handlebars";

export interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface TemplateContext {
  entities: Record<string, EntityState>;
  params: Record<string, string | number | boolean>;
  globalStyles: Record<string, string>;
}

// Register custom helpers
Handlebars.registerHelper(
  "stateEquals",
  function (this: unknown, entityId: string, value: string, options: Handlebars.HelperOptions) {
    const ctx = options.data?.root as TemplateContext;
    const entity = ctx?.entities?.[entityId];
    if (entity?.state === String(value)) {
      return options.fn(this);
    }
    return options.inverse(this);
  }
);

Handlebars.registerHelper(
  "stateGt",
  function (this: unknown, entityId: string, value: number, options: Handlebars.HelperOptions) {
    const ctx = options.data?.root as TemplateContext;
    const entity = ctx?.entities?.[entityId];
    if (entity && parseFloat(entity.state) > value) {
      return options.fn(this);
    }
    return options.inverse(this);
  }
);

Handlebars.registerHelper(
  "stateLt",
  function (this: unknown, entityId: string, value: number, options: Handlebars.HelperOptions) {
    const ctx = options.data?.root as TemplateContext;
    const entity = ctx?.entities?.[entityId];
    if (entity && parseFloat(entity.state) < value) {
      return options.fn(this);
    }
    return options.inverse(this);
  }
);

Handlebars.registerHelper("formatNumber", function (value: unknown, decimals: unknown) {
  const num = parseFloat(String(value));
  const dec = typeof decimals === "number" ? decimals : 1;
  if (isNaN(num)) return String(value);
  return num.toFixed(dec);
});

Handlebars.registerHelper("relativeTime", function (isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
});

Handlebars.registerHelper("iconFor", function (domain: string) {
  const icons: Record<string, string> = {
    light: "mdi-lightbulb",
    switch: "mdi-toggle-switch",
    sensor: "mdi-eye",
    binary_sensor: "mdi-checkbox-blank-circle",
    climate: "mdi-thermostat",
    media_player: "mdi-play-circle",
    camera: "mdi-video",
    cover: "mdi-window-shutter",
    fan: "mdi-fan",
    lock: "mdi-lock",
    vacuum: "mdi-robot-vacuum",
    weather: "mdi-weather-partly-cloudy",
  };
  return icons[domain] ?? "mdi-help-circle";
});

Handlebars.registerHelper("attr", function (entityId: string, attrName: string, options: Handlebars.HelperOptions) {
  const ctx = options.data?.root as TemplateContext;
  const entity = ctx?.entities?.[entityId];
  return entity?.attributes?.[attrName] ?? "";
});

Handlebars.registerHelper("state", function (entityId: string, options: Handlebars.HelperOptions) {
  const ctx = options.data?.root as TemplateContext;
  return ctx?.entities?.[entityId]?.state ?? "unavailable";
});

Handlebars.registerHelper("param", function (paramName: string, options: Handlebars.HelperOptions) {
  const ctx = options.data?.root as TemplateContext;
  return ctx?.params?.[paramName] ?? "";
});

Handlebars.registerHelper("style", function (styleName: string, options: Handlebars.HelperOptions) {
  const ctx = options.data?.root as TemplateContext;
  return ctx?.globalStyles?.[styleName] ?? "";
});

Handlebars.registerHelper("eq", function (a: unknown, b: unknown) {
  return a === b;
});

Handlebars.registerHelper("gt", function (a: unknown, b: unknown) {
  return Number(a) > Number(b);
});

Handlebars.registerHelper("lt", function (a: unknown, b: unknown) {
  return Number(a) < Number(b);
});

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

export function renderTemplate(
  templateStr: string,
  context: TemplateContext
): string {
  let compiled = templateCache.get(templateStr);
  if (!compiled) {
    compiled = Handlebars.compile(templateStr);
    templateCache.set(templateStr, compiled);
  }
  return compiled(context);
}

export function clearTemplateCache() {
  templateCache.clear();
}
