# ⚠️  Legacy Mock-Only Backend — Do Not Deploy

This directory contains a standalone mock Express server that was created before
the real database-backed API was built. It serves **hardcoded, in-memory data
only** and has no database connection.

**It is NOT the production API.**

The real, database-backed API is in:
  `artifacts/api-server/` — backed by PostgreSQL via Drizzle ORM

Do not start, deploy, or route traffic to this directory. It exists only for
historical reference and will be removed in a future cleanup.
