-- Add missing columns to sync_mappings table
ALTER TABLE sync_mappings ADD COLUMN last_sync_at TEXT DEFAULT NULL;

-- Add missing columns to issues table
ALTER TABLE issues ADD COLUMN issue_id TEXT DEFAULT NULL;
ALTER TABLE issues ADD COLUMN notion_page_id TEXT DEFAULT NULL;
ALTER TABLE issues ADD COLUMN priority TEXT DEFAULT NULL;
ALTER TABLE issues ADD COLUMN assignee TEXT DEFAULT NULL;
ALTER TABLE issues ADD COLUMN title TEXT DEFAULT NULL;
ALTER TABLE issues ADD COLUMN description TEXT DEFAULT NULL;

-- Add missing columns to sync_logs table
ALTER TABLE sync_logs ADD COLUMN mapping_id TEXT DEFAULT NULL;
ALTER TABLE sync_logs ADD COLUMN details TEXT DEFAULT NULL;

-- Update sync_logs to reference sync_mappings properly
UPDATE sync_logs SET mapping_id = sync_mapping_id WHERE sync_mapping_id IS NOT NULL;