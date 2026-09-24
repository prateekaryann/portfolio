import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { refs, CAM, type Stage } from './store';

gsap.registerPlugin(ScrollTrigger);

const v = (a: readonly number[]) => ({ x: a[0], y: a[1], z: a[2] });
type Key = { pos: readonly number[]; tgt: readonly number[] };

/**
 * One scrubbed timeline over #story (start: top top, end: +=400%), 4 units long:
 *   0→1 landing → about · 1→2 about → desk · 2→3 desk → screen · 3→4 screen → exit
 * Each unit == one viewport of scroll, so section boundaries line up with keyframes.
 */
export function setupScroll(onStage: (s: Stage) => void) {
  const cam = refs.camera!;
  const rig = refs.rig!;
  const tgt = refs.target;

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut', immediateRender: false },
    scrollTrigger: {
      trigger: '#story',
      start: 'top top',
      end: '+=400%',
      scrub: 0.7,
      invalidateOnRefresh: true,
      onUpdate: (st) => {
        const p = st.progress;
        const s: Stage = p < 0.18 ? 'landing' : p < 0.44 ? 'about' : p < 0.68 ? 'desk' : p < 0.9 ? 'screen' : 'exit';
        if (s !== refs.stage) {
          refs.stage = s;
          onStage(s);
        }
      },
    },
  });

  const move = (from: Key, to: Key, at: number, duration = 1) => {
    tl.fromTo(cam.position, v(from.pos), { ...v(to.pos), duration }, at);
    tl.fromTo(tgt, v(from.tgt), { ...v(to.tgt), duration }, at);
  };

  // 0 → 1 : landing → about
  move(CAM.landing, CAM.about, 0);
  tl.fromTo(rig.rotation, { y: 0 }, { y: 0.55, duration: 1 }, 0);
  tl.to('.landing-copy', { opacity: 0, y: 80, duration: 0.45, ease: 'power2.in' }, 0);
  tl.fromTo('.about-copy', { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.5 }, 0.45);

  // 1 → 2 : about → desk
  move(CAM.about, CAM.desk, 1);
  tl.fromTo(rig.rotation, { y: 0.55 }, { y: -0.15, duration: 1 }, 1);
  tl.to('.about-copy', { opacity: 0, y: -50, duration: 0.4, ease: 'power2.in' }, 1.15);
  tl.fromTo(refs.fx, { desk: 0 }, { desk: 1, duration: 0.5, ease: 'power1.out' }, 1.1);
  tl.fromTo(refs.fx, { screen: 0 }, { screen: 1, duration: 0.4 }, 1.7);
  tl.fromTo('.whatido-copy', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5 }, 1.55);

  // 2 → 3 : desk → screen (over-the-shoulder zoom into the terminal)
  move(CAM.desk, CAM.screen, 2);
  tl.fromTo(rig.rotation, { y: -0.15 }, { y: 0, duration: 0.6 }, 2);
  tl.to('.whatido-copy', { opacity: 0, y: -40, duration: 0.4, ease: 'power2.in' }, 2.1);
  tl.fromTo('.screen-copy', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.7);

  // 3 → 4 : screen → exit (pull back, avatar drops away, canvas fades)
  tl.to('.screen-copy', { opacity: 0, duration: 0.25 }, 3.05);
  move(CAM.screen, CAM.desk, 3, 0.6);
  tl.to(rig.position, { y: -3.4, duration: 0.55, ease: 'power2.in' }, 3.45);
  tl.to('#scene-root', { opacity: 0, duration: 0.3 }, 3.6);

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  requestAnimationFrame(refresh);

  return () => {
    window.removeEventListener('load', refresh);
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set(['.landing-copy', '.about-copy', '.whatido-copy', '.screen-copy', '#scene-root'], { clearProps: 'all' });
  };
}
