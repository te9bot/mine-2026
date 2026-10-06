import * as THREE from "three";
import { CONFIG } from "@/config/constants";

export const FUR_MATERIAL = "Pikachu_Fur";
const BALD_PREFIXES = ["Pikachu_Iris", "Pikachu_Cheek", "Pikachu_Nose", "Pikachu_Mouth"];
const MAX_BALD_SPOTS = 8;

export function pikachuSource(scene: THREE.Object3D) {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const furLengths: number[] = [];
  const glosses: number[] = [];
  const indices: number[] = [];
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry as THREE.BufferGeometry;
    const material = child.material as THREE.MeshStandardMaterial;
    const position = geometry.attributes.position;
    const normalAttribute = geometry.attributes.normal;
    const color = geometry.attributes.color;
    const furry = material.name === FUR_MATERIAL;
    const base = positions.length / 3;
    normalMatrix.getNormalMatrix(child.matrixWorld);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
      positions.push(point.x, point.y, point.z);
      normal.fromBufferAttribute(normalAttribute, i).applyMatrix3(normalMatrix).normalize();
      normals.push(normal.x, normal.y, normal.z);
      if (color) {
        colors.push(color.getX(i) * material.color.r, color.getY(i) * material.color.g, color.getZ(i) * material.color.b);
        furLengths.push(furry && color.itemSize === 4 ? color.getW(i) : furry ? 0.7 : 0);
      } else {
        colors.push(material.color.r, material.color.g, material.color.b);
        furLengths.push(0);
      }
      glosses.push(furry ? 0 : 1 - material.roughness);
    }
    if (geometry.index) {
      for (let i = 0; i < geometry.index.count; i++) indices.push(base + geometry.index.getX(i));
    } else {
      for (let i = 0; i < position.count; i++) indices.push(base + i);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("furLength", new THREE.Float32BufferAttribute(furLengths, 1));
  geometry.setAttribute("gloss", new THREE.Float32BufferAttribute(glosses, 1));
  geometry.setIndex(indices);
  return new THREE.Mesh(geometry);
}

export function furBaldSpots(scene: THREE.Object3D) {
  const spots: THREE.Vector4[] = [];
  const sphere = new THREE.Sphere();
  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !BALD_PREFIXES.some((prefix) => child.name.startsWith(prefix))) return;
    child.geometry.computeBoundingSphere();
    sphere.copy(child.geometry.boundingSphere!).applyMatrix4(child.matrixWorld);
    spots.push(new THREE.Vector4(sphere.center.x, sphere.center.y, sphere.center.z, sphere.radius));
  });
  while (spots.length < MAX_BALD_SPOTS) spots.push(new THREE.Vector4(0, 0, 0, -1));
  return spots.slice(0, MAX_BALD_SPOTS);
}

export function furShellGeometry(source: THREE.BufferGeometry, shells: number) {
  const interior = source.getAttribute("fragmentInterior");
  const length = source.getAttribute("furLength");
  const keep: number[] = [];
  for (let vertex = 0; vertex < source.attributes.position.count; vertex += 3) {
    const outside = !interior || (interior.getX(vertex) + interior.getX(vertex + 1) + interior.getX(vertex + 2)) === 0;
    const furry = Math.max(length.getX(vertex), length.getX(vertex + 1), length.getX(vertex + 2)) > 0.01;
    if (outside && furry) keep.push(vertex, vertex + 1, vertex + 2);
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const values = new Float32Array(keep.length * attribute.itemSize);
    keep.forEach((vertex, i) => {
      for (let component = 0; component < attribute.itemSize; component++) {
        values[i * attribute.itemSize + component] = attribute.getComponent(vertex, component);
      }
    });
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, attribute.itemSize));
  }
  const heights = new Float32Array(shells);
  for (let i = 0; i < shells; i++) heights[i] = (i + 1) / shells;
  geometry.setAttribute("aShell", new THREE.InstancedBufferAttribute(heights, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function applyPikachuSurfaceShader(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
attribute float gloss;
varying float vGloss;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vGloss = gloss;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
varying float vGloss;`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.08, vGloss);`)
      .replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb *= mix(${CONFIG.model.FUR.ROOT_SHADE.toFixed(3)}, 1.0, vGloss);`);
  };
  material.customProgramCacheKey = () => "pikachu-surface";
  material.needsUpdate = true;
}

export function applyFurShader(material: THREE.MeshStandardMaterial, baldSpots: THREE.Vector4[]) {
  const { LENGTH, GRAVITY, DENSITY, CLUMP, ROOT_SHADE, TIP_LIGHT } = CONFIG.model.FUR;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFurLength = { value: LENGTH };
    shader.uniforms.uFurGravity = { value: GRAVITY };
    shader.uniforms.uFurDensity = { value: DENSITY };
    shader.uniforms.uFurClump = { value: CLUMP };
    shader.uniforms.uFurBald = { value: baldSpots };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float aShell;
attribute float furLength;
uniform float uFurLength;
uniform float uFurGravity;
uniform vec4 uFurBald[${MAX_BALD_SPOTS}];
varying vec3 vFurPosition;
varying float vFurShell;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float furMask = furLength;
for (int i = 0; i < ${MAX_BALD_SPOTS}; i++) {
  vec4 spot = uFurBald[i];
  if (spot.w > 0.0) furMask *= smoothstep(spot.w * 0.85, spot.w * 1.5, distance(position, spot.xyz));
}
float furHeight = aShell * furMask;
transformed += normalize(objectNormal) * uFurLength * furHeight;
transformed.y -= uFurGravity * furHeight * furHeight;
vFurPosition = position;
vFurShell = aShell;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uFurDensity;
uniform float uFurClump;
varying vec3 vFurPosition;
varying float vFurShell;
float furHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float furNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(furHash(i), furHash(i + vec3(1, 0, 0)), f.x), mix(furHash(i + vec3(0, 1, 0)), furHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(furHash(i + vec3(0, 0, 1)), furHash(i + vec3(1, 0, 1)), f.x), mix(furHash(i + vec3(0, 1, 1)), furHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float furStrand(vec3 p, out float tint) {
  vec3 cell = floor(p);
  vec3 jitter = vec3(furHash(cell), furHash(cell + 7.1), furHash(cell + 13.7)) - 0.5;
  tint = furHash(cell + 3.3);
  return length(fract(p) - 0.5 - jitter * 0.45);
}`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
float furTint = 0.5;
{
  vec3 clump = vec3(furNoise(vFurPosition * 11.0), furNoise(vFurPosition * 11.0 + 17.0), furNoise(vFurPosition * 11.0 + 31.0)) - 0.5;
  vec3 strandPosition = vFurPosition * uFurDensity + clump * uFurClump;
  float tintA;
  float tintB;
  float a = furStrand(strandPosition, tintA);
  float b = furStrand(strandPosition * 1.31 + 0.5, tintB);
  float radius = 0.5 * (1.0 - vFurShell) * (1.0 - vFurShell * 0.25);
  if (min(a, b) > radius) discard;
  furTint = a < b ? tintA : tintB;
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
diffuseColor.rgb *= mix(${ROOT_SHADE.toFixed(3)}, ${TIP_LIGHT.toFixed(3)}, vFurShell) * (0.88 + furTint * 0.24);`,
      );
  };
  material.customProgramCacheKey = () => "pikachu-fur";
  material.needsUpdate = true;
}
