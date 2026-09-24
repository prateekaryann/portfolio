import * as THREE from 'three';

export type Stage = 'landing' | 'about' | 'desk' | 'screen' | 'exit';

/** Mutable, render-loop-friendly scene refs shared between the R3F tree and the GSAP scroll timeline. */
export const refs = {
  rig: null as THREE.Group | null,
  avatar: null as THREE.Group | null,
  head: null as THREE.Object3D | null,
  camera: null as THREE.PerspectiveCamera | null,
  target: new THREE.Vector3(0, 1.02, 0),
  fx: { desk: 0, screen: 0 },
  mouse: { x: 0, y: 0 },
  stage: 'landing' as Stage,
  actions: null as Record<string, THREE.AnimationAction | null> | null,
  current: 'sitting_idle',
  loaded: false,
};

/** Camera keyframes per scroll stage. Units: metres, avatar sits at origin facing +Z, monitor at z≈0.95. */
export const CAM = {
  landing: { pos: [0, 1.32, 1.75], tgt: [0, 1.14, 0] },
  about: { pos: [-0.6, 1.12, 2.4], tgt: [0.7, 1.0, 0] },
  desk: { pos: [2.5, 1.95, 2.7], tgt: [0.75, 0.85, 0.55] },
  screen: { pos: [0.34, 1.3, 0.22], tgt: [0, 1.06, 0.93] },
} as const;
