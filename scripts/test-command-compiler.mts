import assert from 'node:assert/strict';
import {compileCommand} from '../src/command-compiler';

const validCases = [
  ['report', 'report', 'wireless-operator', 'intercom'],
  ['open periscope, look outside', 'report', 'wireless-operator', 'intercom'],
  ['OPEN PERISCOPE, LOOK OUTSIDE!', 'report', 'wireless-operator', 'intercom'],
  ['look outside', 'report', 'wireless-operator', 'intercom'],
  ['Look outside?', 'report', 'wireless-operator', 'intercom'],
  ['what do I see', 'report', 'wireless-operator', 'intercom'],
  ['WHAT DO I SEE?', 'report', 'wireless-operator', 'intercom'],
  ['driver advance', 'advance', 'driver', 'intercom'],
  ['halt', 'halt', 'driver', 'intercom'],
  ['square us to the wall', 'align', 'driver', 'intercom'],
  ['gunner fire petard at the seam', 'fire', 'gunner', 'intercom'],
  ['sappers inspect the breach', 'inspect', 'sapper-team', 'engineer-net'],
  ['infantry hold', 'hold-infantry', 'infantry-liaison', 'infantry-net'],
  ['engineers mark the lane', 'mark-lane', 'sapper-team', 'engineer-net'],
] as const;

for (const [input, action, recipient, route] of validCases) {
  const command = compileCommand(input);
  assert(command, `${input} should compile`);
  assert.equal(command.action, action);
  assert.equal(command.recipient, recipient);
  assert.equal(command.route, route);
}

for (const input of ['', 'do the thing', 'everyone move but hold', 'fire', 'wall maybe please', 'move then fire', 'sappers maybe wall']) {
  assert.equal(compileCommand(input), null, `${input} should compile to radio silence`);
}

console.log('Command compiler tests: OK');
