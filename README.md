# Database Schema Visualizer

A local, single-user web app that connects to a database, reads its metadata,
and automatically generates an interactive Entity Relationship Diagram (ERD).

- **Frontend**: React + React Flow (rendering, pan/zoom) + dagre (auto-layout)
- **Backend**: FastAPI + SQLAlchemy Inspector (normalized introspection across dialects)
- **Databases**: SQLite (bundled demo), PostgreSQL, MySQL, SQL Server

> **About this project** — this is my learning project:
>
> - Learned **FastAPI** — building the backend API
> - Learned database tools — reading table info with **SQLAlchemy**
> - Learned **graph visualization** — turning tables into an interactive diagram (React Flow + dagre)
> - Got **full stack development** practice — React frontend talking to a Python backend
> - Then added AI features that explain any schema in plain English, using two AI services (**OpenAI** and **OpenRouter**) — self-taught from several tutorials and docs

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
11 tables) or **Load audit demo**. No database required.

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

## Features

- Interactive ERD with dagre auto-layout, minimap, zoom, fit-view
- Search tables
- Focus mode: click a table to see it plus its linked tables (1-3 steps away).
  Everything else fades into the background
- Health check panel: spots common problems — foreign keys without indexes,
  circular table links, tables with no primary key, duplicate indexes, and
  tables with no connections. Click a problem to highlight that table on the
  diagram, or copy the suggested fix
- Refresh schema on demand (metadata is cached after the first read)
- Export PNG
- Schema stats (tables / columns / FKs / orphan tables)
- Warning banner for partial introspection (skipped tables, no-PK tables)
- AI plain-language schema explanations: 4-6 bullet points with bold labels
  (Purpose / Core tables / Relationships / Concerns), fact-grounded from the
  detected schema (join tables, self-referencing tables, orphans, real data
  quality alerts — concerns are never invented), with Copy and Regenerate.
  Works with OpenAI or OpenRouter keys (auto-detected from the key prefix).

## Development

### Backend

```bash
cd backend
uv sync          # install deps from uv.lock
uv run pytest    # 28 tests: introspection fixtures + health audit + API + AI prompt suites
uv run python tests/fixtures/build_fixtures.py   # regenerate SQLite fixtures
```

Fixture edge cases: normal FK graph, composite primary key, self-referencing
FK, table with no primary key, orphaned table, circular table links.

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
namespace, ordered `pkColumns`, and `indexes`; FK edges use column arrays so
composite foreign keys survive. The payload also includes structured
`findings` from the health audit (severity/category/table/message/suggestion).
Layout is computed on the client — the payload is layout-free.

### API

| Method | Path             | Purpose                                   |
| ------ | ---------------- | ----------------------------------------- |
| POST   | `/schema/connect`| Connect (`demo://chinook` or `demo://audit` also work), introspect, cache |
| GET    | `/schema`        | Cached payload (409 if not connected)     |
| POST   | `/schema/refresh`| Re-introspect and replace cache           |
| POST   | `/ai/explain`    | Brief bullet-point explanation. Body: `{apiKey, model, provider}` — provider is auto-detected from the key prefix (`sk-or-` → OpenRouter, else OpenAI); slash-less models are expanded to `vendor/model` for OpenRouter |

Errors are always returned as `{"error": {"kind", "message", ...}}` with
kinds `connection | timeout | not_connected | ai | network | unknown`.
Introspection has a 30s timeout that suggests focus mode on failure.
AI provider errors are translated to plain-language hints per status
(401/403/404/429) without leaking URLs or keys.

## Roadmap

See `Database_Schema_Visualizer_Overview.md` for the full product plan.
