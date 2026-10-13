import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { JourneySceneLayout, COLORS } from './ThreeD/JourneyScene';

interface IntroAnimationProps {
  onComplete: () => void;
}

function ProfileNode() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.position.y = Math.sin(t * 1.5) * 0.5;
    }
  });

  return (
    <group position={[0, 0, 65]} ref={ref}>
      <Float speed={2} rotationIntensity={0.3} floatIntensity={1}>
        {/* Core Glass Card */}
        <mesh>
          <planeGeometry args={[8, 10]} />
          <meshBasicMaterial color={COLORS.electricBlue} transparent opacity={0.1} wireframe />
        </mesh>
        
        {/* Outer Tech Ring */}
        <mesh position={[0, 0, -1]}>
          <ringGeometry args={[5, 5.2, 64]} />
          <meshBasicMaterial color={COLORS.violet} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0, -1.2]} rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[6, 6.1, 4]} />
          <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.3} />
        </mesh>

        <Text position={[0, 2.5, 0.1]} fontSize={0.8} color={COLORS.icyWhite} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">Applicant Profile</Text>
        <Text position={[0, 0.5, 0.1]} fontSize={0.5} color={COLORS.cyan} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">Identity Synced</Text>
        <Text position={[0, -1.5, 0.1]} fontSize={0.35} color={COLORS.icyWhite} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">Validating parameters...</Text>
      </Float>
    </group>
  );
}

function DocumentNode() {
  return (
    <group position={[0, 0, 45]}>
      <Float speed={2.5} rotationIntensity={0.5} floatIntensity={2}>
        <group position={[-5, 0, 0]} rotation={[0, 0.6, 0]}>
          <mesh><planeGeometry args={[5, 7]} /><meshBasicMaterial color={COLORS.cyan} transparent opacity={0.15} wireframe /></mesh>
          <mesh position={[0, 0, -0.1]}><planeGeometry args={[5.2, 7.2]} /><meshBasicMaterial color={COLORS.cyan} transparent opacity={0.05} /></mesh>
          <Text position={[0, 0, 0.2]} fontSize={0.6} color={COLORS.icyWhite} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">Curriculum Vitae</Text>
        </group>
      </Float>
      <Float speed={2} rotationIntensity={0.4} floatIntensity={1.5}>
        <group position={[5, 1, -3]} rotation={[0, -0.5, 0]}>
          <mesh><planeGeometry args={[5, 7]} /><meshBasicMaterial color={COLORS.magenta} transparent opacity={0.15} wireframe /></mesh>
          <mesh position={[0, 0, -0.1]}><planeGeometry args={[5.2, 7.2]} /><meshBasicMaterial color={COLORS.magenta} transparent opacity={0.05} /></mesh>
          <Text position={[0, 0, 0.2]} fontSize={0.6} color={COLORS.icyWhite} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">Certifications</Text>
        </group>
      </Float>
    </group>
  );
}

function AINode() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.4;
      group.current.rotation.x = state.clock.elapsedTime * 0.2;
    }
  });
  
  return (
    <group position={[0, 0, 25]}>
      <Float speed={3} rotationIntensity={1.5} floatIntensity={2}>
        <group ref={group}>
          {/* Central AI Core */}
          <mesh>
            <icosahedronGeometry args={[4, 1]} />
            <meshBasicMaterial color={COLORS.cyan} wireframe transparent opacity={0.6} />
          </mesh>
          <mesh>
            <icosahedronGeometry args={[1.5, 0]} />
            <meshBasicMaterial color={COLORS.violet} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
          </mesh>
          
          {/* Orbiting Neural Nodes */}
          {[...Array(8)].map((_, i) => (
             <mesh key={i} position={[Math.sin(i * Math.PI/4) * 6, Math.cos(i * Math.PI/4) * 6, Math.sin(i * 2) * 3]}>
               <sphereGeometry args={[0.2, 16, 16]} />
               <meshBasicMaterial color={COLORS.icyWhite} />
             </mesh>
          ))}
        </group>
      </Float>
      <Text position={[0, -7, 0]} fontSize={1} color={COLORS.icyWhite} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf">AI Eligibility Verified</Text>
    </group>
  );
}

function DataStreams() {
  // Luminous paths connecting the journey nodes to the destination (Globe)
  const globePos = new THREE.Vector3(6, -1, -10);
  return (
    <group>
      <Line points={[[2, 0, 65], [4, -2, 45], [1, 3, 25], globePos]} color={COLORS.cyan} transparent opacity={0.4} lineWidth={2} />
      <Line points={[[-2, 1, 65], [-5, 3, 45], [-2, -2, 25], globePos]} color={COLORS.magenta} transparent opacity={0.4} lineWidth={2} />
      <Line points={[[0, 4, 65], [0, 5, 45], [3, 0, 25], globePos]} color={COLORS.electricBlue} transparent opacity={0.4} lineWidth={2} />
    </group>
  );
}

function CinematicSequence({ onComplete }: { onComplete: () => void }) {
  const completed = useRef(false);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Z-Axis Journey: Start at Z=80, dive smoothly to Z=10
    let targetZ = 80;
    if (t > 1 && t <= 7) {
      const p = (t - 1) / 6;
      // Exponential/Cubic easing for a massive, accelerating swoop
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      targetZ = 80 - ease * 70;
    } else if (t > 7) {
      targetZ = 10;
    }
    
    // Add subtle cinematic XY drift that reduces to zero as it approaches the final resting position
    const driftFactor = Math.max((targetZ - 10) / 70, 0); 
    const driftX = Math.sin(t * 0.6) * 4 * driftFactor;
    const driftY = Math.cos(t * 0.5) * 3 * driftFactor;

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, driftX, 0.1);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, driftY, 0.1);
    state.camera.position.z = targetZ;
    
    // Always look steadily forward through the tunnel of nodes
    state.camera.lookAt(0, 0, 0);
    
    // When the camera rests perfectly at [0, 0, 10], trigger the seamless crossfade to the homepage
    if (t > 7.5 && !completed.current) {
       completed.current = true;
       onComplete();
    }
  });

  return (
    <>
      <ProfileNode />
      <DocumentNode />
      <AINode />
      <DataStreams />
      
      {/* 
         The actual homepage 3D scene.
         Rendered here at the end of the tunnel so the intro camera flawlessly lands on it.
      */}
      <JourneySceneLayout />
    </>
  );
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasSeenIntro = sessionStorage.getItem('introPlayed');

    if (prefersReducedMotion || hasSeenIntro) {
      onComplete();
    }
  }, [onComplete]);

  const handleSequenceComplete = () => {
    setFading(true);
    sessionStorage.setItem('introPlayed', 'true');
    // Allow the 0.8s opacity transition to finish, seamlessly revealing the identical homepage background
    setTimeout(onComplete, 800);
  };

  const handleSkip = () => {
    setFading(true);
    sessionStorage.setItem('introPlayed', 'true');
    setTimeout(onComplete, 400);
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] bg-[#040112] overflow-hidden pointer-events-auto"
    >
      {/* Background matches ThreeDBackground.tsx perfectly for a zero-jump transition */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_#1f004d,_#040112,_#000000)]" />
      
      <Canvas camera={{ position: [0, 0, 80], fov: 55 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} dpr={[1, 2]}>
        <ambientLight intensity={1.5} color={COLORS.violet} />
        <directionalLight position={[10, 20, 20]} intensity={3} color={COLORS.cyan} />
        <directionalLight position={[-10, -20, 10]} intensity={2} color={COLORS.magenta} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />
        
        <CinematicSequence onComplete={handleSequenceComplete} />
      </Canvas>

      <button
        onClick={handleSkip}
        className="absolute bottom-8 right-12 z-50 px-6 py-2 border border-white/20 rounded-full text-xs text-white/70 hover:text-white hover:bg-white/10 uppercase tracking-[0.2em] transition-all duration-300 backdrop-blur-md"
      >
        Skip Intro
      </button>
    </motion.div>
  );
};
