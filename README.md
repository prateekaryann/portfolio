# prateekaryann portfolio

Personal portfolio site for [Prateek Aryan](https://github.com/prateekaryann) — Senior Backend Engineer.

Built with [Astro](https://astro.build) as a static site. Deployed to GitHub Pages at [prateekaryann.github.io/portfolio](https://prateekaryann.github.io/portfolio).

## Stack

- **Astro 5** — static site generator with first-class content collections
- **TypeScript** — strict mode
- **Pure CSS** — no framework, one ~300-line global stylesheet
- **Markdown** — case studies authored as Markdown in `src/content/case-studies/`
- **Inter + JetBrains Mono** — via Google Fonts

## Structure

```
src/
  content/case-studies/   Markdown case studies (content collection)
  content.config.ts       Content collection schema
  layouts/Base.astro      Shared HTML shell with OG tags, header, footer
  pages/
    index.astro           Hero, about, case study list, projects, contact
    case-studies/[...slug].astro   Per-case-study page
  styles/global.css       Single stylesheet, variables + resets + components
public/
  favicon.svg
astro.config.mjs          base='/portfolio', sitemap integration
```

## Commands

```bash
npm install         # install dependencies
npm run dev         # local dev server
npm run build       # build to dist/
npm run preview     # preview the built site locally
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the site and deploys to GitHub Pages via the official GitHub Actions.

Repository Pages settings required (one-time):
- Settings → Pages → Source: **GitHub Actions**

## Adding a case study

1. Create `src/content/case-studies/NN-slug.md`
2. Add frontmatter matching the schema in `src/content.config.ts`:
   ```yaml
   ---
   title: "Title"
   description: "Short description for link previews"
   publishedAt: "YYYY-MM-DD"
   stack: ["tag1", "tag2"]
   order: N
   featured: true
   ---
   ```
3. Write Markdown body
4. Commit and push — GitHub Action builds and deploys

## Ethical floor

All case studies follow these rules:
- Real work only. Every story happened. Numbers are real.
- Sanitized — company-specific details (customers, schemas, product names, internal tool names) are generalized.
- Honest retro — every case study ends with "what I would do differently".
