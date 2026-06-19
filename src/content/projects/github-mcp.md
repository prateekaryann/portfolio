---
title: github-mcp
tagline: MCP server wrapping the GitHub CLI — 39 tools, straight from Claude.
description: A Model Context Protocol server that wraps the GitHub CLI (gh) to expose 39 tools across 12 categories — repos, branches, issues, PRs, workflows, releases and more — directly inside Claude Desktop or Claude Code.
stack: ['Python', 'MCP', 'GitHub CLI', 'SSE', 'OAuth 2.0']
github: https://github.com/prateekaryann/github-mcp
glyph: terminal
accent: amber
order: 4
banner: /projects/github-mcp/banner.png
demoVideo: /projects/github-mcp/demo.mp4
demoPoster: /projects/github-mcp/poster.png
architecture: /projects/github-mcp/architecture.png
---

# github-mcp

A **Model Context Protocol (MCP)** server that wraps the GitHub CLI (`gh`) to provide
**39 tools across 12 categories** — manage repos, branches, issues, PRs, workflows,
collaborators and more, directly from Claude Desktop or Claude Code.

## What it can do

- **Repositories** — create, clone, list, view, delete.
- **Git operations** — add, commit, push, pull, and init-and-push in one command.
- **Branches** — create, list, switch, delete.
- **Forking** — fork repos and sync forks with upstream.
- **Issues & PRs** — create, list, comment, merge, review, and diff.
- **Collaborators** — list and add collaborators.
- **Files** — read and create/update files via the GitHub API.
- **Workflows** — list, trigger, and inspect GitHub Actions runs.
- **Releases & gists** — create and list releases; create gists from content.
- **Search** — search repositories across GitHub.

## Security

Path sandboxing, input validation, a read-only mode, and audit logging are built in. For
remote use it runs over **SSE with OAuth 2.0** behind an ngrok tunnel; locally it speaks
stdio to Claude Desktop / Claude Code.

## Usage

```bash
git clone https://github.com/prateekaryann/github-mcp.git
cd github-mcp
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
gh auth login          # the server wraps your authenticated gh CLI
python server.py       # stdio transport for Claude Desktop / Code
```

Requires the GitHub CLI (`gh`) and Python 3.10+.
