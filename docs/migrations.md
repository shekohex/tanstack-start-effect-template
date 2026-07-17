# Migrations

SQL migrations live under `deploy/migrations` and use ordered names such as `000002_add_example.sql`.

Rules:

- Forward-only. Never edit an applied migration.
- Stable numeric IDs and lowercase underscore names.
- Migration runner verifies SHA-256 checksums before applying or reporting status.
- Use Effect SQL transactions and one operational migration boundary.
- Test from an empty PostgreSQL database.

Commands:

```bash
pnpm exec vp run dev:services
pnpm exec vp run db:migrate
pnpm exec vp run db:status
pnpm exec vp run db:test
```
