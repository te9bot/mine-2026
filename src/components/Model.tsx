import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { useDebugSettings } from "@/context/DebugSettingsContext";
import { useAnimationContext } from "@/context/AnimationContext";
import { useHeroTransition } from "@/context/HeroTransitionContext";
import { curlScrimCoverY } from "@/lib/detailsCurl";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CONFIG } from "../config/constants";
import { useSceneCapabilities } from "@/context/SceneCapabilitiesContext";
import { SkullParticles } from "@/components/SkullParticles";
import { SkullGlass } from "@/components/SkullGlass";
import { furBaldSpots, pikachuSource } from "@/lib/pikachuFur";
import type { ProjectOrbitCollider } from "@/lib/projectOrbitCollision";
import { heroAssemblyAt } from "@/lib/heroAssembly";
import {
  clampElasticPosition,
  createElasticBody,
  elasticBodyAtRest,
  elasticStretch,
  resetElasticBody,
  stepElasticBody,
} from "@/lib/elasticBody";
import { fitHeroModelSlot, heroModelSlot } from "@/lib/heroModelPlacement";

// Nothing of the model may show above the details gradient. Cutting it there
// rather than fading it keeps the model's own opacity out of it: the cut edge
// lands where the gradient is already at full cover, so it never shows. Module
// scope like the curl's own uniforms, for the one model in the scene.
const CLIP_DISABLED = 1e6;
const FOLD_CLIP = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_DISABLED);
const FOLD_CLIP_PLANES = [FOLD_CLIP];

useGLTF.setDecoderPath("/draco/");

const setCursor = (value: string) => {
  document.body.style.cursor = value;
};

export default function Model({ isDebug }: { isDebug: boolean }) {
  const animGroupRef = useRef<THREE.Group>(null);
  const transitionScaleGroupRef = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Group>(null);
  const skullSurfaceRef = useRef<THREE.Group>(null);
  const orbitCollider = useRef<ProjectOrbitCollider>({ object: null, radius: 1, active: false });
  const entranceProgressRef = useRef({ progress: 0, orbitElapsed: 0 });
  const { scene } = useGLTF("/glbs/pikachu.glb");
  const source = useMemo(() => pikachuSource(scene), [scene]);
  const baldSpots = useMemo(() => furBaldSpots(scene), [scene]);
  const surface = useMemo(() => source.geometry.clone().center(), [source]);
  useEffect(() => () => source.geometry.dispose(), [source]);
  useEffect(() => () => surface?.dispose(), [surface]);

  const heroLayout = useHeroLayout();
  const { responsiveScale: baseResponsiveScale } = heroLayout;
  const { startTrigger } = useAnimationContext();
  const { progressRef, revealProgressRef, modelAnchorRef } = useHeroTransition();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { compactHeight, inputMode, layoutMode, qualityTier } =
    useSceneCapabilities();
  const lowQuality = !isDebug && (inputMode === "coarse" || qualityTier === "low");

  const modelDepth = useRef(new THREE.Vector3(0, 0, CONFIG.model.DEPTH_Z));
  const previousStage = useRef(0);

  const { viewport } = useThree();

  const elasticRootRef = useRef<THREE.Group>(null);
  const stretchAlignRef = useRef<THREE.Group>(null);
  const stretchScaleRef = useRef<THREE.Group>(null);
  const stretchRestoreRef = useRef<THREE.Group>(null);
  const elasticBody = useRef(createElasticBody());
  const grabRef = useRef<{ startX: number; startY: number; lastX: number; lastY: number; vx: number; vy: number } | null>(null);

  const skullRotationGroupRef = useRef<THREE.Group>(null);

  const debug = useDebugSettings();

  useGSAP(() => {
    if (!animGroupRef.current) return;
    entranceProgressRef.current.progress = 0;
    entranceProgressRef.current.orbitElapsed = 0;

    if (!startTrigger) {
      animGroupRef.current.scale.set(0, 0, 0);
      return;
    }

    if (prefersReducedMotion) {
      animGroupRef.current.scale.set(0.95, 0.95, 0.95);
      const timeline = gsap.timeline({ delay: 0.5 });
      timeline.to(animGroupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.4,
        ease: "power2.out",
      }, 0);
      timeline.to(entranceProgressRef.current, { progress: 1, duration: 0.4, ease: "none" }, 0);
      return;
    }

    const duration = debug.skullAppearance.mode === "fragments" ? CONFIG.model.FRAGMENTS.ENTRANCE_DURATION : 1.5;
    const timeline = gsap.timeline({ delay: 1 });
    timeline.to(animGroupRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration,
      ease: debug.skullAppearance.mode === "fragments" ? CONFIG.model.FRAGMENTS.ENTRANCE_EASE : "elastic.out(1, 0.5)",
    }, 0);
    timeline.to(entranceProgressRef.current, { progress: 1, duration, ease: "none" }, 0);
    timeline.to(entranceProgressRef.current, {
      orbitElapsed: CONFIG.projectOrbit.ENTRANCE_DURATION,
      duration: CONFIG.projectOrbit.ENTRANCE_DURATION,
      ease: "none",
    }, duration * CONFIG.projectOrbit.ENTRANCE_START);
  }, { dependencies: [startTrigger, prefersReducedMotion], revertOnUpdate: true });

  const responsiveScale = baseResponsiveScale * debug.particles.scale;

  const skullRotation = CONFIG.model.PIKACHU_ROTATION;
  const modelExtent = useMemo(() => {
    if (!surface) return { height: 0, scatter: 0 };
    const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(skullRotation.x, skullRotation.y, skullRotation.z));
    const box = new THREE.Box3();
    const point = new THREE.Vector3();
    const swirl = new THREE.Vector3();
    const positions = surface.attributes.position;
    let swirlExtent = 0;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      swirl.set(-point.y, point.x, 0).applyMatrix4(rotation);
      swirlExtent = Math.max(swirlExtent, Math.abs(swirl.y));
      box.expandByPoint(point.applyMatrix4(rotation));
    }
    return {
      height: box.max.y - box.min.y,
      scatter: 2 * (CONFIG.heroAssembly.SCATTER_DISTANCE + (swirlExtent + CONFIG.heroAssembly.SCATTER_SWIRL_NOISE) * CONFIG.heroAssembly.SCATTER_SWIRL),
    };
  }, [surface, skullRotation.x, skullRotation.y, skullRotation.z]);

  useFrame((state, delta) => {
    const scrollProgress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const workstationRevealed = revealProgressRef.current > 0.001;
    const inDetails = scrollProgress >= CONFIG.model.DETAILS_POPUP_START;
    const assembly = heroAssemblyAt(scrollProgress, prefersReducedMotion);

    const stage = inDetails ? 1 : 0;
    const teleported = stage !== previousStage.current;
    previousStage.current = stage;
    const dt = Math.min(delta, 1 / 30);
    const entryRamp = THREE.MathUtils.clamp(
      (scrollProgress - CONFIG.model.DETAILS_POPUP_START) /
        CONFIG.model.POPUP_RAMP_SPAN,
      0,
      1,
    );
    const detailsScale = modelAnchorRef.current.scale * entryRamp;

    const modelViewport = state.viewport.getCurrentViewport(
      state.camera,
      modelDepth.current,
    );
    const scatterExtent = debug.skullAppearance.mode === "glass" ? 0 : assembly.scatter * modelExtent.scatter;
    const heroPlacement = layoutMode === "narrow" ? null : fitHeroModelSlot(
      heroModelSlot(heroLayout, scrollProgress),
      (modelExtent.height + scatterExtent) * responsiveScale / modelViewport.height,
      assembly.scale,
    );
    // The scrim is authored against the details sheet at z≈0; the model hangs a
    // depth closer, so the cut's world Y has to travel through this to land on
    // the same screen height.
    const foldDepthScale = modelViewport.height / viewport.height;

    FOLD_CLIP.constant =
      inDetails
        ? curlScrimCoverY() * foldDepthScale
        : CLIP_DISABLED;

    if (animGroupRef.current) {
      animGroupRef.current.visible = !workstationRevealed && (inDetails || assembly.opacity > 0);
      const heroYCurrent = heroPlacement ? heroPlacement.y * modelViewport.height :
        CONFIG.model.BASE_MODEL_Y +
        assembly.rise * modelViewport.height;
      const detailsTargetY =
        modelAnchorRef.current.yFraction * modelViewport.height;
      const detailsTargetX =
        modelAnchorRef.current.xFraction * modelViewport.width;
      const narrowHeroX = compactHeight
        ? modelViewport.width * CONFIG.model.NARROW_COMPACT_X_FRACTION
        : 0;

      const tracking = inDetails && !prefersReducedMotion && inputMode === "fine";
      const leanX = tracking ? THREE.MathUtils.clamp(state.pointer.x - modelAnchorRef.current.xFraction * 2, -1, 1) * CONFIG.model.COMPANION.LEAN * modelViewport.width : 0;
      const leanY = tracking ? THREE.MathUtils.clamp(state.pointer.y - modelAnchorRef.current.yFraction * 2, -1, 1) * CONFIG.model.COMPANION.LEAN * modelViewport.height : 0;
      const targetX =
        (inDetails ? detailsTargetX : layoutMode === "narrow" ? narrowHeroX : 0) + leanX;
      const targetY =
        (inDetails ? detailsTargetY : heroYCurrent) + leanY;

      animGroupRef.current.position.x = teleported
        ? targetX
        : THREE.MathUtils.damp(
            animGroupRef.current.position.x,
            targetX,
            10,
            dt,
          );
      animGroupRef.current.position.y = (heroPlacement && !inDetails) || teleported
        ? targetY
        : THREE.MathUtils.damp(
            animGroupRef.current.position.y,
            targetY,
            10,
            dt,
          );
    }

    if (transitionScaleGroupRef.current) {
      const narrowHeroScale = compactHeight
        ? CONFIG.model.NARROW_COMPACT_HERO_SCALE
        : CONFIG.model.NARROW_HERO_SCALE;
      const targetScale =
        inDetails ? detailsScale : assembly.scale * (layoutMode === "narrow" ? narrowHeroScale : 1);

      const currentScale = teleported
        ? 0
        : transitionScaleGroupRef.current.scale.x;
      const smoothScale = heroPlacement && !inDetails ? heroPlacement.scale : THREE.MathUtils.damp(
        currentScale,
        targetScale,
        10,
        dt,
      );
      transitionScaleGroupRef.current.scale.setScalar(smoothScale);
    }

    if (mesh.current) {
      const t = state.clock.getElapsedTime() * CONFIG.model.IDLE_ROTATION_SPEED;
      const idle = prefersReducedMotion ? 0 : CONFIG.model.IDLE_MAX_ANGLE;
      const tracking = !prefersReducedMotion && inputMode === "fine";
      const pointer = tracking
        ? inDetails ? CONFIG.model.COMPANION.LOOK_MAX_ANGLE : CONFIG.model.CURSOR_MAX_ANGLE
        : 0;
      const lookX = inDetails ? state.pointer.x - modelAnchorRef.current.xFraction * 2 : state.pointer.x;
      const lookY = inDetails ? state.pointer.y - modelAnchorRef.current.yFraction * 2 : state.pointer.y;
      const x = -THREE.MathUtils.clamp(lookY, -1, 1) * pointer;
      const y = THREE.MathUtils.clamp(lookX, -1, 1) * pointer;
      const length = Math.hypot(x, y);
      const limit = length > pointer && length > 0 ? pointer / length : 1;
      mesh.current.rotation.x = THREE.MathUtils.damp(mesh.current.rotation.x, x * limit, CONFIG.model.TILT_RESPONSE, dt);
      mesh.current.rotation.y = THREE.MathUtils.damp(mesh.current.rotation.y, y * limit, CONFIG.model.TILT_RESPONSE, dt);
      mesh.current.rotation.z = Math.sin(t) * idle;
    }
  }, -3);

  const elastic = CONFIG.model.ELASTIC;

  useEffect(() => {
    const release = () => {
      const grab = grabRef.current;
      if (!grab) return;
      elasticBody.current.vx += grab.vx * elastic.FLING_BOOST;
      elasticBody.current.vy += grab.vy * elastic.FLING_BOOST;
      grabRef.current = null;
      setCursor("");
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      grabRef.current = null;
      setCursor("");
    };
  }, [elastic.FLING_BOOST]);

  const grabbable = () =>
    !prefersReducedMotion &&
    !!animGroupRef.current?.visible &&
    (transitionScaleGroupRef.current?.scale.x ?? 0) > 0.05 &&
    revealProgressRef.current <= 0.001;

  useFrame((state, delta) => {
    const root = elasticRootRef.current;
    const align = stretchAlignRef.current;
    const scale = stretchScaleRef.current;
    const restore = stretchRestoreRef.current;
    if (!root || !align || !scale || !restore) return;

    const body = elasticBody.current;
    const grab = grabRef.current;
    if (grab && !grabbable()) {
      grabRef.current = null;
      setCursor("");
    }

    const active = grabRef.current;
    if (!active && elasticBodyAtRest(body, elastic.REST_EPSILON)) {
      if (body.x !== 0 || body.y !== 0 || body.dx !== 0 || body.dy !== 0) {
        resetElasticBody(body);
        root.position.set(0, 0, 0);
        align.rotation.z = 0;
        scale.scale.set(1, 1, 1);
        restore.rotation.z = 0;
      }
      return;
    }

    const dt = Math.min(delta, 1 / 30);
    const view = state.viewport.getCurrentViewport(state.camera, modelDepth.current);

    let offset: { x: number; y: number } | null = null;
    if (active) {
      const cursorX = (state.pointer.x * view.width) / 2;
      const cursorY = (state.pointer.y * view.height) / 2;
      const smoothing = 1 - Math.exp(-elastic.VELOCITY_SMOOTHING * dt);
      active.vx += ((cursorX - active.lastX) / dt - active.vx) * smoothing;
      active.vy += ((cursorY - active.lastY) / dt - active.vy) * smoothing;
      active.lastX = cursorX;
      active.lastY = cursorY;
      offset = { x: cursorX - active.startX, y: cursorY - active.startY };
    }

    stepElasticBody(body, offset, dt, elastic);
    clampElasticPosition(body, view.height * elastic.MAX_OFFSET_HEIGHTS);

    const stretch = elasticStretch(body, view.height, elastic.STRETCH_GAIN, elastic.MAX_STRETCH);
    root.position.set(body.x, body.y, 0);
    align.rotation.z = stretch.angle;
    scale.scale.set(stretch.along, stretch.across, stretch.across);
    restore.rotation.z = -stretch.angle;
  }, -2);

  return (
    <group ref={elasticRootRef}>
      <group position={[0, 0.1, CONFIG.model.DEPTH_Z]} ref={animGroupRef}>
        <group ref={transitionScaleGroupRef}>
          <group ref={stretchAlignRef}>
            <group ref={stretchScaleRef}>
              <group ref={stretchRestoreRef}>
                <mesh
                  onPointerOver={() => {
                    if (grabbable() && !grabRef.current) setCursor("grab");
                  }}
                  onPointerOut={() => {
                    if (!grabRef.current) setCursor("");
                  }}
                  onPointerDown={(event) => {
                    if (!grabbable()) return;
                    event.stopPropagation();
                    const view = viewport.getCurrentViewport(event.camera, modelDepth.current);
                    const cursorX = (event.pointer.x * view.width) / 2;
                    const cursorY = (event.pointer.y * view.height) / 2;
                    grabRef.current = { startX: cursorX, startY: cursorY, lastX: cursorX, lastY: cursorY, vx: 0, vy: 0 };
                    setCursor("grabbing");
                  }}
                >
                  <sphereGeometry args={[modelExtent.height * responsiveScale * elastic.HIT_RADIUS_MULT, 16, 12]} />
                  <meshBasicMaterial visible={false} />
                </mesh>
                <group ref={mesh}>
                  <group
                    ref={skullRotationGroupRef}
                    rotation={[skullRotation.x, skullRotation.y, skullRotation.z]}
                  >
                    <group ref={skullSurfaceRef} scale={responsiveScale}>
                      {debug.skullAppearance.mode === "glass" && surface && (
                        <SkullGlass
                          geometry={surface}
                          orbitCollider={orbitCollider}
                          lowQuality={lowQuality}
                          clippingPlanes={FOLD_CLIP_PLANES}
                        />
                      )}
                      {debug.skullAppearance.mode !== "glass" && (
                        <SkullParticles
                          entranceRef={animGroupRef}
                          orbitCollider={orbitCollider}
                          fragments={debug.skullAppearance.mode === "fragments"}
                          source={source}
                          lowQuality={lowQuality}
                          clippingPlanes={FOLD_CLIP_PLANES}
                          furBaldSpots={baldSpots}
                        />
                      )}
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
