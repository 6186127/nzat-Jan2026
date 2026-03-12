-- Add merchant staff members (0..N) for customers
CREATE TABLE IF NOT EXISTS customer_staff (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  CONSTRAINT fk_customer_staff_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_customer_staff_customer_id ON customer_staff(customer_id);
