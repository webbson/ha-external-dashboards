CREATE TABLE `display_clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity` text NOT NULL,
	`mac_address` text,
	`alias` text,
	`hostname` text,
	`last_ip` text,
	`last_dashboard_id` integer,
	`last_slug` text,
	`first_seen_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_seen_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`last_dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `display_clients_identity_unique` ON `display_clients` (`identity`);