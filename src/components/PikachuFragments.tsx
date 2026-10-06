import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { CONFIG } from "@/config/constants";
import { applySkullFragmentShader } from "@/lib/skullFragments";
import type { SkullSimulationUniforms } from "@/lib/skullParticles";
import { applySkullOrbitLighting, createSkullOrbitLightingUniforms } from "@/lib/skullOrbitLighting";
import { orbitCollisionTransform, type ProjectOrbitCollider } from "@/lib/projectOrbitCollision";
import { applyFurShader, applyPikachuSurfaceShader, furShellGeometry } from "@/lib/pikachuFur";
import { useOrbitSignal } from "@/context/OrbitSignalContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { heroAssemblyAt } from "@/lib/heroAssembly";

export function PikachuFragments({
  geometry,
  fragments,
  baldSpots,
  lowQuality,
  clippingPlanes,
  orbitCollider,
}: {
  geometry: THREE.BufferGeometry;
  fragments: SkullSimulationUniforms;
  baldSpots: THREE.Vector4[];
  lowQuality: boolean;
  clippingPlanes: THREE.Plane[];
  orbitCollider: RefObject<ProjectOrbitCollider>;
}) {
  const surface = useRef<THREE.Mesh>(null);
  const figure = useRef<THREE.Group>(null);
  const { config } = useOrbitSignal();
  const { progressRef } = useHeroTransition();
  const reducedMotion = usePrefersReducedMotion();
  const exitDissolve = useRef({ value: 0 });
  const orbitLighting = useRef(createSkullOrbitLightingUniforms());
  const shells = lowQuality ? CONFIG.model.FUR.SHELLS_LOW : CONFIG.model.FUR.SHELLS;

  const surfaceMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: CONFIG.model.FUR.ROUGHNESS,
      envMapIntensity: CONFIG.model.FUR.ENV_INTENSITY,
      clippingPlanes,
    });
    applyPikachuSurfaceShader(material);
    return material;
  }, [clippingPlanes]);

  const furMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: CONFIG.model.FUR.ROUGHNESS,
      envMapIntensity: CONFIG.model.FUR.ENV_INTENSITY,
      clippingPlanes,
    });
    applyFurShader(material);
    return material;
  }, [clippingPlanes]);

  const fur = useMemo(() => {
    const mesh = new THREE.InstancedMesh(furShellGeometry(geometry, shells, baldSpots), furMaterial, shells);
    mesh.frustumCulled = false;
    mesh.raycast = () => null;
    return mesh;
  }, [geometry, shells, furMaterial, baldSpots]);

  useEffect(() => {
    const restoreSurface = applySkullFragmentShader(surfaceMaterial, fragments, exitDissolve.current);
    const restoreLighting = applySkullOrbitLighting(surfaceMaterial, orbitLighting.current);
    const restoreFur = applySkullFragmentShader(furMaterial, fragments, exitDissolve.current);
    return () => {
      restoreLighting();
      restoreSurface();
      restoreFur();
    };
  }, [surfaceMaterial, furMaterial, fragments]);

  useEffect(() => () => {
    surfaceMaterial.dispose();
    furMaterial.dispose();
    fur.geometry.dispose();
  }, [surfaceMaterial, furMaterial, fur]);

  useFrame(({ camera }) => {
    if (!surface.current) return;
    const inDetails = progressRef.current >= CONFIG.model.DETAILS_POPUP_START;
    const assembly = heroAssemblyAt(progressRef.current, reducedMotion);
    exitDissolve.current.value = 0;
    figure.current?.scale.setScalar(inDetails || reducedMotion ? 1 : Math.max(0.0001, assembly.opacity * assembly.opacity * (3 - 2 * assembly.opacity)));
    const collider = orbitCollider.current;
    const lighting = orbitLighting.current;
    lighting.skullOrbitHud.value = config.style === "cyberpunk" ? 1 : 0;
    lighting.skullOrbitLight.value.set(0, config.illumination, config.occlusion, 0);
    if (collider.active && orbitCollisionTransform(surface.current, collider, lighting.skullOrbitFromLocal.value)) {
      orbitCollisionTransform(camera, collider, lighting.skullOrbitFromView.value);
      lighting.skullOrbitLight.value.x = collider.opacity ?? 1;
      lighting.skullOrbitReveal.value = collider.reveal ?? 1;
      lighting.skullOrbitPhase.value = collider.phase ?? 0;
      lighting.skullOrbitCurvature.value = collider.curvature ?? 1;
      if (collider.shape) lighting.skullOrbitShape.value.copy(collider.shape);
    }
  });

  return (
    <group ref={figure}>
      <mesh ref={surface} geometry={geometry} material={surfaceMaterial} frustumCulled={false} raycast={() => null} />
      <primitive object={fur} />
    </group>
  );
}
