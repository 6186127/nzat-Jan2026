CREATE TABLE IF NOT EXISTS inactive_gmail_correlations (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inactive_gmail_correlations_correlation_id
  ON inactive_gmail_correlations(correlation_id);
