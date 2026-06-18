---
title: "Orchestrating multi-step LLM workflows with AWS Step Functions and Bedrock"
subtitle: "How I built a regulated-industry report generation pipeline without a single fragile cron job"
description: "Parallel section-wise generation, validation with repair prompts, human-in-the-loop via Step Functions callback tokens, and the observability layer that makes it all debuggable at 2 a.m."
publishedAt: "2026-04-11"
stack: ["AWS Step Functions", "AWS Bedrock", "AWS Lambda", "Amazon S3", "PostgreSQL"]
order: 2
featured: true
accent: "indigo"
---

# Orchestrating multi-step LLM workflows with AWS Step Functions and Bedrock

*How I built a regulated-industry report generation pipeline that handles ingestion, section-wise generation, validation, and assembly — without running it on a single fragile cron job or a single bloated Lambda.*

> *A sanitized architectural write-up of a real production system. Company-specific details (section types, template formats, model choices, prompts) have been generalized. The orchestration pattern, trade-offs, and failure-mode handling are real.*

## TL;DR

Clinical regulatory documents are long, section-structured, and slow to produce. Generating a full report is not a single LLM call — it's an ingestion stage, a set of parallel section-wise generation stages, a validation stage, and an assembly stage, with human-in-the-loop checkpoints along the way. I built the orchestration layer on **AWS Step Functions with a Lambda per stage, pulling models through AWS Bedrock**. This piece walks through the design decisions and the things that surprised me in production.

The architecture is boring on purpose. Boring orchestration is how you get a regulated pipeline that you can actually debug at 2 a.m.

## Why not a single Lambda?

The first version of this pipeline, before I joined, was a single long-running Python process. It worked for small inputs and fell over on big ones for predictable reasons:

1. **Lambda has a 15-minute wall-clock limit.** A full regulatory report, section by section, comfortably exceeds that.
2. **LLM calls are the slowest thing in the pipeline.** A single timeout or a single rate-limit from the model provider takes the whole generation down. Retrying from scratch re-does every section.
3. **Partial failure is invisible.** If section 7 of 14 fails halfway through, the orchestrator process has no idea what was already done. Every retry restarts from zero.
4. **Nothing is observable.** "Where are we in the pipeline right now?" was a question I literally could not answer without reading log files.

Any one of those issues is survivable in isolation. Together, they mean you have a pipeline that works on the demo data and dies on real inputs — which was exactly the state I inherited.

## What I wanted out of the replacement

Before writing any code, I wrote down what a good orchestration layer had to do:

1. **Never lose work.** If stage 3 of 8 succeeds and stage 4 fails, the retry starts at stage 4.
2. **Run sections in parallel.** The individual section-wise generation calls are independent. The pipeline should exploit that.
3. **Be observable.** An engineer or a product manager should be able to look at a dashboard and see exactly which step of which run is currently in-flight.
4. **Survive model-provider flakiness.** Retries with exponential backoff on throttling. Graceful failure paths when a model provider has an outage.
5. **Have a clean human-in-the-loop seam.** Regulatory workflows have review checkpoints. The pipeline needs to be able to pause for hours or days while a human approves something, then resume.
6. **Be replaceable.** I didn't want the team to be locked into Step Functions forever. The individual Lambdas should be portable to any orchestrator (Temporal, Prefect, Airflow, a custom Celery workflow) with minimal surgery.

## The architecture at a glance

<figure class="cs-figure">
<div class="canvas"><img src="/portfolio/diagrams/arch02.svg" alt="AWS Step Functions state machine: Ingest, Plan, parallel Map (generate/validate with repair), Human gate via callback token, Assemble, Notify. Bedrock for model calls, S3 for documents." loading="lazy" /></div>
<figcaption>Each box is a Lambda; Step Functions owns state, transitions, retries, parallelism, and the human-review pause.</figcaption>
</figure>

Each box is a Lambda. The orchestration — state, transitions, retries, parallelism, the human-review pause — is entirely handled by Step Functions.

## Why Step Functions, specifically

I considered four orchestration options:

| Option | Why I didn't pick it |
|---|---|
| Plain Lambda calling Lambda via SQS | Works, but I would have re-implemented half of Step Functions by hand. State tracking, retries, visibility, parallelism — all stuff I'd have to build. |
| AWS Batch | Right tool for compute-heavy, CPU/GPU-bound batch jobs. Wrong tool for an orchestration with lots of small steps and external API calls. |
| Temporal / Prefect / Airflow (self-hosted) | Fantastic choices for a team that already runs them. Running any of them from scratch meant standing up and owning a new piece of infrastructure, plus convincing a regulated-industry security review. Not worth it for v1. |
| **AWS Step Functions** (winner) | Native to the AWS environment the platform already used. Zero infrastructure to run. First-class human-in-the-loop via callback tokens. First-class parallelism via Map state. Has an OK-ish visual debugger. |

The decision mostly came down to **"how much new infrastructure can I justify for this project?"** The answer was "as little as possible, because the team's appetite for new operational surfaces is already full." Step Functions was the path of least surprise.

## The interesting stages

### Stage: Generate section

This is the stage that actually calls Bedrock. It's a Lambda that:

1. Receives a section task from the Map state: `{study_id, section_type, context_refs, output_key}`.
2. Loads the normalized source content from S3.
3. Renders a section-specific prompt template with the source content interpolated.
4. Calls `bedrock_runtime.invoke_model` or `invoke_model_with_response_stream`.
5. Catches two categories of Bedrock error explicitly:
   - **Throttling** (`ThrottlingException`) → raise an error that's marked as retryable in the Step Functions retry policy.
   - **Model-side error** (`ModelErrorException`, `ServiceUnavailableException`) → same handling.
6. Writes the raw model output to S3 at `output_key`.

In Step Functions ASL, the retry policy on this task looks like:

```json
{
  "ErrorEquals": ["ThrottlingException", "ModelErrorException", "ServiceUnavailableException"],
  "IntervalSeconds": 2,
  "BackoffRate": 2.0,
  "MaxAttempts": 5,
  "JitterStrategy": "FULL"
}
```

Five attempts with jittered exponential backoff covers every throttling and transient-error case I've seen in practice. On the sixth failure, the state transitions to a dedicated `SectionFailed` state that writes a failure record to the database and lets the rest of the Map run complete — rather than taking the entire report down because one section's model call failed.

**Lesson:** always design your Map branches so one bad section can't kill the whole report. A partially-generated report that a human can review and retry the missing section on is much more useful than a total failure.

### Stage: Validate section

The validate stage is a Lambda that runs the model's output through:

1. **Schema validation.** Each section type has a JSON schema describing its required structure. The Lambda uses a strict JSON schema validator and fails fast on malformed output.
2. **Rule-based checks.** Things a schema can't express: cross-references exist, numeric values fall in sane ranges, prohibited terminology is absent, sections reference real source documents.
3. **Hash check for prompt injection.** We maintain a small denylist of output patterns that indicate the model decided to do something unscripted. If the validator catches one, the section is marked `failed_safety_check` and sent to a human without auto-retry. This has fired exactly once in production, which is both reassuring and a good reminder that it needs to be there.

If validation fails, the state machine transitions to **Retry with repair prompt**: a second Lambda that builds a "you made these specific mistakes, try again" prompt and calls Bedrock one more time with the original context plus the validator's error list.

<div class="cs-callout tip"><span class="ic"></span><div class="bd"><strong>Pattern worth stealing</strong><p>Never retry an LLM with the exact same prompt on failure — it will almost certainly reproduce the same error. Retry with the validator's error list in the prompt, so the model has new information to act on.</p></div></div>

### Stage: Human review gate

This is the stage that would have been hardest to build without Step Functions. The requirement is:

> After all sections are generated and validated, pause the pipeline. Notify the assigned regulatory reviewer. When the reviewer signs off in the app, resume the pipeline at the assembly step.

Step Functions supports this natively via **task tokens with a callback pattern**. The flow is:

1. The human review state is a Lambda task with `"waitForTaskToken": true`. When Step Functions reaches it, Step Functions generates a unique task token and hands it to the Lambda.
2. The Lambda writes a row in a `pending_review` table: `{execution_id, task_token, section_ids, reviewer_id, created_at}`, notifies the reviewer via the platform's notification bus, and **returns** (important — the Lambda itself does not wait).
3. Step Functions holds the state machine paused on that task, potentially for hours or days. There's no polling, no cost except a tiny amount of state storage.
4. When the human reviewer clicks "Approve" or "Reject" in the UI, the FastAPI backend calls `stepfunctions.send_task_success` or `send_task_failure` with the stored task token.
5. Step Functions resumes the state machine and transitions to the next state based on success or failure.

The whole pattern, top to bottom, is about 150 lines of code in a Lambda plus a few rows of infrastructure. Implementing it on raw SQS + polling would have been several times larger and far more fragile.

**Lesson:** if your workflow has a "wait for a human" shape, look for an orchestrator that treats that as a first-class primitive. Don't roll it yourself.

## Observability — the thing I underestimated

Every Step Functions execution gets a unique ARN and shows up in the console with a visual state-by-state view. That's the happy-path observability story and it's fine.

The unhappy-path story is harder. When a support ticket comes in saying "run 12345 is stuck", you need to be able to answer:

- Which state is it in right now?
- How long has it been in that state?
- What inputs did it get?
- Which Lambda invocations are linked to this execution?

What I added on top:

1. **Every Lambda logs its Step Functions execution ARN as a structured log field.** Now any log line can be joined back to a specific pipeline run.
2. **A `pipeline_run` table in PostgreSQL** that stores a record per Step Functions execution, with the report ID, state, started_at, current_state, reviewer_id, and the execution ARN. The state machine itself updates this table at each major transition. This gives the product team a "what's happening right now" view without needing to crawl the Step Functions API.
3. **CloudWatch alarms on execution failures**, differentiated by whether the failure was in a model call (retry policy exhausted) vs in a validator (schema mismatch) vs in assembly (downstream service). Each alarm class goes to a different pager because the response is different.

The single most useful piece of this was the database-backed pipeline state. An engineer wanting to know "what's going on with report X" can run a SQL query. They don't have to know that Step Functions exists.

## What I would do differently

Honest retrospective notes:

1. **I started with serial section generation and switched to parallel later.** That was a mistake — the parallel version was not actually harder to write, and the serial version was slow from day one. If your workflow has an obvious Map state, use it immediately.
2. **I over-indexed on Step Functions' visual debugger and underbuilt the database-backed view.** The visual debugger is great for engineers. It is useless to a product manager. I should have built the `pipeline_run` table in week one, not week four.
3. **Retries with jitter are free.** Do not write custom retry loops inside your Lambdas. Let the orchestrator handle it via its retry policy.
4. **The denylist safety check earns its keep from day one.** Even on a regulated workflow where the inputs are highly structured, the one-in-ten-thousand case where the model does something unexpected is the one you care about most.
5. **A schema validator is the cheapest, highest-ROI thing you can add to an LLM pipeline.** It turns "the model is being weird" from an unknown-unknown into a known-unknown with a clean retry path.

<div class="cs-pullquote">Your LLM pipeline is a distributed system — and everything distributed systems have taught us over the last twenty years still applies.</div>

## What transfers to other systems

This architecture is not specific to clinical regulatory workflows. The shape applies wherever you have:

- A multi-stage pipeline where stages have different durations and different failure modes.
- Stages that can legitimately be parallelized.
- External calls that are slow, flaky, or rate-limited.
- A requirement to pause for human input somewhere in the middle.
- A need to show a non-engineer where the work is in the pipeline.

The unglamorous summary: **your LLM pipeline is a distributed system, and everything distributed systems have taught us over the last twenty years applies**. Idempotent stages, transactional state transitions, retries with jitter, first-class human-in-the-loop, real observability. None of it is new. It's just newly important now that LLM calls are the slow and flaky parts of every pipeline that uses one.
