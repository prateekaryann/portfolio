import { useEffect, useRef } from 'react';

export type TermProject = { name: string; desc: string; path: string };
export type TermStudy = { n: number; title: string; path: string };

type Props = {
  base: string;
  projects: TermProject[];
  studies: TermStudy[];
  /** start the boot sequence (defaults to true; the 3D monitor flips it on when the screen lights up) */
  active?: boolean;
  variant?: 'card' | 'screen';
};

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/**
 * Interactive fake shell — explore the site by typing. Imperative DOM inside an effect on purpose:
 * it runs identically as a plain island and projected onto the 3D monitor via drei <Html>.
 */
export default function Terminal({ base, projects, studies, active = true, variant = 'card' }: Props) {
  const termRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active) return;
    const term = termRef.current!;
    const out = outRef.current!;
    const body = bodyRef.current!;
    const inputLine = lineRef.current!;
    const input = inputRef.current!;
    if (term.dataset.ready) return;
    term.dataset.ready = '1';

    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroll = () => { body.scrollTop = body.scrollHeight; };
    const line = (html: string, cls?: string) => {
      const d = document.createElement('div');
      d.className = 'tl' + (cls ? ' ' + cls : '');
      d.innerHTML = html;
      out.appendChild(d);
      scroll();
      return d;
    };
    const echo = (cmd: string) => line('<span class="prompt">❯</span> <span class="cmd">' + esc(cmd) + '</span>');
    const go = (path: string) => {
      line('<span class="muted">opening ' + esc(path) + ' …</span>');
      later(() => { window.location.href = path; }, 350);
    };

    const HELP: [string, string][] = [
      ['whoami', 'who I am, briefly'],
      ['about', 'the longer story'],
      ['ls', 'list everything here'],
      ['projects', 'products &amp; open-source work'],
      ['case-studies', "deep dives into systems I've shipped"],
      ['skills', 'what I work with'],
      ['uptime', 'the track record'],
      ['resume', 'download my résumé'],
      ['contact', 'how to reach me'],
      ['github / linkedin', 'find me elsewhere'],
      ['open &lt;name&gt;', 'jump to a project or case study'],
      ['clear', 'clear the screen'],
    ];

    const commands: Record<string, () => string> = {
      help: () => 'Available commands:\n' + HELP.map(([c, d]) => '  <span class="ok">' + c.padEnd(18) + '</span> ' + d).join('\n') + '\n\nTip: try <span class="ok">open documind</span> or <span class="ok">case-studies</span>.',
      whoami: () => 'Prateek Aryan — senior backend engineer.\nDistributed systems, LLM infrastructure, and the unglamorous reliability work that keeps things up.',
      about: () => "I build backend systems that stay up when things get hard.\n\nRight now I'm an AI Engineer on the Gilead Sciences clinical content platform — fault-tolerant LLM orchestration, an idempotent RAG pipeline, prompt-caching &amp; model-tiering cost controls. Before that, 5 years at Cisco keeping 200+ enterprise apps reliable.\n\nType <span class=\"ok\">case-studies</span> for the deep dives.",
      uptime: () => 'up 5+ years in production  ·  200+ apps kept alive at Cisco  ·  99.3% latency cut shipped (7s → 50ms)  ·  SOX reporting 3h → &lt;10m  ·  0 outages I caused on purpose',
      ls: () => 'projects/        case-studies/        about        skills        contact\n\n<span class="muted">try: ls projects</span>',
      skills: () => '<span class="ok">backend</span>   Python · FastAPI · PostgreSQL · gRPC · SQLAlchemy\n<span class="ok">ai/llm</span>    RAG · prompt caching · model tiering · Bedrock / Claude\n<span class="ok">cloud</span>     AWS · EKS/K8s · Docker · Terraform · CI/CD\n<span class="ok">systems</span>   distributed systems · Redis · Kafka · observability',
      projects: () => projects.map((p) => '  <a href="' + p.path + '">' + p.name + '</a>  <span class="muted">' + esc(p.desc) + '</span>').join('\n') + '\n\n<span class="muted">→ open ' + projects[0]?.name + '</span>',
      'case-studies': () => studies.map((s) => '  <span class="ok">cs' + s.n + '</span>  <a href="' + s.path + '">' + esc(s.title) + '</a>').join('\n') + '\n\n<span class="muted">→ open cs1</span>',
      contact: () => 'email     <a href="mailto:prateekaryyan@gmail.com">prateekaryyan@gmail.com</a>\ngithub    <a href="https://github.com/prateekaryann" target="_blank" rel="noopener">github.com/prateekaryann</a>\nlinkedin  <a href="https://linkedin.com/in/prateek-aryan" target="_blank" rel="noopener">linkedin.com/in/prateek-aryan</a>',
      resume: () => { go(base + '/Prateek_Aryan_Resume.pdf'); return ''; },
      github: () => { window.open('https://github.com/prateekaryann', '_blank'); return 'opening github.com/prateekaryann …'; },
      linkedin: () => { window.open('https://linkedin.com/in/prateek-aryan', '_blank'); return 'opening linkedin.com/in/prateek-aryan …'; },
      clear: () => { out.innerHTML = ''; return ''; },
      sudo: () => 'you already have root here 🙂',
      exit: () => "there's no escape — just keep scrolling.",
    };

    const open = (arg?: string) => {
      if (!arg) return 'usage: open &lt;name&gt;  — e.g. open documind, open cs1';
      const p = projects.find((x) => x.name === arg);
      if (p) { go(p.path); return ''; }
      const m = arg.match(/^cs(\d+)$/i);
      if (m) { const s = studies[+m[1] - 1]; if (s) { go(s.path); return ''; } }
      const s2 = studies.find((x) => x.path.includes(arg));
      if (s2) { go(s2.path); return ''; }
      return 'not found: ' + esc(arg) + '  — try <span class="ok">projects</span> or <span class="ok">case-studies</span>';
    };

    const run = (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      const [cmd, ...rest] = t.split(/\s+/);
      const c = cmd.toLowerCase();
      if (c === 'open') { const r = open(rest[0]); if (r) line(r, 'out'); return; }
      if (c === 'ls' && rest[0] === 'projects') { line(commands.projects(), 'out'); return; }
      const direct = projects.find((x) => x.name === c);
      if (direct) { go(direct.path); return; }
      if (commands[c]) { const r = commands[c](); if (r) line(r, 'out'); return; }
      line('zsh: command not found: ' + esc(cmd) + '  — type <span class="ok">help</span>', 'out err');
    };

    const hist: string[] = [];
    let hi = -1;
    const onClick = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('a')) input.focus(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const v = input.value; echo(v);
        if (v.trim()) { hist.push(v); hi = hist.length; }
        input.value = ''; run(v);
      } else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) { hi--; input.value = hist[hi] || ''; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length - 1) { hi++; input.value = hist[hi] || ''; } else { hi = hist.length; input.value = ''; } }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const names = ['help', 'whoami', 'about', 'ls', 'projects', 'case-studies', 'skills', 'uptime', 'resume', 'contact', 'github', 'linkedin', 'clear', 'open'];
        const hit = names.find((n) => n.startsWith(input.value.trim().toLowerCase()));
        if (hit) input.value = hit;
      }
    };
    const enable = () => {
      inputLine.hidden = false;
      term.addEventListener('click', onClick);
      input.addEventListener('keydown', onKey);
      if (variant === 'card') input.focus({ preventScroll: true });
    };

    const boot = [
      { c: 'whoami', o: commands.whoami() },
      { c: 'uptime', o: commands.uptime() },
    ];
    const hint = () => line('<span class="muted">Type a command to explore — try </span><span class="ok">help</span><span class="muted">.</span>');
    if (reduce) {
      boot.forEach((b) => { echo(b.c); line(b.o, 'out'); });
      hint();
      enable();
    } else {
      let bi = 0;
      const typeCmd = (text: string, done: () => void) => {
        const d = line('<span class="prompt">❯</span> <span class="cmd"></span>');
        const span = d.querySelector('.cmd')!;
        let i = 0;
        const tick = () => {
          span.textContent = text.slice(0, ++i);
          scroll();
          if (i < text.length) later(tick, 45); else later(done, 240);
        };
        tick();
      };
      const step = () => {
        if (bi >= boot.length) { hint(); enable(); return; }
        const b = boot[bi++];
        typeCmd(b.c, () => { line(b.o, 'out'); later(step, 350); });
      };
      later(step, 500);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      term.removeEventListener('click', onClick);
      input.removeEventListener('keydown', onKey);
      out.innerHTML = '';
      inputLine.hidden = true;
      delete term.dataset.ready;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className={`term term-${variant}`} ref={termRef} role="group" aria-label="Interactive terminal — explore this site by typing commands. The site menu works too.">
      <div className="term-bar">
        <span className="tdot r" /><span className="tdot y" /><span className="tdot g" />
        <span className="term-title">prateek@portfolio — zsh</span>
        <span className="term-hint">type <b>help</b></span>
      </div>
      <div className="term-body" ref={bodyRef}>
        <div ref={outRef} />
        <div className="term-input-line" ref={lineRef} hidden>
          <span className="prompt">❯</span>
          <input
            className="term-input"
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Terminal input — type a command such as help, ls, or open documind"
          />
        </div>
      </div>
    </div>
  );
}
