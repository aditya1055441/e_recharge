ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS verification_otps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_otps_ident ON verification_otps(identifier, expires_at DESC);
