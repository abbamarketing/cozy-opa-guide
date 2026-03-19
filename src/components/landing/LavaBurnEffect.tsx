import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform float u_intensity;
uniform float u_seed;

// Pseudo-random
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1 + u_seed, 311.7 + u_seed))) * 43758.5453);
}

// Value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion — 6 octaves for detail
float fbm(vec2 p) {
  float val = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  for (int i = 0; i < 6; i++) {
    val += amp * noise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

void main() {
  vec2 uv = vUv;

  // Fire coordinates — flow upward
  vec2 fireUv = uv * vec2(8.0, 3.0);
  fireUv.y -= u_time * 1.8;

  // Base fire shape
  float fire = fbm(fireUv);

  // Second layer for detail
  float detail = fbm(fireUv * 2.0 + vec2(u_time * 0.3, 0.0));

  // Combine
  float combined = fire * 0.7 + detail * 0.3;

  // Intensity mask — fire is strongest at bottom, fades at top
  float yMask = pow(1.0 - uv.y, 1.5);
  float intensity = combined * yMask * 2.5;

  // Apply global intensity (scroll-driven)
  intensity *= u_intensity;

  // Lava color ramp
  vec3 color = vec3(0.0);

  // Deep red core
  color += vec3(0.6, 0.05, 0.0) * smoothstep(0.0, 0.2, intensity);
  // Orange
  color += vec3(0.4, 0.25, 0.0) * smoothstep(0.15, 0.45, intensity);
  // Bright orange-yellow
  color += vec3(0.3, 0.4, 0.0) * smoothstep(0.35, 0.65, intensity);
  // Hot yellow
  color += vec3(0.2, 0.35, 0.1) * smoothstep(0.55, 0.8, intensity);
  // White-hot core
  color += vec3(0.3, 0.3, 0.25) * smoothstep(0.75, 1.0, intensity);

  // Horizontal edge fade
  float hFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.x);

  // Alpha
  float alpha = clamp(intensity * hFade * 1.5, 0.0, 1.0);

  // Ember sparks
  float spark = step(0.985, hash(floor(uv * 60.0) + floor(u_time * 3.0)));
  float sparkAlpha = spark * yMask * u_intensity * 0.8;
  vec3 sparkColor = vec3(1.0, 0.7, 0.2);

  color = mix(color, sparkColor, sparkAlpha);
  alpha = max(alpha, sparkAlpha);

  gl_FragColor = vec4(color, alpha);
}
`;

function FirePlane({ intensity }: { intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_intensity: { value: 0 },
    u_seed: { value: Math.random() * 100 },
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.u_intensity.value = intensity;
    }
  });

  return (
    <mesh ref={meshRef} scale={[2, 2, 1]}>
      <planeGeometry args={[2, 1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

interface LavaBurnEffectProps {
  intensity: number; // 0-1, driven by scroll
  visible: boolean;
}

export default function LavaBurnEffect({ intensity, visible }: LavaBurnEffectProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '35vh',
        zIndex: 15,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s',
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        camera={{ position: [0, 0, 1], fov: 50 }}
      >
        <FirePlane intensity={intensity} />
      </Canvas>
    </div>
  );
}
