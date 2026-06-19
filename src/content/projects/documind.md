---
title: documind
tagline: Production-grade RAG Q&A API — FastAPI + pgvector + Celery + SSE.
description: DocuMind is a production-grade Retrieval-Augmented Generation API — upload PDFs, get pgvector-backed embeddings, and ask questions over a streaming endpoint with page-level citations.
stack: ['Python', 'FastAPI', 'PostgreSQL', 'pgvector', 'Celery', 'Redis', 'OpenAI / Anthropic']
github: https://github.com/prateekaryann/documind
glyph: docs
accent: violet
order: 0
banner: /projects/documind/banner.png
demoVideo: /projects/documind/demo.mp4
demoPoster: /projects/documind/poster.png
architecture: /projects/documind/architecture.png
---

# documind

DocuMind is a production-grade **Retrieval-Augmented Generation** API. Upload PDFs, get
chunked embeddings stored in pgvector, and ask questions through a streaming `/ask`
endpoint that returns LLM-generated answers with **page-level source citations**.

It's built as a reference implementation for multi-tenant RAG services on a
**single-database** architecture (PostgreSQL + pgvector) — no separate vector store to
operate.

## Why it exists

Most "RAG in an afternoon" tutorials skip the parts that actually matter in production:
auth, rate limiting, async document processing, streaming responses, source citations,
multi-tenancy, and observability. DocuMind is opinionated about all of them.

## Highlights

- **Multi-tenant** — API-key-scoped collections with full data isolation at the query layer.
- **Streaming responses** — Server-Sent Events for real-time Q&A.
- **Source citations** — page-level references attached to every generated answer.
- **Rate limiting** — Redis-backed per-key limits with standard `X-RateLimit-*` headers.
- **Async ingestion** — Celery pipeline (`parse → chunk → embed → store`) with retries.
- **Typed end to end** — Pydantic v2, async SQLAlchemy 2, `mypy --strict` on `src/`.

## How it works

Three paths run through the system:

- **Request path** — `HTTP → rate limit → auth → router → service → DB / LLM / storage`
- **Ingestion path** — `upload → Celery task → PDF parse → chunk → embed → pgvector`
- **Query path** — `/ask → retrieve top-k chunks → LLM with context → SSE stream with citations`

## Stack choices

| Layer | Choice | Why |
|---|---|---|
| API | FastAPI + Pydantic v2 | Async, type-safe, auto OpenAPI |
| Datastore | PostgreSQL + pgvector | Relational data *and* vectors in one DB |
| Async queue | Celery + Redis | Battle-tested ingestion pipeline |
| LLM | OpenAI / Anthropic | Behind a provider interface with streaming |
| Storage | Cloudflare R2 (S3-compatible) | Cheap, no egress fees |
| Tooling | uv + Docker Compose | One command brings the whole stack up |
