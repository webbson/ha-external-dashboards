CREATE TABLE `dashboard_entity_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dashboard_id` integer NOT NULL,
	`pattern` text NOT NULL,
	`type` text NOT NULL,
	`source` text,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_dashboard_entity_access_dashboard_id` ON `dashboard_entity_access` (`dashboard_id`);