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
  type: "string" | "textarea" | "number" | "boolean" | "color" | "select" | "icon";
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
  step?: number;
}

export interface GlobAttributeFilter {
  attribute: string;
  operator: "eq" | "neq" | "contains" | "startsWith";
  value: string;
}

export interface GlobStateFilter {
  operator: "eq" | "neq" | "contains" | "startsWith";
  value: string;
}


export interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob";
  allowedDomains?: string[];
}

export interface LayoutRegion {
  id: string;
  applyChromeTo?: "components" | "region";
  flexDirection?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  flexGrow?: boolean;
}

export interface LayoutStructure {
  gridTemplate?: string; // legacy — kept for backward compat
  gridTemplates?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    tv?: string;
  };
  regions: LayoutRegion[];
}

export interface ContainerConfig {
  type: "tabs" | "auto-rotate" | "stack";
  rotateInterval?: number;
}

export interface DashboardLayout {
  id: number;
  dashboardId: number;
  layoutId: number;
  sortOrder: number;
  label: string | null;
  icon: string | null;
  visibilityRules?: VisibilityRule[];
  hideInTabBar?: boolean;
  autoReturn?: boolean;
  autoReturnDelay?: number;
}

export interface SwitchLayoutMessage {
  type: "switch_layout";
  layoutId: number;
  autoReturn?: boolean;
  autoReturnDelay?: number;
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
  tabBarBg: string;
  tabBarColor: string;
  tabBarActiveColor: string;
  tabBarActiveBg: string;
  tabBarFontSize: string;
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
  tabBarBg: "transparent",
  tabBarColor: "rgba(255,255,255,0.6)",
  tabBarActiveColor: "#ffffff",
  tabBarActiveBg: "rgba(255,255,255,0.15)",
  tabBarFontSize: "14px",
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
  tabBarBg: "--db-tab-bar-bg",
  tabBarColor: "--db-tab-bar-color",
  tabBarActiveColor: "--db-tab-bar-active-color",
  tabBarActiveBg: "--db-tab-bar-active-bg",
  tabBarFontSize: "--db-tab-bar-font-size",
};
