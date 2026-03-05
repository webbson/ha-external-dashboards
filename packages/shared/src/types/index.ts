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
