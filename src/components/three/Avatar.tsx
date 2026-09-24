import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { refs } from './store';

type Props = { url: string; onLoaded?: () => void };

/**
 * Avaturn avatar (Mixamo-named rig) with merged Mixamo clips:
 * sitting_idle · typing · talking · stand_to_sit · sit_to_stand.
 * Head tracks the cursor on the landing/about stages (additive on top of the clip pose),
 * looks down at the monitor on the desk/screen stages, and blinks via ARKit morph targets.
 */
export function Avatar({ url, onLoaded }: Props) {
  const group = useRef<THREE.Group>(null!);
  const gltf = useGLTF(url, false, true) as any;
  const { scene, animations, nodes } = gltf;
  const { actions, mixer } = useAnimations(animations, group);
  const smile = useRef({ on: false, v: 0, meshes: [] as THREE.Mesh[] });
  const look = useRef({ x: 0, y: 0 });
  const blink = useRef({ t: 2 + Math.random() * 3, v: 0, meshes: [] as THREE.Mesh[] });

  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        if (o.morphTargetDictionary && 'eyeBlinkLeft' in o.morphTargetDictionary) meshes.push(o);
        if (o.morphTargetDictionary && 'mouthSmileLeft' in o.morphTargetDictionary) smile.current.meshes.push(o);
      }
    });
    blink.current.meshes = meshes;
    refs.avatar = group.current;
    refs.head = nodes.Head ?? null;
    refs.actions = actions as any;
    Object.values(actions).forEach((a) => a && (a.enabled = true));
    actions.sitting_idle?.reset().fadeIn(0.5).play();
    refs.current = 'sitting_idle';
    refs.loaded = true;
    onLoaded?.();

    // "hi": the Mixamo wave, right-arm tracks only, layered over the seated idle.
    // Weight >> 1 so the arm follows the wave rather than a 50/50 blend with the idle.
    let waveTimer = 0;
    let waveAction: THREE.AnimationAction | null = null;
    const scheduleIdleWave = () => {
      window.clearTimeout(waveTimer);
      // keep saying hi every ~12s while the visitor is still on the landing stage
      waveTimer = window.setTimeout(() => {
        if (refs.stage === 'landing' && document.visibilityState === 'visible') refs.wave?.();
        else scheduleIdleWave();
      }, 11000 + Math.random() * 3000);
    };
    const onFinished = (e: any) => {
      if (e.action !== waveAction) return;
      waveAction?.fadeOut(0.45);
      smile.current.on = false;
      refs.waving = false;
      scheduleIdleWave();
    };
    const waveClip = (animations as THREE.AnimationClip[]).find((c) => c.name === 'wave');
    if (waveClip) {
      const armTracks = waveClip.tracks.filter((t) => /^Right(Shoulder|Arm|ForeArm|Hand)/.test(t.name));
      const armClip = new THREE.AnimationClip('wave_arm', waveClip.duration, armTracks);
      waveAction = mixer.clipAction(armClip, group.current);
      waveAction.setLoop(THREE.LoopOnce, 1);
      waveAction.clampWhenFinished = false;
      mixer.addEventListener('finished', onFinished);
      refs.wave = () => {
        if (refs.waving || !waveAction) return;
        refs.waving = true;
        waveAction.reset().setEffectiveTimeScale(1.1).setEffectiveWeight(8).fadeIn(0.35).play();
        smile.current.on = true;
      };
      waveTimer = window.setTimeout(() => refs.wave?.(), 700);
    }
    return () => {
      window.clearTimeout(waveTimer);
      mixer.removeEventListener('finished', onFinished);
      refs.wave = null;
      refs.waving = false;
      refs.loaded = false;
      refs.head = null;
      refs.actions = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, actions, nodes]);

  useFrame((_, dt) => {
    const head = refs.head;
    if (!head) return;
    const st = refs.stage;
    let tx = 0;
    let ty = 0;
    if (st === 'landing' || st === 'about') {
      ty = refs.mouse.x * 0.55;
      tx = -refs.mouse.y * 0.35;
    } else if (st === 'desk' || st === 'screen') {
      tx = 0.18;
    }
    const k = 1 - Math.exp(-dt * 5);
    look.current.x += (tx - look.current.x) * k;
    look.current.y += (ty - look.current.y) * k;
    // the mixer wrote the clip pose this frame; add our offset on top
    head.rotation.x += look.current.x;
    head.rotation.y += look.current.y;

    const sm = smile.current;
    sm.v += ((sm.on ? 0.65 : 0) - sm.v) * (1 - Math.exp(-dt * 4));
    for (const m of sm.meshes) {
      const d = m.morphTargetDictionary!;
      const inf = m.morphTargetInfluences!;
      inf[d.mouthSmileLeft] = sm.v;
      inf[d.mouthSmileRight] = sm.v;
    }

    const b = blink.current;
    b.t -= dt;
    if (b.t <= 0) {
      b.v = 1;
      b.t = 2.5 + Math.random() * 4;
    }
    if (b.v > 0) {
      b.v = Math.max(0, b.v - dt * 7);
      const w = Math.sin((1 - b.v) * Math.PI);
      for (const m of b.meshes) {
        const d = m.morphTargetDictionary!;
        const inf = m.morphTargetInfluences!;
        inf[d.eyeBlinkLeft] = w;
        inf[d.eyeBlinkRight] = w;
      }
    }
  });

  return <primitive ref={group} object={scene} />;
}
