export interface ElasticTuning {
  readonly POSITION_STIFFNESS: number;
  readonly POSITION_DAMPING: number;
  readonly DEFORM_STIFFNESS: number;
  readonly DEFORM_DAMPING: number;
  readonly FOLLOW: number;
  readonly MAX_SUBSTEP: number;
}

export interface ElasticBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dx: number;
  dy: number;
  dvx: number;
  dvy: number;
}

export interface ElasticStretch {
  angle: number;
  along: number;
  across: number;
}

export function createElasticBody(): ElasticBody {
  return { x: 0, y: 0, vx: 0, vy: 0, dx: 0, dy: 0, dvx: 0, dvy: 0 };
}

export function elasticBodyAtRest(body: ElasticBody, epsilon: number): boolean {
  return (
    Math.hypot(body.x, body.y, body.dx, body.dy) < epsilon &&
    Math.hypot(body.vx, body.vy, body.dvx, body.dvy) < epsilon
  );
}

export function resetElasticBody(body: ElasticBody): void {
  body.x = body.y = body.vx = body.vy = 0;
  body.dx = body.dy = body.dvx = body.dvy = 0;
}

export function stepElasticBody(
  body: ElasticBody,
  grabOffset: { x: number; y: number } | null,
  dt: number,
  tuning: ElasticTuning,
): void {
  const steps = Math.max(1, Math.ceil(dt / tuning.MAX_SUBSTEP));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const targetX = grabOffset ? grabOffset.x * tuning.FOLLOW : 0;
    const targetY = grabOffset ? grabOffset.y * tuning.FOLLOW : 0;
    body.vx += (-tuning.POSITION_STIFFNESS * (body.x - targetX) - tuning.POSITION_DAMPING * body.vx) * h;
    body.vy += (-tuning.POSITION_STIFFNESS * (body.y - targetY) - tuning.POSITION_DAMPING * body.vy) * h;
    body.x += body.vx * h;
    body.y += body.vy * h;

    if (grabOffset) {
      const nextDx = grabOffset.x - body.x;
      const nextDy = grabOffset.y - body.y;
      body.dvx = (nextDx - body.dx) / h;
      body.dvy = (nextDy - body.dy) / h;
      body.dx = nextDx;
      body.dy = nextDy;
    } else {
      body.dvx += (-tuning.DEFORM_STIFFNESS * body.dx - tuning.DEFORM_DAMPING * body.dvx) * h;
      body.dvy += (-tuning.DEFORM_STIFFNESS * body.dy - tuning.DEFORM_DAMPING * body.dvy) * h;
      body.dx += body.dvx * h;
      body.dy += body.dvy * h;
    }
  }
}

export function elasticStretch(
  body: ElasticBody,
  reference: number,
  gain: number,
  maxStretch: number,
): ElasticStretch {
  const length = Math.hypot(body.dx, body.dy);
  if (length < 1e-6 || reference <= 0) return { angle: 0, along: 1, across: 1 };
  const along = 1 + Math.min((length / reference) * gain, maxStretch - 1);
  return {
    angle: Math.atan2(body.dy, body.dx),
    along,
    across: 1 / Math.sqrt(along),
  };
}

export function clampElasticPosition(body: ElasticBody, limit: number): void {
  const length = Math.hypot(body.x, body.y);
  if (length <= limit || length === 0) return;
  const k = limit / length;
  body.x *= k;
  body.y *= k;
  const outward = (body.vx * body.x + body.vy * body.y) / limit;
  if (outward > 0) {
    body.vx -= (outward * body.x) / limit;
    body.vy -= (outward * body.y) / limit;
  }
}
