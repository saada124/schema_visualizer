# Database Schema Visualizer

A local, single-user web app that connects to a database, reads its metadata,
and automatically generates an interactive Entity Relationship Diagram (ERD).

- **Frontend**: React + React Flow (rendering, pan/zoom) + dagre (auto-layout)
- **Backend**: FastAPI + SQLAlchemy Inspector (normalized introspection across dialects)
- **Databases**: SQLite (bundled demo), PostgreSQL, MySQL, SQL Server

## Quick start (zero setup — demo schema)

```bash
# terminal 1 — backend (port 8000)
cd backend
uv run uvicorn app.main:app --port 8000

# terminal 2 — frontend (port 5173)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and click **Load demo schema** (bundled Chinook,
11 tables). No database required.

## Connect to a real database

Paste a SQLAlchemy-style connection string and click **Connect**:

```
postgresql://user:pass@host:5432/dbname
mysql+pymysql://user:pass@host:3306/dbname
mssql+pyodbc://user:pass@host/dbname?driver=ODBC+Driver+18+for+SQL+Server
sqlite:///C:/path/to/database.db
```

The dialect is auto-detected from the URL prefix. Driver packages may need to
be installed first (e.g. `psycopg2-binary` for PostgreSQL).

## Security model

- **Local only** — runs on localhost, no accounts, no server-side persistence.
- **Credentials live in memory for the session only** and are never written
  to disk or logged. Connection errors are surfaced without echoing the URL.
- **Read-only by design** — the tool only runs SQLAlchemy introspection
  queries, never DDL or DML. For production databases, connect via a
  read-only role or replica.
- **AI explanations** — the AI API key is stored in your browser's
  `localStorage` only and sent per-request; it is never persisted by the
  backend. The AI feature is hidden entirely until you provide a key.

## Features

- Interactive ERD with dagre auto-layout, minimap, zoom, fit-view
- Search tables; focus mode (click a table to show its 1-hop neighborhood)
- Refresh schema on demand (metadata is cached after the first read)
- Export PNG
- Schema stats (tables / columns / FKs / orphan tables)
- Warning banner for partial introspection (skipped tables, no-PK tables)
- AI plain-language schema explanations (OpenAI-compatible endpoint)

## Development

### Backend

```bash
cd backend
uv sync          # install deps from uv.lock
uv run pytest    # 14 tests: introspection fixtures + API suite
uv run python tests/fixtures/build_fixtures.py   # regenerate SQLite fixtures
```

Fixture edge cases: normal FK graph, composite primary key, self-referencing
FK, table with no primary key, orphaned table.

### Frontend

```bash
cd frontend
npm run lint     # oxlint
npm run build    # tsc + vite build
```

### Architecture

```
React (React Flow + dagre)  ->  FastAPI  ->  SQLAlchemy Inspector
       ^                                              |
       +----------- versioned JSON contract ----------+
```

The contract between the two sides is `backend/app/contract.py` (Pydantic)
mirrored by `frontend/src/api/types.ts`. Nodes carry a nullable `schema`
namespace (clustering-ready); FK edges use column arrays so composite
foreign keys survive. Layout is computed on the client — the payload is
layout-free.

### API

| Method | Path             | Purpose                                   |
| ------ | ---------------- | ----------------------------------------- |
| POST   | `/schema/connect`| Connect (or `demo://chinook`), introspect, cache |
| GET    | `/schema`        | Cached payload (409 if not connected)     |
| POST   | `/schema/refresh`| Re-introspect and replace cache           |
| POST   | `/ai/explain`    | Plain-language explanation (key per request) |

Errors are always returned as `{"error": {"kind", "message", ...}}` with
kinds `connection | timeout | not_connected | ai | network | unknown`.
Introspection has a 30s timeout that suggests focus mode on failure.

## Roadmap

See `Database_Schema_Visualizer_Overview.md` for the full product plan.
