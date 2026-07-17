#!/usr/bin/env bash
set -euo pipefail

compose_file="deploy/compose/compose.yml"

docker compose -f "$compose_file" up -d --wait postgres
vp run db:migrate
vp run db:status

applied_count="$(docker compose -f "$compose_file" exec -T postgres psql -U app -d app -Atc 'SELECT count(*) FROM app_schema_migrations')"
available_count="$(find deploy/migrations -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
test "$applied_count" -eq "$available_count"

docker compose -f "$compose_file" exec -T postgres psql -U app -d app -Atc \
  "SELECT
    to_regclass('users') IS NOT NULL
    AND to_regclass('auth_accounts') IS NOT NULL
    AND to_regclass('auth_sessions') IS NOT NULL
    AND to_regclass('organizations') IS NOT NULL
    AND to_regclass('memberships') IS NOT NULL
    AND to_regclass('invitations') IS NOT NULL" | grep -qx t

if docker compose -f "$compose_file" exec -T postgres psql -v ON_ERROR_STOP=1 -U app -d app <<'SQL'
BEGIN;
INSERT INTO users (id, email, display_name) VALUES ('usr_owner_test', 'owner-test@example.com', 'Owner Test');
INSERT INTO organizations (id, slug, display_name, created_by_user_id)
VALUES ('org_owner_test', 'owner-test', 'Owner Test', 'usr_owner_test');
INSERT INTO memberships (id, organization_id, user_id, role)
VALUES ('mem_owner_test', 'org_owner_test', 'usr_owner_test', 'owner');
UPDATE memberships SET role = 'admin' WHERE id = 'mem_owner_test';
ROLLBACK;
SQL
then
  echo 'last owner invariant unexpectedly allowed demotion' >&2
  exit 1
fi

if docker compose -f "$compose_file" exec -T postgres psql -v ON_ERROR_STOP=1 -U app -d app <<'SQL'
BEGIN;
INSERT INTO audit_events (id, action, target_type, target_id)
VALUES ('aud_immutable_test', 'test.created', 'test', 'immutable');
UPDATE audit_events SET action = 'test.changed' WHERE id = 'aud_immutable_test';
ROLLBACK;
SQL
then
  echo 'audit event unexpectedly allowed mutation' >&2
  exit 1
fi
