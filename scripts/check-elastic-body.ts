import assert from "node:assert/strict";
import { CONFIG } from "@/config/constants";
import {
  clampElasticPosition,
  createElasticBody,
  elasticBodyAtRest,
  elasticStretch,
  stepElasticBody,
} from "@/lib/elasticBody";

const tuning = CONFIG.model.ELASTIC;

function simulate(fps: number) {
  const body = createElasticBody();
  const dt = 1 / fps;
  let peakStretch = 1;
  for (let i = 0; i < fps; i++) {
    stepElasticBody(body, { x: 1.2, y: 0.6 }, dt, tuning);
    const stretch = elasticStretch(body, 4, tuning.STRETCH_GAIN, tuning.MAX_STRETCH);
    peakStretch = Math.max(peakStretch, stretch.along);
  }
  const heldX = body.x;
  const heldY = body.y;
  let overshot = false;
  let seconds = 0;
  while (!elasticBodyAtRest(body, tuning.REST_EPSILON) && seconds < 20) {
    stepElasticBody(body, null, dt, tuning);
    if (body.x < -1e-3) overshot = true;
    seconds += dt;
  }
  return { heldX, heldY, peakStretch, overshot, seconds };
}

const reference = simulate(240);
for (const fps of [30, 60, 120]) {
  const run = simulate(fps);
  assert.ok(Math.abs(run.heldX - reference.heldX) < 0.05, `held position is frame-rate independent at ${fps} FPS`);
  assert.ok(Math.abs(run.peakStretch - reference.peakStretch) < 0.08, `peak stretch is frame-rate independent at ${fps} FPS`);
  assert.ok(run.peakStretch > 1.2 && run.peakStretch <= tuning.MAX_STRETCH, `stretch stays within bounds at ${fps} FPS`);
  assert.ok(run.overshot, `release springs past rest at ${fps} FPS`);
  assert.ok(run.seconds < 6, `release settles at ${fps} FPS`);
}

const held = createElasticBody();
for (let i = 0; i < 240; i++) stepElasticBody(held, { x: 1, y: 0 }, 1 / 60, tuning);
assert.ok(Math.abs(held.x - tuning.FOLLOW) < 0.02, "held body settles at its follow fraction of the pull");
assert.ok(Math.abs(held.dx - (1 - tuning.FOLLOW)) < 0.02, "held deformation is the gap between cursor and body");

const stretched = elasticStretch({ ...createElasticBody(), dx: 3, dy: 0 }, 4, tuning.STRETCH_GAIN, tuning.MAX_STRETCH);
assert.ok(Math.abs(stretched.along * stretched.across * stretched.across - 1) < 1e-9, "stretch preserves volume");
assert.equal(elasticStretch(createElasticBody(), 4, tuning.STRETCH_GAIN, tuning.MAX_STRETCH).along, 1, "rest shape is undeformed");

const flung = createElasticBody();
flung.x = 10;
flung.vx = 50;
clampElasticPosition(flung, 2);
assert.ok(Math.hypot(flung.x, flung.y) <= 2 + 1e-9 && flung.vx <= 1e-9, "fling is clamped to the screen with outward velocity removed");

console.log("PASS: elastic body stretches within bounds, follows the cursor, springs past rest and settles independently of frame rate.");
