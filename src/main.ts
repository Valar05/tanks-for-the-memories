import './styles.css';
import {compileCommand, routeLabel, type CommandAction, type CompiledCommand} from './command-compiler';

type MissionFlag = 'positioned' | 'aligned' | 'infantryHeld' | 'breached' | 'inspected' | 'marked' | 'complete';

type TranscriptEntry = {
  text: string;
  speaker: string;
  audioId?: string;
  quiet?: boolean;
};

type AudioLine = {
  id: string;
  file: string;
  speaker: string;
  text: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: {results: ArrayLike<{0: {transcript: string}; isFinal: boolean}>}) => void) | null;
  onerror: ((event: {error?: string}) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root');
const appRoot = root;

const audioLines = new Map<string, AudioLine>();
let lastAudio: HTMLAudioElement | null = null;
let recognition: SpeechRecognitionLike | null = null;

const state = {
  elapsed: 0,
  flags: new Set<MissionFlag>(),
  transcript: [] as TranscriptEntry[],
  lastInput: '',
  mic: 'idle',
};

appRoot.innerHTML = `
  <main class="app-shell">
    <section class="mission-header" aria-labelledby="title">
      <p class="eyebrow">Royal Engineers / Churchill AVRE</p>
      <h1 id="title">The road remains</h1>
      <p class="lede">You are an engineer with no hands except other people. Speak clear operational intent; the radio machine routes it. Verbal garbage receives the dignity of absolute silence.</p>
    </section>

    <section class="status-grid" aria-label="Operation status">
      <div><span>Position</span><strong data-position>short of wall</strong></div>
      <div><span>Obstacle</span><strong data-obstacle>damaged wall seam</strong></div>
      <div><span>Infantry</span><strong data-infantry>waiting for control</strong></div>
      <div><span>Elapsed</span><strong data-elapsed>00:00</strong></div>
    </section>

    <section class="transcript-panel" aria-labelledby="transcript-title">
      <div class="panel-head">
        <h2 id="transcript-title">What reaches you</h2>
        <button type="button" data-replay>Replay last audio</button>
      </div>
      <ol class="transcript" aria-live="polite" aria-relevant="additions" data-transcript></ol>
    </section>

    <form class="command-form" data-command-form>
      <label for="command">Command</label>
      <div class="command-row">
        <input id="command" name="command" autocomplete="off" placeholder="driver advance" data-command-input />
        <button type="submit">Send</button>
        <button type="button" data-mic>Use speech</button>
      </div>
      <p class="mic-state" aria-live="polite" data-mic-state>Microphone idle. Typing is always available.</p>
    </form>

    <aside class="notebook" aria-labelledby="notebook-title">
      <h2 id="notebook-title">Field notebook</h2>
      <p>Mission intent: open one infantry lane through the wall without feeding men into smoke and rubble. The machine routes commands; you do not tune radio channels.</p>
      <ul>
        <li>Bring the AVRE forward before aligning.</li>
        <li>Square the hull to the damaged seam before firing the petard.</li>
        <li>Hold infantry before the wall comes down.</li>
        <li>Sappers inspect before they mark the lane.</li>
      </ul>
    </aside>
  </main>
`;

const transcriptEl = appRoot.querySelector<HTMLOListElement>('[data-transcript]')!;
const inputEl = appRoot.querySelector<HTMLInputElement>('[data-command-input]')!;
const formEl = appRoot.querySelector<HTMLFormElement>('[data-command-form]')!;
const micButton = appRoot.querySelector<HTMLButtonElement>('[data-mic]')!;
const micStateEl = appRoot.querySelector<HTMLElement>('[data-mic-state]')!;

void boot();

formEl.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = inputEl.value;
  inputEl.value = '';
  submitUtterance(value);
});

appRoot.querySelector<HTMLButtonElement>('[data-replay]')?.addEventListener('click', () => {
  if (lastAudio) {
    lastAudio.currentTime = 0;
    void lastAudio.play().catch(() => undefined);
  }
});

micButton.addEventListener('click', () => {
  if (!recognition) recognition = createSpeechRecognition();
  if (!recognition) {
    setMicState('Speech recognition is unavailable here. Use typed commands.');
    return;
  }
  try {
    recognition.start();
    setMicState('Listening. Speak one command.');
  } catch {
    setMicState('Microphone could not start. Use typed commands.');
  }
});

function submitUtterance(raw: string) {
  const command = compileCommand(raw);
  state.lastInput = raw;
  state.elapsed += Math.max(4, Math.ceil(raw.trim().length / 8));
  if (!command) {
    render();
    return;
  }
  dispatch(command);
}

function dispatch(command: CompiledCommand) {
  const blocked = obstruction(command.action);
  if (blocked) {
    addEntry(`${routeLabel(command.route)} / ${command.recipient}`, blocked);
    return;
  }

  switch (command.action) {
    case 'report':
      addEntry('Wireless operator', 'report-current');
      break;
    case 'advance':
      state.flags.add('positioned');
      addEntry('Driver', 'driver-advance');
      break;
    case 'halt':
      addEntry('Driver', 'driver-halt');
      break;
    case 'align':
      state.flags.add('aligned');
      addEntry('Driver', 'driver-align');
      break;
    case 'hold-infantry':
      state.flags.add('infantryHeld');
      addEntry('Infantry liaison', 'infantry-hold');
      break;
    case 'fire':
      state.flags.add('breached');
      addEntry('Gunner', 'gunner-fire');
      break;
    case 'inspect':
      state.flags.add('inspected');
      addEntry('Sapper team', 'sappers-inspect');
      break;
    case 'mark-lane':
      state.flags.add('marked');
      state.flags.add('complete');
      addEntry('Sapper team', 'sappers-mark');
      addEntry('After-action memory', 'after-action-road');
      break;
  }
}

function obstruction(action: CommandAction): string | null {
  if (action === 'align' && !state.flags.has('positioned')) return 'blocked-align-before-advance';
  if (action === 'fire' && !state.flags.has('aligned')) return 'blocked-fire-before-align';
  if (action === 'fire' && !state.flags.has('infantryHeld')) return 'blocked-fire-before-hold';
  if (action === 'inspect' && !state.flags.has('breached')) return 'blocked-inspect-before-breach';
  if (action === 'mark-lane' && !state.flags.has('inspected')) return 'blocked-mark-before-inspect';
  return null;
}

function addEntry(speaker: string, audioId: string) {
  const line = audioLines.get(audioId);
  const text = line?.text || fallbackText(audioId);
  state.transcript.push({speaker, text, audioId});
  state.elapsed += 20;
  render();
  if (line) playAudio(line.file);
}

function fallbackText(id: string): string {
  return {
    'avre-opening': 'Wall ahead. Petard is useless unless the hull is square. Infantry are waiting for the lane.',
    'report-current': 'Driver short of the damaged wall seam; hull not yet square. Infantry waiting for the lane. Breach not made.',
    'driver-advance': 'Advancing. Slow over broken stone. We are short of the seam.',
    'driver-halt': 'Stopped.',
    'driver-align': 'Hull square to the seam. Hold us here.',
    'infantry-hold': 'Infantry held. They will not enter the smoke until released.',
    'gunner-fire': 'Petard away. Wall broken. Dust and brick across the front.',
    'sappers-inspect': 'Sappers moving. Breach is passable on the left edge.',
    'sappers-mark': 'Lane marked. Infantry can pass through the tape.',
    'after-action-road': 'After-action memory: the road remains because other hands made it usable.',
    'blocked-align-before-advance': 'Driver cannot square the hull from here.',
    'blocked-fire-before-align': 'Gunner has no square shot at the seam.',
    'blocked-fire-before-hold': 'Infantry are too close to fire.',
    'blocked-inspect-before-breach': 'Sappers have no breach to inspect.',
    'blocked-mark-before-inspect': 'Sappers will not mark an uninspected lane.',
  }[id] || id;
}

async function boot() {
  await loadAudioScript();
  addEntry('Opening brief', 'avre-opening');
}

async function loadAudioScript() {
  try {
    const response = await fetch('audio/script.json');
    if (!response.ok) return;
    const lines = (await response.json()) as AudioLine[];
    for (const line of lines) audioLines.set(line.id, line);
  } catch {
    // Text is canonical; missing audio must not break play.
  }
}

function playAudio(file: string) {
  lastAudio?.pause();
  lastAudio = new Audio(`audio/${file}`);
  void lastAudio.play().catch(() => undefined);
}

function createSpeechRecognition(): SpeechRecognitionLike | null {
  const win = window as Window & {SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor};
  const Constructor = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!Constructor) return null;
  const instance = new Constructor();
  instance.lang = 'en-GB';
  instance.interimResults = false;
  instance.continuous = false;
  instance.onresult = (event) => {
    const latest = event.results[event.results.length - 1]?.[0]?.transcript || '';
    setMicState(`Heard: ${latest}`);
    submitUtterance(latest);
  };
  instance.onerror = () => setMicState('Microphone failed. Use typed commands.');
  instance.onend = () => {
    if (state.mic === 'Listening. Speak one command.') setMicState('Microphone idle. Typing is always available.');
  };
  return instance;
}

function setMicState(text: string) {
  state.mic = text;
  micStateEl.textContent = text;
}

function render() {
  appRoot.querySelector<HTMLElement>('[data-position]')!.textContent = state.flags.has('positioned') ? state.flags.has('aligned') ? 'square to seam' : 'at wall' : 'short of wall';
  appRoot.querySelector<HTMLElement>('[data-obstacle]')!.textContent = state.flags.has('breached') ? state.flags.has('marked') ? 'lane marked' : 'breach obscured' : 'damaged wall seam';
  appRoot.querySelector<HTMLElement>('[data-infantry]')!.textContent = state.flags.has('infantryHeld') ? state.flags.has('complete') ? 'moving through marked lane' : 'held clear' : 'waiting for control';
  appRoot.querySelector<HTMLElement>('[data-elapsed]')!.textContent = formatTime(state.elapsed);
  transcriptEl.innerHTML = state.transcript.map((entry) => `<li><span>${entry.speaker}</span><p>${entry.text}</p></li>`).join('');
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}
