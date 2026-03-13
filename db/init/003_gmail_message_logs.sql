-- Persist Gmail message metadata for PO threads
CREATE TABLE IF NOT EXISTS gmail_message_logs (
  id BIGSERIAL PRIMARY KEY,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT,
  internal_date_ms BIGINT,
  direction TEXT NOT NULL,
  counterparty_email TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,
  snippet TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gmail_message_logs_message_id
  ON gmail_message_logs(gmail_message_id);

CREATE INDEX IF NOT EXISTS ix_gmail_message_logs_thread_id
  ON gmail_message_logs(gmail_thread_id);

CREATE INDEX IF NOT EXISTS ix_gmail_message_logs_correlation_id
  ON gmail_message_logs(correlation_id);
