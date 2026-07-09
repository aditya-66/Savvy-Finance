USE savvy_db;

-- Add budget and target savings to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_savings DECIMAL(10, 2) DEFAULT 0;

-- Add soft delete to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
