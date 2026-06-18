---
title: "A fault-tolerant, cost-optimized LLM platform for clinical document generation"
subtitle: "Durable orchestration, idempotent RAG, prompt caching, and model tiering on a regulated GenAI pipeline"
description: "How I engineer a production clinical content-generation platform to survive failures, skip redundant work, and cut LLM cost and latency by an order of magnitude — without trading away output quality."
publishedAt: "2026-06-19"
stack: ["Python", "FastAPI", "PostgreSQL", "RAG", "Prompt Caching", "Anthropic Claude", "AWS"]
order: 0
featured: true
accent: "violet"
metric: "~85% / ~90%"
metricLabel: "inference latency / token cost cut"
---

# A fault-tolerant, cost-optimized LLM platform for clinical document generation

*Durable orchestration, idempotent RAG, prompt caching, and model tiering — the four pieces that turn a fragile demo into a production GenAI system you can actually run.*

> *A sanitized architectural write-up of real production work on my current engagement as an AI Engineer with **Gilead Sciences** (via UsefulBI), building the platform behind automated clinical regulatory documents (CSR, DSUR, PLPS). Company-specific details — internal service names, prompts, schemas, exact model identifiers, and proprietary numbers — have been generalized. The patterns, trade-offs, and failure-mode handling are real.*

## TL;DR

Generating a clinical regulatory document is not one LLM call. It is ingestion, retrieval over a large corpus, dozens of section-wise generations, validation, and assembly — minutes of work, lots of model calls, and strict expectations on reproducibility. Four design decisions did most of the heavy lifting: **durable orchestration**, an **idempotent RAG pipeline**, **prompt caching**, and **model tiering**.

<div class="cs-statrow">
  <div class="s"><div class="v">~85%</div><div class="l">lower inference latency</div></div>
  <div class="s"><div class="v">~90%</div><div class="l">lower API token cost</div></div>
  <div class="s"><div class="v">min → sec</div><div class="l">repeat-run time</div></div>
  <div class="s"><div class="v">zero</div><div class="l">state loss on failure</div></div>
</div>

None of these is exotic. The discipline is in wiring them together so the system is boring to operate, which is exactly what a regulated pipeline needs.

## The shape of the problem

A finished report is long and section-structured. Producing one means **ingesting** source material, **retrieving** the right evidence per section from a large, mostly-unchanged corpus, **generating** each section against strict structure, **validating** with repair passes, and **assembling** the result.

Two properties make this harder than a typical RAG chatbot:

- **It is long-running.** A full document is minutes of wall-clock and a large number of model calls. Anything that restarts from scratch on failure is dead on arrival.
- **It is regulated.** Reviewers need to trust that the same inputs produce consistent, auditable output, and that nothing silently changed between runs.

So the platform has two jobs that pull in opposite directions: serve **low-latency interactive requests** *and* run **long-horizon batch generations** — without letting one starve or corrupt the other.

## Architecture at a glance

<figure class="cs-figure">
<div class="canvas"><img src="/portfolio/diagrams/arch06.svg" alt="Idempotent RAG pipeline on AWS: S3 sources to Textract extract to OpenSearch retrieve to Bedrock generate to EKS serve, sequenced by Step Functions with an RDS Postgres checkpointer and CloudWatch observability." loading="lazy" /></div>
<figcaption>Stateless typed steps (top) sequenced by a durable orchestrator; state lives in Postgres, not a process heap. Observability spans offline eval and live traces.</figcaption>
</figure>

The orchestrator owns *state and sequencing*. Everything else is a stateless step that takes typed input and returns typed output — which is what makes the whole thing checkpointable and testable.

## 1. Durable orchestration: never restart from zero

The first version of long-running generation was a single process holding everything in memory. It worked on demo inputs and fell over on real ones: a restart, a deploy, or one model timeout three-quarters of the way through threw away every section already generated.

I moved sequencing onto a **durable-execution model with a Postgres-backed checkpointer**. After each step completes, its result is committed as a checkpoint. If a worker dies — OOM, deploy, spot reclaim, a provider outage — the workflow **resumes from the last committed step instead of the beginning**. State lives in the database, not in a process's heap.

That single change bought **zero state loss across failures**, a clean **fast-path / slow-path split** (interactive single-section requests run synchronously; full-document generations are enqueued as durable workflows), and **portability** — the steps are ordinary typed functions, not welded to any one engine.

<div class="cs-pullquote">If you can't answer "where is this run right now?" from durable state, you don't have orchestration — you have a script that happens to call an LLM.</div>

## 2. Idempotent RAG: hash it, then skip it

The RAG pipeline is the classic chain — extract → chunk → embed → retrieve → generate. The expensive truth is that **most inputs don't change between runs.** Re-ingesting and re-embedding an unchanged corpus on every regeneration is pure waste, and it's the slowest part of the pipeline.

So I made every stage **idempotent and content-addressed.** Each stage hashes its inputs and writes its output keyed by that hash. On the next run, a matching hash returns the cache and skips the work; a changed input misses and recomputes.

<div class="cs-callout insight">
  <span class="ic"></span>
  <div class="bd"><strong>Key insight</strong><p>The key includes parameters and model versions, not just raw content — so a config change or a model upgrade correctly busts the cache instead of silently serving stale embeddings. In a regulated setting, "why did this output change?" must always have a precise answer.</p></div>
</div>

The payoff is steep: a regeneration where only one section's inputs changed reuses everything else and **drops from minutes to seconds.** It also makes the pipeline naturally **safe to retry** — a re-run converges to the same result instead of duplicating work.

## 3. Cutting cost and latency: prompt caching

LLM generation here leans on large, stable system prefixes — instructions, formatting rules, and shared context identical across hundreds of section calls. Sending those tokens fresh on every call is the dominant cost and a big chunk of the latency.

I restructured prompts so the **stable prefix is cacheable and the variable part is small and at the end**, then enabled **prompt caching**. On the high-volume RAG instructions this cut **inference latency by ~85%** and **API token cost by ~90%.**

<div class="cs-callout tip">
  <span class="ic"></span>
  <div class="bd"><strong>What actually matters</strong><p>Prefix stability is a feature you design for. The win only lands if the cached portion is byte-stable across calls — so pull anything dynamic (timestamps, per-call IDs, reordered context) out of the cached region, and keep the long shared block first with the small per-section delta last.</p></div>
</div>

## 4. Model tiering: don't send a simple task to a frontier model

A lot of the pipeline's work is routing and classification — "what kind of request is this, which section type, which path?" — and that doesn't need a frontier model. I built a **model-tiering router**: a **fast, low-cost model** handles intent classification under **strict Pydantic schemas** (validated, typed, safe to branch on), and only the genuinely hard generation work is **escalated to a frontier model.**

The schema constraint is what makes this safe. Forcing the cheap model's output through a Pydantic model means a malformed or hallucinated classification **fails closed** instead of silently mis-routing an expensive generation. Lower average cost, higher throughput, quality preserved where it counts.

## 5. Observability and evaluation: two layers

A generation pipeline you can't measure is one you can't trust — and here, trust is the product. Observability is **two complementary layers**: **offline dataset scoring** (a curated eval set that gates regressions before they ship when a prompt, model version, or retrieval parameter changes) and **live trace transformation** (real-run traces turned into structured signals — latency, cache-hit rate, validation-failure rate, token spend). Together they enable **drift detection and automated alerting**: the offline layer says whether a *change* is safe; the live layer says whether *production* still matches the baseline you signed off on.

## Trade-offs and what I'd tell you before you build this

<div class="cs-callout warn">
  <span class="ic"></span>
  <div class="bd"><strong>Watch out</strong><p>Content-hash caching is only as correct as your keys — forget a parameter or a model version and you'll serve stale results, the worst kind of bug because it's invisible. And durable execution adds real operational surface (a checkpoint store, idempotency at every step); it's worth it the moment a run is longer than a retry is cheap to redo.</p></div>
</div>

- **Prompt caching rewards discipline.** The headline numbers assume a stable prefix. Sloppy prompts get a fraction of the benefit and conclude caching "doesn't work."
- **Tiering needs a hard schema boundary.** The cheap model is only safe to rely on because its output is validated before anything branches on it.

## Closing

There's nothing flashy here, and that's the point. A regulated GenAI platform earns its keep by being **predictable**: it survives failures without losing work, doesn't redo work it already did, doesn't pay frontier prices for trivial tasks, and tells you when something drifts. Wired together carefully, those four levers turn an impressive demo into a system you can put in front of regulatory reviewers.
