---
title: "Automating MySQL cluster upgrades from 1 hour to 10 minutes as an intern"
subtitle: "A story about initiative, unasked-for work, and the difference between 'the task' and 'the job'"
description: "My first real production automation project — shipped on the side in my fourth month as an intern, before anyone asked for it. The lessons I learned shadowing senior engineers, classifying step outcomes, and the five patterns I still use four years later."
publishedAt: "2026-04-12"
stack: ["Python", "Ansible", "MySQL", "Jenkins", "Bash"]
order: 5
featured: true
---

# Automating MySQL cluster upgrades from 1 hour to 10 minutes as an intern

*A story about initiative, unasked-for work, and what I learned about the difference between "the official task" and "the real job" in my first six months on a platform team.*

> *A sanitized write-up of real early-career work. Specific tool names, internal team names, and cluster counts have been generalized. The lessons and the arc are real.*

## The short version

In my first three months as a Software Engineer Intern on a database platform team, I was asked to run routine MySQL cluster upgrades as part of the standard on-call rotation. Each upgrade took about an hour of manual work: draining traffic, upgrading the binaries, running data fixes, rolling clients, re-balancing. It was tedious but stable, and nobody on the team seemed bothered by it.

In my fourth month, I automated the whole thing. The new upgrade tool took the same work from roughly an hour of attention-heavy manual clicking to about ten minutes of watching a log stream. I wrote it in my evenings, without being asked, as a side project.

By my sixth month, the tool had replaced the manual playbook entirely for routine upgrades. By the time I converted from intern to full-time engineer, it had run more than a hundred upgrades without intervention. It became the first thing I'd ever built that outlived the reason I built it.

This piece is about the stuff nobody teaches you in school — how initiative actually gets rewarded on engineering teams, why unasked-for work is risky but high-leverage, and the specific lessons I learned from shipping my first real production automation.

## Setting the stage

Cisco ran a lot of MySQL clusters. Internal enterprise applications used them for everything from provisioning workflows to audit logs to the occasional oddball service nobody remembered setting up. The database platform team's job was to keep these clusters healthy and current.

A routine upgrade — going from MySQL 5.7 to the next patch release — was a well-defined sequence: SSH to the cluster's bastion, check replication lag, take the cluster out of the service registry, flip writes to read-only on the primary, upgrade the standby's binary, restart, wait for catchup, switch over, upgrade the old primary, restart, re-sync, re-register, smoke test, tell the team. Every step was documented in the team's runbook as a set of commands to copy-paste. A good upgrade with no surprises took about an hour. A bad upgrade — one with an unexpected replication lag warning, a misbehaving package manager, a flaky service registry call — could take two.

The team had been doing upgrades this way for a few years. The runbook was solid, the steps were well understood, and nobody was going to die from the occasional two-hour upgrade. It was just … routine.

## What the team wanted me to do

My intern project, on paper, was "improve the provisioning scripts for new cluster deployments." That was a real problem, and it was what I spent my official work hours on. The provisioning project shipped on time and I was proud of it.

But in parallel, I was getting paged into the on-call rotation to help shadow upgrades. "Help" meant standing behind a senior engineer, watching them run the runbook steps, asking questions, and occasionally being allowed to run a non-scary command myself. I did six or seven shadowed upgrades that way before they let me run one unsupervised.

When I ran my first one alone, it took me almost three hours because I kept double-checking myself against the runbook and triple-verifying every step. The senior engineer who was on secondary for my run was patient about it. But I left that evening with a very specific thought that I couldn't shake: *there is no good reason this has to be a manual process*.

## The (unofficial) project

I didn't bring it up in standups. I didn't write a design doc. I didn't ask for permission. I just started writing Python in my evenings.

The first version was an absolute mess. I tried to use Ansible for the whole thing, which was a reasonable instinct, but I didn't understand Ansible well enough yet, so what I actually had was a half-baked playbook that called shell scripts that called Python scripts that called the service registry's REST API. It worked, sort of, on my local Vagrant VMs against a fake cluster I had set up. But it also had race conditions, no error handling, and no way to recover if any step failed partway through.

I almost threw it away. Then I did a thing that I now think was the actual inflection point: I stopped trying to automate the runbook and started trying to understand it.

I sat down with the runbook and for every step, I wrote down three things:

1. **What could go wrong at this step?**
2. **If it does go wrong, what does the recovery look like?**
3. **How does a human currently know the step succeeded?**

That exercise was the first time I really saw what the senior engineers were doing during their manual upgrades. They weren't running a sequence of commands. They were running a sequence of commands and **watching for specific failure modes** at each one. Their value wasn't executing the steps — the runbook had the steps. Their value was in the ten seconds of attention they gave to each step's output, matching it against the patterns they'd learned to recognize as "this is going wrong, stop now."

Once I saw that, I understood why automation was going to be harder than I thought, and also why it was going to be so much more valuable than I thought.

The automation had to *replicate the attention*, not just the commands.

## The second version

The second version of the tool was Python on top of Ansible, with each step wrapped in a function that:

1. Ran the step
2. Parsed the step's output against a set of known patterns
3. Classified the result as `ok`, `ok-with-warning`, or `error`
4. Emitted a structured log line with the classification
5. Either continued, paused for human review (on warning), or aborted (on error)

The list of known patterns came from two sources. The runbook itself had some — phrases like "replication lag > 30 seconds" or "package not signed" that the runbook told humans to watch for. And I supplemented those with the things I saw in actual upgrade logs, going back through six months of past upgrades and pulling out every weird failure mode anyone had encountered.

That second source was the one that made the tool actually useful. The runbook described the happy path plus a handful of common errors. The historical logs contained the long tail of weird-shit-that-actually-happens. **If you're automating someone else's manual process, read the logs of their past runs, not just their documentation. The documentation captures what they think they do. The logs capture what they actually do.**

## Shipping it (quietly)

I had the second version working end-to-end against my Vagrant setup after about three weeks of evening work. I was 19 years old and I had written something that actually did a useful thing and I was incredibly nervous about showing it to anyone on the team.

My first instinct was to bring it to standup and present it. My second instinct, which was correct, was to test it once against a real staging cluster first.

I asked the senior engineer who'd been on secondary for my first manual upgrade — the one who'd been patient with me — if he'd let me run my tool against a staging cluster while he watched. Not to replace the runbook, just to see what would happen. He said yes, curious.

It worked. Not cleanly — it caught one warning that it wanted to pause on that turned out to be a false positive, and it logged some stuff in a format that wasn't super readable — but the core thing was: it ran through all thirteen steps of the runbook on a real cluster, correctly, and produced an output that a human could audit.

The senior engineer said something I still remember: "You should show this to the team lead on Monday."

Monday came. I showed it to the team lead. The team lead said, essentially, "Why didn't you tell me you were working on this?"

I didn't have a good answer. The real answer was that I'd been afraid I'd be told to stop — that building unasked-for tools on the side wasn't what interns were supposed to do, that I'd get in trouble for not focusing on my official project. The team lead's actual response was the opposite: he was mildly irritated that I hadn't flagged it because he would have given me more support and maybe moved my official project timeline to accommodate it.

**"I was afraid to ask" is almost always a worse call than "I asked and they said no."**

## From prototype to production

The team spent the next two weeks hardening the tool. What I'd built was a proof of concept. What we needed for production was:

- Proper config management — reading cluster metadata from the service registry instead of hardcoding
- Integration with the team's existing Jenkins pipeline so upgrades could be kicked off from the usual place
- Alerts plumbed into the usual Slack channel
- A dry-run mode so operators could see what the tool would do without running it
- Unit tests on the step-classifier functions
- Runbook documentation for the tool itself

All of that took more time than building the prototype did, which is another lesson: **the last 20% of production-readiness is always 80% of the work**. The prototype is the easy part.

The tool went live against the first real production cluster about six weeks after my initial "show and tell" with the senior engineer. It ran green. The upgrade took twelve minutes. The senior engineer pinged me in Slack with a thumbs up and a one-line note: *"nice."*

I took a screenshot.

## The numbers

| Metric | Before (manual) | After (automated) |
|---|---|---|
| Time per routine upgrade | ~60 minutes | ~10 minutes |
| Time per complex upgrade | ~120 minutes | ~15 minutes |
| Engineer attention required | Continuous for the whole hour | Spot-check the final output |
| Upgrades running in parallel | 1 per engineer | Limited only by staging capacity |
| Variance across engineers | Significant | Zero |
| Upgrades where the runbook got updated after the fact | Occasional | Zero |

The raw time improvement (60 min → 10 min) is the headline. The more interesting number is the last row: **the upgrades that modified the runbook went to zero, because the automation WAS the runbook**. Every improvement to the upgrade procedure now happened as a pull request to the tool, which meant every improvement was reviewed, tested, and preserved.

Within the first year, the tool ran more than a hundred production upgrades. There was one incident during that time, and it turned out to be a misconfigured cluster rather than a tool bug. The tool correctly classified the step as an error and aborted before doing any damage.

## The actual lessons

Five things I learned on this project that I still use, four years later.

### 1. Shadow before you automate

If you try to automate a manual process without understanding the attention layer, you'll automate the commands and miss the judgment. The tool will run but it won't be trustworthy. Watch senior engineers run the process enough times to see what they're paying attention to, not just what they're doing.

### 2. Read the logs, not just the docs

The runbook is what people *think* they do. The historical logs are what they *actually* do. The delta is where the long tail of failure modes lives.

### 3. Classify step outcomes, don't just execute steps

A naive automation tool runs commands and checks exit codes. A useful one classifies the output against a known vocabulary: `ok`, `ok-with-warning`, `error`, `unknown`. The "unknown" bucket is important — it means "I don't recognize this output, pause for a human." Treating "I don't know what this means" as a first-class outcome is what makes an automation tool trustworthy.

### 4. Ship the prototype. Then do the 80% of work that remains.

I almost stopped at "it works against Vagrant." The work between "it works against Vagrant" and "the team can trust it in production" was four or five times as much as the original prototype. That ratio has held for every production tool I've shipped since.

### 5. "I was afraid to ask" is almost always a worse call than "I asked and they said no."

I spent three weeks building in secret because I was afraid of being shut down. That fear was wrong and it cost me a chunk of runway. When you catch yourself not asking for something because you're afraid of the answer, notice it. Then ask anyway.

## What I'd do differently

Not much. The project is one of the few things I've built that I'd ship the same way again. Two changes:

1. **Tell my team lead on day one.** Not to ask permission, but to flag it. Surprises are bad even when they're good surprises.
2. **Add a dry-run mode from the start.** It's worth its weight in gold for operator trust and CI testing.

## What it unlocked

This project isn't on my resume as its own bullet point. It's the thing behind the phrase *"automated MySQL cluster upgrades, cutting time from 1 hour to 10 minutes"* in the first bullet of my first role at Cisco. But for me, it was the project that taught me the difference between "the task you were assigned" and "the job you were hired for."

Every large piece of automation I've built since — the Oracle switchover system, the SOX compliance pipeline, the FDA document platform, the LLM orchestration work at UsefulBI — is recognizably a descendant of this first one. The shadow-the-operator, read-the-logs, classify-step-outcomes pattern applies in all of them. The "ship the prototype, then do the other 80%" rhythm applies in all of them. The "flag what you're working on to the people who'll own it" discipline applies in all of them.

Your first production project isn't important because of the project itself. It's important because of the patterns you form while building it. Pick the patterns carefully — you'll be using them for years.
