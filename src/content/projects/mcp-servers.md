---
title: mcp-servers
tagline: Collection of MCP servers with shared transport & OAuth.
description: A monorepo of Model Context Protocol (MCP) servers that give Claude access to external tools — with shared infrastructure handling stdio/SSE transport, OAuth 2.0, security sandboxing, and audit logging so each server only defines its tools.
stack: ['Python', 'MCP', 'OAuth 2.0', 'SSE', 'stdio']
github: https://github.com/prateekaryann/mcp-servers
glyph: mcp
accent: teal
order: 3
banner: /projects/mcp-servers/banner.png
demoVideo: /projects/mcp-servers/demo.mp4
demoPoster: /projects/mcp-servers/poster.png
architecture: /projects/mcp-servers/architecture.png
---

# mcp-servers

A monorepo of **Model Context Protocol (MCP)** servers that give Claude access to external
tools and services. Each server wraps a CLI tool or API and exposes its capabilities as MCP
tools — while **shared infrastructure** handles transport, authentication, security, and
audit logging, so a new server only has to define its tools.

## Servers

| Server | Tools | CLI | Description |
|---|---|---|---|
| GitHub | 40 | `gh` | Repos, issues, PRs, branches, workflows, releases |
| Freelance Jobs | 7 | `httpx` | Search 8 job platforms, skill matching, notifications |
| *(more coming)* | | | Slack, Calendar, AWS, … |

## Shared infrastructure (`mcp_shared`)

Every server gets these for free:

- **Transport** — stdio (local) or SSE (remote), selected by the `MCP_TRANSPORT` env var.
- **OAuth 2.0** — auto-configured for SSE: dynamic client registration, PKCE, and a consent page.
- **Security** — path sandboxing, audit logging, and a read-only mode.
- **CLI runner** — `run_cli(command, args)`, a universal subprocess wrapper.

## Creating a new server

```bash
cp -r servers/_template servers/your-service
# edit servers/your-service/server.py — add your tools
python servers/your-service/server.py
```

The template is ~20 lines of boilerplate. Everything else — transport, OAuth, logging,
security — comes from `mcp_shared`. Run locally for Claude Desktop/Code, or over SSE with
OAuth for Claude.ai.
