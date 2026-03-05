CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_file_name_unique` ON `assets` (`file_name`);--> statement-breakpoint
CREATE TABLE `component_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dashboard_layout_id` integer NOT NULL,
	`component_id` integer NOT NULL,
	`region_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`parameter_values` text DEFAULT '{}' NOT NULL,
	`entity_bindings` text DEFAULT '{}' NOT NULL,
	`visibility_rules` text DEFAULT '[]' NOT NULL,
	`parent_instance_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`dashboard_layout_id`) REFERENCES `dashboard_layouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `components` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`template` text DEFAULT '' NOT NULL,
	`styles` text DEFAULT '' NOT NULL,
	`parameter_defs` text DEFAULT '[]' NOT NULL,
	`entity_selector_defs` text DEFAULT '[]' NOT NULL,
	`is_container` integer DEFAULT false NOT NULL,
	`container_config` text DEFAULT 'null',
	`is_prebuilt` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dashboard_layouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dashboard_id` integer NOT NULL,
	`layout_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`label` text,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`layout_id`) REFERENCES `layouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dashboards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`access_key` text NOT NULL,
	`access_mode` text DEFAULT 'public' NOT NULL,
	`password_hash` text,
	`header_name` text,
	`header_value` text,
	`interactive_mode` integer DEFAULT false NOT NULL,
	`global_styles` text DEFAULT '{}' NOT NULL,
	`layout_switch_mode` text DEFAULT 'tabs' NOT NULL,
	`layout_rotate_interval` integer DEFAULT 30,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboards_slug_unique` ON `dashboards` (`slug`);--> statement-breakpoint
CREATE TABLE `layouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`structure` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `popups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`timeout` integer DEFAULT 10 NOT NULL,
	`target_dashboard_ids` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
