ALTER TABLE `dashboard_layouts` ADD `visibility_rules` text;--> statement-breakpoint
ALTER TABLE `dashboard_layouts` ADD `hide_in_tab_bar` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `dashboard_layouts` ADD `auto_return` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `dashboard_layouts` ADD `auto_return_delay` integer DEFAULT 10 NOT NULL;