import assert from 'node:assert/strict';
import {
  makeAlphaControlState,
  sampleCameraRelativeStick,
  stepAlphaTankControl,
  wrapAngle
} from '../src/alpha-control-model.js';

function stepMany(state, input, count = 90) {
  let next = state;
  for (let i = 0; i < count; i += 1) {
    next = stepAlphaTankControl(next, input, 1 / 60);
  }
  return next;
}

const neutral = sampleCameraRelativeStick(0, 0, 0);
assert.equal(neutral.magnitude, 0, 'neutral stick must produce no camera-relative order');

const forwardNorth = sampleCameraRelativeStick(0, -1, Math.PI);
assert.ok(forwardNorth.z > 0.95, 'stick-up with camera behind tank should order north/world +Z travel');
assert.ok(Math.abs(forwardNorth.x) < 0.01, 'stick-up should not inject side drift at neutral camera yaw');

const forwardEast = sampleCameraRelativeStick(0, -1, -Math.PI / 2);
assert.ok(forwardEast.x > 0.95, 'stick-up after right camera orbit should order east/world +X travel');
assert.ok(Math.abs(forwardEast.z) < 0.01, 'camera-relative movement should rotate cleanly with camera yaw');

let state = makeAlphaControlState();
state = stepMany(state, {
  desiredX: forwardNorth.x,
  desiredZ: forwardNorth.z,
  desiredMagnitude: forwardNorth.magnitude,
  desiredYaw: forwardNorth.desiredYaw
});
assert.ok(state.hullZ > 0.4, 'tank should move along hull forward after accepting camera-relative order');
assert.ok(Math.abs(wrapAngle(state.hullYaw)) < 0.35, 'tank hull should face ordered movement vector after forward order');
assert.ok(state.leftTrack > 0.1 && state.rightTrack > 0.1, 'both tracks should drive forward on a straight order');

const turnOrder = sampleCameraRelativeStick(1, 0, Math.PI);
const turning = stepMany(state, {
  desiredX: turnOrder.x,
  desiredZ: turnOrder.z,
  desiredMagnitude: turnOrder.magnitude,
  desiredYaw: turnOrder.desiredYaw
}, 45);
assert.ok(Math.abs(turning.leftTrack - turning.rightTrack) > 0.05, 'side stick order should create differential track steering');
assert.notEqual(Math.sign(turning.leftTrack), Math.sign(-turning.rightTrack), 'tank should not default to arcade strafing');

let cameraChangeState = makeAlphaControlState();
const orderBefore = sampleCameraRelativeStick(0, -1, 0);
cameraChangeState = stepMany(cameraChangeState, {
  desiredX: orderBefore.x,
  desiredZ: orderBefore.z,
  desiredMagnitude: orderBefore.magnitude,
  desiredYaw: orderBefore.desiredYaw
}, 20);
const yawBefore = cameraChangeState.hullYaw;
const orderAfter = sampleCameraRelativeStick(0, -1, Math.PI / 2);
cameraChangeState = stepMany(cameraChangeState, {
  desiredX: orderAfter.x,
  desiredZ: orderAfter.z,
  desiredMagnitude: orderAfter.magnitude,
  desiredYaw: orderAfter.desiredYaw
}, 20);
assert.ok(Math.abs(wrapAngle(cameraChangeState.hullYaw - yawBefore)) > 0.05, 'right-side camera orbit should affect the next camera-relative travel order');
assert.ok(Math.abs(wrapAngle(cameraChangeState.turretYaw - cameraChangeState.desiredYaw)) < Math.abs(wrapAngle(cameraChangeState.hullYaw - cameraChangeState.desiredYaw)), 'lagging turret aim should move toward camera order faster than hull');

console.log('Alpha control smoke passed: touch halves, camera-relative movement order, hull-limited tank response, lagging turret state.');
