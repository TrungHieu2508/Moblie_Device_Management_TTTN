import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Campus3DPinProps {
  position: [number, number, number];
  name: string;
  address?: string;
  schoolCount?: number;
  isSelected?: boolean;
  onClick?: () => void;
  color?: string;
}

// ─── Force Field Marker ──────────────────────────────────────────
const ForceFieldMarker = ({ color, active }: { color: string; active: boolean }) => {
  const ringsRef = useRef<THREE.Group>(null!);
  const diamondRef = useRef<THREE.Group>(null!);
  const domeRef = useRef<THREE.Mesh>(null!);

  const domeRadius = 4.0;
  const targetOpacity = active ? 0.35 : 0.15;

  useFrame((state, dt) => {
    if (!ringsRef.current || !diamondRef.current || !domeRef.current) return;
    
    // Rotate rings and diamond
    ringsRef.current.rotation.z -= dt * 0.5;
    diamondRef.current.rotation.y += dt * 1.2;
    
    // Pulse animation for floating and glowing
    const t = state.clock.getElapsedTime();
    diamondRef.current.position.y = 7 + Math.sin(t * 2) * 0.5; // Float up and down
    
    const pulse = 1 + Math.sin(t * 3) * 0.1;
    
    // Smooth opacity transition for dome
    const domeMat = domeRef.current.material as THREE.MeshStandardMaterial;
    domeMat.opacity = THREE.MathUtils.lerp(domeMat.opacity, targetOpacity * pulse, 0.1);
  });

  return (
    <group position={[0, 0.05, 0]}>
      {/* 1. Ground Rings */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group ref={ringsRef}>
          {/* Outer Ring */}
          <mesh>
            <ringGeometry args={[domeRadius - 0.2, domeRadius, 64]} />
            <meshBasicMaterial color={color} transparent opacity={active ? 0.8 : 0.4} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* Inner dashed ring pattern */}
          <mesh>
            <ringGeometry args={[domeRadius - 0.8, domeRadius - 0.6, 32, 1, 0, Math.PI * 2]} />
            <meshBasicMaterial color={color} transparent opacity={active ? 0.5 : 0.2} wireframe side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* 2. Floating Diamond (Crystal) Marker */}
      <group ref={diamondRef} position={[0, 9, 0]}>
        {/* Core Diamond */}
        <mesh castShadow>
          <octahedronGeometry args={[2.0, 0]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.1} 
            metalness={0.8} 
            emissive={color} 
            emissiveIntensity={active ? 1.0 : 0.6} 
          />
        </mesh>
        {/* Wireframe Aura */}
        <mesh>
          <octahedronGeometry args={[2.3, 0]} />
          <meshBasicMaterial 
            color="#ffffff" 
            wireframe 
            transparent 
            opacity={active ? 0.8 : 0.3} 
            blending={THREE.AdditiveBlending} 
          />
        </mesh>
      </group>

      {/* 2.5 Laser Anchor Line pointing to ground */}
      <mesh position={[0, 4.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 9, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* 3. Energy Dome (Hemisphere) */}
      <mesh ref={domeRef} position={[0, 0, 0]}>
        <sphereGeometry args={[domeRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={1.5}
          transparent 
          opacity={0.2} 
          roughness={0.1}
          metalness={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Core light at base */}
      <pointLight color={color} intensity={active ? 20 : 10} distance={15} decay={2} position={[0, 1, 0]} />
    </group>
  );
};

// ─── Campus3DPin ───────────────────────────────────────────────────
export const Campus3DPin = ({
  position,
  name,
  address,
  schoolCount = 0,
  isSelected = false,
  onClick,
  color = '#00ff88', // Default to a cyber green/cyan if not provided
}: Campus3DPinProps) => {
  const [hovered, setHover] = useState(false);
  const active = hovered || isSelected;
  // Use primary blue for selected, otherwise the provided color
  const themeColor = isSelected ? '#1A73E8' : color;

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHover(false); document.body.style.cursor = 'default'; }}
    >
      {/* Invisible hitbox for stable hover - covers the entire dome and pillar */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[8, 8, 20, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <ForceFieldMarker color={themeColor} active={active} />

      {/* ─── Glassmorphism Name Label ─────────────────────────────────────────── */}
      <Html
        position={[0, 14, 0]}
        center
        distanceFactor={22}
        zIndexRange={[100, 0]}
      >
        <div style={{
          background: active ? 'rgba(26, 115, 232, 0.35)' : 'rgba(10, 15, 25, 0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#ffffff',
          fontSize: 42,
          fontWeight: 900,
          fontFamily: '"Google Sans", "Noto Sans", system-ui, sans-serif',
          padding: '20px 48px',
          borderRadius: '28px',
          whiteSpace: 'nowrap',
          border: `2px solid ${active ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)'}`,
          boxShadow: active 
            ? `0 16px 50px rgba(26, 115, 232, 0.8), inset 0 0 24px rgba(255, 255, 255, 0.4)` 
            : '0 12px 40px rgba(0,0,0,0.6)',
          letterSpacing: '0.05em',
          userSelect: 'none',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          opacity: active ? 0 : 1 // Hide this label when active to show the detailed card instead
        }}>
          <div style={{
            textTransform: 'uppercase',
            textShadow: active ? `0 0 15px ${themeColor}, 0 0 30px ${themeColor}` : '0 2px 5px rgba(0,0,0,0.8)'
          }}>
            {name}
          </div>
          {schoolCount > 0 && (
             <div style={{
               fontSize: 24,
               fontWeight: 700,
               background: active ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.15)',
               padding: '6px 20px',
               borderRadius: '24px',
               border: '1px solid rgba(255,255,255,0.2)',
               boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
             }}>
               {schoolCount} Trường học
             </div>
          )}
        </div>
      </Html>

      {/* ─── Info card on hover (Detailed) ─────────────────────────────────── */}
      {hovered && !isSelected && (
        <Html
          position={[0, 16, 0]}
          center
          distanceFactor={28}
          zIndexRange={[200, 0]}
        >
          <div style={{
            background: 'rgba(15, 20, 30, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '24px',
            padding: '30px',
            minWidth: 360,
            boxShadow: '0 24px 60px rgba(0,0,0,0.8), inset 0 0 6px rgba(255,255,255,0.3)',
            fontFamily: '"Google Sans", system-ui, sans-serif',
            pointerEvents: 'none',
            border: `2px solid rgba(255,255,255,0.3)`,
            overflow: 'hidden',
            transition: 'opacity 0.2s',
          }}>
            {/* Cyberpunk accent line */}
            <div style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, height: '6px', 
              background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)` 
            }} />
            
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', marginBottom: 14, textShadow: '0 4px 8px rgba(0,0,0,0.6)' }}>
              {name}
            </div>
            {address && (
              <div style={{ fontSize: 18, color: '#e0e0e0', marginBottom: 20, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{opacity: 0.9, fontSize: '20px'}}>📍</span> {address}
              </div>
            )}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.15)', color: '#b9f6ca',
              border: '2px solid rgba(165, 214, 167, 0.4)',
              fontSize: 18, fontWeight: 700,
              padding: '12px 24px', borderRadius: '16px',
            }}>
              🏫 Hệ thống có {schoolCount} trường
            </div>
            <div style={{ 
              fontSize: 16, color: themeColor, marginTop: 24, 
              fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: '24px', lineHeight: 0 }}>⚲</span> Click để xem chi tiết
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default Campus3DPin;
