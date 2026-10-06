import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { useTheme } from "@/context/ThemeContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  lightPillarFragmentShader,
  lightPillarVertexShader,
  pillarBackdropFragmentShader,
  pillarBackdropVertexShader,
} from "@/lib/lightPillar";

const PLANE_DEPTH = new THREE.Vector3(0, 0, CONFIG.themeSweep.PLANE_Z + CONFIG.lightPillar.PLANE_OFFSET);

export function LightPillarBackdrop() {
  const mesh = useRef<THREE.Mesh>(null);
  const { camera, viewport } = useThree();
  const plane = viewport.getCurrentViewport(camera, PLANE_DEPTH);
  const { theme } = useTheme();
  const { revealProgressRef } = useHeroTransition();
  const { qualityTier, inputMode } = useSceneCapabilities();
  const reducedMotion = usePrefersReducedMotion();
  const cfg = CONFIG.lightPillar;
  const lowQuality = qualityTier === "low" || inputMode === "coarse";
  const time = useRef(0);

  const pillar = useMemo(() => {
    const quality = lowQuality ? cfg.QUALITY_LOW : cfg.QUALITY;
    const rotation = THREE.MathUtils.degToRad(cfg.PILLAR_ROTATION);
    const material = new THREE.ShaderMaterial({
      vertexShader: lightPillarVertexShader,
      fragmentShader: lightPillarFragmentShader(quality.ITERATIONS, quality.WAVE_ITERATIONS),
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTopColor: { value: new THREE.Color(cfg.TOP_COLOR) },
        uBottomColor: { value: new THREE.Color(cfg.BOTTOM_COLOR) },
        uIntensity: { value: cfg.INTENSITY },
        uGlowAmount: { value: cfg.GLOW_AMOUNT },
        uPillarWidth: { value: cfg.PILLAR_WIDTH },
        uPillarHeight: { value: cfg.PILLAR_HEIGHT },
        uRotCos: { value: 1 },
        uRotSin: { value: 0 },
        uPillarRotCos: { value: Math.cos(rotation) },
        uPillarRotSin: { value: Math.sin(rotation) },
        uWaveSin: { value: Math.sin(0.4) },
        uWaveCos: { value: Math.cos(0.4) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter });
    return { material, scene, target, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), scale: quality.RESOLUTION_SCALE };
  }, [cfg, lowQuality]);

  const pillarRef = useRef(pillar);
  useEffect(() => {
    pillarRef.current = pillar;
  }, [pillar]);

  const backdrop = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: pillarBackdropVertexShader,
    fragmentShader: pillarBackdropFragmentShader,
    uniforms: {
      uMap: { value: pillar.target.texture },
      uLightMode: { value: 0 },
      uOpacity: { value: cfg.OPACITY },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }), [pillar, cfg]);

  useEffect(() => () => {
    pillar.material.dispose();
    pillar.target.dispose();
    pillar.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    backdrop.dispose();
  }, [pillar, backdrop]);

  useFrame((state, delta) => {
    const current = mesh.current;
    if (!current) return;
    const fade = 1 - THREE.MathUtils.clamp(revealProgressRef.current / cfg.REVEAL_FADE, 0, 1);
    current.visible = fade > 0.001;
    if (!current.visible) return;
    const pillar = pillarRef.current;

    const width = Math.max(1, Math.round(state.size.width * state.viewport.dpr * pillar.scale));
    const height = Math.max(1, Math.round(state.size.height * state.viewport.dpr * pillar.scale));
    if (pillar.target.width !== width || pillar.target.height !== height) pillar.target.setSize(width, height);

    if (!reducedMotion) time.current += Math.min(delta, 1 / 20) * cfg.ROTATION_SPEED;
    const uniforms = pillar.material.uniforms;
    uniforms.uTime.value = time.current;
    uniforms.uRotCos.value = Math.cos(time.current * 0.3);
    uniforms.uRotSin.value = Math.sin(time.current * 0.3);
    uniforms.uResolution.value.set(width, height);

    const previous = state.gl.getRenderTarget();
    state.gl.setRenderTarget(pillar.target);
    state.gl.render(pillar.scene, pillar.camera);
    state.gl.setRenderTarget(previous);

    const material = current.material as THREE.ShaderMaterial;
    material.uniforms.uLightMode.value = theme === "Light" ? 1 : 0;
    material.uniforms.uOpacity.value = cfg.OPACITY * fade;
  });

  return (
    <mesh ref={mesh} position={[0, 0, PLANE_DEPTH.z]} scale={[plane.width, plane.height, 1]} frustumCulled={false} renderOrder={-1000} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <primitive object={backdrop} attach="material" />
    </mesh>
  );
}
