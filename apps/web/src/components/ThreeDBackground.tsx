import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { JourneySceneLayout, COLORS } from './ThreeD/JourneyScene';

// Cursor-Responsive Interactive Camera
function InteractiveCamera() {
  const { camera, size } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates to -1 to +1
      mouse.current.x = (e.clientX / size.width) * 2 - 1;
      mouse.current.y = -(e.clientY / size.height) * 2 + 1;
    };
    
    // Only listen to mouse move on desktop, mobile can have ambient movement
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size]);

  useFrame(() => {
    // Resting position matches the final frame of IntroAnimation exactly
    const targetX = mouse.current.x * 2; // subtle yaw
    const targetY = mouse.current.y * 1.5; // subtle pitch
    
    // Smoothly lerp camera position
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    // Keep Z locked at 10 to perfectly match the intro's final frame depth
    camera.position.z = 10;
    
    // Have the camera always look at the center of the scene for parallax
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export const ThreeDBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden bg-[#040112] ${className}`} style={{ zIndex: 0, pointerEvents: 'none' }}>
      
      {/* Vibrant Atmospheric Lighting Gradient (Matches IntroAnimation exactly) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_var(--tw-gradient-stops))] from-[#1f004d] via-[#040112] to-[#000000] opacity-100" />
      
      <Canvas camera={{ position: [0, 0, 10], fov: 55 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} dpr={[1, 2]}>
        
        {/* Dynamic Colorful Lighting (Matches IntroAnimation exactly) */}
        <ambientLight intensity={1.5} color={COLORS.violet} />
        <directionalLight position={[10, 20, 20]} intensity={3} color={COLORS.cyan} />
        <directionalLight position={[-10, -20, 10]} intensity={2} color={COLORS.magenta} />
        
        {/* Exact same scene geometry rendering */}
        <JourneySceneLayout />
        
        {/* Smooth, interactive cursor parallax */}
        <InteractiveCamera />
        
      </Canvas>
      
      {/* Foreground gradient restricted to the extreme left to guarantee text readability without hiding the 3D scene */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#02000a] via-[#02000a]/50 to-transparent w-[45%]" />
    </div>
  );
};
