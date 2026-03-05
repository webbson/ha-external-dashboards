import Handlebars from "handlebars";

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface TemplateContext {
  entities: Record<string, EntityState>;
  params: Record<string, string | number | boolean>;
  globalStyles: Record<string, string>;
}

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

Handlebars.registerHelper("iconFor", (domain: string) => {
  const icons: Record<string, string> = {
    light: "mdi-lightbulb", switch: "mdi-toggle-switch", sensor: "mdi-eye",
    binary_sensor: "mdi-checkbox-blank-circle", climate: "mdi-thermostat",
    media_player: "mdi-play-circle", camera: "mdi-video",
    cover: "mdi-window-shutter", fan: "mdi-fan", lock: "mdi-lock",
    vacuum: "mdi-robot-vacuum", weather: "mdi-weather-partly-cloudy",
  };
  return icons[domain] ?? "mdi-help-circle";
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

Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));
Handlebars.registerHelper("lt", (a: unknown, b: unknown) => Number(a) < Number(b));
