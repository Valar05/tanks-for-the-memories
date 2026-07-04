export const TANK_CONTROL_BUILD = 'droobiedoo-touch-halves-camera-relative-v1';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function angleLerp(current, target, alpha) {
  return current + wrapAngle(target - current) * clamp(alpha, 0, 1);
}

export function yawFromVector(x, z, fallbackYaw = 0) {
  if (Math.hypot(x, z) <= 0.0001) return fallbackYaw;
  return Math.atan2(x, z);
}

export function vectorFromYaw(yaw) {
  return {
    x: Math.sin(yaw),
    z: Math.cos(yaw)
  };
}

export function makeAlphaControlState() {
  return {
    hullX: 0,
    hullZ: 0,
    hullYaw: 0,
    turretYaw: 0,
    speed: 0,
    throttle: 0,
    steer: 0,
    leftTrack: 0,
    rightTrack: 0,
    desiredYaw: 0,
    headingError: 0,
    desiredX: 0,
    desiredZ: 0,
    desiredMagnitude: 0,
    order: 'neutral'
  };
}

export function sampleCameraRelativeStick(stickX, stickY, cameraYaw, deadzone = 0.16) {
  const rawMagnitude = clamp(Math.hypot(stickX, stickY), 0, 1);
  if (rawMagnitude < deadzone) {
    return { x: 0, z: 0, magnitude: 0, desiredYaw: 0 };
  }

  const remappedMagnitude = clamp((rawMagnitude - deadzone) / (1 - deadzone), 0, 1);
  const unitX = stickX / Math.max(rawMagnitude, 0.0001);
  const unitY = stickY / Math.max(rawMagnitude, 0.0001);

  const cameraForward = {
    x: -Math.sin(cameraYaw),
    z: -Math.cos(cameraYaw)
  };
  const cameraRight = {
    x: -cameraForward.z,
    z: cameraForward.x
  };
  const x = (cameraRight.x * unitX + cameraForward.x * -unitY) * remappedMagnitude;
  const z = (cameraRight.z * unitX + cameraForward.z * -unitY) * remappedMagnitude;
  return {
    x,
    z,
    magnitude: remappedMagnitude,
    desiredYaw: yawFromVector(x, z, cameraYaw)
  };
}

export function stepAlphaTankControl(state, input, dt) {
  const delta = clamp(dt, 0.001, 0.05);
  const desiredMagnitude = clamp(input.desiredMagnitude ?? 0, 0, 1);
  const desiredYaw = desiredMagnitude > 0.001 ? input.desiredYaw : state.desiredYaw;
  const headingError = wrapAngle(desiredYaw - state.hullYaw);
  const absError = Math.abs(headingError);
  const pivotBias = smoothstep(0.25, 1.55, absError);
  const targetThrottle = desiredMagnitude * (1 - pivotBias * 0.74);
  const targetSteer = desiredMagnitude > 0.001 ? clamp(headingError / 1.05, -1, 1) : 0;
  const throttleAlpha = 1 - Math.exp(-delta * 3.8);
  const steerAlpha = 1 - Math.exp(-delta * 6.2);
  const throttle = state.throttle + (targetThrottle - state.throttle) * throttleAlpha;
  const steer = state.steer + (targetSteer - state.steer) * steerAlpha;

  const steerMix = steer * (0.44 + pivotBias * 0.44 + Math.abs(throttle) * 0.18);
  const leftTrack = clamp(throttle + steerMix, -1, 1);
  const rightTrack = clamp(throttle - steerMix, -1, 1);
  const trackAverage = (leftTrack + rightTrack) * 0.5;
  const differential = leftTrack - rightTrack;
  const speed = state.speed + (trackAverage * 3.25 - state.speed) * (1 - Math.exp(-delta * 2.6));
  const hullYaw = wrapAngle(state.hullYaw + differential * delta * 1.34);
  const forward = vectorFromYaw(hullYaw);
  const hullX = state.hullX + forward.x * speed * delta;
  const hullZ = state.hullZ + forward.z * speed * delta;
  const turretYaw = angleLerp(state.turretYaw, desiredMagnitude > 0.08 ? desiredYaw : hullYaw, 1 - Math.exp(-delta * 1.9));

  const order =
    desiredMagnitude < 0.04 ? 'neutral' :
    pivotBias > 0.62 ? 'pivot hull toward camera order' :
    'drive hull toward camera order';

  return {
    ...state,
    hullX,
    hullZ,
    hullYaw,
    turretYaw: wrapAngle(turretYaw),
    speed,
    throttle,
    steer,
    leftTrack,
    rightTrack,
    desiredYaw,
    headingError,
    desiredX: input.desiredX ?? 0,
    desiredZ: input.desiredZ ?? 0,
    desiredMagnitude,
    order
  };
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
