#!/usr/bin/env node
import { requirePromptContract } from './prompt_contract_guard.mjs';

const actionIndex = process.argv.indexOf('--action');
const action = actionIndex >= 0 ? process.argv[actionIndex + 1] : undefined;
const contractIndex = process.argv.indexOf('--contract');
const contractPath = contractIndex >= 0 ? process.argv[contractIndex + 1] : undefined;
requirePromptContract({ action, contractPath });
console.log('Current prompt contract passed' + (action ? ' for action ' + action : '') + '.');
