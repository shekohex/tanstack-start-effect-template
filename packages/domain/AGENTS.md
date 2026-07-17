# Domain Agent Guide

- Keep models JSON-compatible and independent of transport and persistence.
- Use named Effect Schema classes and branded schemas for reusable values.
- Put pure domain invariants here; do not add services, SQL, HTTP, or UI code.
- Derive related shapes instead of duplicating schemas.
