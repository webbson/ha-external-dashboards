CREATE TABLE `themes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`standard_variables` text DEFAULT '{}' NOT NULL,
	`global_styles` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
DROP TABLE `popups`;--> statement-breakpoint
ALTER TABLE `assets` ADD `folder` text;--> statement-breakpoint
ALTER TABLE `dashboards` ADD `theme_id` integer REFERENCES themes(id);--> statement-breakpoint
-- Migrate existing dashboard styles to themes
INSERT INTO themes (name, standard_variables, global_styles, created_at, updated_at)
SELECT
  name || ' Theme',
  standard_variables,
  global_styles,
  datetime('now'),
  datetime('now')
FROM dashboards
WHERE standard_variables != '{}' OR global_styles != '{}';--> statement-breakpoint
-- Link dashboards to their themes
UPDATE dashboards SET theme_id = (
  SELECT t.id FROM themes t
  WHERE t.name = dashboards.name || ' Theme'
) WHERE standard_variables != '{}' OR global_styles != '{}';--> statement-breakpoint
ALTER TABLE `dashboards` DROP COLUMN `global_styles`;--> statement-breakpoint
ALTER TABLE `dashboards` DROP COLUMN `standard_variables`;