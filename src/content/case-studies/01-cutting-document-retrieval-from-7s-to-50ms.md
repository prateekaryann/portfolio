---
title: "Cutting a clinical document retrieval API from 7s to 50ms"
subtitle: "A 99.3% latency reduction by replacing synchronous S3 polling with a database registry"
description: "How I turned an O(n) S3 prefix scan into an O(1) indexed PostgreSQL query — with a four-phase migration plan that caught a latent bug before it became an incident."
publishedAt: "2026-04-11"
stack: ["FastAPI", "PostgreSQL", "AWS S3", "SQLAlchemy", "Alembic"]
order: 1
featured: true
---

# Cutting a clinical document retrieval API from 7s to 50ms

*A 99.3% latency reduction by replacing synchronous S3 polling with a database registry — or, how I turned an O(n) prefix scan into an O(1) indexed query.*

> *A sanitized write-up of a real production optimization. Company-specific details (bucket layout, schema, product names) have been generalized. The architecture, trade-offs, and measurements are real.*

## TL;DR

A clinical document retrieval API was taking 7–8 seconds per request in production. After profiling and a root-cause investigation, I replaced the existing S3-polling retrieval path with a PostgreSQL document registry. The new path resolved requests in **under 50 milliseconds** — a **99.3% reduction** — without changing the API contract, the S3 storage layer, or any upstream consumer. The fix was about 400 lines of Python plus one Alembic migration, and it shipped in a single sprint.

This is the story of how I got there.

## Context: what the API does

In the platform, each clinical study produces documents that pass through a multi-stage review workflow — CSR sections, DSUR updates, PLPS revisions, and so on. Every version of every section is stored in S3 behind a structured prefix hierarchy that encodes study ID, document type, section ID, and version. The retrieval API is the read-side of this: given a logical document identifier, return the latest approved version, plus its metadata, plus a presigned URL for the client to download.

On the surface it is a simple request. In practice, "latest approved" is where the bodies are buried.

## The symptom

A few months in, we started seeing user complaints about document previews feeling sluggish. In the APM dashboard, the `/documents/{id}` endpoint showed a p50 of ~6 seconds and a p95 of **7–8 seconds**. Nothing else was obviously broken. No errors. No timeouts. The service was healthy. It was just… slow.

At that kind of latency, a document-heavy workflow (review a section, read it, comment, move on) becomes an interruption. The platform was technically working, and practically unusable.

## The first instinct was wrong

My first instinct was to blame cold starts or network flakiness — we were running FastAPI on a small EKS deployment, and I half-suspected a bad pod somewhere. I checked the container metrics: CPU calm, memory stable, GC not thrashing, no network errors. The latency was steady across every pod, every deployment, every day of the week. It wasn't a capacity problem. The request itself was doing work that took 7 seconds to complete.

**Lesson #1:** steady latency is a sign of steady badness, not transient badness. Don't chase retries and cold starts when the p50 and p99 are in the same neighborhood.

## Profiling the hot path

I dropped into the code path and added two things:

1. Per-step timing with `time.monotonic()` deltas around each major operation.
2. A temporary `structlog` log line at each step with the step name and duration.

Deployed to staging, hit the endpoint with a representative request, and read the logs. The output looked roughly like this:

```
step=auth                   duration_ms=3
step=load_document_record   duration_ms=12
step=list_s3_versions       duration_ms=6850  ← this is the problem
step=pick_latest_approved   duration_ms=45
step=generate_presigned_url duration_ms=18
step=build_response         duration_ms=4
```

**6.85 seconds of every request was a single S3 list operation.** Everything else was fine.

**Lesson #2:** profile before you guess. I would have spent an afternoon "optimizing" query plans and Redis caches before I realized the entire latency budget was burning in one step.

## Why was S3 so slow?

S3 is not a slow system. A `list_objects_v2` call usually returns in 30–100ms even for large buckets. The problem was how we were using it.

The retrieval logic was doing this:

1. Take the logical document identifier.
2. Compute the S3 prefix for that document (e.g. `studies/{study_id}/csr/{doc_type}/{section_id}/`).
3. Call `list_objects_v2` under that prefix to get every version of every file ever uploaded for that section.
4. Filter the results to the current logical document (each file had a suffix encoding version and approval state).
5. Sort by version, pick the latest with `approved=true`.
6. Generate a presigned URL for it.

Steps 4–6 are cheap. Step 3 is where all the time went.

Two things made step 3 slow:

**(a) The prefix was shared across many unrelated files.** In early design, the team had chosen to co-locate all historical section versions under one prefix, to make archival and backup scripts simpler. That was a sensible decision in isolation, but it meant that a single logical document's prefix contained hundreds to low thousands of sibling objects — all the other historical revisions, review artifacts, attachments, and intermediate working copies for the section.

**(b) `list_objects_v2` is paginated.** For a prefix with more than 1000 objects, S3 returns one page of 1000 and a `ContinuationToken` for the next. Each page is a separate HTTP round trip. On the hottest sections, we were doing **6 to 8 round trips** per retrieval, each adding a few hundred milliseconds of S3-side latency plus TLS handshake overhead from the AWS SDK.

For our worst sections, the per-request cost was roughly `8 × 700ms + 200ms ≈ 5.8s of S3 round trips + 200ms of in-process filtering`, matching the profiling numbers. This was textbook **O(n) behavior where n is "everything ever written to this prefix"**, and n was growing every time a user saved a draft.

**Lesson #3:** the performance of an S3-based lookup is a function of how many siblings share the prefix, not how large the target object is. The bucket was fine. The access pattern was wrong.

## The wrong fixes I considered (and why I dropped them)

Before landing on the eventual design, I considered three other options:

**Option A — Move to S3 object tags or S3 metadata filtering.** S3 supports per-object tags and you can query them. But S3 tag filtering is not a substitute for an index — you still have to list the prefix first, which is exactly the step that was slow. This would not have reduced the number of round trips.

**Option B — Introduce a Redis cache in front of the list call.** A cache would have hidden the problem for cache hits. But the write-side of the system was active — users upload new versions constantly — so the TTL would have to be short or we'd serve stale "latest". Cache-miss paths would still be 7 seconds, which is long enough to cause visible hiccups on first-load after any write. It did not fix the fundamental issue. Caches are good at hiding slow systems. They are bad at fixing broken data models. I wanted to fix the data model.

**Option C — Restructure the S3 prefix hierarchy.** Moving every historical version into a separate prefix per document would have shrunk `n` to 1 or 2. But this required a data migration across every existing document, coordination with the backup and archival tools that depended on the old layout, and a transitional period where the API would need to read from both layouts. It was the right long-term answer but the wrong answer for shipping this quarter.

All three of these options were trying to fix the symptom — slow S3 listing — rather than the underlying issue, which was:

> **S3 was being used as the source of truth for the question "what is the latest approved version of this document?"**

That question has nothing to do with object storage. It is relational metadata. It should live in a database.

## The fix: a PostgreSQL document registry

The actual fix was to introduce a small table — I'll call it `document_registry` — that mirrored the answer to that question directly.

```python
class DocumentRegistry(Base):
    __tablename__ = "document_registry"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    study_id: Mapped[UUID] = mapped_column(ForeignKey("studies.id"))
    document_type: Mapped[str]
    section_id: Mapped[UUID] = mapped_column(ForeignKey("sections.id"))
    logical_document_id: Mapped[str] = mapped_column(index=True)

    latest_version_number: Mapped[int]
    latest_version_s3_key: Mapped[str]
    latest_approved_at: Mapped[datetime | None]
    latest_approved_by: Mapped[UUID | None]

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
```

Plus the index that makes the lookup actually O(1):

```sql
CREATE UNIQUE INDEX ix_document_registry_lookup
  ON document_registry (logical_document_id)
  WHERE latest_approved_at IS NOT NULL;
```

The retrieval hot path became, in total:

```python
async def get_latest_approved_document(
    session: AsyncSession, logical_document_id: str
) -> DocumentResponse:
    entry = await session.scalar(
        select(DocumentRegistry).where(
            DocumentRegistry.logical_document_id == logical_document_id,
            DocumentRegistry.latest_approved_at.is_not(None),
        )
    )
    if entry is None:
        raise DocumentNotFoundError(logical_document_id)

    presigned = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": entry.latest_version_s3_key},
        ExpiresIn=300,
    )
    return DocumentResponse.from_registry(entry, presigned_url=presigned)
```

Two operations: one indexed lookup on PostgreSQL (sub-millisecond in practice), one `generate_presigned_url` call (local to the SDK, no S3 round trip — the presigned URL is just a signed query string computed client-side), one response build. No list. No pagination. No sorting.

## The write-side: keeping the registry accurate

A fast read path is worthless if the data behind it is wrong. The interesting part of the migration was the write side.

The registry needed to update whenever a new version was uploaded, approved, rejected, or rolled back. Every one of those actions was already going through a service-layer method on the backend — the team had been disciplined about not letting controllers touch S3 directly. That meant I had exactly one place per action type to hook into.

I wrapped each service method in a transactional context:

```python
async def approve_document_version(
    session: AsyncSession,
    document_version_id: UUID,
    approver_id: UUID,
) -> None:
    async with session.begin():
        version = await _load_version_for_update(session, document_version_id)
        version.approved_at = datetime.now(timezone.utc)
        version.approved_by = approver_id
        await _sync_registry(session, version)
```

`_sync_registry` is an upsert keyed on `logical_document_id` that updates the registry row to point at the latest approved version if this newly-approved version is actually the newest. Critically, **the upsert and the version update happen in the same database transaction**. Either both commit or neither does. The registry can never be stale relative to the source-of-truth `document_versions` table.

For documents that existed *before* the registry was introduced, I wrote a one-time backfill script. It walked the existing `document_versions` table and populated the registry in batches of 500, inside a transaction per batch. The backfill took about 4 minutes in production for several hundred thousand document versions.

## The migration plan

Two things had to be true on ship day:

1. **No downtime.** The retrieval API had to stay live the whole time.
2. **No correctness drift.** New writes and old writes had to both be reflected in the registry as soon as it became the read-side source of truth.

The plan had four phases:

**Phase 1 — Ship the registry table, the service-layer hooks, and the dual-write.** The new table existed, every write was synchronously populating it, but the read path was still going to S3. This was deployed and left running for two days. I wrote a nightly reconciliation job that compared the registry's idea of the latest approved version with the S3-listing algorithm's idea of it, and alerted on any mismatches.

Phase 1 caught exactly one class of bug: a race between the old prefix-based archival job (which was moving some rarely-touched files under different prefixes) and the registry sync. The archive job had been a cron that ran weekly and I hadn't known about it. I updated the archival job to also update the registry when it moved files.

**Phase 2 — Backfill historical data.** Ran the backfill script during a quiet window. The reconciliation job caught zero mismatches at the end.

**Phase 3 — Flip the read path.** Added a feature flag that switched `get_latest_approved_document` from the S3-listing implementation to the registry lookup. Flipped the flag for 1% of traffic, watched latencies, ramped to 10%, 50%, 100% over the course of an afternoon. Watched the APM dashboard show p50 and p95 collapse.

**Phase 4 — Delete the old code path.** Two weeks later, once the reconciliation job had run long enough without alerts, I deleted the S3-listing code path and removed the feature flag. The reconciliation job stays running as a correctness canary.

## The results

| Metric | Before | After | Change |
|---|---|---|---|
| p50 retrieval latency | 6,100 ms | 42 ms | -99.3% |
| p95 retrieval latency | 7,800 ms | 58 ms | -99.3% |
| p99 retrieval latency | 9,200 ms | 71 ms | -99.2% |
| S3 API requests / retrieval | 6–8 | 0 | -100% |
| Per-user document review latency (subjective) | "laggy" | "instant" | n/a |

The absolute numbers are not the only interesting bit. The **p95 went from 7.8s to 58ms**, and that's the metric that matters for user experience — it's the floor at which about one in twenty users sees "the app felt slow".

## What I would do differently if I had started from scratch

A few honest retrospective thoughts:

1. **I should have caught this in design review, not production.** The pattern of "S3 prefix with many siblings serves as implicit index" is a known anti-pattern. It's in every AWS best-practices guide. But it was inherited from the platform's early days when the team was three people and everything was fine at low volume. I should have flagged it the first time I read through the retrieval code, not the first time a user complained.
2. **Dual-write is under-rated for migrations.** The four-phase rollout (dual-write → backfill → read-flip → cleanup) is boring and slow, but it caught a latent bug (the archival job race) that would have been a production incident if we had done a big-bang cutover. For data migrations that affect a hot path, **always dual-write before you flip the read side**.
3. **Reconciliation jobs pay for themselves forever.** The nightly reconciliation is still running. It has caught one additional issue since launch (a bug in a bulk-import tool that bypassed the service layer) and that was free because the alerting was already plumbed in.
4. **Database indexes are a form of caching.** I spent a lot of words earlier in this piece distinguishing "cache" from "index". They're the same thing on a spectrum: both are redundant data structures that store a precomputed answer to a frequent question. The difference is that a well-chosen index is inside the transactional boundary of the database, so it can't go stale the way a Redis cache can. If you can fit your hot query into an indexed path, you should always prefer it to a cache.

## What transfers to other systems

If you read this and your project has nothing to do with regulated documents or clinical data, the shape of the problem is everywhere:

- **Any API whose latency depends on listing a blob store prefix.** Same architecture, same fix.
- **Any "what is the latest X" query implemented by scanning a log or an event stream.** Use a projection table. Keep it in sync transactionally with the source of truth.
- **Any long-running system where an architectural decision from the 3-person-team days quietly became load-bearing.** Go look at it. Profile it before you need to.

The shape of the fix — *move a frequently-asked question out of the storage layer and into an indexed projection inside your transactional database* — is the single highest-ROI pattern I apply in backend work. It works because storage layers optimize for different things than query layers, and the right place to answer "latest X" is almost never the same place as the right place to store X itself.
