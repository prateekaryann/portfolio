import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { refs } from './store';
import Terminal, { type TermProject, type TermStudy } from '../Terminal';

type Props = { base: string; projects: TermProject[]; studies: TermStudy[] };

const DARK = '#0e0e16';
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
        {/* keyboard + mouse */}
        <mesh position={[0, 0.748, 0.55]} castShadow>
          <boxGeometry args={[0.44, 0.014, 0.15]} />
          <meshStandardMaterial color="#1a1a26" roughness={0.7} transparent />
        </mesh>
        <mesh position={[0.34, 0.752, 0.55]} castShadow>
          <boxGeometry args={[0.06, 0.02, 0.1]} />
          <meshStandardMaterial color="#1a1a26" roughness={0.7} transparent />
        </mesh>
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
            <div ref={html} className="term3d" style={{ opacity: 0 }}>
              <Terminal base={base} projects={projects} studies={studies} active={active} variant="screen" />
            </div>
          </Html>
        </group>
      </group>

      <pointLight ref={glow} position={[0, 1.1, 0.75]} color="#22d3ee" intensity={0} distance={2.6} decay={2} />
    </group>
  );
}
