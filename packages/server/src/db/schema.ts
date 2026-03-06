import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const dashboards = sqliteTable("dashboards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  accessKey: text("access_key").notNull(),
  accessMode: text("access_mode", {
    enum: ["public", "password", "header"],
  })
    .notNull()
    .default("public"),
  passwordHash: text("password_hash"),
  headerName: text("header_name"),
  headerValue: text("header_value"),
  interactiveMode: integer("interactive_mode", { mode: "boolean" })
    .notNull()
    .default(false),
  themeId: integer("theme_id").references(() => themes.id),
  maxWidth: text("max_width"),
  padding: text("padding"),
  layoutSwitchMode: text("layout_switch_mode", {
    enum: ["tabs", "auto-rotate"],
  })
    .notNull()
    .default("tabs"),
  layoutRotateInterval: integer("layout_rotate_interval").default(30),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const themes = sqliteTable("themes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  standardVariables: text("standard_variables", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'`),
  globalStyles: text("global_styles", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const layouts = sqliteTable("layouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  structure: text("structure", { mode: "json" })
    .$type<{
      gridTemplate: string;
      regions: { id: string; applyChromeTo?: "components" | "region" }[];
    }>()
    .notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const dashboardLayouts = sqliteTable("dashboard_layouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dashboardId: integer("dashboard_id")
    .notNull()
    .references(() => dashboards.id, { onDelete: "cascade" }),
  layoutId: integer("layout_id")
    .notNull()
    .references(() => layouts.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  label: text("label"),
  icon: text("icon"),
});

export const components = sqliteTable("components", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  template: text("template").notNull().default(""),
  styles: text("styles").notNull().default(""),
  parameterDefs: text("parameter_defs", { mode: "json" })
    .$type<
      {
        name: string;
        label: string;
        type: string;
        default?: string | number | boolean;
        options?: { label: string; value: string }[];
      }[]
    >()
    .notNull()
    .default(sql`'[]'`),
  entitySelectorDefs: text("entity_selector_defs", { mode: "json" })
    .$type<
      { name: string; label: string; mode: string }[]
    >()
    .notNull()
    .default(sql`'[]'`),
  isContainer: integer("is_container", { mode: "boolean" })
    .notNull()
    .default(false),
  containerConfig: text("container_config", { mode: "json" })
    .$type<{
      type: "tabs" | "auto-rotate" | "stack";
      rotateInterval?: number;
    } | null>()
    .default(sql`'null'`),
  testEntityBindings: text("test_entity_bindings", { mode: "json" })
    .$type<Record<string, string | string[]> | null>()
    .default(sql`'null'`),
  isPrebuilt: integer("is_prebuilt", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const componentInstances = sqliteTable("component_instances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dashboardLayoutId: integer("dashboard_layout_id")
    .notNull()
    .references(() => dashboardLayouts.id, { onDelete: "cascade" }),
  componentId: integer("component_id")
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  regionId: text("region_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  parameterValues: text("parameter_values", { mode: "json" })
    .$type<Record<string, string | number | boolean>>()
    .notNull()
    .default(sql`'{}'`),
  entityBindings: text("entity_bindings", { mode: "json" })
    .$type<Record<string, string | string[]>>()
    .notNull()
    .default(sql`'{}'`),
  visibilityRules: text("visibility_rules", { mode: "json" })
    .$type<
      {
        entityId: string;
        attribute?: string;
        operator: string;
        value: string;
      }[]
    >()
    .notNull()
    .default(sql`'[]'`),
  parentInstanceId: integer("parent_instance_id"),
  tabLabel: text("tab_label"),
  tabIcon: text("tab_icon"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  fileName: text("file_name").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  folder: text("folder"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
