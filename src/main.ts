import * as THREE from 'three';
import './styles.css';
import { beginBattle, buildAfterActionHtml, buildCrewPanelHtml, getCrewModifiers, loadCrewState, noteCrewSighting, registerBattleEvent, saveCrewState, tickCrewState } from './crew';
import { cloneAwarenessState, createAwarenessState, getPrimaryContact, recordEnemyTankContact, resolveEnemyPicture, type AwarenessState } from './awareness';

type ViewMode = 'hatch' | 'buttoned' | 'scope' | 'map';
type Phase = 'live' | 'failure' | 'victory';
type UnitRole = 'player' | 'wingman' | 'enemy';
type UnitIntent = 'idle' | 'advance' | 'reverse' | 'hold' | 'scout-left' | 'scout-right' | 'attack' | 'disabled';
type CommandKind = 'report' | 'scout left' | 'scout right' | 'advance' | 'halt' | 'reverse' | 'hold' | 'attack contact' | 'hatch open' | 'button up' | 'gunner scope' | 'map';
type ReportType = 'sighting' | 'contact' | 'status' | 'order' | 'after-action';

type Command = {
  raw: string;
  kind: CommandKind;
  target: 'platoon' | 'wingman';
};

type Report = {
  id: string;
  type: ReportType;
  source: string;
  subject: string;
  approxPosition: {
    label: string;
    x: number;
    z: number;
    radius: number;
  };
  confidence: number;
  createdAt: number;
  expiryAt: number;
  truth: 'confirmed' | 'partial' | 'unconfirmed' | 'stale';
};

type Unit = {
  role: UnitRole;
  group: THREE.Group;
  body: THREE.Mesh;
  turret: THREE.Mesh;
  barrel: THREE.Mesh;
  label: HTMLSpanElement;
  intent: UnitIntent;
  speed: number;
  heading: number;
  destination: THREE.Vector3 | null;
  holdTimer: number;
  scoutSide: 'left' | 'right' | null;
  attackTarget: THREE.Vector3 | null;
};

type Checkpoint = {
  player: THREE.Vector3;
  wingman: THREE.Vector3;
  reports: Report[];
  log: string[];
  phase: Phase;
  viewMode: ViewMode;
  enemyKnown: boolean;
  enemyRevealed: boolean;
  enemyDestroyed: boolean;
  ambushTriggered: boolean;
  attackTimer: number;
  ammo: number;
  awarenessState: AwarenessState;
  lastLesson: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: null | (() => void);
  onend: null | (() => void);
  onerror: null | (() => void);
  onresult: null | ((event: any) => void);
};

let recognition: SpeechRecognitionLike | null = null;

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Missing #app root');
}

const shell = document.createElement('div');
shell.className = 'shell';
shell.innerHTML = [
  '<div class="world-shell">',
  '  <div class="status-strip">',
  '    <div class="chip" data-view-chip></div>',
  '    <div class="chip muted" data-threat-chip></div>',
  '    <div class="chip muted" data-morale-chip></div>',
  '    <div class="chip muted" data-awareness-chip></div>',
  '  </div>',
  '  <div class="layout">',
  '    <section class="panel command-panel">',
  '      <p class="eyebrow">WW2 tank-command information simulation</p>',
  '      <h1>Tanks For The Memories</h1>',
  '      <p class="lede">Information → Order → Consequence → Memory</p>',
  '      <form class="command-form" data-command-form>',
  '        <input data-command-input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type: scout right" />',
  '        <button type="submit">Send order</button>',
  '        <button type="button" data-voice-button>Voice</button>',
  '      </form>',
  '      <div class="quick-commands" data-quick-commands></div>',
  '      <div class="legend">Typed commands are primary. Voice uses the same parser later.</div>',
  '      <div class="radio-log" data-radio-log></div>',
  '    </section>',
  '    <section class="panel ledger-panel">',
  '      <header class="panel-head">',
  '        <h2>Information Ledger</h2>',
  '        <span class="panel-subtitle" data-ledger-summary></span>',
  '      </header>',
  '      <div class="ledger-list" data-ledger-list></div>',
  '    </section>',
  '    <section class="panel map-panel">',
  '      <header class="panel-head">',
  '        <h2>Map / Report View</h2>',
  '        <span class="panel-subtitle">Uncertainty stays visible.</span>',
  '      </header>',
  '      <div class="map-card" data-map-card>',
  '        <div class="map-grid" data-map-grid></div>',
  '        <div class="map-caption" data-map-caption></div>',
  '      </div>',
  '    </section>',
  '    <section class="panel crew-panel">',
  '      <header class="panel-head">',
  '        <h2>Crew</h2>',
  '        <span class="panel-subtitle" data-crew-summary></span>',
  '      </header>',
  '      <div class="crew-panel-body">',
  '        <div class="crew-cards" data-crew-cards></div>',
  '        <div class="crew-log" data-crew-log></div>',
  '      </div>',
  '    </section>',
  '    <div class="chip muted" data-awareness-chip></div>',
  '  </div>',
  '  <div class="after-action hidden" data-aar></div>',
  '  <div class="vignette" data-vignette></div>',
  '</div>'
].join('\n');
root.appendChild(shell);

type StatusRefs = {
  viewChip: HTMLDivElement;
  threatChip: HTMLDivElement;
  moraleChip: HTMLDivElement;
  commandForm: HTMLFormElement;
  commandInput: HTMLInputElement;
  voiceButton: HTMLButtonElement;
  quickCommands: HTMLDivElement;
  radioLog: HTMLDivElement;
  ledgerList: HTMLDivElement;
  ledgerSummary: HTMLSpanElement;
  mapCard: HTMLDivElement;
  mapGrid: HTMLDivElement;
  mapCaption: HTMLDivElement;
  crewSummary: HTMLSpanElement;
  crewCards: HTMLDivElement;
  crewLog: HTMLDivElement;
  awarenessChip: HTMLDivElement;
  aar: HTMLDivElement;
  vignette: HTMLDivElement;
};

const refs = {
  viewChip: shell.querySelector<HTMLDivElement>('[data-view-chip]')!,
  threatChip: shell.querySelector<HTMLDivElement>('[data-threat-chip]')!,
  moraleChip: shell.querySelector<HTMLDivElement>('[data-morale-chip]')!,
  commandForm: shell.querySelector<HTMLFormElement>('[data-command-form]')!,
  commandInput: shell.querySelector<HTMLInputElement>('[data-command-input]')!,
  voiceButton: shell.querySelector<HTMLButtonElement>('[data-voice-button]')!,
  quickCommands: shell.querySelector<HTMLDivElement>('[data-quick-commands]')!,
  radioLog: shell.querySelector<HTMLDivElement>('[data-radio-log]')!,
  ledgerList: shell.querySelector<HTMLDivElement>('[data-ledger-list]')!,
  ledgerSummary: shell.querySelector<HTMLSpanElement>('[data-ledger-summary]')!,
  mapCard: shell.querySelector<HTMLDivElement>('[data-map-card]')!,
  mapGrid: shell.querySelector<HTMLDivElement>('[data-map-grid]')!,
  mapCaption: shell.querySelector<HTMLDivElement>('[data-map-caption]')!,
  crewSummary: shell.querySelector<HTMLSpanElement>('[data-crew-summary]')!,
  crewCards: shell.querySelector<HTMLDivElement>('[data-crew-cards]')!,
  crewLog: shell.querySelector<HTMLDivElement>('[data-crew-log]')!,
  awarenessChip: shell.querySelector<HTMLDivElement>('[data-awareness-chip]')!,
  aar: shell.querySelector<HTMLDivElement>('[data-aar]')!,
  vignette: shell.querySelector<HTMLDivElement>('[data-vignette]')!
};

const quickOrderKinds: Array<{ label: string; command: string }> = [
  { label: 'Report', command: 'report' },
  { label: 'Scout left', command: 'scout left' },
  { label: 'Scout right', command: 'scout right' },
  { label: 'Advance', command: 'advance' },
  { label: 'Halt', command: 'halt' },
  { label: 'Reverse', command: 'reverse' },
  { label: 'Hold', command: 'hold' },
  { label: 'Attack contact', command: 'attack contact' },
  { label: 'Hatch open', command: 'hatch open' },
  { label: 'Button up', command: 'button up' },
  { label: 'Gunner scope', command: 'gunner scope' },
  { label: 'Map', command: 'map' }
];

for (const item of quickOrderKinds) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = item.label;
  button.addEventListener('click', () => {
    refs.commandInput.value = item.command;
    submitCommand(item.command);
  });
  refs.quickCommands.appendChild(button);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1f16');
scene.fog = new THREE.Fog('#1a1f16', 24, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.className = 'viewport';
document.body.appendChild(renderer.domElement);

const cameras = {
  hatch: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 250),
  buttoned: new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 250),
  scope: new THREE.PerspectiveCamera(24, window.innerWidth / window.innerHeight, 0.1, 250),
  map: new THREE.OrthographicCamera(-34, 34, 20, -20, 0.1, 250)
};

let activeCamera: THREE.Camera = cameras.hatch;
let viewMode: ViewMode = 'hatch';
let phase: Phase = 'live';
let gameTime = 0;
let nextReportId = 1;
let attackTimer = 0;
let ambushTriggered = false;
let enemyKnown = false;
let enemyRevealed = false;
let enemyDestroyed = false;
let currentLesson = '';
const crewState = loadCrewState();
const awarenessState = createAwarenessState();
let ammo = 6;
let battleAmmoStart = ammo;
const commandQueue: Command[] = [];
const logLines: string[] = [];
const reports: Report[] = [];
let checkpoint: Checkpoint | null = null;
beginBattle(crewState, ammo, 0);
saveCrewState(crewState);

const terrain = new THREE.Group();
scene.add(terrain);

const ambient = new THREE.AmbientLight('#dbe7d3', 1.2);
scene.add(ambient);

const sun = new THREE.DirectionalLight('#fff2c9', 2.4);
sun.position.set(-12, 24, 10);
scene.add(sun);

const fill = new THREE.DirectionalLight('#7ea0c6', 0.9);
fill.position.set(12, 10, -14);
scene.add(fill);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 10),
  new THREE.MeshStandardMaterial({ color: '#594b37', roughness: 1 })
);
road.rotation.x = -Math.PI / 2;
road.position.set(12, 0.03, 0);
terrain.add(road);

const mud = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 24),
  new THREE.MeshStandardMaterial({ color: '#3d3529', roughness: 1 })
);
mud.rotation.x = -Math.PI / 2;
mud.position.set(12, 0.02, 0);
terrain.add(mud);

const leftHedge = createHedge(-2, -8, 74, 3);
const rightHedge = createHedge(-2, 8, 74, 3);
terrain.add(leftHedge);
terrain.add(rightHedge);

const laneBreak = createBocageGap(28, 0, 8);
terrain.add(laneBreak);

const farmhouse = createFarmhouse(39, -10);
terrain.add(farmhouse);

const church = createChurch(48, 10);
terrain.add(church);

const player = createUnit('player', 0x6ec4ff, -14, 0);
const wingman = createUnit('wingman', 0x9de26e, -20, 5.5);
const enemy = createEnemyGun(34, 7);

const enemyLabel = document.createElement('span');
enemyLabel.className = 'unit-label enemy';
enemyLabel.textContent = 'AT GUN';
document.body.appendChild(enemyLabel);

const initialCheckpoint: Checkpoint = {
  player: player.group.position.clone(),
  wingman: wingman.group.position.clone(),
  reports: [],
  log: [],
  phase: 'live',
  viewMode: 'hatch',
  enemyKnown: false,
  enemyRevealed: false,
  enemyDestroyed: false,
  ambushTriggered: false,
  attackTimer: 0,
  ammo,
  awarenessState: cloneAwarenessState(awarenessState),
  lastLesson: ''
};
checkpoint = cloneCheckpoint(initialCheckpoint);

captureCheckpoint();
updateViewMode('hatch', false);
logEvent('HQ', 'Mission start. Current slice: one Normandy bocage lane.');
logEvent('HQ', 'You command the platoon by report, order, consequence, and memory.');
logEvent('HQ', 'Information -> Order -> Consequence -> Memory');
logEvent('HQ', 'The hidden enemy remains concealed behind the bocage.');
logEvent('HQ', 'No live AI or LLM calls are used at runtime.');
renderHud();

window.addEventListener('resize', onResize);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && document.activeElement === refs.commandInput) {
    event.preventDefault();
    submitCommand(refs.commandInput.value);
  }
});

refs.commandForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCommand(refs.commandInput.value);
});

refs.voiceButton.addEventListener('click', () => {
  toggleVoiceInput();
});

refs.commandInput.addEventListener('input', () => {
  refs.commandInput.setAttribute('aria-label', 'Order command');
});

function createHedge(x: number, z: number, length: number, thickness: number) {
  const hedge = new THREE.Mesh(
    new THREE.BoxGeometry(length, 4.2, thickness),
    new THREE.MeshStandardMaterial({ color: '#3e5a30', roughness: 1 })
  );
  hedge.position.set(x + length / 2, 2.1, z);
  return hedge;
}

function createBocageGap(x: number, z: number, size: number) {
  const gap = new THREE.Mesh(
    new THREE.BoxGeometry(size, 0.1, size),
    new THREE.MeshStandardMaterial({ color: '#5a4a39', roughness: 1 })
  );
  gap.position.set(x, 0.01, z);
  return gap;
}

function createFarmhouse(x: number, z: number) {
  const house = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10, 6, 8),
    new THREE.MeshStandardMaterial({ color: '#cdb48b', roughness: 0.9 })
  );
  base.position.set(x, 3, z);
  house.add(base);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(6.8, 4, 4),
    new THREE.MeshStandardMaterial({ color: '#7b392f', roughness: 1 })
  );
  roof.position.set(x, 8, z);
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  const barn = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 6),
    new THREE.MeshStandardMaterial({ color: '#a66a4d', roughness: 1 })
  );
  barn.position.set(x - 8, 2, z + 6);
  house.add(barn);

  return house;
}

function createChurch(x: number, z: number) {
  const churchRoot = new THREE.Group();
  const nave = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5, 12),
    new THREE.MeshStandardMaterial({ color: '#d9d4c4', roughness: 0.95 })
  );
  nave.position.set(x, 2.5, z);
  churchRoot.add(nave);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(5, 13, 5),
    new THREE.MeshStandardMaterial({ color: '#c4bea8', roughness: 0.9 })
  );
  tower.position.set(x + 5, 6.5, z - 3);
  churchRoot.add(tower);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 5, 4),
    new THREE.MeshStandardMaterial({ color: '#6c3a2f', roughness: 0.9 })
  );
  spire.position.set(x + 5, 14.5, z - 3);
  churchRoot.add(spire);

  return churchRoot;
}

function createUnit(role: UnitRole, color: number, x: number, z: number): Unit {
  const group = new THREE.Group();
  group.position.set(x, 0.7, z);
  scene.add(group);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.3, 1.4, 6.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  );
  body.position.y = 0.7;
  group.add(body);

  const turret = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.2, 2.2),
    new THREE.MeshStandardMaterial({ color: lighten(color, 0.12), roughness: 0.8 })
  );
  turret.position.set(0.1, 1.65, -0.2);
  group.add(turret);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 4.2, 10),
    new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.7 })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(1.4, 1.75, -0.2);
  group.add(barrel);

  const trackMaterial = new THREE.MeshStandardMaterial({ color: '#202020', roughness: 1 });
  const leftTrack = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.5, 0.7), trackMaterial);
  leftTrack.position.set(0, 0.15, -2.7);
  group.add(leftTrack);
  const rightTrack = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.5, 0.7), trackMaterial);
  rightTrack.position.set(0, 0.15, 2.7);
  group.add(rightTrack);

  const label = document.createElement('span');
  label.className = 'unit-label ' + role;
  label.textContent = role.toUpperCase();
  document.body.appendChild(label);

  return {
    role,
    group,
    body,
    turret,
    barrel,
    label,
    intent: 'idle',
    speed: role === 'enemy' ? 0 : 5.2,
    heading: 0,
    destination: null,
    holdTimer: 0,
    scoutSide: null,
    attackTarget: null
  };
}

function createEnemyGun(x: number, z: number) {
  const group = new THREE.Group();
  group.position.set(x, 0.35, z);
  scene.add(group);

  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.6, 1.1),
    new THREE.MeshStandardMaterial({ color: '#4a4d4f', roughness: 1 })
  );
  shield.position.y = 0.8;
  group.add(shield);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 5, 12),
    new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.7 })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(1.8, 1.15, 0);
  group.add(barrel);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.5, 1.8),
    new THREE.MeshStandardMaterial({ color: '#2a241c', roughness: 1 })
  );
  base.position.set(0, 0.25, 0);
  group.add(base);

  group.visible = false;
  return group;
}

function lighten(color: number, amount: number) {
  const c = new THREE.Color(color);
  c.offsetHSL(0, 0, amount);
  return c.getHex();
}

function cloneCheckpoint(source: Checkpoint): Checkpoint {
  return {
    player: source.player.clone(),
    wingman: source.wingman.clone(),
    reports: source.reports.map(cloneReport),
    log: [...source.log],
    phase: source.phase,
    viewMode: source.viewMode,
    enemyKnown: source.enemyKnown,
    enemyRevealed: source.enemyRevealed,
    enemyDestroyed: source.enemyDestroyed,
    ambushTriggered: source.ambushTriggered,
    attackTimer: source.attackTimer,
    ammo: source.ammo,
    awarenessState: cloneAwarenessState(source.awarenessState),
    lastLesson: source.lastLesson
  };
}

function cloneReport(report: Report): Report {
  return {
    id: report.id,
    type: report.type,
    source: report.source,
    subject: report.subject,
    approxPosition: {
      label: report.approxPosition.label,
      x: report.approxPosition.x,
      z: report.approxPosition.z,
      radius: report.approxPosition.radius
    },
    confidence: report.confidence,
    createdAt: report.createdAt,
    expiryAt: report.expiryAt,
    truth: report.truth
  };
}

function captureCheckpoint() {
  checkpoint = {
    player: player.group.position.clone(),
    wingman: wingman.group.position.clone(),
    reports: reports.map(cloneReport),
    log: [...logLines],
    phase,
    viewMode,
    enemyKnown,
    enemyRevealed,
    enemyDestroyed,
    ambushTriggered,
    attackTimer,
    ammo,
    awarenessState: cloneAwarenessState(awarenessState),
    lastLesson: currentLesson
  };
}

function restoreCheckpoint() {
  if (!checkpoint) {
    return;
  }
  player.group.position.copy(checkpoint.player);
  wingman.group.position.copy(checkpoint.wingman);
  reports.length = 0;
  reports.push(...checkpoint.reports.map(cloneReport));
  logLines.length = 0;
  logLines.push(...checkpoint.log);
  phase = checkpoint.phase;
  viewMode = checkpoint.viewMode;
  enemyKnown = checkpoint.enemyKnown;
  enemyRevealed = checkpoint.enemyRevealed;
  enemyDestroyed = checkpoint.enemyDestroyed;
  ambushTriggered = checkpoint.ambushTriggered;
  attackTimer = checkpoint.attackTimer;
  ammo = checkpoint.ammo;
  awarenessState.contacts = cloneAwarenessState(checkpoint.awarenessState).contacts;
  awarenessState.lastRevealAt = checkpoint.awarenessState.lastRevealAt;
  awarenessState.nextContactId = checkpoint.awarenessState.nextContactId;
  currentLesson = checkpoint.lastLesson;
  player.intent = 'idle';
  wingman.intent = 'idle';
  player.destination = null;
  wingman.destination = null;
  player.attackTarget = null;
  wingman.attackTarget = null;
  enemy.visible = enemyRevealed && !enemyDestroyed;
  enemy.scale.setScalar(1);
  beginBattle(crewState, ammo, gameTime);
  updateViewMode(viewMode, false);
  refs.aar.classList.add('hidden');
  refs.aar.innerHTML = '';
  refreshAwarenessChip();
  appendStatus('Checkpoint restored.');
  renderHud();
}

function logEvent(source: string, message: string) {
  const line = '[' + source + '] ' + message;
  logLines.unshift(line);
  while (logLines.length > 10) {
    logLines.pop();
  }
}

function appendStatus(message: string) {
  currentLesson = message;
}


function showAwarenessReveal(text: string) {
  refs.awarenessChip.textContent = text;
  refs.awarenessChip.className = 'chip muted chip-awareness';
  logEvent('AWARENESS', text);
}

function refreshAwarenessChip() {
  const contact = getPrimaryContact(awarenessState);
  if (!contact) {
    refs.awarenessChip.textContent = 'No active contact';
    refs.awarenessChip.className = 'chip muted';
    return;
  }
  refs.awarenessChip.textContent = contact.observer + ' · ' + contact.status.replace('-', ' ') + ' · ' + Math.round(contact.confidence * 100) + '%' + (contact.realityLabel ? ' → ' + contact.realityLabel : '');
  refs.awarenessChip.className = 'chip chip-awareness';
}

function recordAwarenessContact(observed: { label: string; x: number; z: number; radius: number; confidence: number }, observer: string, sourceUnit: string, confirmed = false) {
  const transition = recordEnemyTankContact(awarenessState, {
    observer,
    sourceUnit,
    time: gameTime,
    label: observed.label,
    confidence: observed.confidence,
    confirmed
  });
  refreshAwarenessChip();
  if (transition.shouldReveal) {
    showAwarenessReveal(transition.revealText);
    addReport({
      type: 'contact',
      source: observer + ' / ' + sourceUnit,
      subject: transition.reportSubject,
      approxPosition: {
        label: observed.label,
        x: observed.x,
        z: observed.z,
        radius: observed.radius
      },
      confidence: transition.contact.confidence,
      truth: transition.contact.status === 'confirmed-armor' ? 'confirmed' : 'partial'
    });
  }
  enemyKnown = true;
  if (transition.contact.status === 'confirmed-armor') {
    enemyRevealed = true;
    enemy.visible = true;
  }
  return transition;
}

function addReport(input: Omit<Report, 'id' | 'truth' | 'createdAt' | 'expiryAt'> & { truth?: Report['truth'] }) {
  const report: Report = {
    id: 'R' + String(nextReportId++).padStart(3, '0'),
    type: input.type,
    source: input.source,
    subject: input.subject,
    approxPosition: {
      label: input.approxPosition.label,
      x: input.approxPosition.x,
      z: input.approxPosition.z,
      radius: input.approxPosition.radius
    },
    confidence: clamp(input.confidence, 0, 1),
    createdAt: gameTime,
    expiryAt: gameTime + 75,
    truth: input.truth || 'unconfirmed'
  };
  reports.unshift(report);
  if (reports.length > 8) {
    reports.length = 8;
  }
  return report;
}

function updateReportTruth(report: Report): Report['truth'] {
  const age = gameTime - report.createdAt;
  if (age > 75) {
    return 'stale';
  }
  if (report.confidence >= 0.8) {
    return 'confirmed';
  }
  if (report.confidence >= 0.45) {
    return 'partial';
  }
  return 'unconfirmed';
}

function activeReports() {
  return reports.filter((report) => report.expiryAt > gameTime);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatSeconds(seconds: number) {
  return Math.max(0, Math.ceil(seconds)).toString() + 's';
}

function describeConfidence(confidence: number) {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.55) return 'moderate';
  return 'low';
}

function statusTextForView(mode: ViewMode) {
  if (mode === 'hatch') return 'Hatch open';
  if (mode === 'buttoned') return 'Buttoned up';
  if (mode === 'scope') return 'Gunner scope';
  return 'Map / report';
}

function updateViewMode(mode: ViewMode, record: boolean = true) {
  viewMode = mode;
  if (record) {
    addReport({
      type: 'status',
      source: 'Commander Sherman',
      subject: 'Changed viewpoint to ' + statusTextForView(mode),
      approxPosition: {
        label: 'player tank',
        x: player.group.position.x,
        z: player.group.position.z,
        radius: 3
      },
      confidence: mode === 'map' ? 1 : mode === 'scope' ? 0.65 : 0.72,
      truth: 'confirmed'
    });
  }
  refs.viewChip.textContent = statusTextForView(mode);
  refs.viewChip.className = 'chip' + (mode === 'map' ? ' chip-map' : mode === 'scope' ? ' chip-scope' : mode === 'buttoned' ? ' chip-buttoned' : ' chip-hatch');
  refs.vignette.dataset.mode = mode;
  if (mode === 'hatch') {
    shell.dataset.view = 'hatch';
    activeCamera = cameras.hatch;
  } else if (mode === 'buttoned') {
    shell.dataset.view = 'buttoned';
    activeCamera = cameras.buttoned;
  } else if (mode === 'scope') {
    shell.dataset.view = 'scope';
    activeCamera = cameras.scope;
  } else {
    shell.dataset.view = 'map';
    activeCamera = cameras.map;
  }
}

function submitCommand(raw: string) {
  const command = parseCommand(raw);
  refs.commandInput.value = '';
  if (!command || phase !== 'live') {
    return;
  }
  commandQueue.push(command);
  logEvent('ORDER', command.raw);
  renderHud();
}

function parseCommand(raw: string): Command | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;
  const wingman = text.includes('wingman');
  const pairs: Array<[CommandKind, string]> = [
    ['attack contact', 'attack contact'],
    ['gunner scope', 'gunner scope'],
    ['button up', 'button up'],
    ['hatch open', 'hatch open'],
    ['scout left', 'scout left'],
    ['scout right', 'scout right'],
    ['advance', 'advance'],
    ['reverse', 'reverse'],
    ['halt', 'halt'],
    ['hold', 'hold'],
    ['report', 'report'],
    ['map', 'map']
  ];
  for (const [kind, phrase] of pairs) {
    if (text.includes(phrase)) {
      return { raw: text, kind, target: wingman ? 'wingman' : 'platoon' };
    }
  }
  return null;
}

function processOrders() {
  while (commandQueue.length > 0) {
    const command = commandQueue.shift()!;
    if (command.kind === 'report') {
      issueReport(command.target);
    } else if (command.kind === 'scout left') {
      orderScout('left');
    } else if (command.kind === 'scout right') {
      orderScout('right');
    } else if (command.kind === 'advance') {
      setPlatoonIntent('advance');
    } else if (command.kind === 'halt' || command.kind === 'hold') {
      setPlatoonIntent('hold');
    } else if (command.kind === 'reverse') {
      setPlatoonIntent('reverse');
    } else if (command.kind === 'attack contact') {
      engageKnownContact();
    } else if (command.kind === 'hatch open') {
      updateViewMode('hatch');
    } else if (command.kind === 'button up') {
      updateViewMode('buttoned');
    } else if (command.kind === 'gunner scope') {
      updateViewMode('scope');
    } else if (command.kind === 'map') {
      updateViewMode('map');
    }
    logEvent('ACK', acknowledge(command));
  }
}

function acknowledge(command: Command) {
  if (command.kind === 'attack contact') {
    return enemyKnown ? 'Fire mission accepted.' : 'No confirmed contact to engage.';
  }
  if (command.kind === 'scout left' || command.kind === 'scout right') {
    return 'Wingman moving to scout.';
  }
  if (command.kind === 'report') {
    return 'Situation report generated.';
  }
  if (command.kind === 'map') {
    return 'Map view updated.';
  }
  if (command.kind === 'hatch open' || command.kind === 'button up' || command.kind === 'gunner scope') {
    return 'Viewpoint changed.';
  }
  if (command.kind === 'advance') return 'Platoon advancing.';
  if (command.kind === 'reverse') return 'Platoon reversing.';
  return 'Holding position.';
}

function issueReport(target: 'platoon' | 'wingman') {
  const activeEnemyReports = activeReports().filter((report) => report.subject.toLowerCase().includes('enemy') || report.subject.toLowerCase().includes('gun'));
  if (activeEnemyReports.length > 0) {
    const report = activeEnemyReports[0];
    addReport({
      type: 'status',
      source: target === 'wingman' ? 'Wingman Sherman' : 'Commander Sherman',
      subject: 'Current picture: hostile contact still at ' + report.approxPosition.label,
      approxPosition: {
        label: report.approxPosition.label,
        x: report.approxPosition.x,
        z: report.approxPosition.z,
        radius: report.approxPosition.radius
      },
      confidence: Math.max(0.5, report.confidence - 0.1),
      truth: report.truth === 'confirmed' ? 'confirmed' : 'partial'
    });
    logEvent('INFO', 'Report updated from current contact picture.');
    enemyKnown = true;
    noteCrewSighting(crewState, gameTime, 'The commander tightened the picture from an existing contact report.');
    return;
  }

  addReport({
    type: 'status',
    source: target === 'wingman' ? 'Wingman Sherman' : 'Commander Sherman',
    subject: 'No fresh contact; lane remains uncertain beyond the hedge',
    approxPosition: {
      label: 'road center',
      x: player.group.position.x + 6,
      z: player.group.position.z,
      radius: 12
    },
    confidence: 0.34,
    truth: 'unconfirmed'
  });
  logEvent('INFO', 'Situation report filed with uncertainty preserved.');
}

function orderScout(side: 'left' | 'right') {
  if (wingman.intent === 'disabled') {
    return;
  }
  wingman.intent = side === 'left' ? 'scout-left' : 'scout-right';
  wingman.scoutSide = side;
  wingman.destination = new THREE.Vector3(player.group.position.x + 8, 0.7, side === 'left' ? -12 : 12);
  wingman.holdTimer = 0;
  logEvent('WINGMAN', 'Moving to scout ' + side + '.');
}

function setPlatoonIntent(intent: UnitIntent) {
  player.intent = intent;
  wingman.intent = intent === 'hold' ? 'hold' : intent;
  if (intent === 'advance') {
    player.destination = new THREE.Vector3(player.group.position.x + 18, 0.7, player.group.position.z);
    wingman.destination = new THREE.Vector3(wingman.group.position.x + 14, 0.7, wingman.group.position.z);
    logEvent('PLATOON', 'Advance along the lane.');
  } else if (intent === 'reverse') {
    player.destination = new THREE.Vector3(player.group.position.x - 12, 0.7, player.group.position.z);
    wingman.destination = new THREE.Vector3(wingman.group.position.x - 12, 0.7, wingman.group.position.z);
    logEvent('PLATOON', 'Reverse.');
  } else if (intent === 'hold') {
    player.destination = null;
    wingman.destination = null;
    logEvent('PLATOON', 'Hold position.');
  }
}

function engageKnownContact() {
  const contact = chooseContactReport();
  if (!contact || enemyDestroyed) {
    logEvent('FIRE', 'No confirmed target.');
    return;
  }
  if (ammo <= 0) {
    logEvent('FIRE', 'Empty rack. Loader says the tank is out of useful shells.');
    registerBattleEvent(crewState, 'low-ammo', gameTime, 'The rack is empty and the crew knows it.');
    return;
  }
  const mods = getCrewModifiers(crewState);
  ammo = Math.max(0, ammo - 1);
  enemyKnown = true;
  attackTimer = clamp(1.35 - mods.attackBonus * 1.9, 0.72, 1.35);
  player.intent = 'attack';
  wingman.intent = 'attack';
  player.attackTarget = new THREE.Vector3(contact.approxPosition.x, 0.7, contact.approxPosition.z);
  wingman.attackTarget = new THREE.Vector3(contact.approxPosition.x, 0.7, contact.approxPosition.z);
  logEvent('FIRE', 'Engaging ' + contact.approxPosition.label + '.');
  if (ammo <= 2) {
    registerBattleEvent(crewState, 'low-ammo', gameTime, 'The loader counted the remaining rounds after the shot.');
  }
}

function chooseContactReport() {
  const active = activeReports().filter((report) => report.subject.toLowerCase().includes('contact') || report.subject.toLowerCase().includes('gun') || report.subject.toLowerCase().includes('enemy'));
  if (active.length > 0) {
    return active[0];
  }
  return null;
}

function triggerAmbush() {
  if (ambushTriggered || enemyDestroyed) {
    return;
  }
  ambushTriggered = true;
  enemy.visible = true;
  enemyRevealed = true;
  const resolution = resolveEnemyPicture(awarenessState, {
    observer: 'Player Sherman',
    sourceUnit: 'Enemy AT gun',
    time: gameTime,
    kind: 'underestimation',
    realityLabel: 'concealed anti-tank gun',
    consequence: [
      'Original Report: Wingman Sherman reported suspected armor.',
      'Reality: Concealed anti-tank gun.',
      'Consequence: Platoon advanced before confirmation.',
      'Lesson: Observation quality matters.'
    ].join('\n')
  });
  refreshAwarenessChip();
  addReport({
    type: 'contact',
    source: 'Enemy AT gun',
    subject: 'Reality: concealed anti-tank gun behind the right hedgerow',
    approxPosition: {
      label: 'right hedgerow, 34m ahead',
      x: 34,
      z: 7,
      radius: 6
    },
    confidence: 0.98,
    truth: 'confirmed'
  });
  logEvent('ENEMY', 'Ambush. The hidden AT gun proved the scout picture wrong.');
  logEvent('AWARENESS', resolution.revealText);
  registerBattleEvent(crewState, 'taking-fire', gameTime, 'The enemy gun fired first from the right hedgerow.');
  currentLesson = resolution.resolutionText || [
    'Original Report: Wingman Sherman reported suspected armor.',
    'Reality: Concealed anti-tank gun.',
    'Consequence: Platoon advanced before confirmation.',
    'Lesson: Observation quality matters.'
  ].join('\n');
  failMission('Ambushed in the bocage lane. The scout report was believable and wrong.');
}
function failMission(message: string) {
  if (phase !== 'live') return;
  phase = 'failure';
  player.intent = 'hold';
  wingman.intent = 'hold';
  player.destination = null;
  wingman.destination = null;
  player.attackTarget = null;
  wingman.attackTarget = null;
  refs.aar.innerHTML = buildAfterActionHtml(crewState, 'failure', message, currentLesson || 'A scout report on the hidden enemy.', ammo);
  refs.aar.classList.remove('hidden');
  const restart = refs.aar.querySelector<HTMLButtonElement>('[data-restart-button]');
  if (restart) {
    restart.addEventListener('click', () => {
      restartFromCheckpoint();
    });
  }
  logEvent('HQ', 'After-action report issued.');
  renderHud();
}

function restartFromCheckpoint() {
  if (!checkpoint) return;
  phase = 'live';
  player.group.position.copy(checkpoint.player);
  wingman.group.position.copy(checkpoint.wingman);
  reports.length = 0;
  reports.push(...checkpoint.reports.map(cloneReport));
  logLines.length = 0;
  logLines.push(...checkpoint.log);
  viewMode = checkpoint.viewMode;
  enemyKnown = checkpoint.enemyKnown;
  enemyRevealed = checkpoint.enemyRevealed;
  enemyDestroyed = checkpoint.enemyDestroyed;
  ambushTriggered = checkpoint.ambushTriggered;
  attackTimer = checkpoint.attackTimer;
  ammo = checkpoint.ammo;
  awarenessState.contacts = cloneAwarenessState(checkpoint.awarenessState).contacts;
  awarenessState.lastRevealAt = checkpoint.awarenessState.lastRevealAt;
  awarenessState.nextContactId = checkpoint.awarenessState.nextContactId;
  currentLesson = checkpoint.lastLesson;
  player.intent = 'idle';
  wingman.intent = 'idle';
  player.destination = null;
  wingman.destination = null;
  player.attackTarget = null;
  wingman.attackTarget = null;
  enemy.visible = enemyRevealed && !enemyDestroyed;
  enemy.scale.setScalar(1);
  refs.aar.classList.add('hidden');
  refs.aar.innerHTML = '';
  beginBattle(crewState, ammo, gameTime);
  updateViewMode(viewMode, false);
  refreshAwarenessChip();
  logEvent('HQ', 'Checkpoint restored.');
  renderHud();
}

function winMission(message: string) {
  if (phase !== 'live') return;
  phase = 'victory';
  refs.aar.innerHTML = buildAfterActionHtml(crewState, 'victory', message, 'Scouting produced the report that let the platoon act safely.', ammo);
  refs.aar.classList.remove('hidden');
  const restart = refs.aar.querySelector<HTMLButtonElement>('[data-restart-button]');
  if (restart) {
    restart.addEventListener('click', () => restartFromCheckpoint());
  }
  logEvent('HQ', 'Victory. Lane secure.');
  renderHud();
}

function observeEnemy(observer: Unit) {
  if (enemyDestroyed) return null;
  const observerPos = observer.group.position.clone();
  const enemyPos = new THREE.Vector3(enemy.position.x, 0.7, enemy.position.z);
  const distance = observerPos.distanceTo(enemyPos);
  const forwardBias = enemyPos.x >= observerPos.x ? 1 : 0;
  const observerMode = getObserverSightMode(observer);
  if (!observerMode) return null;
  const maxRange = observerMode === 'hatch' ? 78 : observerMode === 'buttoned' ? 48 : observerMode === 'scope' ? 68 : observerMode === 'scout' ? 72 : 58;
  const arcCheck = observerMode === 'scope' ? Math.abs(enemyPos.z - observerPos.z) < 10 : observerMode === 'scout' ? Math.abs(enemyPos.z - observerPos.z) < 14 : true;
  const scoutBonus = observerMode === 'scout' ? 1 : 0;
  const crewBonus = observer.role === 'player' ? getCrewModifiers(crewState).spottingBonus : 0;
  if (distance > maxRange) return null;
  if (!arcCheck) return null;
  if (blockedByHedgerow(observerPos, enemyPos) && scoutBonus === 0) {
    return null;
  }
  const confidence = clamp((0.45 + (maxRange - distance) / maxRange * 0.4 + scoutBonus * 0.2 + forwardBias * 0.1 + crewBonus) * viewConfidenceMultiplier(observerMode), 0.25, 0.98);
  return {
    label: 'right hedgerow, about ' + Math.round(distance * 2.2) + 'm ahead',
    x: enemyPos.x,
    z: enemyPos.z,
    radius: confidence >= 0.8 ? 5 : 10,
    confidence
  };
}

function getObserverSightMode(observer: Unit): Exclude<ViewMode, 'map'> | 'scout' | 'field' | null {
  if (observer.role === 'player') {
    if (viewMode === 'map') return null;
    return viewMode;
  }
  if (observer.intent === 'scout-left' || observer.intent === 'scout-right') {
    return 'scout';
  }
  return 'field';
}

function blockedByHedgerow(start: THREE.Vector3, end: THREE.Vector3) {
  const blockers = [
    { minX: -2, maxX: 18, minZ: -9.5, maxZ: -5.0 },
    { minX: -2, maxX: 18, minZ: 5.0, maxZ: 9.5 },
    { minX: 20, maxX: 31, minZ: -9.5, maxZ: -5.0 },
    { minX: 20, maxX: 31, minZ: 5.0, maxZ: 9.5 }
  ];
  for (const blocker of blockers) {
    if (segmentIntersectsRect(start, end, blocker)) {
      return true;
    }
  }
  return false;
}

function segmentIntersectsRect(start: THREE.Vector3, end: THREE.Vector3, rect: { minX: number; maxX: number; minZ: number; maxZ: number; }) {
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = start.x + (end.x - start.x) * t;
    const z = start.z + (end.z - start.z) * t;
    if (x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ) {
      return true;
    }
  }
  return false;
}

function viewConfidenceMultiplier(mode: Exclude<ViewMode, 'map'> | 'scout' | 'field') {
  if (mode === 'hatch') return 1.1;
  if (mode === 'buttoned') return 0.75;
  if (mode === 'scope') return 1.2;
  if (mode === 'scout') return 1.08;
  return 1;
}

function updateUnit(unit: Unit, delta: number) {
  if (unit.intent === 'disabled') return;
  if (unit.intent === 'hold') {
    unit.holdTimer = Math.max(0, unit.holdTimer - delta);
    return;
  }

  if (unit.intent === 'advance') {
    unit.heading = 0;
    unit.group.position.x += unit.speed * delta;
    if (unit.role === 'wingman') {
      unit.group.position.z += Math.sin(gameTime * 0.6) * 0.01;
    }
    return;
  }

  if (unit.intent === 'reverse') {
    unit.heading = Math.PI;
    unit.group.position.x -= unit.speed * 0.85 * delta;
    return;
  }

  if (unit.intent === 'scout-left' || unit.intent === 'scout-right') {
    const destination = unit.destination;
    if (destination) {
      moveTowards(unit, destination, delta, 5.4);
      if (unit.group.position.distanceTo(destination) < 0.4) {
        if (!enemyDestroyed) {
          const observed = observeEnemy(unit);
          if (observed) {
            const transition = recordAwarenessContact(observed, 'Wingman Sherman', 'Wingman Sherman', observed.confidence > 0.8);
            logEvent('WINGMAN', 'Contact report filed: ' + transition.reportSubject + '.');
          } else {
            addReport({
              type: 'sighting',
              source: 'Wingman Sherman',
              subject: 'No clear target from the scout lane; hedge line remains uncertain',
              approxPosition: {
                label: unit.scoutSide === 'right' ? 'right hedge' : 'left hedge',
                x: unit.group.position.x,
                z: unit.group.position.z,
                radius: 11
              },
              confidence: 0.42,
              truth: 'partial'
            });
            logEvent('WINGMAN', 'Scout pass returned an uncertain picture.');
          }
        }
        unit.intent = 'hold';
        unit.destination = null;
        unit.scoutSide = null;
      }
    }
    return;
  }

  if (unit.intent === 'attack') {
    if (unit.attackTarget) {
      moveTowardAim(unit, unit.attackTarget, delta, 0);
    }
  }
}

function moveTowards(unit: Unit, destination: THREE.Vector3, delta: number, speed: number) {
  const target = destination.clone();
  target.y = unit.group.position.y;
  const deltaVec = target.sub(unit.group.position);
  const distance = deltaVec.length();
  if (distance < 0.12) {
    unit.group.position.copy(target);
    return;
  }
  deltaVec.normalize();
  unit.heading = Math.atan2(deltaVec.z, deltaVec.x) - Math.PI / 2;
  unit.group.position.addScaledVector(deltaVec, speed * delta);
}

function moveTowardAim(unit: Unit, aim: THREE.Vector3, delta: number, speed: number) {
  const target = aim.clone();
  target.y = unit.group.position.y;
  const deltaVec = target.sub(unit.group.position);
  const distance = deltaVec.length();
  if (distance > 0.1) {
    deltaVec.normalize();
    unit.heading = Math.atan2(deltaVec.z, deltaVec.x) - Math.PI / 2;
    unit.group.position.addScaledVector(deltaVec, speed * delta);
  }
}

function handleAmbushLogic() {
  if (phase !== 'live' || enemyDestroyed) return;
  const triggerLine = 11.5;
  if (!ambushTriggered && player.group.position.x > triggerLine) {
    const contact = getPrimaryContact(awarenessState);
    const pictureResolved = Boolean(contact?.realityLabel);
    if (!pictureResolved) {
      triggerAmbush();
    }
  }
}

function handleVictoryLogic() {
  if (phase !== 'live' || enemyDestroyed === false) return;
  if (player.group.position.x > 42) {
    registerBattleEvent(crewState, 'victory', gameTime, 'The lane opened and the crew could finally breathe.');
    winMission('The lane is open. Your platoon reached the farmhouse line with the contact neutralized.');
  }
}

function handleAttackResolution(delta: number) {
  if (attackTimer <= 0) return;
  attackTimer = Math.max(0, attackTimer - delta);
  if (attackTimer === 0 && !enemyDestroyed) {
    const mods = getCrewModifiers(crewState);
    const hitChance = clamp((viewMode === 'hatch' ? 0.88 : viewMode === 'buttoned' ? 0.72 : viewMode === 'scope' ? 0.94 : 0.76) + mods.attackBonus + (enemyKnown ? 0.08 : 0) + (ammo <= 1 ? -0.05 : 0), 0.1, 0.98);
    if (Math.random() < hitChance) {
      enemyDestroyed = true;
      enemy.visible = false;
      enemyRevealed = true;
      addReport({
        type: 'after-action',
        source: 'Platoon',
        subject: 'Enemy AT gun silenced',
        approxPosition: {
          label: 'right hedgerow, 34m ahead',
          x: 34,
          z: 7,
          radius: 5
        },
        confidence: 1,
        truth: 'confirmed'
      });
      logEvent('PLATOON', 'Target neutralized.');
      registerBattleEvent(crewState, 'destroyed-tank', gameTime, 'The gun went up in smoke and the crew had a clear wreck to remember.');
    } else {
      logEvent('PLATOON', 'Round missed the target.');
      registerBattleEvent(crewState, 'note', gameTime, 'The shot missed and the crew had to correct the picture.');
    }
  }
}

function updateCameras() {
  const playerPos = player.group.position.clone();
  const enemyPos = new THREE.Vector3(34, 2.2, 7);

  cameras.hatch.position.lerp(new THREE.Vector3(playerPos.x - 9, 5.2, playerPos.z + 7.5), 0.14);
  cameras.hatch.lookAt(playerPos.x + 12, 1.2, playerPos.z);

  cameras.buttoned.position.lerp(new THREE.Vector3(playerPos.x - 5.3, 2.1, playerPos.z + 3.8), 0.16);
  cameras.buttoned.lookAt(playerPos.x + 10, 1.1, playerPos.z);

  const aim = enemyKnown ? enemyPos : new THREE.Vector3(playerPos.x + 24, 1.0, playerPos.z);
  cameras.scope.position.lerp(new THREE.Vector3(playerPos.x - 2.2, 1.8, playerPos.z + 1.8), 0.2);
  cameras.scope.lookAt(aim.x, aim.y, aim.z);

  cameras.map.position.set(18, 48, 0.01);
  cameras.map.lookAt(18, 0, 0);

  if (viewMode === 'scope') {
    cameras.scope.fov = 18;
    cameras.scope.updateProjectionMatrix();
  } else if (viewMode === 'buttoned') {
    cameras.buttoned.fov = 34;
    cameras.buttoned.updateProjectionMatrix();
  }

  player.body.rotation.y = player.heading;
  player.turret.rotation.y = player.heading * 0.92;
  player.barrel.rotation.y = player.heading * 0.92;
  wingman.body.rotation.y = wingman.heading;
  wingman.turret.rotation.y = wingman.heading * 0.92;
  wingman.barrel.rotation.y = wingman.heading * 0.92;

  if (enemyRevealed && !enemyDestroyed) {
    enemy.rotation.y = Math.PI;
  }

  updateLabel(player, playerPos, activeCamera);
  updateLabel(wingman, wingman.group.position.clone(), activeCamera);
  updateEnemyLabel();
}

function updateLabel(unit: Unit, position: THREE.Vector3, camera: THREE.Camera) {
  const projected = position.clone().project(camera);
  const visible = projected.z > -1 && projected.z < 1;
  unit.label.style.opacity = visible ? '1' : '0';
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
  unit.label.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
  if (phase === 'live' && unit.role !== 'enemy') {
    unit.label.textContent = unit.role.toUpperCase() + ' · ' + unit.intent.toUpperCase();
  }
}

function updateEnemyLabel() {
  const enemyPos = new THREE.Vector3(enemy.position.x, 2.2, enemy.position.z);
  const projected = enemyPos.clone().project(activeCamera);
  const visible = projected.z > -1 && projected.z < 1;
  enemyLabel.style.opacity = enemyRevealed && !enemyDestroyed && visible ? '1' : '0';
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
  enemyLabel.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
}

function renderHud() {
  const crewView = buildCrewPanelHtml(crewState, ammo, phase);
  refs.moraleChip.textContent = crewView.summary;
  refs.threatChip.textContent = enemyDestroyed ? 'Enemy silenced' : enemyKnown ? 'Contact known' : 'Enemy hidden';
  refreshAwarenessChip();
  refs.ledgerSummary.textContent = activeReports().length + ' active report' + (activeReports().length === 1 ? '' : 's');
  refs.radioLog.innerHTML = logLines.map(function (entry) {
    return '<div class="radio-entry">' + escapeHtml(entry) + '</div>';
  }).join('');
  refs.ledgerList.innerHTML = renderReports();
  refs.mapGrid.innerHTML = renderMap();
  refs.mapCaption.textContent = viewMode === 'map' ? 'Map view shows report quality, not omniscience.' : 'Use map/report view for uncertainty, confidence, and timing.';
  refs.crewSummary.textContent = crewView.summary;
  refs.crewCards.innerHTML = crewView.cards;
  refs.crewLog.innerHTML = crewView.log;
  if (phase === 'live') {
    refs.aar.classList.add('hidden');
  }
  updateVignette();
  refreshMissionState();
}

function renderReports() {
  const list = reports.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
  if (list.length === 0) {
    return '<div class="empty-state">No reports yet. A scout pass or situation report will create the first entry.</div>';
  }
  return list.map(function (report) {
    const truth = updateReportTruth(report);
    const stale = report.expiryAt <= gameTime;
    const bars = Math.max(1, Math.round(report.confidence * 5));
    let confidenceBars = '';
    for (let i = 0; i < 5; i++) {
      confidenceBars += '<span class="bar ' + (i < bars ? 'filled' : 'empty') + '"></span>';
    }
    return [
      '<article class="report-card ' + truth + (stale ? ' stale' : '') + '">',
      '  <div class="report-topline">',
      '    <strong>' + escapeHtml(report.type.toUpperCase()) + '</strong>',
      '    <span>' + escapeHtml(report.source) + '</span>',
      '  </div>',
      '  <p class="report-subject">' + escapeHtml(report.subject) + '</p>',
      '  <div class="report-meta">',
      '    <span>' + escapeHtml(report.approxPosition.label) + '</span>',
      '    <span>confidence ' + describeConfidence(report.confidence) + '</span>',
      '    <span>' + formatSeconds(report.expiryAt - gameTime) + ' live</span>',
      '  </div>',
      '  <div class="confidence-strip" aria-hidden="true">' + confidenceBars + '</div>',
      '</article>'
    ].join('');
  }).join('');
}

function renderMap() {
  const playerPos = player.group.position;
  const wingmanPos = wingman.group.position;
  const active = activeReports();
  const items = [
    mapNode('player', 'Player Sherman', playerPos.x, playerPos.z, 0.1),
    mapNode('wingman', 'Wingman Sherman', wingmanPos.x, wingmanPos.z, 0.1)
  ];

  if (enemyDestroyed) {
    items.push('<div class="map-ghost map-ghost-destroyed" style="left:' + toMapX(34) + '%;top:' + toMapZ(7) + '%"></div>');
  } else if (enemyRevealed || active.some((report) => report.subject.toLowerCase().includes('gun') || report.subject.toLowerCase().includes('enemy') || report.subject.toLowerCase().includes('contact'))) {
    const report = active[0];
    const radius = report ? report.approxPosition.radius : 7;
    const conf = report ? report.confidence : 0.55;
    items.push('<div class="map-uncertainty" style="left:' + toMapX(34) + '%;top:' + toMapZ(7) + '%;width:' + radius * 2.1 + 'vmin;height:' + radius * 2.1 + 'vmin;opacity:' + conf + '"></div>');
    if (report && report.confidence > 0.75) {
      items.push('<div class="map-contact known" style="left:' + toMapX(34) + '%;top:' + toMapZ(7) + '%"></div>');
    }
  }

  items.push('<div class="map-landmark farmhouse" style="left:' + toMapX(39) + '%;top:' + toMapZ(-10) + '%"></div>');
  items.push('<div class="map-landmark church" style="left:' + toMapX(48) + '%;top:' + toMapZ(10) + '%"></div>');
  items.push('<div class="map-lane"></div>');
  return items.join('');
}

function mapNode(kind: string, label: string, x: number, z: number, opacity: number) {
  return '<div class="map-unit ' + kind + '" style="left:' + toMapX(x) + '%;top:' + toMapZ(z) + '%;opacity:' + opacity + '"><span>' + escapeHtml(label) + '</span></div>';
}

function toMapX(x: number) {
  return ((x + 18) / 72) * 100;
}

function toMapZ(z: number) {
  return ((z + 18) / 36) * 100;
}

function updateVignette() {
  refs.vignette.dataset.mode = viewMode;
  refs.vignette.dataset.phase = phase;
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  cameras.hatch.aspect = window.innerWidth / window.innerHeight;
  cameras.buttoned.aspect = window.innerWidth / window.innerHeight;
  cameras.scope.aspect = window.innerWidth / window.innerHeight;
  cameras.hatch.updateProjectionMatrix();
  cameras.buttoned.updateProjectionMatrix();
  cameras.scope.updateProjectionMatrix();
}

function tick(now: number) {
  const delta = Math.min(0.05, (now - lastTick) / 1000 || 0.016);
  lastTick = now;
  if (phase === 'live') {
    gameTime += delta;
    processOrders();
    player.speed = 5.2 * getCrewModifiers(crewState).driveSpeedMultiplier;
    updateUnit(player, delta);
    updateUnit(wingman, delta);
    handleAmbushLogic();
    handleAttackResolution(delta);
    handleVictoryLogic();
    updateCommandersAwareness();
    tickCrewState(crewState, {
      time: gameTime,
      delta,
      phase,
      ammo,
      playerIntent: player.intent,
      moving: player.intent === 'advance' || player.intent === 'reverse',
      underFire: ambushTriggered && !enemyDestroyed,
      enemyKnown,
      enemyRevealed,
      enemyDestroyed,
      friendlyLoss: false
    });
  }
  updateCameras();
  renderer.render(scene, activeCamera);
  renderHud();
  requestAnimationFrame(tick);
}

function updateCommandersAwareness() {
  if (phase !== 'live' || viewMode === 'map') return;
  const playerObservation = observeEnemy(player);
  const contact = getPrimaryContact(awarenessState);
  if (playerObservation && (!contact || playerObservation.confidence > contact.confidence + 0.08 || (contact.status !== 'confirmed-armor' && playerObservation.confidence >= 0.82))) {
    const transition = recordAwarenessContact(playerObservation, 'Commander Mercer', 'Player Sherman', playerObservation.confidence > 0.8);
    if (transition.shouldReveal) {
      logEvent('COMMANDER', 'Direct sighting confirmed.');
    }
    if (transition.created || transition.statusChanged) {
      noteCrewSighting(crewState, gameTime, 'Commander spotted the hedge-line contact and finally got a clean picture.');
    }
  }
}

function escapeHtml(text: string) {
  return text.replace(/[&<>'"]/g, function (char) {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    };
    return map[char] || char;
  });
}

let lastTick = 0;

function toggleVoiceInput() {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    refs.voiceButton.textContent = 'Speech unavailable';
    refs.voiceButton.disabled = true;
    return;
  }

  if (recognition) {
    recognition.stop();
    recognition = null;
    refs.voiceButton.textContent = 'Voice';
    return;
  }

  recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onstart = () => {
    refs.voiceButton.textContent = 'Stop voice';
  };
  recognition.onend = () => {
    refs.voiceButton.textContent = 'Voice';
    recognition = null;
  };
  recognition.onerror = () => {
  };
  recognition.onresult = (event: any) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    submitCommand(transcript);
  };
  recognition.start();
}

function maybeRevealEnemy() {
  const visibleNow = enemyKnown || enemyRevealed;
  enemy.visible = visibleNow && !enemyDestroyed;
}

function syncEnemyMesh() {
  maybeRevealEnemy();
  enemy.position.set(34, 0.35, 7);
  enemy.scale.setScalar(enemyDestroyed ? 0.1 : 1);
  if (enemyDestroyed) {
    enemy.rotation.y = Math.PI * 0.35;
  }
}

function refreshMissionState() {
  refs.commandInput.placeholder = phase === 'live' ? 'type: scout right' : 'checkpoint complete';
  syncEnemyMesh();
}

captureCheckpoint();
updateViewMode('hatch', false);
refreshMissionState();
requestAnimationFrame(tick);
