ALTER TABLE `issues` ADD `issue_id` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `notion_page_id` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `title` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `description` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `priority` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `assignee` text;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD `mapping_id` text REFERENCES sync_mappings(id);--> statement-breakpoint
ALTER TABLE `sync_logs` ADD `details` text;--> statement-breakpoint
ALTER TABLE `sync_mappings` ADD `last_sync_at` text;