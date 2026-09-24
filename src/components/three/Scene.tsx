import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, useProgress, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { refs, CAM, type Stage } from './store';
import { Avatar } from './Avatar';
import { Desk } from './Desk';
import { setupScroll } from './scroll';
import type { TermProject, TermStudy } from '../Terminal';

type Props = { base: string; projects: TermProject[]; studies: TermStudy[] };

function switchAction(stage: Stage) {
  const a = refs.actions;
  if (!a) return;
  const want = stage === 'desk' || stage === 'screen' ? 'typing' : 'sitting_idle';
  if (want === refs.current) return;
  const next = a[want];
  const cur = a[refs.current];
  if (!next) return;
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.6).play();
  cur?.fadeOut(0.6);
  refs.current = want;
}

function Rig({ base, projects, studies }: Props) {
  const rig = useRef<THREE.Group>(null!);
  const [loaded, setLoaded] = useState(false);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useEffect(() => {
    refs.rig = rig.current;
    refs.camera = camera;
    camera.position.set(...(CAM.landing.pos as [number, number, number]));
    refs.target.set(...(CAM.landing.tgt as [number, number, number]));
    return () => {
      refs.rig = null;
      refs.camera = null;
    };
  }, [camera]);

  useEffect(() => {
    if (!loaded) return;
    refs.stage = 'landing';
    return setupScroll(switchAction);
  }, [loaded]);

  useFrame(() => {
    camera.lookAt(refs.target);
  });

  return (
    <group ref={rig}>
      <Avatar url={`${base}/models/prateek.glb`} onLoaded={() => setLoaded(true)} />
      <Desk base={base} projects={projects} studies={studies} />
    </group>
  );
}

function Loader() {
  const { progress, active } = useProgress();
  const started = useRef(false);
  const [gone, setGone] = useState(false);
  if (active) started.current = true;
  const done = started.current && !active && progress >= 100;
  useEffect(() => {
    // nothing began loading within 1.5s → assets were cached, drop the overlay
    const t = window.setTimeout(() => !started.current && setGone(true), 1500);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(t);
  }, [done]);
  if (gone) return null;
  return (
    <div className={`loader${done ? ' done' : ''}`} aria-hidden="true">
      <div className="loader-pill">
        Loading <b>{Math.round(progress)}%</b>
      </div>
    </div>
  );
}

/** Fixed full-viewport 3D story layer. Desktop + WebGL2 + no reduced-motion only; otherwise renders nothing. */
export default function Scene({ base, projects, studies }: Props) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = !!document.createElement('canvas').getContext('webgl2');
    const enabled = desktop && motion && gl;
    setOk(enabled);
    if (import.meta.env.DEV) (window as any).__refs = refs;
    document.documentElement.classList.toggle('has-3d', enabled);
    if (enabled) useGLTF.preload(`${base}/models/prateek.glb`, false, true);
    return () => document.documentElement.classList.remove('has-3d');
  }, [base]);

  useEffect(() => {
    if (!ok) return;
    const onMove = (e: PointerEvent) => {
      refs.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      refs.mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [ok]);

  if (!ok) return null;

  return (
    <>
      <Loader />
      <div id="scene-root" className="scene-root">
        <Canvas
          dpr={[1, 1.6]}
          shadows
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 30, near: 0.08, far: 40, position: CAM.landing.pos as [number, number, number] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
        >
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[2.5, 3.5, 2.5]}
            intensity={1.8}
            color="#eee9ff"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-3, 2, -2]} intensity={1.3} color="#5eead4" />
          <Suspense fallback={null}>
            <Environment files={`${base}/models/env.hdr`} environmentIntensity={0.55} />
            <Rig base={base} projects={projects} studies={studies} />
            <ContactShadows position={[0, 0.001, 0.3]} opacity={0.55} scale={5} blur={2.4} far={1.6} resolution={512} />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
}
