// ============================================================
// Shared cover-art helpers — gradient + glyph SVG panels.
// Used by the homepage (case-study + project cards) and the
// project detail pages. Keep in sync with the design tokens
// in src/styles/global.css.
// ============================================================

export type Accent = 'violet' | 'cyan' | 'indigo' | 'amber' | 'teal' | 'pink';

export const ACCENTS: Record<Accent, [string, string]> = {
  violet: ['#a78bfa', '#22d3ee'],
  cyan:   ['#22d3ee', '#0ea5e9'],
  indigo: ['#818cf8', '#c084fc'],
  amber:  ['#f5b14c', '#ec4899'],
  teal:   ['#2dd4bf', '#22d3ee'],
  pink:   ['#ec4899', '#a78bfa'],
};

// Stroke-based glyphs drawn on a 64×64 canvas, centered by panel().
export const GLYPHS: Record<string, string> = {
  llm: '<circle cx="32" cy="32" r="7"/><circle cx="10" cy="14" r="4"/><circle cx="54" cy="14" r="4"/><circle cx="10" cy="50" r="4"/><circle cx="54" cy="50" r="4"/><path d="M26 28 14 17M38 28 50 17M26 36 14 47M38 36 50 47"/>',
  speed: '<path d="M6 16 22 26 34 22 46 42 58 50"/><circle cx="6" cy="16" r="3" fill="#fff" stroke="none"/><circle cx="22" cy="26" r="3" fill="#fff" stroke="none"/><circle cx="34" cy="22" r="3" fill="#fff" stroke="none"/><circle cx="46" cy="42" r="3" fill="#fff" stroke="none"/><circle cx="58" cy="50" r="3" fill="#fff" stroke="none"/>',
  workflow: '<rect x="4" y="26" width="16" height="12" rx="3"/><rect x="44" y="8" width="16" height="12" rx="3"/><rect x="44" y="44" width="16" height="12" rx="3"/><path d="M20 32 32 32M32 32 32 14 44 14M32 32 32 50 44 50"/>',
  failover: '<rect x="4" y="20" width="22" height="24" rx="4"/><rect x="38" y="20" width="22" height="24" rx="4"/><path d="M28 27 36 27M33 24 36 27 33 30M36 37 28 37M31 34 28 37 31 40"/>',
  shield: '<path d="M32 5 54 13 54 30C54 43 44 53 32 58 20 53 10 43 10 30L10 13Z"/><path d="M23 32 29 38 42 24"/>',
  dbupgrade: '<ellipse cx="32" cy="17" rx="15" ry="6"/><path d="M17 17 17 39C17 42 24 45 32 45 40 45 47 42 47 39L47 17"/><path d="M32 61 32 49M26 55 32 49 38 55"/>',
  docs: '<path d="M14 6 36 6 46 16 46 42 14 42Z"/><path d="M36 6 36 16 46 16"/><circle cx="33" cy="39" r="9"/><path d="M40 46 50 56"/>',
  focus: '<circle cx="32" cy="32" r="21"/><path d="M17 32C21 22 26 22 30 32 34 42 39 42 43 32"/>',
  audio: '<path d="M10 40 10 24M21 46 21 18M32 48 32 16M43 46 43 18M54 40 54 24" stroke-width="4.5"/>',
  mcp: '<circle cx="12" cy="32" r="6"/><circle cx="52" cy="15" r="6"/><circle cx="52" cy="49" r="6"/><path d="M18 32 46 18M18 32 46 46"/>',
  terminal: '<rect x="6" y="13" width="52" height="38" rx="5"/><path d="M16 27 24 33 16 39M30 41 44 41"/>',
};

// Returns an inline SVG string (use with set:html). `key` must be unique
// per panel on a page so the gradient/pattern ids don't collide.
export function panel(accent: Accent | string, glyph: string, key: string, h = 168): string {
  const [a, b] = ACCENTS[accent as Accent] ?? ACCENTS.violet;
  const id = 'p' + key;
  const cy = (h - 96) / 2;
  return `<svg viewBox="0 0 400 ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
      <radialGradient id="${id}r" cx="0.78" cy="0.2" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.4"/><stop offset="0.65" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <pattern id="${id}d" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#fff" opacity="0.16"/></pattern>
    </defs>
    <rect width="400" height="${h}" fill="url(#${id})"/>
    <rect width="400" height="${h}" fill="url(#${id}d)"/>
    <rect width="400" height="${h}" fill="url(#${id}r)"/>
    <g transform="translate(152 ${cy}) scale(1.5)" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">${GLYPHS[glyph] ?? GLYPHS.llm}</g>
  </svg>`;
}
