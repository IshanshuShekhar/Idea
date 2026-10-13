import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Line, Trail, Text } from '@react-three/drei';
import * as THREE from 'three';

// Global start time to ensure perfect continuity between the Intro canvas and the Homepage canvas
const GLOBAL_START_TIME = Date.now() / 1000;

export const COLORS = {
  electricBlue: '#0055ff',
  cyan: '#00ffff',
  violet: '#8a2be2',
  magenta: '#ff00ff',
  icyWhite: '#ffffff',
  redAccent: '#ff1133'
};

const GERMANY_POS = new THREE.Vector3(0, 2, 7.7);

export function HolographicGlobe({ timeOffset = 0 }: { timeOffset?: number }) {
  const globeRef = useRef<THREE.Group>(null);
  
  const [positions, colors] = useMemo(() => {
    const radius = 8;
    const count = 5000;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    
    const cCyan = new THREE.Color(COLORS.cyan);
    const cBlue = new THREE.Color(COLORS.electricBlue);
    const cViolet = new THREE.Color(COLORS.violet);
    
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      
      const mixRatio = (y + radius) / (radius * 2);
      const c = new THREE.Color().lerpColors(cBlue, cViolet, mixRatio);
      if (Math.random() > 0.8) c.lerp(cCyan, 0.9);
      
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    return [pos, cols];
  }, []);

  useFrame((state) => {
    if (globeRef.current) {
      // Sync global time across separate canvases
      const t = (Date.now() / 1000) - GLOBAL_START_TIME;
      
      // Cinematic Intro Rotation: Starts facing away (x: -Math.PI/2), rotates to front over 6 seconds
      let baseRotationY = 0;
      if (t < 8) {
        // Smooth ease-out from -1.5 to 0
        const progress = Math.min(t / 8, 1);
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);
        baseRotationY = -1.5 * (1 - easeOutQuad);
      }
      
      globeRef.current.rotation.y = baseRotationY + Math.sin(t * 0.1) * 0.15;
      globeRef.current.rotation.z = Math.sin(t * 0.05) * 0.05;
    }
  });

  return (
    <group ref={globeRef}>
      <mesh>
        <sphereGeometry args={[7.8, 64, 64]} />
        <meshBasicMaterial color="#020010" />
      </mesh>
      
      <mesh>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color={COLORS.electricBlue} wireframe transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
      
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.08} vertexColors transparent opacity={0.8} sizeAttenuation blending={THREE.AdditiveBlending} />
      </points>

      <group position={GERMANY_POS}>
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial color={COLORS.icyWhite} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.0, 32, 32]} />
          <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
        <GermanyRings timeOffset={timeOffset} />
        
        <CityLabel text="BERLIN" position={[0.4, 0.4, 0.1]} />
        <CityLabel text="MUNICH" position={[0.1, -0.6, 0.2]} />
        <CityLabel text="HAMBURG" position={[-0.3, 0.8, 0]} />
        <CityLabel text="FRANKFURT" position={[-0.5, -0.2, 0.1]} />
      </group>
    </group>
  );
}

function GermanyRings({ timeOffset = 0 }: { timeOffset?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      const t = (Date.now() / 1000) - GLOBAL_START_TIME;
      ref.current.children[0].scale.setScalar(1 + Math.sin(t * 2) * 0.1);
      ref.current.children[1].rotation.z = t;
    }
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI/2.2, 0, 0]}>
        <torusGeometry args={[1.8, 0.04, 16, 64]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI/1.8, 0, 0]}>
        <torusGeometry args={[2.8, 0.02, 16, 64]} />
        <meshBasicMaterial color={COLORS.redAccent} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function CityLabel({ text, position }: { text: string, position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[-0.1, 0, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={COLORS.icyWhite} />
      </mesh>
      <Text
        position={[0.1, 0, 0]}
        color={COLORS.icyWhite}
        fontSize={0.25}
        anchorX="left"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
      >
        {text}
      </Text>
    </group>
  );
}

export function AnimatedRoute({ start, end, color, speed, offset, timeOffset = 0 }: { start: THREE.Vector3, end: THREE.Vector3, color: string, speed: number, offset: number, timeOffset?: number }) {
  const curve = useMemo(() => {
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2 + (start.x > end.x ? -5 : 5),
      (start.y + end.y) / 2 + 5,
      (start.z + end.z) / 2 + 5
    );
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(50), [curve]);
  const packetRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (packetRef.current) {
      const globalTime = (Date.now() / 1000) - GLOBAL_START_TIME;
      const t = (globalTime * speed + offset) % 1;
      const pos = curve.getPoint(t);
      packetRef.current.position.copy(pos);
    }
  });

  return (
    <group>
      <Line points={points} color={color} opacity={0.15} transparent lineWidth={2} blending={THREE.AdditiveBlending} />
      <Trail width={0.5} length={8} color={color} attenuation={(t) => t * t}>
        <mesh ref={packetRef}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color={COLORS.icyWhite} />
        </mesh>
      </Trail>
    </group>
  );
}

export function JourneyRoutes({ timeOffset = 0 }: { timeOffset?: number }) {
  const routes = useMemo(() => {
    return [
      { start: new THREE.Vector3(-12, -8, 0), color: COLORS.cyan, speed: 0.15, offset: 0 },
      { start: new THREE.Vector3(12, -5, -2), color: COLORS.magenta, speed: 0.12, offset: 0.3 },
      { start: new THREE.Vector3(-8, 8, -4), color: COLORS.electricBlue, speed: 0.18, offset: 0.6 },
      { start: new THREE.Vector3(8, 8, 2), color: COLORS.violet, speed: 0.14, offset: 0.1 },
      { start: new THREE.Vector3(-4, -10, 4), color: COLORS.cyan, speed: 0.16, offset: 0.8 },
    ];
  }, []);

  return (
    <>
      {routes.map((r, i) => (
        <AnimatedRoute key={i} start={r.start} end={GERMANY_POS} color={r.color} speed={r.speed} offset={r.offset} timeOffset={timeOffset} />
      ))}
    </>
  );
}

export function FloatingCards() {
  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1} position={[-7, 2, 6]}>
        <group rotation={[0, 0.4, -0.1]}>
          <CardBase color={COLORS.cyan} />
          <mesh position={[0, 0.8, 0.05]}><circleGeometry args={[0.35, 32]} /><meshBasicMaterial color={COLORS.icyWhite} transparent opacity={0.9} /></mesh>
          <mesh position={[0, 0.2, 0.05]}><planeGeometry args={[1.2, 0.1]}/><meshBasicMaterial color={COLORS.cyan} /></mesh>
          <mesh position={[0, -0.1, 0.05]}><planeGeometry args={[1.2, 0.08]}/><meshBasicMaterial color={COLORS.icyWhite} transparent opacity={0.6}/></mesh>
          <mesh position={[0, -0.3, 0.05]}><planeGeometry args={[0.8, 0.08]}/><meshBasicMaterial color={COLORS.icyWhite} transparent opacity={0.6}/></mesh>
          <mesh position={[0, -0.7, 0.05]}><planeGeometry args={[1.2, 0.3]}/><meshBasicMaterial color={COLORS.electricBlue} transparent opacity={0.4}/></mesh>
        </group>
      </Float>

      <Float speed={2.5} rotationIntensity={0.4} floatIntensity={1.5} position={[6, 5, 4]}>
        <group rotation={[0, -0.5, 0.1]}>
          <CardBase color={COLORS.magenta} />
          <mesh position={[0, 0.5, 0.05]} rotation={[-Math.PI/2, 0, 0]}><coneGeometry args={[0.4, 0.3, 4]} /><meshBasicMaterial color={COLORS.icyWhite} /></mesh>
          <mesh position={[0, -0.3, 0.05]}><planeGeometry args={[1.0, 0.1]}/><meshBasicMaterial color={COLORS.magenta} /></mesh>
          <mesh position={[0, -0.6, 0.05]}><planeGeometry args={[0.6, 0.08]}/><meshBasicMaterial color={COLORS.icyWhite} transparent opacity={0.6}/></mesh>
        </group>
      </Float>

      <Float speed={1.8} rotationIntensity={0.6} floatIntensity={1.2} position={[8, -3, 5]}>
        <group rotation={[0, -0.3, -0.1]}>
          <CardBase color={COLORS.electricBlue} />
          <mesh position={[0, 0.4, 0.05]}><boxGeometry args={[0.6, 0.4, 0.01]} /><meshBasicMaterial color={COLORS.icyWhite} /></mesh>
          <mesh position={[0, 0.65, 0.05]}><torusGeometry args={[0.15, 0.04, 8, 16]} /><meshBasicMaterial color={COLORS.icyWhite} /></mesh>
          <mesh position={[0, -0.3, 0.05]}><planeGeometry args={[1.0, 0.1]}/><meshBasicMaterial color={COLORS.electricBlue} /></mesh>
          <mesh position={[0, -0.6, 0.05]}><planeGeometry args={[0.6, 0.08]}/><meshBasicMaterial color={COLORS.icyWhite} transparent opacity={0.6}/></mesh>
        </group>
      </Float>

      <Float speed={2.2} rotationIntensity={0.3} floatIntensity={1} position={[-6, -4, 4]}>
        <group rotation={[0, 0.5, 0.1]}>
          <CardBase color={COLORS.violet} />
          <mesh position={[0, 0.4, 0.05]}><circleGeometry args={[0.3, 32]} /><meshBasicMaterial color={COLORS.icyWhite} /></mesh>
          <mesh position={[0, 0.4, 0.06]}><circleGeometry args={[0.2, 32]} /><meshBasicMaterial color={COLORS.violet} /></mesh>
          <mesh position={[0, -0.3, 0.05]}><planeGeometry args={[1.0, 0.1]}/><meshBasicMaterial color={COLORS.violet} /></mesh>
          <mesh position={[0, -0.6, 0.05]}><planeGeometry args={[0.6, 0.08]}/><meshBasicMaterial color={COLORS.icyWhite} transparent opacity={0.6}/></mesh>
        </group>
      </Float>
    </group>
  );
}

function CardBase({ color }: { color: string }) {
  return (
    <>
      <mesh>
        <planeGeometry args={[2.0, 2.8]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <planeGeometry args={[2.0, 2.8]} />
        <meshBasicMaterial color={COLORS.icyWhite} wireframe transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

export function JourneySceneLayout({ timeOffset = 0 }: { timeOffset?: number }) {
  const { viewport } = useThree();
  const isMobile = viewport.width < 5;
  const position = isMobile ? [0, 2, -12] : [6, -1, -10];
  const scale = isMobile ? 0.6 : 1.1;

  return (
    <group position={position as [number, number, number]} scale={scale}>
      <HolographicGlobe timeOffset={timeOffset} />
      <JourneyRoutes timeOffset={timeOffset} />
      <FloatingCards />
    </group>
  );
}
