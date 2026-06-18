---
title: "A fault-tolerant, cost-optimized LLM platform for clinical document generation"
subtitle: "Durable orchestration, idempotent RAG, prompt caching, and model tiering on a regulated GenAI pipeline"
description: "How I engineer a production clinical content-generation platform to survive failures, skip redundant work, and cut LLM cost and latency by an order of magnitude — without trading away output quality."
publishedAt: "2026-06-19"
stack: ["Python", "FastAPI", "PostgreSQL", "RAG", "Prompt Caching", "Anthropic Claude", "AWS"]
order: 0
featured: true
---

# A fault-tolerant, cost-optimized LLM platform for clinical document generation

*Durable orchestration, idempotent RAG, prompt caching, and model tiering — the four pieces that turn a fragile demo into a production GenAI system you can actually run.*

> *A sanitized architectural write-up of real production work on my current engagement as an AI Engineer with **Gilead Sciences** (via UsefulBI), building the platform behind automated clinical regulatory documents (CSR, DSUR, PLPS). Company-specific details — internal service names, prompts, schemas, exact model identifiers, and proprietary numbers — have been generalized. The patterns, trade-offs, and failure-mode handling are real.*

## TL;DR

Generating a clinical regulatory document is not one LLM call. It is ingestion, retrieval over a large corpus, dozens of section-wise generations, validation, and assembly — minutes of work, lots of model calls, and strict expectations on reproducibility and quality. Four design decisions did most of the heavy lifting:

1. **Durable orchestration** with a Postgres-backed checkpointer, so a crash mid-generation never loses state and never restarts from zero.
2. **An idempotent RAG pipeline** keyed on content hashes, so unchanged inputs skip straight to cached results — repeat runs drop from minutes to seconds.
3. **Prompt caching** on stable system prefixes, which cut inference latency by ~85% and token cost by ~90% on the high-volume instructions.
4. **Model tiering** — a fast, cheap classifier gates the expensive frontier model, so we only pay for power when the task needs it.

None of these is exotic. The discipline is in wiring them together so the system is boring to operate, which is exactly what a regulated pipeline needs.

## The shape of the problem

A finished report is long and section-structured. Producing one means:

- **Ingesting** source material (study data, prior documents, templates) and normalizing it.
- **Retrieving** the right evidence for each section from a large, mostly-unchanged corpus.
- **Generating** each section — often dozens — against strict structural expectations.
- **Validating** structure and content, with repair passes when something is off.
- **Assembling** the pieces into a single reviewable document.

Two properties make this harder than a typical RAG chatbot:

- **It is long-running.** A full document is minutes of wall-clock and a large number of model calls. Anything that restarts from scratch on failure is dead on arrival.
- **It is regulated.** Reviewers need to trust that the same inputs produce consistent, auditable output, and that nothing silently changed between runs.

So the platform has two jobs that pull in opposite directions: serve **low-latency interactive requests** (a user editing or regenerating one section) *and* run **long-horizon batch generations** (a whole document) — without letting one starve or corrupt the other.

## Architecture at a glance

```
                         ┌─────────────────────────────┐
   interactive request → │  API (FastAPI)              │ ← fast path: single section,
                         │  - auth, validation         │   sync, returns in-line
                         └──────────────┬──────────────┘
                                        │ enqueue long jobs
                                        ▼
                         ┌─────────────────────────────┐
                         │  Orchestrator               │  durable execution
                         │  (checkpointed workflow)    │  state in PostgreSQL
                         └──────────────┬──────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
   [Ingest]                       [Retrieve / RAG]                 [Generate sections]
   content-hash cache             content-hash cache               model-tiered:
   (skip if unchanged)            (skip if unchanged)              classify → route
        │                               │                               │
        └───────────────┬───────────────┴───────────────┬───────────────┘
                        ▼                               ▼
                   [Validate + repair]            [Assemble document]
                        │                               │
                        └───────────────┬───────────────┘
                                        ▼
                         observability: offline eval + live traces
```

The orchestrator owns *state and sequencing*. Everything else is a stateless step that takes typed input and returns typed output — which is what makes the whole thing checkpointable and testable.

## 1. Durable orchestration: never restart from zero

The first version of long-running generation was a single process holding everything in memory. It worked on demo inputs and fell over on real ones for the usual reasons: a process restart, a deploy, or one model timeout three-quarters of the way through threw away every section already generated.

I moved sequencing onto a **durable-execution model with a Postgres-backed checkpointer**. After each step completes, its result is committed as a checkpoint. If a worker dies — OOM, deploy, spot reclaim, a provider outage — the workflow **resumes from the last committed step instead of the beginning**. State lives in the database, not in a process's heap.

That single change bought a few things at once:

- **Zero state loss across failures.** A crash costs you the in-flight step, not the whole document.
- **A clean fast-path / slow-path split.** Interactive single-section requests run synchronously on the API and return in-line; full-document generations are enqueued as durable workflows. Neither blocks the other, and a flood of long jobs can't make the editor feel slow.
- **Portability.** Steps are ordinary typed functions. The durable layer sequences and checkpoints them, but the business logic isn't welded to any one engine — it could move to another orchestrator with modest surgery.

The mental model I kept coming back to: **the orchestrator should know exactly where every run is at all times, and be able to pick up any run from where it stopped.** If you can't answer "where is this run right now?" from durable state, you don't have orchestration — you have a script that happens to call an LLM.

## 2. Idempotent RAG: hash it, then skip it

The RAG pipeline is the classic chain — extract → chunk → embed → retrieve → generate. The expensive truth is that **most inputs don't change between runs.** Re-ingesting, re-chunking, and re-embedding an unchanged corpus on every regeneration is pure waste, and it's the slowest part of the pipeline.

So I made every stage **idempotent and content-addressed**. Each stage computes a hash of its inputs (the source bytes, the chunking parameters, the embedding model version, and so on) and writes its output keyed by that hash. On the next run:

- Input hash matches a cached result → **return the cache, skip the work.**
- Input changed → hash misses → recompute, and write the new result under the new key.

Because the key includes *parameters and model versions*, not just the raw content, a config change or a model upgrade correctly busts the cache instead of silently serving stale embeddings — which matters a lot in a regulated setting where "why did this output change?" must always have a precise answer.

The payoff is steep: a regeneration where only one section's inputs changed reuses everything else and **drops from minutes to seconds.** The first run pays full price; every run after that pays only for what actually changed. It also makes the pipeline naturally **safe to retry** — a re-run of a partially-completed stage converges to the same result instead of duplicating work.

## 3. Cutting cost and latency: prompt caching

LLM generation here leans on large, stable system prefixes — instructions, formatting rules, and shared context that are identical across hundreds of section calls. Sending those tokens fresh on every call is the dominant cost and a big chunk of the latency.

I restructured prompts so the **stable prefix is cacheable and the variable part is small and at the end**, then enabled **prompt caching** on the provider. Cached prefix tokens are served far cheaper and far faster than fresh ones, so on the high-volume RAG instructions this cut:

- **inference latency by ~85%**, and
- **API token cost by ~90%.**

Two non-obvious lessons:

- **Prefix stability is a feature you design for.** The win only materializes if the cached portion is genuinely byte-stable across calls. I had to be deliberate about prompt construction — pulling anything dynamic (timestamps, per-call IDs, reordered context) *out* of the cached region — so the cache actually hits.
- **Order matters more than length.** The savings come from keeping the long, shared content in one stable block and concatenating the small per-section delta last, rather than interleaving stable and variable text.

## 4. Model tiering: don't send a simple task to a frontier model

Not every call needs the most capable (and most expensive) model. A lot of the pipeline's work is routing and classification — "what kind of request is this, which section type, which path?" — and that doesn't need a frontier model at all.

I built a **model-tiering router**:

- A **fast, low-cost model** handles intent classification and structural decisions, constrained by **strict Pydantic schemas** so its output is validated, typed, and safe to branch on. If it doesn't conform to the schema, it doesn't pass.
- Only the genuinely hard generation work — the section content that benefits from the extra capability — is **escalated to a frontier model.**

The schema constraint is what makes this safe. A cheap model is more likely to wander; forcing its output through a Pydantic model means a malformed or hallucinated classification fails closed instead of silently mis-routing an expensive generation. The result is lower average cost and higher throughput, with quality preserved exactly where it counts.

## 5. Observability and evaluation: two layers

A generation pipeline you can't measure is a generation pipeline you can't trust — and in this domain, "trust" is the product. I built observability as **two complementary layers**:

- **Offline dataset scoring.** A curated evaluation set runs the pipeline and scores outputs against references and rule-based checks. This is the gate: it catches regressions before they ship when a prompt, a model version, or a retrieval parameter changes.
- **Live trace transformation.** In production, traces from real runs are transformed into structured signals — latencies, cache-hit rates, validation-failure rates, token spend, output characteristics — so the system's behavior is visible as it happens, not reconstructed from logs after an incident.

Together they enable **drift detection and automated alerting**: when live quality or cost signals move away from the offline baseline, we hear about it instead of finding out from a reviewer. The offline layer tells you whether a *change* is safe; the live layer tells you whether *production* still looks like the baseline you signed off on.

## Trade-offs and what I'd tell you before you build this

- **Durable execution adds moving parts.** You now operate a checkpoint store and reason about idempotency at every step. The cost is real; it's worth it the moment your runs are longer than a single retry is cheap to redo.
- **Content-hash caching is only as correct as your keys.** Forget to include a parameter or a model version in the hash and you'll serve stale results — the worst kind of bug, because it's invisible. Be paranoid about what goes into the key.
- **Prompt caching rewards discipline.** The headline numbers assume a stable prefix. If your prompts are sloppy about what's cacheable, you get a fraction of the benefit and conclude caching "doesn't work."
- **Tiering needs a hard schema boundary.** The cheap model is only safe to rely on because its output is validated before anything branches on it. Without the schema, you've just made your routing less reliable to save a few cents.

## Closing

There's nothing flashy here, and that's the point. A regulated GenAI platform earns its keep by being **predictable**: it survives failures without losing work, it doesn't redo work it already did, it doesn't pay frontier prices for trivial tasks, and it tells you when something drifts. Durable orchestration, idempotent RAG, prompt caching, and model tiering are the four levers that get you there — and wired together carefully, they turn an impressive demo into a system you can actually put in front of regulatory reviewers.
