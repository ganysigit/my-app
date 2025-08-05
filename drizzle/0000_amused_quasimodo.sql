CREATE TABLE `discord_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bot_token` text NOT NULL,
	`channel_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `discord_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`discord_channel_id` text NOT NULL,
	`message_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discord_channel_id`) REFERENCES `discord_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` text PRIMARY KEY NOT NULL,
	`notion_connection_id` text NOT NULL,
	`status` text NOT NULL,
	`project` text,
	`bug_name` text NOT NULL,
	`bug_description` text,
	`attached_files` text,
	`severity` text,
	`notion_url` text,
	`last_synced_at` text DEFAULT CURRENT_TIMESTAMP,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`notion_connection_id`) REFERENCES `notion_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notion_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`api_key` text NOT NULL,
	`database_id` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`description` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`sync_mapping_id` text,
	`operation` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`error_details` text,
	`issues_processed` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`sync_mapping_id`) REFERENCES `sync_mappings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sync_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`notion_connection_id` text NOT NULL,
	`discord_channel_id` text NOT NULL,
	`project_filter` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`notion_connection_id`) REFERENCES `notion_connections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discord_channel_id`) REFERENCES `discord_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
