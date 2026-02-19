# Prateek Aryan — Portfolio

A modern, minimal personal portfolio built with **React + Vite + TypeScript**, styled with **Tailwind CSS**, and animated with **Framer Motion**.

## Stack

- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v3](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide React](https://lucide.dev/) — icons
- [gh-pages](https://github.com/tschaub/gh-pages) — GitHub Pages deploy

## Project structure

```
src/
├── components/       # One file per section
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── About.tsx
│   ├── Skills.tsx
│   ├── Projects.tsx
│   ├── Experience.tsx
│   └── Contact.tsx
├── data/
│   └── portfolio.ts  # All personal data — edit this file
├── hooks/
│   └── useTheme.ts   # Dark/light mode toggle
├── App.tsx
├── main.tsx
└── index.css
```

## Getting started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Customise your content

All personal data lives in **`src/data/portfolio.ts`**. Update the following exports:

| Export | What to change |
|--------|---------------|
| `personal` | Name, role, email, GitHub, LinkedIn |
| `bio` | Your About section text |
| `skillGroups` | Skills grouped by category |
| `projects` | Project cards (title, description, tags, links) |
| `experience` | Timeline entries (role, company, dates, bullet points) |

## Deploy to GitHub Pages

### Manual deploy

```bash
npm run deploy
```

This runs `npm run build` then pushes the `dist/` folder to the `gh-pages` branch.

### Automatic deploy (GitHub Actions)

Push to `main` → the workflow at `.github/workflows/deploy.yml` builds and deploys automatically.

**Setup steps:**

1. Go to **Settings → Pages** in your GitHub repo
2. Set source to **`gh-pages` branch**
3. (Optional) Add your custom domain in **Settings → Pages → Custom domain**
4. Update `public/CNAME` with your domain (or delete it if you're not using one)
5. Update the `cname` field in `.github/workflows/deploy.yml`

### Custom domain (optional)

Replace the content of `public/CNAME` with your domain:

```
yourdomain.com
```

If you're not using a custom domain, delete `public/CNAME` and remove the `cname:` line from the deploy workflow.

## Dark / light mode

The site defaults to dark mode (or respects the user's OS preference). The toggle in the header persists the choice to `localStorage`.

## License

MIT — feel free to fork and adapt.
