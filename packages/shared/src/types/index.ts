export type AccessMode = "public" | "password" | "header";
export type LayoutSwitchMode = "tabs" | "auto-rotate";
export type VisibilityOperator = "eq" | "neq" | "gt" | "lt" | "gte" | "lte";

export interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: VisibilityOperator;
  value: string;
}

export interface ParameterDef {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "color" | "select";
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
}

export interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}

export interface LayoutRegion {
  id: string;
  label: string;
}

export interface LayoutStructure {
  gridTemplate: string;
  regions: LayoutRegion[];
}

export interface ContainerConfig {
  type: "tabs" | "auto-rotate" | "stack";
  rotateInterval?: number;
}

export interface PopupContent {
  type: "text" | "image" | "video";
  body?: string;
  mediaUrl?: string;
}

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

export interface StandardVariables {
  componentBg: string;
  fontColor: string;
  fontColorSecondary: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  borderStyle: string;
  borderRadius: string;
  componentPadding: string;
  componentGap: string;
  backgroundType: "color" | "image";
  backgroundColor: string;
  backgroundImage: string;
}

export const STANDARD_VARIABLE_DEFAULTS: StandardVariables = {
  componentBg: "transparent",
  fontColor: "#ffffff",
  fontColorSecondary: "#aaaaaa",
  accentColor: "#1890ff",
  fontFamily: "inherit",
  fontSize: "16px",
  borderStyle: "none",
  borderRadius: "0px",
  componentPadding: "0px",
  componentGap: "0px",
  backgroundType: "color",
  backgroundColor: "#000000",
  backgroundImage: "",
};

export const STANDARD_VARIABLE_CSS_MAP: Record<
  Exclude<keyof StandardVariables, "backgroundType" | "backgroundImage">,
  string
> = {
  componentBg: "--db-component-bg",
  fontColor: "--db-font-color",
  fontColorSecondary: "--db-font-color-secondary",
  accentColor: "--db-accent-color",
  fontFamily: "--db-font-family",
  fontSize: "--db-font-size",
  borderStyle: "--db-border-style",
  borderRadius: "--db-border-radius",
  componentPadding: "--db-component-padding",
  componentGap: "--db-component-gap",
  backgroundColor: "--db-background-color",
};
