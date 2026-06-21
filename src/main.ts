import * as THREE from 'three';
import './styles.css';

type TankRole = 'player' | 'ally' | 'enemy';
type TankState = 'Idle' | 'Moving' | 'Attacking' | 'Holding';
type CameraMode = 'commander' | 'drone';

type Command = {
  raw: string;
  role: TankRole;
  action: 'advance' | 'halt' | 'reverse' | 'scan' | 'fire' | 'follow' | 'attack' | 'hold';
};

type Tank = {
  role: TankRole;
  mesh: THREE.Mesh;
  label: HTMLSpanElement;
  state: TankState;
  speed: number;
  target?: THREE.Vector3;
  heading: number;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing app root');

const app = document.createElement('div');
app.className = 'shell';
app.innerHTML = `
  <section class="hud">
    <header class="titlebar">
      <div>
        <p class="eyebrow">Voice-command-first prototype</p>
        <h1>Tanks For The Memories</h1>
      </div>
      <div class="badges">
        <span class="badge" data-camera-badge>Commander Camera</span>
        <span class="badge ghost" data-speech-badge>Speech idle</span>
      </div>
    </header>
    <div class="panels">
      <article class="panel">
        <h2>Orders</h2>
        <p>Say commands such as <code>driver advance</code>, <code>gunner scan</code>, or <code>wingman attack</code>.</p>
        <p>C switches commander camera. V switches drone camera.</p>
      </article>
      <article class="panel">
        <h2>Command Log</h2>
        <div class="log" data-log></div>
      </article>
    </div>
  </section>
  <div class="controls">
    <button data-listen>Start voice input</button>
    <button data-reset>Reset positions</button>
  </div>
  <div class="help">
    <span>Command queue feeds tank state machines.</span>
    <span>Low-confidence speech is ignored silently.</span>
  </div>
`;

root.appendChild(app);

const logEl = app.querySelector<HTMLDivElement>('[data-log]')!;
const listenButton = app.querySelector<HTMLButtonElement>('[data-listen]')!;
const resetButton = app.querySelector<HTMLButtonElement>('[data-reset]')!;
const cameraBadge = app.querySelector<HTMLSpanElement>('[data-camera-badge]')!;
const speechBadge = app.querySelector<HTMLSpanElement>('[data-speech-badge]')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1624');
scene.fog = new THREE.Fog('#0d1624', 30, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.className = 'viewport';
document.body.appendChild(renderer.domElement);

const commanderCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
const droneCamera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
let cameraMode: CameraMode = 'commander';
let activeCamera = commanderCamera;

const ambient = new THREE.AmbientLight('#9eb4d8', 1.1);
scene.add(ambient);

const sun = new THREE.DirectionalLight('#fff1c7', 2.3);
sun.position.set(-10, 18, 8);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220, 10, 10),
  new THREE.MeshStandardMaterial({ color: '#40533a', roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const grid = new THREE.GridHelper(220, 44, '#74947d', '#2b3829');
scene.add(grid);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 220),
  new THREE.MeshStandardMaterial({ color: '#3a424c', roughness: 1 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.02;
scene.add(road);

const tanks = new Map<TankRole, Tank>();

function createTank(role: TankRole, color: number, position: THREE.Vector3): Tank {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.5, 4),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.copy(position);
  body.position.y = 0.75;
  scene.add(body);

  const label = document.createElement('span');
  label.className = `tank-label ${role}`;
  label.textContent = role.toUpperCase();
  document.body.appendChild(label);

  const tank: Tank = {
    role,
    mesh: body,
    label,
    state: 'Idle',
    speed: role === 'enemy' ? 8 : 6,
    heading: 0
  };
  tanks.set(role, tank);
  return tank;
}

const playerTank = createTank('player', 0x4cc3ff, new THREE.Vector3(-10, 0, 0));
const allyTank = createTank('ally', 0x8df27b, new THREE.Vector3(-18, 0, 6));
const enemyTank = createTank('enemy', 0xff6b6b, new THREE.Vector3(18, 0, -8));

const commandQueue: Command[] = [];
const commandLog: string[] = [];

function appendLog(message: string) {
  commandLog.unshift(message);
  while (commandLog.length > 8) commandLog.pop();
  logEl.innerHTML = commandLog.map((entry) => `<div class="log-line">${escapeHtml(entry)}</div>`).join('');
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[char] ?? char;
  });
}

function acknowledge(action: Command['action']) {
  const table: Record<Command['action'], string> = {
    advance: 'Moving.',
    reverse: 'Moving.',
    halt: 'Holding.',
    hold: 'Holding.',
    scan: 'Target acquired.',
    fire: 'Engaging.',
    follow: 'Moving.',
    attack: 'Engaging.'
  };
  return table[action];
}

function parseCommand(raw: string): Command | null {
  const text = raw.trim().toLowerCase();
  const role = text.includes('wingman') ? 'ally' : text.includes('enemy') ? 'enemy' : 'player';

  const matches: Array<[RegExp, Command['action']]> = [
    [/\badvance\b/, 'advance'],
    [/\breverse\b/, 'reverse'],
    [/\bhalt\b/, 'halt'],
    [/\bhold\b/, 'hold'],
    [/\bscan\b/, 'scan'],
    [/\bfire\b/, 'fire'],
    [/\bfollow\b/, 'follow'],
    [/\battack\b/, 'attack']
  ];

  for (const [pattern, action] of matches) {
    if (pattern.test(text)) {
      return { raw, role, action };
    }
  }
  return null;
}

function queueCommand(raw: string) {
  const command = parseCommand(raw);
  if (!command) return;
  commandQueue.push(command);
  appendLog(`> ${command.raw}`);
}

function applyCommand(command: Command) {
  const tank = tanks.get(command.role);
  if (!tank) return;

  switch (command.action) {
    case 'advance':
      tank.state = 'Moving';
      tank.target = tank.mesh.position.clone().add(new THREE.Vector3(0, 0, -20));
      tank.heading = Math.PI;
      break;
    case 'reverse':
      tank.state = 'Moving';
      tank.target = tank.mesh.position.clone().add(new THREE.Vector3(0, 0, 16));
      tank.heading = 0;
      break;
    case 'halt':
    case 'hold':
      tank.state = 'Holding';
      tank.target = undefined;
      break;
    case 'scan':
      tank.state = 'Attacking';
      tank.target = enemyTank.mesh.position.clone();
      break;
    case 'fire':
    case 'attack':
      tank.state = 'Attacking';
      tank.target = enemyTank.mesh.position.clone();
      enemyTank.mesh.scale.setScalar(0.9);
      break;
    case 'follow':
      tank.state = 'Moving';
      tank.target = playerTank.mesh.position.clone().add(new THREE.Vector3(-6, 0, 6));
      break;
  }

  appendLog(`${tank.role.toUpperCase()}: ${command.raw}`);
  appendLog(`ACK: ${acknowledge(command.action)}`);
}

function updateTank(tank: Tank, delta: number) {
  if (tank.role === 'enemy') {
    const target = playerTank.mesh.position.clone();
    target.y = tank.mesh.position.y;
    const dir = target.sub(tank.mesh.position);
    const distance = dir.length();
    if (distance > 18) {
      tank.state = 'Moving';
      dir.normalize();
      tank.mesh.position.addScaledVector(dir, tank.speed * 0.6 * delta);
      tank.heading = Math.atan2(dir.x, dir.z);
    } else {
      tank.state = 'Attacking';
      tank.heading += delta * 0.6;
    }
    return;
  }

  if (tank.state === 'Holding') return;

  if (tank.target) {
    const target = tank.target.clone();
    target.y = tank.mesh.position.y;
    const deltaVec = target.sub(tank.mesh.position);
    const distance = deltaVec.length();
    if (distance < 0.35) {
      tank.state = tank.state === 'Attacking' ? 'Attacking' : 'Idle';
      tank.target = undefined;
      return;
    }

    deltaVec.normalize();
    tank.mesh.position.addScaledVector(deltaVec, tank.speed * delta * 0.65);
    tank.heading = Math.atan2(deltaVec.x, deltaVec.z);
  }
}

function updateLabels() {
  const camera = activeCamera;
  for (const tank of tanks.values()) {
    const pos = tank.mesh.position.clone().project(camera);
    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
    tank.label.style.transform = `translate(${x}px, ${y}px)`;
    tank.label.style.opacity = pos.z < 1 ? '1' : '0';
    tank.label.textContent = `${tank.role.toUpperCase()} · ${tank.state}`;
  }
}

function updateCameras(delta: number) {
  const playerPos = playerTank.mesh.position.clone();
  commanderCamera.position.lerp(
    new THREE.Vector3(playerPos.x - 18, 14, playerPos.z + 22),
    0.08
  );
  commanderCamera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);

  const droneTarget = new THREE.Vector3(playerPos.x, 28, playerPos.z + 0.01);
  droneCamera.position.lerp(droneTarget, 0.1 + delta * 0.01);
  droneCamera.lookAt(playerPos.x, 0, playerPos.z);
}

function tick(time: number) {
  const delta = Math.min(0.033, (time - lastTime) / 1000 || 0.016);
  lastTime = time;

  while (commandQueue.length > 0) {
    const command = commandQueue.shift()!;
    applyCommand(command);
  }

  updateTank(playerTank, delta);
  updateTank(allyTank, delta);
  updateTank(enemyTank, delta);
  updateCameras(delta);
  updateLabels();

  for (const tank of tanks.values()) {
    tank.mesh.rotation.y = tank.heading;
  }

  renderer.render(scene, activeCamera);
  requestAnimationFrame(tick);
}

function resetPositions() {
  playerTank.mesh.position.set(-10, 0.75, 0);
  allyTank.mesh.position.set(-18, 0.75, 6);
  enemyTank.mesh.position.set(18, 0.75, -8);
  playerTank.state = 'Idle';
  allyTank.state = 'Idle';
  enemyTank.state = 'Idle';
  playerTank.target = undefined;
  allyTank.target = undefined;
  enemyTank.target = undefined;
  enemyTank.mesh.scale.setScalar(1);
  appendLog('Positions reset.');
}

function setCameraMode(mode: CameraMode) {
  cameraMode = mode;
  activeCamera = mode === 'commander' ? commanderCamera : droneCamera;
  cameraBadge.textContent = mode === 'commander' ? 'Commander Camera' : 'Drone Camera';
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyC') setCameraMode('commander');
  if (event.code === 'KeyV') setCameraMode('drone');
});

resetButton.addEventListener('click', resetPositions);

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: null | (() => void);
  onend: null | (() => void);
  onerror: null | ((event: Event) => void);
  onresult: null | ((event: SpeechRecognitionEvent) => void);
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const SpeechRecognitionAPI = (
  window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
).SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

let recognition: SpeechRecognitionLike | null = null;
let listening = false;

function updateSpeechBadge(text: string) {
  speechBadge.textContent = text;
}

function startVoiceInput() {
  if (!SpeechRecognitionAPI) {
    updateSpeechBadge('Speech unavailable');
    listenButton.disabled = true;
    return;
  }

  if (recognition) {
    recognition.stop();
  }

  recognition = new SpeechRecognitionAPI();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    listening = true;
    listenButton.textContent = 'Stop voice input';
    updateSpeechBadge('Speech listening');
  };

  recognition.onend = () => {
    listening = false;
    listenButton.textContent = 'Start voice input';
    updateSpeechBadge('Speech idle');
  };

  recognition.onerror = () => {
    // Ignore speech errors silently, matching the prompt.
  };

  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (!result.isFinal) continue;
      const transcript = result[0]?.transcript ?? '';
      const confidence = result[0]?.confidence ?? 0;
      if (confidence < 0.55) continue;
      queueCommand(transcript);
    }
  };

  recognition.start();
}

listenButton.addEventListener('click', () => {
  if (!recognition) {
    startVoiceInput();
    return;
  }

  if (listening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

function createStartupHints() {
  appendLog('Ready for voice orders.');
  appendLog('Commands: driver advance, gunner scan, wingman attack.');
  appendLog('Camera: C commander, V drone.');
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  commanderCamera.aspect = window.innerWidth / window.innerHeight;
  commanderCamera.updateProjectionMatrix();
  droneCamera.aspect = window.innerWidth / window.innerHeight;
  droneCamera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);

let lastTime = performance.now();
setCameraMode('commander');
createStartupHints();
resize();
requestAnimationFrame(tick);
