ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
  CHECK (status IN ('new','paid','posted','pending','active','submitted','qa_review','qa_failed','delivered','completed','disputed','cancelled'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
