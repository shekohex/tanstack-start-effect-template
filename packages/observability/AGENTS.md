# Observability Guide

- Prefer Effect logging, spans, and metrics in Effect applications.
- Keep exporter construction in layers and optional for local development.
- Include safe correlation metadata and redact secrets and content.
- Do not make observability failures break product behavior by default.
