CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','API_MANAGER','MASTER_DISTRIBUTOR','DISTRIBUTOR','RETAILER')),
  parent_user_id BIGINT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','PENDING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parent_user_id IS NULL OR parent_user_id <> id)
);
CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_user_id);

CREATE TABLE IF NOT EXISTS providers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  environment TEXT NOT NULL DEFAULT 'SANDBOX' CHECK (environment IN ('SANDBOX','PRODUCTION')),
  priority INTEGER NOT NULL DEFAULT 100,
  supported_services TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  health_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (health_status IN ('UNKNOWN','HEALTHY','DEGRADED','DOWN')),
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT UNIQUE,
  owner_user_id BIGINT REFERENCES users(id),
  account_type TEXT NOT NULL CHECK (account_type IN ('USER_WALLET','CLEARING')),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_user_wallet
  ON ledger_accounts(owner_user_id, currency)
  WHERE account_type='USER_WALLET';

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id),
  ledger_account_id BIGINT NOT NULL UNIQUE REFERENCES ledger_accounts(id),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','FROZEN','CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id, currency)
);

CREATE TABLE IF NOT EXISTS wallet_journals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_ref TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  entry_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','REVERSED')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_id BIGINT NOT NULL REFERENCES wallet_journals(id),
  account_id BIGINT NOT NULL REFERENCES ledger_accounts(id),
  amount NUMERIC(18,2) NOT NULL CHECK (amount <> 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_entries_account ON wallet_entries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_entries_journal ON wallet_entries(journal_id);

CREATE TABLE IF NOT EXISTS recharge_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  client_user_id BIGINT NOT NULL REFERENCES users(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('MOBILE','DTH','BILL_PAYMENT')),
  target TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  provider_id BIGINT REFERENCES providers(id),
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','SUCCESS','FAILED','UNKNOWN','REVERSED')),
  failure_code TEXT,
  failure_message TEXT,
  request_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  response_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON recharge_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON recharge_transactions(client_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON recharge_transactions(status);

CREATE TABLE IF NOT EXISTS commission_rules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('MOBILE','DTH','BILL_PAYMENT')),
  beneficiary_role TEXT NOT NULL CHECK (beneficiary_role IN ('MASTER_DISTRIBUTOR','DISTRIBUTOR','RETAILER')),
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('FIXED','PERCENTAGE')),
  rate NUMERIC(12,4) NOT NULL CHECK (rate >= 0),
  priority INTEGER NOT NULL DEFAULT 100,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS wallet_funding_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','VERIFICATION_REQUIRED','APPROVED','REJECTED','CANCELLED')),
  payment_provider TEXT,
  provider_reference TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  transaction_id BIGINT REFERENCES recharge_transactions(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A platform clearing account; negative/positive entries must balance each journal.
CREATE TABLE IF NOT EXISTS system_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ledger_account_id BIGINT NOT NULL UNIQUE REFERENCES ledger_accounts(id)
);
