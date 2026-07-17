# Config Agent Guide

- Read configuration through Effect `Config` and expose it through `AppConfig`.
- Keep defaults deterministic and mirror every public environment variable in `.env.example`.
- Validate configuration before constructing application resources.
- Never log secret configuration values.
