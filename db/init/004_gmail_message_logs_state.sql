ALTER TABLE gmail_message_logs
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS detected_po_number TEXT;

CREATE INDEX IF NOT EXISTS ix_gmail_message_logs_is_read
  ON gmail_message_logs(is_read);
