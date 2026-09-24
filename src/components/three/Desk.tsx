import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { refs } from './store';
import Terminal, { type TermProject, type TermStudy } from '../Terminal';

type Props = { base: string; projects: TermProject[]; studies: TermStudy[] };

const DARK = '#0e0e16';

/** 5 rows × 14 keycaps as one instanced mesh (70 draw-call-free keys). */
function Keycaps() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const layout = useMemo(() => {
    const m = new THREE.Matrix4();
    const out: THREE.Matrix4[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        if (r === 4 && c > 3 && c < 10) continue; // spacebar gap
        m.makeTranslation(-0.195 + c * 0.03, 0.009, -0.058 + r * 0.028);
        out.push(m.clone());
      }
    }
    return out;
  }, []);
  useEffect(() => {
    layout.forEach((m, i) => ref.current.setMatrixAt(i, m));
    ref.current.instanceMatrix.needsUpdate = true;
  }, [layout]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, layout.length]} castShadow>
      <boxGeometry args={[0.024, 0.008, 0.022]} />
      <meshStandardMaterial color="#2a2a38" roughness={0.6} transparent />
    </instancedMesh>
  );
}
const DARKER = '#0a0a10';

/**
 * Low-poly desk, chair and monitor built from primitives (no external assets).
 * Chair is always visible; desk + monitor fade in via refs.fx.desk, the screen lights up via refs.fx.screen.
 * The interactive terminal is projected onto the screen with drei <Html transform>.
 */
export function Desk({ base, projects, studies }: Props) {
  const fade = useRef<THREE.Group>(null!);
  const screenMat = useRef<THREE.MeshStandardMaterial>(null!);
  const glow = useRef<THREE.PointLight>(null!);
  const html = useRef<HTMLDivElement>(null!);
  const [active, setActive] = useState(false);

  useFrame(() => {
    const { desk, screen } = refs.fx;
    fade.current.traverse((o: any) => {
      if (o.isMesh) {
        o.material.opacity = desk;
        o.visible = desk > 0.01;
      }
    });
    screenMat.current.emissiveIntensity = screen * 0.35;
    glow.current.intensity = screen * 2.4;
    if (html.current) html.current.style.opacity = String(screen);
    const on = refs.stage === 'desk' || refs.stage === 'screen';
    if (on !== active) setActive(on);
  });
  const enter = () => {
    if (refs.stage === 'screen') return;
    document.getElementById('screen')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <group>
      {/* chair */}
      <group position={[0, 0, 0.02]}>
        <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.52, 0.07, 0.52]} />
          <meshStandardMaterial color={DARK} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.78, -0.27]} castShadow>
          <boxGeometry args={[0.5, 0.62, 0.06]} />
          <meshStandardMaterial color={DARK} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.36, 12]} />
          <meshStandardMaterial color="#2a2a36" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.03, 24]} />
          <meshStandardMaterial color="#1a1a24" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* desk + monitor (fade in on scroll) */}
      <group ref={fade}>
        <mesh position={[0, 0.7225, 0.72]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.035, 0.75]} />
          <meshStandardMaterial color="#12121c" roughness={0.8} transparent />
        </mesh>
        {[
          [-0.7, 0.37],
          [0.7, 0.37],
          [-0.7, 1.07],
          [0.7, 1.07],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.352, z]} castShadow>
            <boxGeometry args={[0.04, 0.705, 0.04]} />
            <meshStandardMaterial color="#1c1c28" roughness={0.6} metalness={0.4} transparent />
          </mesh>
        ))}
        {/* keyboard: base slab + instanced keycaps + spacebar */}
        <group position={[0, 0.7425, 0.55]}>
          <mesh castShadow>
            <boxGeometry args={[0.44, 0.012, 0.15]} />
            <meshStandardMaterial color="#15151f" roughness={0.75} transparent />
          </mesh>
          <Keycaps />
          <mesh position={[0, 0.011, 0.052]} castShadow>
            <boxGeometry args={[0.16, 0.008, 0.02]} />
            <meshStandardMaterial color="#2a2a38" roughness={0.6} transparent />
          </mesh>
        </group>
        {/* mouse: ellipsoid body + wheel */}
        <group position={[0.34, 0.748, 0.55]}>
          <mesh castShadow scale={[0.031, 0.018, 0.052]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#1c1c28" roughness={0.45} metalness={0.15} transparent />
          </mesh>
          <mesh position={[0, 0.016, -0.018]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.006, 12]} />
            <meshStandardMaterial color="#3a3a4a" roughness={0.5} transparent />
          </mesh>
        </group>
        {/* monitor stand */}
        <mesh position={[0, 0.748, 0.98]}>
          <boxGeometry args={[0.3, 0.014, 0.18]} />
          <meshStandardMaterial color="#101018" transparent />
        </mesh>
        <mesh position={[0, 0.88, 0.975]}>
          <boxGeometry args={[0.06, 0.28, 0.03]} />
          <meshStandardMaterial color="#101018" transparent />
        </mesh>
        {/* monitor, rotated to face the avatar (-Z) */}
        <group position={[0, 1.06, 0.95]} rotation={[0, Math.PI, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.66, 0.42, 0.03]} />
            <meshStandardMaterial color={DARKER} roughness={0.5} transparent />
          </mesh>
          <mesh position={[0, 0, 0.0165]}>
            <planeGeometry args={[0.6, 0.37]} />
            <meshStandardMaterial
              ref={screenMat}
              color="#05050a"
              emissive="#22d3ee"
              emissiveIntensity={0}
              roughness={0.3}
              transparent
            />
          </mesh>
          <Html
            transform
            position={[0, 0, 0.02]}
            scale={0.000577}
            distanceFactor={400}
            zIndexRange={[3, 1]}
            wrapperClass="term3d-wrap"
          >
            <div ref={html} className="term3d" style={{ opacity: 0 }} onClick={enter}>
              <Terminal base={base} projects={projects} studies={studies} active={active} variant="screen" />
            </div>
          </Html>
        </group>
      </group>

      <pointLight ref={glow} position={[0, 1.1, 0.75]} color="#22d3ee" intensity={0} distance={2.6} decay={2} />
    </group>
  );
}
