CREATE TABLE users (
  id text PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email = lower(email)),
  CHECK (length(trim(display_name)) > 0)
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE auth_accounts (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, account_id)
);

CREATE INDEX auth_accounts_user_idx ON auth_accounts (user_id);

CREATE TABLE auth_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  CHECK (expires_at > created_at)
);

CREATE INDEX auth_sessions_user_expires_idx ON auth_sessions (user_id, expires_at);

CREATE TABLE auth_verifications (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_verifications_identifier_idx ON auth_verifications (identifier, expires_at);

CREATE TABLE auth_rate_limits (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE,
  count integer NOT NULL,
  last_request bigint NOT NULL
);

CREATE TABLE organizations (
  id text PRIMARY KEY,
  slug text NOT NULL,
  display_name text NOT NULL,
  created_by_user_id text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (slug = lower(slug)),
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  CHECK (length(trim(display_name)) > 0)
);

CREATE UNIQUE INDEX organizations_slug_unique ON organizations (lower(slug));

CREATE TABLE memberships (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (organization_id, user_id)
);

CREATE INDEX memberships_user_status_idx ON memberships (user_id, status);

CREATE TABLE invitations (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  token_hash text NOT NULL UNIQUE,
  created_by_user_id text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_user_id text REFERENCES users(id),
  revoked_at timestamptz,
  CHECK (email = lower(email)),
  CHECK (expires_at > created_at),
  CHECK (NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL))
);

CREATE INDEX invitations_organization_created_idx ON invitations (organization_id, created_at DESC);
CREATE UNIQUE INDEX invitations_pending_email_unique
  ON invitations (organization_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE audit_events (
  id text PRIMARY KEY,
  organization_id text REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_organization_created_idx
  ON audit_events (organization_id, created_at DESC);

CREATE TABLE domain_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id text NOT NULL UNIQUE,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  actor_user_id text REFERENCES users(id),
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX domain_events_organization_sequence_idx
  ON domain_events (organization_id, sequence);

CREATE FUNCTION app_preserve_last_owner() RETURNS trigger AS $$
DECLARE
  remaining_owners integer;
  removes_active_owner boolean;
BEGIN
  removes_active_owner := OLD.role = 'owner'
    AND OLD.status = 'active'
    AND (
      TG_OP = 'DELETE'
      OR NEW.role <> 'owner'
      OR NEW.status <> 'active'
      OR NEW.organization_id <> OLD.organization_id
    );

  IF NOT removes_active_owner THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  SELECT count(*) INTO remaining_owners
  FROM memberships
  WHERE organization_id = OLD.organization_id
    AND role = 'owner'
    AND status = 'active'
    AND id <> OLD.id;

  IF remaining_owners = 0 THEN
    RAISE EXCEPTION 'an organization must retain an active owner' USING ERRCODE = '23514';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memberships_preserve_last_owner
BEFORE DELETE OR UPDATE OF role, status, organization_id ON memberships
FOR EACH ROW EXECUTE FUNCTION app_preserve_last_owner();

CREATE FUNCTION app_reject_immutable_record_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION app_reject_immutable_record_mutation();

CREATE TRIGGER domain_events_immutable
BEFORE UPDATE OR DELETE ON domain_events
FOR EACH ROW EXECUTE FUNCTION app_reject_immutable_record_mutation();

CREATE FUNCTION app_audit_user_registered() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_events (id, actor_user_id, action, target_type, target_id)
  VALUES ('aud_' || gen_random_uuid()::text, NEW.id, 'auth.user_registered', 'user', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_registration
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION app_audit_user_registered();

CREATE FUNCTION app_audit_session_created() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_events (id, actor_user_id, action, target_type, target_id)
  VALUES ('aud_' || gen_random_uuid()::text, NEW.user_id, 'auth.session_created', 'session', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auth_sessions_audit_creation
AFTER INSERT ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION app_audit_session_created();

CREATE FUNCTION app_audit_session_revoked() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_events (id, actor_user_id, action, target_type, target_id)
  VALUES ('aud_' || gen_random_uuid()::text, OLD.user_id, 'auth.session_revoked', 'session', OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auth_sessions_audit_revocation
AFTER DELETE ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION app_audit_session_revoked();
