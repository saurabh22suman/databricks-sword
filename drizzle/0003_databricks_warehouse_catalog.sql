-- Add warehouseId and catalogName columns to databricks_connections table
-- warehouseId: SQL Warehouse ID for running validation queries
-- catalogName: Unity Catalog name (defaults to 'dev' for Free Edition)

ALTER TABLE databricks_connections ADD COLUMN warehouse_id TEXT;
ALTER TABLE databricks_connections ADD COLUMN catalog_name TEXT NOT NULL DEFAULT 'dev';
