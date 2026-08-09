# Database Schema Visualizer

## Overview

A web application that connects to a database, reads its metadata, and
automatically generates an interactive Entity Relationship Diagram
(ERD).

## Problem

Understanding an unfamiliar database with dozens or hundreds of tables
is difficult. Developers spend hours exploring tables and relationships
manually.

The visualizer automatically maps the schema into an interactive graph.

## Target Users

-   Database administrators
-   Backend developers
-   Data engineers
-   Students
-   Software architects

## Core Features

1.  Connect to a database
2.  Read metadata
3.  Detect tables, columns, primary keys and foreign keys
4.  Generate ER diagrams
5.  Search and filter tables
6.  Export PDF or PNG
7.  Generate Markdown documentation
8.  Display schema statistics
9.  **AI-generated plain-language schema explanations** (moved up from V3 -- cheap to build, strong differentiator vs. tools like dbdiagram.io / SchemaSpy)
10. **Bundled demo schema** (e.g. Sakila or Chinook) so users can try the tool with zero setup

## Supported Databases

-   PostgreSQL
-   MySQL
-   SQLite
-   SQL Server
-   Oracle (future -- flag ODBC/cx_Oracle driver setup as a real integration cost, not just a checkbox)

## Suggested Tech Stack

### Frontend

-   React
-   React Flow (handles both rendering *and* layout -- see note below)
-   `dagre` or `elkjs` for auto-layout

### Backend

-   FastAPI
-   SQLAlchemy Inspector (normalizes metadata across dialects, so no per-DB raw introspection queries)

> **Stack simplification:** Graphviz and NetworkX have been dropped. React Flow with a
> `dagre`/`elkjs` layout pass covers graph rendering and auto-layout on its own -- running
> a separate Python-side Graphviz layout is redundant and adds a dependency for no real
> benefit.

## Security & Connection Handling

*(new section -- this was previously unaddressed)*

-   **Never persist raw credentials.** Use short-lived sessions or encrypted-at-rest storage if persistence is required; prefer prompting per-session.
-   **Enforce read-only access.** The tool should only ever run introspection queries -- never DDL/DML. Recommend (or require) connecting via a read-only DB role or read replica.
-   **Transport security.** Enforce TLS for both the app and the DB connection where supported.
-   Document this clearly for users connecting production databases -- credential handling is a trust-critical part of the product, not an afterthought.

## Performance at Scale

*(new section)*

Schemas with hundreds of tables will produce unreadable "hairball" diagrams if rendered naively. Address this directly:

-   **Grouping/clustering** -- group tables by schema/namespace or by foreign-key density.
-   **Focus mode** -- render a subgraph around a selected table and expand neighbors on click, rather than the whole graph at once.
-   **Lazy loading** -- fetch and render subgraphs on demand instead of the full metadata graph up front.

## Caching & Refresh Strategy

*(new section)*

-   Cache extracted metadata after the first read; don't re-introspect on every page load.
-   Provide an explicit "Refresh schema" action for the user to pull latest metadata on demand.
-   This matters most for large production databases, where live introspection on every request is expensive.

## High-Level Architecture

React Frontend -> FastAPI -> SQLAlchemy Inspector -> Metadata Extraction
(cached) -> Graph Builder (dagre/elkjs layout) -> Interactive Diagram

## Typical Workflow

1.  User enters connection details (or loads the bundled demo schema).
2.  Backend connects to the database using a read-only role.
3.  Metadata is extracted and cached.
4.  Relationships are identified.
5.  Diagram JSON is returned.
6.  Frontend renders the ERD (with focus mode / clustering for large schemas).

## Future Features

-   Missing index detection
-   Circular dependency detection
-   Database comparison
-   Version history
-   Reverse SQL generation

> AI schema explanations moved to Core Features / MVP+ (see above).

## Development Roadmap

### MVP

-   PostgreSQL support
-   Interactive ERD
-   Search
-   Export PNG
-   Read-only connection enforcement
-   Bundled demo schema (Sakila/Chinook) for zero-setup trial

### MVP+ (new tier)

-   AI-generated schema explanations
-   Basic caching + manual refresh
-   Focus mode for large schemas

### Version 2

-   Multi-database support (MySQL, SQLite, SQL Server)
-   Statistics dashboard
-   Markdown documentation
-   Schema clustering/grouping for large diagrams

### Version 3

-   Performance recommendations (missing index detection, etc.)
-   Team collaboration
-   Oracle support
-   Database comparison, version history, reverse SQL generation

## Learning Outcomes

-   Database introspection
-   Metadata analysis
-   Graph visualization
-   Full-stack development
-   Export pipelines
-   Multi-database support
-   Secure credential handling
-   Performance design for large graphs
