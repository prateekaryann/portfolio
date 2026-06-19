---
title: "Building resilient switchover automation with gRPC"
subtitle: "State-machine-driven DB failover with bidirectional streaming"
description: "How I replaced a brittle REST-based primary-standby failover system with a gRPC-driven state machine that handled hundreds of enterprise clusters without split-brain — and why fencing is non-negotiable."
publishedAt: "2026-04-11"
stack: ["gRPC", "Python", "PostgreSQL", "Distributed Systems", "Protocol Buffers"]
order: 3
featured: true
accent: "amber"
metric: "22→9 min"
metricLabel: "median switchover · 0 split-brain"
---

# Building resilient switchover automation for distributed DB clusters with gRPC

*How I replaced a brittle REST-based primary-standby failover system with a gRPC-driven state machine that handled hundreds of enterprise-critical clusters without human intervention.*

> *A sanitized write-up of real production work. Internal tool names, specific vendor behaviors, and database topology details have been generalized. The protocol design, failure modes, and operational lessons are real.*

## TL;DR

The database platform team I joined at Cisco ran several hundred primary-standby database clusters for internal enterprise applications. Switchovers — promoting a standby to primary for maintenance, patching, or recovery — were done through a mix of REST calls, shell scripts, and human eyeballs. Failures were common and diagnostics were painful. I replaced that system with a **gRPC-based switchover orchestrator** that modeled the switchover as an explicit state machine, used bidirectional streaming for live progress, and made recovery from partial failures trivial. The new system cut median switchover time by more than half, eliminated an entire class of split-brain scenarios, and became the default operational tool for the team within a quarter.

<div class="cs-statrow"><div class="s"><div class="v">22→9min</div><div class="l">median switchover</div></div><div class="s"><div class="v">0</div><div class="l">split-brain (was 2)</div></div><div class="s"><div class="v">40→5min</div><div class="l">operator time / run</div></div><div class="s"><div class="v">100s</div><div class="l">clusters automated</div></div></div>

## The starting point

The existing switchover tool was a small Python service that exposed REST endpoints. A typical switchover looked like this:

1. Operator opens a ticket with the cluster ID, the reason, and the target window.
2. Operator SSH-es into a bastion and runs a shell wrapper that called the REST endpoint.
3. The service performs the switchover in one long-running HTTP request — stopping writes, promoting the standby, re-pointing the primary, running post-switchover validation.
4. The client waits for the HTTP response, sometimes for tens of minutes.
5. If the HTTP connection dropped (which happened — any idle proxy in the path would cut it), the client had no way to know if the switchover finished successfully, or where in the sequence it died.

The fundamental mismatch was this: **a switchover is a multi-step, long-running workflow with observable intermediate states, but REST was modeling it as a single request-response**. When one of the middle steps failed, the whole thing looked like "504 gateway timeout" to the operator, who then had to manually log into both database hosts to figure out what state they were actually in.

This model had three specific failure modes I kept seeing:

1. **Phantom switchovers.** The operator sees a timeout, assumes it failed, re-runs the command. The first one had actually succeeded. Now you have two attempts fighting each other over the same cluster.
2. **Half-promoted clusters.** The standby got partially promoted — replication stopped, but the primary flag never flipped — and the cluster was left in a zombie state where reads worked and writes silently failed.
3. **No live feedback.** An operator kicking off a 15-minute switchover just saw a spinner. If the middle stages were hung, there was no way to see *which* stage.

Any one of these was survivable. Together they made switchovers feel dangerous enough that operators would put them off, which meant deferred patching, which meant larger blast radius when something broke.

## Why gRPC, specifically

I evaluated four replacement options:

| Option | Verdict |
|---|---|
| Polished REST + polling endpoint | Patches the symptoms without fixing the model. Still two protocols (kickoff + status), still race-prone. |
| WebSockets | Solves the live-feedback problem but doesn't give me types or contract enforcement. Hand-rolling the wire protocol was a step backward. |
| SSE (Server-Sent Events) | Same concerns as WebSockets, and no bidirectional channel if we ever needed operator input mid-flow. |
| **gRPC with bidirectional streaming** | Typed contracts via protobuf. First-class streaming in both directions. Built-in deadlines, cancellation, status codes. Language-agnostic clients. |

gRPC's killer feature for this was **bidirectional streaming**. A switchover request opens a stream, and:

- The client sends one initial request message (cluster ID, options, confirmation level)
- The server sends a stream of progress events as each stage of the switchover executes
- The client can send follow-up control messages (e.g. "abort", "force-continue-after-warning")
- The stream closes when the switchover terminates (success, failure, or abort)

That maps cleanly to how a switchover actually works. It also means the operator UI can render a live timeline instead of a spinner — I got the "which stage is hung" question answered for free.

## The proto

Here's the shape of the contract (simplified):

```protobuf
syntax = "proto3";
package switchover.v1;

service SwitchoverService {
  rpc RunSwitchover(stream SwitchoverClientMessage)
      returns (stream SwitchoverServerEvent);

  rpc GetClusterState(ClusterRef) returns (ClusterState);
  rpc ListActiveSwitchovers(ListActiveRequest) returns (ListActiveResponse);
}

message SwitchoverClientMessage {
  oneof payload {
    SwitchoverRequest initial = 1;
    ControlMessage control = 2;
  }
}

enum Stage {
  STAGE_UNSPECIFIED = 0;
  PRE_FLIGHT_CHECKS = 1;
  QUIESCE_WRITES = 2;
  WAIT_FOR_REPLICATION_CATCHUP = 3;
  PROMOTE_STANDBY = 4;
  REPOINT_CLIENT_TRAFFIC = 5;
  POST_SWITCHOVER_VALIDATION = 6;
  CLEANUP = 7;
}
```

Two design choices in there that earned their keep:

1. **Every stage is an explicit enum value, and every stage emits its own event.** This turned "where is the switchover right now" from a log-grepping exercise into an index lookup.
2. **Warnings are a first-class event type, separate from failures.** Some switchover stages raise concerns that aren't blocking but should be seen by a human — e.g. "replication lag was 12 seconds, higher than expected, but we caught up."

## The state machine behind the service

On the server side, a switchover was modeled as an explicit state machine:

<figure class="cs-figure">
<div class="canvas"><img src="/portfolio/diagrams/arch03.svg" alt="gRPC switchover state machine: pre-flight, quiesce, catch-up, fence, promote, validate; a fencing step before promotion prevents split-brain." loading="lazy" /></div>
<figcaption>Every stage is an explicit, observable state persisted in Postgres. A fencing step before promotion makes split-brain impossible; any stage can fail to FAILED/ABORTED and resume from the database.</figcaption>
</figure>

The state machine lives in PostgreSQL — one row per switchover with the current stage, start time, operator, cluster, and a JSON blob for stage-specific context. Every state transition is a SQL `UPDATE` inside a transaction.

**Why PostgreSQL-backed state instead of in-memory?** Because the server can crash mid-switchover and the workflow can't just vanish. With persistent state, a restart can read the `switchovers` table, find any rows in non-terminal states, and resume them or mark them for operator attention.

## The three nastiest failure modes

I learned these in production.

### Failure mode 1: Client disconnects mid-switchover

The operator's laptop Wi-Fi blips. The gRPC stream drops. The switchover is in `PROMOTE_STANDBY`. What happens?

**Wrong answer:** server assumes the operator has given up, aborts the switchover, rolls back.
**Right answer:** server keeps running. The state is in PostgreSQL. The operator reconnects, calls `GetClusterState` (or `ListActiveSwitchovers`), sees the switchover is still in-flight, optionally reopens a stream to get live events again.

The first version of the service I shipped had the wrong answer. An operator's VPN dropped during a patching window and the server rolled back a switchover that was 80% complete, corrupting the replication setup in the process. Took me a long night to untangle. The next deploy had the right answer.

**Lesson:** in a long-running workflow, the client is an observer, not a driver. Decouple workflow lifetime from connection lifetime.

### Failure mode 2: Two operators start simultaneous switchovers on the same cluster

If you have hundreds of clusters and a team of five SREs, sooner or later two of them kick off a switchover on the same cluster within the same minute.

The gRPC service uses a PostgreSQL advisory lock keyed on the cluster ID. The second request fails with `FailedPrecondition` and an error message that says "switchover already in progress: {other_switchover_id}". The operator who hit the lock can subscribe to the existing one and watch the first one finish.

**Lesson:** any operation that mutates a shared resource needs an explicit lock you can inspect. Don't rely on "nobody would do that" — somebody always does.

### Failure mode 3: Split-brain from a network partition mid-promotion

This was the scariest one. The sequence:

1. Switchover enters `WAIT_FOR_REPLICATION_CATCHUP`
2. Standby reports "I'm caught up within 50ms lag, good to go"
3. Server starts `PROMOTE_STANDBY`
4. **At that exact moment**, the network path between the old primary and the standby drops
5. The promotion proceeds. Standby becomes the new primary. But the old primary, still up, still accepting connections from clients that hadn't been repointed yet, also thinks it's the primary.
6. Split brain. Two writers. Data corruption waiting to happen.

The fix was a **fencing step** inserted between `WAIT_FOR_REPLICATION_CATCHUP` and `PROMOTE_STANDBY`. Before promoting the standby, the server explicitly kills the old primary's ability to accept writes — either by flipping it to read-only at the database layer, by removing it from the load balancer, or in the worst case by STONITH. Only after fencing succeeds does the promotion start.

<div class="cs-callout warn"><span class="ic"></span><div class="bd"><strong>Fence before you promote</strong><p>Always. No exceptions. Split-brain is not a problem you can fix after the fact — so the fencing step (kill the old primary’s writes before promoting the standby) is non-negotiable in any failover automation.</p></div></div>

## The operational wins

| Metric | Before | After |
|---|---|---|
| Median switchover time | ~22 minutes | ~9 minutes |
| Switchovers requiring manual recovery | ~15% | <1% |
| Split-brain incidents | 2 in the year before | 0 in the year after |
| Average operator time spent per switchover | ~40 minutes | ~5 minutes |

The most interesting metric is the last one: **average operator time per switchover dropped from ~40 minutes to ~5 minutes**. That's not because the switchover itself got 8× faster. It's because operators trusted the tool. With the live event stream, they could start a switchover, see the first two stages succeed, and go back to whatever else they were working on.

**Lesson:** the ROI of operational tooling is dominated by trust, not by raw speed. If your operators don't trust your tool, they'll watch it like a hawk and the nominal speed gains evaporate into operator attention cost.

## What I'd do differently

1. **Start with fencing, don't retrofit it.** Fencing should be a first-class step from day one of any failover automation, because the failure mode it catches is unrecoverable.
2. **Emit events to a message bus, not just the stream.** Later, I wanted to build a dashboard showing every switchover across the fleet in real time. If I were rebuilding, I'd fan events out to both the gRPC stream and a Kafka topic.
3. **Make "resume from stage N" a first-class CLI command.** I built this after the fact as a janky admin endpoint. It should have been supported from the start.
4. **Version the proto before you ship.** I used `package switchover.v1` from the start, which saved me once when I needed to add a field without breaking existing clients.

<div class="cs-pullquote">Model long-running operations as state machines, expose their state over a streaming protocol, and keep the authoritative state in a transactional database.</div>

## What transfers

Any long-running, multi-stage operation where:

- A single request-response HTTP model maps badly onto the workflow shape
- Operators need live feedback about intermediate state
- Partial failure recovery matters
- Multiple operators could accidentally collide on the same resource

…is a candidate for this pattern. gRPC bidirectional streaming is the most under-used feature of the protocol and the one that earns its keep the most in operational tooling.

The one-line version: **model long-running operations as state machines, expose their state over a streaming protocol, and keep the authoritative state in a transactional database**.
