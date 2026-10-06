export const lightPillarVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const lightPillarFragmentShader = (iterations: number, waveIterations: number) => /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
uniform float uIntensity;
uniform float uGlowAmount;
uniform float uPillarWidth;
uniform float uPillarHeight;
uniform float uRotCos;
uniform float uRotSin;
uniform float uPillarRotCos;
uniform float uPillarRotSin;
uniform float uWaveSin;
uniform float uWaveCos;
varying vec2 vUv;

const int MAX_ITER = ${iterations};
const int WAVE_ITER = ${waveIterations};

void main() {
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
  uv = vec2(uPillarRotCos * uv.x - uPillarRotSin * uv.y, uPillarRotSin * uv.x + uPillarRotCos * uv.y);

  vec3 ro = vec3(0.0, 0.0, -10.0);
  vec3 rd = normalize(vec3(uv, 1.0));

  vec3 col = vec3(0.0);
  float t = 0.1;

  for (int i = 0; i < MAX_ITER; i++) {
    vec3 p = ro + rd * t;
    p.xz = vec2(uRotCos * p.x - uRotSin * p.z, uRotSin * p.x + uRotCos * p.z);

    vec3 q = p;
    q.y = p.y * uPillarHeight + uTime;

    float freq = 1.0;
    float amp = 1.0;
    for (int j = 0; j < WAVE_ITER; j++) {
      q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);
      q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
      freq *= 2.0;
      amp *= 0.5;
    }

    float d = length(cos(q.xz)) - 0.2;
    float bound = length(p.xz) - uPillarWidth;
    float k = 4.0;
    float h = max(k - abs(d - bound), 0.0);
    d = max(d, bound) + h * h * 0.0625 / k;
    d = abs(d) * 0.15 + 0.01;

    float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
    col += mix(uBottomColor, uTopColor, grad) / d;

    t += d;
    if (t > 50.0) break;
  }

  float widthNorm = uPillarWidth / 3.0;
  vec3 x = col * uGlowAmount / widthNorm;
  vec3 e = exp(-2.0 * x);
  col = (1.0 - e) / (1.0 + e);
  gl_FragColor = vec4(clamp(col * uIntensity, 0.0, 1.0), 1.0);
}
`;

export const pillarBackdropVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const pillarBackdropFragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uLightMode;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  vec3 result = texture2D(uMap, vUv).rgb;
  float energy = max(result.r, max(result.g, result.b));
  vec3 hue = result / max(energy, 0.001);
  if (uLightMode > 0.5) {
    float coverage = smoothstep(0.025, 0.95, energy);
    hue = pow(clamp(hue, 0.0, 1.0), vec3(1.25));
    gl_FragColor = vec4(hue, coverage * 0.94 * uOpacity);
  } else {
    gl_FragColor = vec4(hue, energy * uOpacity);
  }
}
`;
