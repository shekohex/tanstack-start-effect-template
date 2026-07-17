# Permissions Agent Guide

- Keep authorization pure, explicit, tenant-scoped, and deny-by-default.
- Do not perform SQL, network, logging, or mutable state changes here.
- Test cross-organization and negative cases before positive paths.
