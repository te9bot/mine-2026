import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useSweptColor } from "@/context/ThemeContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ferrofluidFragmentShader, ferrofluidVertexShader } from "@/lib/ferrofluid";

const FLOW = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] } as const;
const PLANE_DEPTH = new THREE.Vector3(0, 0, CONFIG.themeSweep.PLANE_Z + CONFIG.ferrofluid.PLANE_OFFSET);

export function FerrofluidBackdrop() {
  const mesh = useRef<THREE.Mesh>(null);
  const { camera, viewport } = useThree();
  const plane = viewport.getCurrentViewport(camera, PLANE_DEPTH);
  const { revealProgressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const cfg = CONFIG.ferrofluid;
  const mouseTarget = useRef(new THREE.Vector2(-1e4, -1e4));
  const time = useRef(0);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ferrofluidVertexShader,
    fragmentShader: ferrofluidFragmentShader,
    uniforms: {
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iMouse: { value: new THREE.Vector2(-1e4, -1e4) },
      iTime: { value: 0 },
      uColor0: { value: new THREE.Color() },
      uColor1: { value: new THREE.Color() },
      uColor2: { value: new THREE.Color() },
      uFlow: { value: new THREE.Vector2(...FLOW[cfg.FLOW_DIRECTION]) },
      uSpeed: { value: cfg.SPEED },
      uScale: { value: cfg.SCALE },
      uTurbulence: { value: cfg.TURBULENCE },
      uFluidity: { value: cfg.FLUIDITY },
      uRimWidth: { value: cfg.RIM_WIDTH },
      uSharpness: { value: cfg.SHARPNESS },
      uShimmer: { value: cfg.SHIMMER },
      uGlow: { value: cfg.GLOW },
      uOpacity: { value: cfg.OPACITY },
      uMouseEnabled: { value: 1 },
      uMouseStrength: { value: cfg.MOUSE_STRENGTH },
      uMouseRadius: { value: cfg.MOUSE_RADIUS },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }), [cfg]);
  useEffect(() => () => material.dispose(), [material]);

  const outer = useSweptColor("textBody", mesh, useCallback((hex: string) => {
    material.uniforms.uColor0.value.set(hex);
    material.uniforms.uColor2.value.set(hex);
  }, [material]));
  const inner = useSweptColor("accent", mesh, useCallback((hex: string) => {
    material.uniforms.uColor1.value.set(hex);
  }, [material]));
  useEffect(() => {
    material.uniforms.uColor0.value.set(outer);
    material.uniforms.uColor2.value.set(outer);
    material.uniforms.uColor1.value.set(inner);
  }, [material, outer, inner]);

  useFrame((state, delta) => {
    const current = mesh.current;
    if (!current) return;
    const uniforms = (current.material as THREE.ShaderMaterial).uniforms;
    const width = state.size.width * state.viewport.dpr;
    const height = state.size.height * state.viewport.dpr;
    uniforms.iResolution.value.set(width, height, 1);
    if (!reducedMotion) time.current += Math.min(delta, 1 / 20);
    uniforms.iTime.value = time.current;
    mouseTarget.current.set((state.pointer.x * 0.5 + 0.5) * width, (state.pointer.y * 0.5 + 0.5) * height);
    const follow = 1 - Math.exp(-delta / Math.max(1e-4, cfg.MOUSE_DAMPENING));
    if (uniforms.iMouse.value.x < -1e3) uniforms.iMouse.value.copy(mouseTarget.current);
    else uniforms.iMouse.value.lerp(mouseTarget.current, follow);
    const fade = 1 - THREE.MathUtils.clamp(revealProgressRef.current / cfg.REVEAL_FADE, 0, 1);
    uniforms.uOpacity.value = cfg.OPACITY * fade;
    current.visible = fade > 0.001;
  });

  return (
    <mesh ref={mesh} position={[0, 0, PLANE_DEPTH.z]} scale={[plane.width, plane.height, 1]} frustumCulled={false} renderOrder={-1000} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
