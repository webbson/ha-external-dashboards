PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_dashboards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`access_key` text NOT NULL,
	`access_mode` text DEFAULT 'public' NOT NULL,
	`password_hash` text,
	`header_name` text,
	`header_value` text,
	`interactive_mode` integer DEFAULT false NOT NULL,
	`theme_id` integer,
	`max_width` text,
	`padding` text,
	`layout_switch_mode` text DEFAULT 'tabs' NOT NULL,
	`layout_rotate_interval` integer DEFAULT 30,
	`blackout_entity` text,
	`blackout_start_time` text,
	`blackout_end_time` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_dashboards`("id", "name", "slug", "access_key", "access_mode", "password_hash", "header_name", "header_value", "interactive_mode", "theme_id", "max_width", "padding", "layout_switch_mode", "layout_rotate_interval", "blackout_entity", "blackout_start_time", "blackout_end_time", "created_at", "updated_at") SELECT "id", "name", "slug", "access_key", "access_mode", "password_hash", "header_name", "header_value", "interactive_mode", "theme_id", "max_width", "padding", "layout_switch_mode", "layout_rotate_interval", "blackout_entity", "blackout_start_time", "blackout_end_time", "created_at", "updated_at" FROM `dashboards`;--> statement-breakpoint
DROP TABLE `dashboards`;--> statement-breakpoint
ALTER TABLE `__new_dashboards` RENAME TO `dashboards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `dashboards_slug_unique` ON `dashboards` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_component_instances_dashboard_layout_id` ON `component_instances` (`dashboard_layout_id`);--> statement-breakpoint
CREATE INDEX `idx_component_instances_component_id` ON `component_instances` (`component_id`);--> statement-breakpoint
CREATE INDEX `idx_dashboard_layouts_dashboard_id` ON `dashboard_layouts` (`dashboard_id`);--> statement-breakpoint
CREATE INDEX `idx_dashboard_layouts_layout_id` ON `dashboard_layouts` (`layout_id`);