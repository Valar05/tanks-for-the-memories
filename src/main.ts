import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './styles.css';

type FeedType = 'Scout report' | 'Radio report' | 'Visual observation' | 'HQ message';
type Assessment = 'incomplete' | 'stale' | 'wrong' | 'solid';
type DecisionKey = 'advance' | 'confirm' | 'send wingman' | 'hold';
type Posture = 'head-out' | 'hatch-cracked' | 'buttoned-up' | 'optic-scan';
type Phase = 'live' | 'victory' | 'failure';
type ArtifactKey = 'scout-photo' | 'radio-transcript' | 'visual-snapshot' | 'scope-snapshot' | 'hq-dispatch';
type VoiceRole = 'scout' | 'radio' | 'visual' | 'hq' | 'memory';

type ReportTemplate = {
  type: FeedType;
  source: string;
  confidence: number;
  content: string;
  assessment: Assessment;
  artifact: ArtifactKey;
  bark: string;
  clip: string;
  voice: VoiceRole;
};

type Report = ReportTemplate & {
  id: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt: number | null;
  decision: DecisionKey | null;
  outcome: string;
};

type MemoryEvent = {
  time: number;
  original: string;
  reality: string;
  consequence: string;
  lesson: string;
  clip: string;
};

type AudioState = {
  unlocked: boolean;
  context: AudioContext | null;
  noiseSources: AudioBufferSourceNode[];
  ambientTimer: number | null;
};

type FeedState = {
  phase: Phase;
  posture: Posture;
  time: number;
  score: number;
  attention: number;
  pressure: number;
  turnCount: number;
  selectedReportId: string | null;
  nextReportAt: number;
  nextReportIndex: number;
  reports: Report[];
  memoryEvents: MemoryEvent[];
  lastAnnouncement: string;
  falseReportPresent: boolean;
  fedDoctrineValidated: boolean;
  decisions: Record<DecisionKey, number>;
  reportTypesSeen: Set<FeedType>;
  victoryLogged: boolean;
  failureLogged: boolean;
  lastSpontaneousAt: number;
  pendingSpeech: string[];
  currentSpeech: HTMLAudioElement | null;
  audio: AudioState;
};

type DecisionOption = {
  key: DecisionKey;
  label: string;
  hotkey: string;
};

const TANK_MODEL_MANIFEST_URL = '/tftm/models/m4a3_75_vvss_sherman_alpha_mobile/model_manifest.json';
const TANK_MODEL_REQUIRED_PIVOTS = ['turret_traverse_pivot', 'cannon_elevation_pivot', 'commander_hatch'];

const REPORT_LIBRARY: ReportTemplate[] = [
  {
    type: 'Scout report',
    source: 'Scout Team Blue',
    confidence: 0.62,
    content: 'Possible armor near orchard fence.',
    assessment: 'incomplete',
    artifact: 'scout-photo',
    bark: 'Scout reports movement, right hedgerow.',
    clip: 'scout-movement-right-hedgerow.mp3',
    voice: 'scout'
  },
  {
    type: 'Radio report',
    source: 'Relay Net',
    confidence: 0.44,
    content: 'Friendly tank missing on the left track. The message arrived late and clipped.',
    assessment: 'stale',
    artifact: 'radio-transcript',
    bark: 'Radio contact lost.',
    clip: 'radio-contact-lost.mp3',
    voice: 'radio'
  },
  {
    type: 'Visual observation',
    source: 'Command binoculars',
    confidence: 0.71,
    content: 'Movement observed. Could be a hedge line, could be a gun team setting.',
    assessment: 'wrong',
    artifact: 'visual-snapshot',
    bark: 'Movement observed.',
    clip: 'visual-movement-observed.mp3',
    voice: 'visual'
  },
  {
    type: 'HQ message',
    source: 'Battalion HQ',
    confidence: 0.89,
    content: 'Advance immediately. The picture is never going to get perfectly clean.',
    assessment: 'solid',
    artifact: 'hq-dispatch',
    bark: 'HQ requests immediate advance.',
    clip: 'hq-advance-immediately.mp3',
    voice: 'hq'
  },
  {
    type: 'Scout report',
    source: 'Scout Team Echo',
    confidence: 0.58,
    content: 'Boxy shape beyond the orchard fence. The hedge cuts the lane and hides the far side.',
    assessment: 'incomplete',
    artifact: 'scout-photo',
    bark: 'Scout says the orchard fence is hiding something.',
    clip: 'scout-possible-armor-orchard-fence.mp3',
    voice: 'scout'
  },
  {
    type: 'Radio report',
    source: 'Wingman Net',
    confidence: 0.63,
    content: 'Wingman reports a pause on the right flank. The net is clear, but the picture is narrow.',
    assessment: 'solid',
    artifact: 'radio-transcript',
    bark: 'Wingman says the right flank went quiet.',
    clip: 'radio-friendly-tank-missing.mp3',
    voice: 'radio'
  },
  {
    type: 'Visual observation',
    source: 'Gunner sight',
    confidence: 0.8,
    content: 'Scope picture looks usable, but the blur could still lie.',
    assessment: 'solid',
    artifact: 'scope-snapshot',
    bark: 'Movement observed through the scope.',
    clip: 'visual-maybe-muzzle-flash.mp3',
    voice: 'visual'
  },
  {
    type: 'HQ message',
    source: 'Battalion HQ',
    confidence: 0.9,
    content: 'Hold until the picture clears. HQ is late enough that the line may already have changed.',
    assessment: 'stale',
    artifact: 'hq-dispatch',
    bark: 'HQ says hold until the picture clears.',
    clip: 'hq-hold-until-clear.mp3',
    voice: 'hq'
  }
];

const DECISIONS: DecisionOption[] = [
  { key: 'advance', label: 'Head out', hotkey: 'A' },
  { key: 'confirm', label: 'Hatch cracked', hotkey: 'B' },
  { key: 'send wingman', label: 'Buttoned up', hotkey: 'C' },
  { key: 'hold', label: 'Optics scan', hotkey: 'D' }
];

let nextReportId = 1;
let lastTick = 0;

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Missing #app root');
}

const shell = document.createElement('div');
shell.className = 'shell';
shell.innerHTML = `
  <div class="tank-app">
    <header class="masthead">
      <div class="masthead-copy">
        <p class="eyebrow">Sherman commander station</p>
        <h1>Inside a tank</h1>
        <p class="lede">Lt. Mercer is buttoned up in the turret. The player sees the world through hatch rim, periscope frame, radio, and crew calls before they ever see a clean map.</p>
        <div class="posture-strip" data-posture-strip></div>
        <button class="audio-wake" type="button" data-audio-wake>Wake radio net</button>
      </div>
      <div class="masthead-metrics">
        <div class="metric" data-status></div>
        <div class="metric" data-doctrine></div>
        <div class="metric" data-attention></div>
        <div class="metric" data-score></div>
      </div>
    </header>

    <main class="layout">
      <section class="panel station-panel">
        <div class="panel-head">
          <div>
            <h2>Hatch and optics</h2>
            <p class="panel-subtitle">The commander’s body is the first interface. Hatch state changes what can be seen, heard, and trusted.</p>
          </div>
          <span class="pill" data-posture-pill></span>
        </div>
        <div class="tank-stage">
          <div class="tank-hull">
            <div class="turret-plate">
              <div class="hatch-rim">
                <span class="hatch-title">Commander hatch</span>
                <span class="hatch-state" data-hatch-state></span>
              </div>
              <div class="periscope-frame">
                <div class="optic-slit">
                  <span class="slit-caption">Periscope frame</span>
                  <div class="outside-glimpse" data-outside-glimpse></div>
                </div>
              </div>
            </div>
            <div class="radio-bay">
              <div class="radio-head">Radio / intercom</div>
              <div class="radio-static">Crew voices come through armor, not a dashboard.</div>
              <div class="radio-tags">
                <span class="tag">hatch view</span>
                <span class="tag">optics</span>
                <span class="tag">radio</span>
                <span class="tag">intercom</span>
              </div>
            </div>
          </div>
        </div>
        <div class="model-preview">
          <div class="model-preview-copy">
            <span class="model-preview-kicker">Procedural Three.js tank preview</span>
            <strong>M4 Sherman silhouette</strong>
            <p>Hull, turret, gun, tracks, road wheels, hatch marker, and hedgerow occluders are generated at runtime so the commander station has a tank-body reference before a sourced GLB exists.</p>
            <span class="model-preview-note">Alpha proof keeps the Sherman geometry fixed; identity comes from paint, wear, markings, and maintenance habits.</span>
          </div>
          <div class="model-preview-viewport" data-tank-preview></div>
        </div>
        <div class="posture-grid" data-decision-grid></div>
      </section>

      <section class="panel command-panel">
        <div class="panel-head">
          <div>
            <h2>Signals inside armor</h2>
            <p class="panel-subtitle">Contacts are not cards in a dashboard. They are glimpses, barks, and corrections arriving through the commander station.</p>
          </div>
        </div>
        <article class="active-report" data-active-report></article>
        <div class="map-tool" data-map-tool></div>
        <div class="signal-strip" data-feed-stream></div>
        <div class="command-note" data-command-note></div>
      </section>

      <section class="panel memory-panel">
        <div class="panel-head">
          <div>
            <h2>After-action memory</h2>
            <p class="panel-subtitle">When the picture breaks, the memory sheet preserves what was seen, what was true, and why the commander was wrong.</p>
          </div>
          <span class="pill" data-contact-count></span>
        </div>
        <div class="memory-feed" data-memory-feed></div>
      </section>
    </main>

    <footer class="footer">
      <span class="footer-chip">A / B / C / D change the commander’s posture.</span>
      <span class="footer-chip">Contacts arrive through hatch, optics, radio, and intercom.</span>
      <span class="footer-chip">The tank body interrupts the player.</span>
      <span class="footer-chip">No live AI or LLM calls are used at runtime.</span>
    </footer>
  </div>
`;
root.appendChild(shell);

const refs = {
  status: shell.querySelector<HTMLDivElement>('[data-status]')!,
  doctrine: shell.querySelector<HTMLDivElement>('[data-doctrine]')!,
  attention: shell.querySelector<HTMLDivElement>('[data-attention]')!,
  score: shell.querySelector<HTMLDivElement>('[data-score]')!,
  contactCount: shell.querySelector<HTMLSpanElement>('[data-contact-count]')!,
  feedStream: shell.querySelector<HTMLDivElement>('[data-feed-stream]')!,
  activeReport: shell.querySelector<HTMLDivElement>('[data-active-report]')!,
  decisionGrid: shell.querySelector<HTMLDivElement>('[data-decision-grid]')!,
  posturePill: shell.querySelector<HTMLSpanElement>('[data-posture-pill]')!,
  hatchState: shell.querySelector<HTMLSpanElement>('[data-hatch-state]')!,
  outsideGlimpse: shell.querySelector<HTMLDivElement>('[data-outside-glimpse]')!,
  tankPreview: shell.querySelector<HTMLDivElement>('[data-tank-preview]')!,
  mapTool: shell.querySelector<HTMLDivElement>('[data-map-tool]')!,
  commandNote: shell.querySelector<HTMLDivElement>('[data-command-note]')!,
  memoryFeed: shell.querySelector<HTMLDivElement>('[data-memory-feed]')!,
  audioWake: shell.querySelector<HTMLButtonElement>('[data-audio-wake]')!,
  postureStrip: shell.querySelector<HTMLDivElement>('[data-posture-strip]')!
};

const state: FeedState = {
  phase: 'live',
  posture: 'buttoned-up',
  time: 0,
  score: 0,
  attention: 6,
  pressure: 0,
  turnCount: 0,
  selectedReportId: null,
  nextReportAt: 1.4,
  nextReportIndex: 0,
  reports: buildInitialReports(),
  memoryEvents: [],
  lastAnnouncement: 'Tap to wake the radio net.',
  falseReportPresent: true,
  fedDoctrineValidated: false,
  decisions: { advance: 0, confirm: 0, 'send wingman': 0, hold: 0 },
  reportTypesSeen: new Set<FeedType>(['Scout report', 'Radio report', 'Visual observation', 'HQ message']),
  victoryLogged: false,
  failureLogged: false,
  lastSpontaneousAt: 0,
  pendingSpeech: [],
  currentSpeech: null,
  audio: {
    unlocked: false,
    context: null,
    noiseSources: [],
    ambientTimer: null
  }
};

nextReportId = state.reports.length + 1;
seedInitialSelection();
bindControls();
const tankPreview = createProceduralTankPreview(refs.tankPreview);
render();
requestAnimationFrame(tick);

function buildInitialReports(): Report[] {
  return [
    createReport(REPORT_LIBRARY[0], 0),
    createReport(REPORT_LIBRARY[1], 0),
    createReport(REPORT_LIBRARY[2], 0),
    createReport(REPORT_LIBRARY[3], 0)
  ];
}

function createReport(template: ReportTemplate, createdAt = state.time): Report {
  return {
    ...template,
    id: 'R' + String(nextReportId++).padStart(3, '0'),
    createdAt,
    resolved: false,
    resolvedAt: null,
    decision: null,
    outcome: ''
  };
}

function seedInitialSelection() {
  const unresolved = state.reports.find((report) => !report.resolved);
  state.selectedReportId = unresolved ? unresolved.id : null;
}

function bindControls() {
  for (const option of DECISIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'decision-button';
    button.innerHTML = `<span class="hotkey">${option.hotkey}</span><span>${escapeHtml(option.label)}</span>`;
    button.addEventListener('click', () => chooseDecision(option.key));
    refs.decisionGrid.appendChild(button);
  }

  refs.audioWake.addEventListener('click', () => unlockAudio());
  window.addEventListener('pointerdown', () => unlockAudio(), { once: true });
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r' && state.phase !== 'live') {
      restart();
      return;
    }
    if (state.phase !== 'live') {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'a') chooseDecision('advance');
    if (key === 'b') chooseDecision('confirm');
    if (key === 'c') chooseDecision('send wingman');
    if (key === 'd') chooseDecision('hold');
  });
}

function tick(now: number) {
  const delta = Math.min(0.1, (now - lastTick) / 1000 || 0.016);
  lastTick = now;

  if (state.phase === 'live') {
    state.time += delta;
    ageReports();
    drainAttention(delta);
    maybeSpawnReport();
    maybeSpontaneousCommentary();
    maybeTransition();
  }

  render();
  tankPreview.update(delta, state.posture);
  requestAnimationFrame(tick);
}

function ageReports() {
  for (const report of state.reports) {
    if (report.resolved) continue;
    const age = state.time - report.createdAt;
    if (age > 10 && report.assessment === 'incomplete') report.assessment = 'stale';
    if (age > 12 && report.assessment === 'solid') report.assessment = 'stale';
  }
}

function drainAttention(delta: number) {
  const unresolved = state.reports.filter((report) => !report.resolved).length;
  state.pressure = clamp(state.pressure + unresolved * delta * 0.045, 0, 10);
  const drain = 0.06 + unresolved * 0.03 + state.pressure * 0.01;
  state.attention = clamp(state.attention - drain * delta, 0, 10);
}

function maybeSpawnReport() {
  if (state.time < state.nextReportAt) return;
  const template = REPORT_LIBRARY[state.nextReportIndex % REPORT_LIBRARY.length];
  state.nextReportIndex += 1;
  const report = createReport(template, state.time);
  state.reports.unshift(report);
  state.reportTypesSeen.add(report.type);
  state.selectedReportId = report.id;
  state.lastAnnouncement = report.bark;
  speak(report.clip);

  const unresolved = state.reports.filter((item) => !item.resolved).length;
  const pressureDelay = unresolved >= 4 ? 2.2 : 3.5;
  const cadence = clamp(pressureDelay - state.pressure * 0.12, 1.8, 4.4);
  state.nextReportAt = state.time + cadence;
}

function chooseDecision(decision: DecisionKey) {
  if (state.phase !== 'live') return;
  const report = getActiveReport();
  if (!report || report.resolved) {
    state.lastAnnouncement = 'No active contact to resolve.';
    return;
  }

  state.posture = decisionToPosture(decision);
  const outcome = resolveReport(report, decision);
  state.decisions[decision] += 1;
  state.turnCount += 1;
  state.selectedReportId = pickNextReportId();
  state.lastAnnouncement = `${postureLabel(state.posture)}: ${outcome.announcement}`;
  maybeTransition();
}

function decisionToPosture(decision: DecisionKey): Posture {
  if (decision === 'advance') return 'head-out';
  if (decision === 'confirm') return 'hatch-cracked';
  if (decision === 'send wingman') return 'buttoned-up';
  return 'optic-scan';
}

function postureLabel(posture: Posture) {
  if (posture === 'head-out') return 'Head out';
  if (posture === 'hatch-cracked') return 'Hatch cracked';
  if (posture === 'buttoned-up') return 'Buttoned up';
  return 'Optics scan';
}

function postureHint(posture: Posture) {
  if (posture === 'head-out') return 'best hatch view, worst protection';
  if (posture === 'hatch-cracked') return 'mixed hatch and crew view';
  if (posture === 'buttoned-up') return 'radio and intercom dominate';
  return 'periscope and optics dominate';
}

function resolveReport(report: Report, decision: DecisionKey) {
  const outcome = assessDecision(report, decision);
  report.resolved = true;
  report.resolvedAt = state.time;
  report.decision = decision;
  report.outcome = outcome.text;
  state.score = clamp(state.score + outcome.scoreDelta, -9, 20);
  state.attention = clamp(state.attention + outcome.attentionDelta, 0, 10);
  state.pressure = clamp(state.pressure + outcome.pressureDelta, 0, 10);

  if (outcome.memory) {
    addMemoryEvent(outcome.memory);
  }

  if (decision === 'send wingman') {
    spawnFollowupReport(report);
  }

  return outcome;
}

function assessDecision(report: Report, decision: DecisionKey) {
  const age = state.time - report.createdAt;
  const fresh = age < 4;
  const stale = age >= 7;
  const category = report.assessment;

  let scoreDelta = 0;
  let attentionDelta = 0;
  let pressureDelta = 0;
  let announcement = '';
  let text = '';
  let memory: MemoryEvent | null = null;
  let clip = 'memory-original-report.mp3';

  if (category === 'wrong') {
    if (decision === 'confirm' || decision === 'hold') {
      scoreDelta = 2;
      attentionDelta = 0.7;
      pressureDelta = -0.5;
      announcement = 'The optics caught the lie before it drove the platoon.';
      text = 'The hatch and optic picture disagreed with the first glance, and the false picture failed early.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the visual picture was a concealed anti-tank gun.',
        consequence: 'Consequence: the commander did not drive the platoon into the kill zone.',
        lesson: 'Lesson: a clean-looking view can still be a lie.',
        clip: 'memory-the-feed-was-wrong.mp3'
      };
      clip = 'memory-the-feed-was-wrong.mp3';
    } else {
      scoreDelta = -2;
      attentionDelta = -1.4;
      pressureDelta = 1.2;
      announcement = 'The head-out picture went forward too early.';
      text = 'The commander committed on a thin read and paid for the haste.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the shape was incomplete and the enemy was not where the report implied.',
        consequence: 'Consequence: the platoon spent tempo on a false lead.',
        lesson: 'Lesson: the first picture is not the truth; it is only the first claim.',
        clip: 'memory-original-report.mp3'
      };
    }
  } else if (category === 'incomplete') {
    if (decision === 'confirm' || decision === 'send wingman') {
      scoreDelta = 2;
      attentionDelta = 0.3;
      pressureDelta = -0.2;
      announcement = 'The incomplete picture forced a useful second look.';
      text = 'The gap in the picture was treated as a clue, not a finish.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the report was incomplete, so the commander waited for more evidence.',
        consequence: 'Consequence: the platoon learned before it moved.',
        lesson: 'Lesson: incomplete is not useless; it is a prompt to confirm.',
        clip: 'memory-original-report.mp3'
      };
    } else if (decision === 'advance') {
      scoreDelta = stale ? -1 : 0;
      attentionDelta = -0.8;
      pressureDelta = 0.9;
      announcement = 'The hatch view outran the picture.';
      text = 'The commander moved on a report that had not finished talking.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the report had not been confirmed and the lane was still uncertain.',
        consequence: 'Consequence: the platoon spent tempo on a hunch.',
        lesson: 'Lesson: motion without confirmation burns attention.',
        clip: 'memory-original-report.mp3'
      };
    } else {
      scoreDelta = 0;
      attentionDelta = 0.5;
      pressureDelta = -0.1;
      announcement = 'Buttoning up bought time for the picture to breathe.';
      text = 'The pause kept the incomplete contact from becoming a trap.';
    }
  } else if (category === 'stale') {
    if (decision === 'hold' || decision === 'confirm') {
      scoreDelta = 2;
      attentionDelta = 0.5;
      pressureDelta = -0.6;
      announcement = 'The stale contact was treated as stale, not sacred.';
      text = 'The age on the contact mattered more than the drama in the wording.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the claim had gone stale before it reached the commander.',
        consequence: 'Consequence: the commander saved the platoon from chasing old news.',
        lesson: 'Lesson: age is part of truth management.',
        clip: 'memory-original-report.mp3'
      };
    } else {
      scoreDelta = -1;
      attentionDelta = -1.1;
      pressureDelta = 0.8;
      announcement = 'A stale contact pushed the platoon into motion.';
      text = 'The picture was late and the rushed choice made the delay expensive.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the report was already stale by the time the order went out.',
        consequence: 'Consequence: the platoon moved on old information.',
        lesson: 'Lesson: the picture must be timed, not merely read.',
        clip: 'memory-original-report.mp3'
      };
    }
  } else {
    if (decision === 'advance') {
      scoreDelta = fresh ? 3 : 2;
      attentionDelta = 0.5;
      pressureDelta = -0.7;
      announcement = 'The commander committed on a solid picture.';
      text = 'The hatch view supported the move and the commander used it.';
    } else if (decision === 'confirm') {
      scoreDelta = 1;
      attentionDelta = 0.6;
      pressureDelta = -0.2;
      announcement = 'The hatch crack strengthened an already decent picture.';
      text = 'The contact held up under one more look.';
    } else if (decision === 'send wingman') {
      scoreDelta = 0;
      attentionDelta = 0.2;
      pressureDelta = 0.2;
      announcement = 'The commander stayed buttoned up and asked for another set of eyes.';
      text = 'The extra check cost attention without buying much clarity.';
    } else {
      scoreDelta = 1;
      attentionDelta = 0.8;
      pressureDelta = -0.3;
      announcement = 'The optics scan preserved the option to act later.';
      text = 'The contact was solid, but the commander bought more time instead of spending it.';
    }
  }

  return { scoreDelta, attentionDelta, pressureDelta, announcement, text, memory, clip };
}

function spawnFollowupReport(sourceReport: Report) {
  const followupType: FeedType = sourceReport.type === 'Scout report' ? 'Radio report' : 'Scout report';
  const followupTemplate: ReportTemplate = {
    type: followupType,
    source: sourceReport.type === 'Scout report' ? 'Wingman Sherman' : 'Scout Team Blue',
    confidence: clamp(sourceReport.confidence + 0.12, 0, 1),
    content: 'Follow-up arrives because the commander spent attention to cross-check the first claim.',
    assessment: sourceReport.assessment === 'wrong' ? 'incomplete' : 'solid',
    artifact: sourceReport.type === 'Scout report' ? 'radio-transcript' : 'scout-photo',
    bark: 'Cross-check report incoming.',
    clip: sourceReport.type === 'Scout report' ? 'radio-contact-lost.mp3' : 'scout-possible-armor-orchard-fence.mp3',
    voice: sourceReport.type === 'Scout report' ? 'radio' : 'scout'
  };
  const followup = createReport(followupTemplate, state.time + 0.3);
  state.reports.unshift(followup);
  state.reportTypesSeen.add(followup.type);
  state.lastAnnouncement = 'Cross-check generated a new contact instead of a map.';
  speak(followup.clip);
}

function maybeSpontaneousCommentary() {
  if (state.time - state.lastSpontaneousAt < 6) return;
  const unresolved = state.reports.filter((item) => !item.resolved).length;
  if (unresolved >= 3) {
    state.lastSpontaneousAt = state.time;
    state.lastAnnouncement = 'The station is stacking up contacts and attention is the only thing that runs out first.';
  }
}

function maybeTransition() {
  if (state.phase !== 'live') return;
  if (state.attention <= 0 || state.pressure >= 10) {
    state.phase = 'failure';
    if (!state.failureLogged) {
      state.failureLogged = true;
      state.lastAnnouncement = 'Attention collapsed. The tank lost the picture.';
      addMemoryEvent({
        time: state.time,
        original: 'Original Report: Too many contacts unresolved at once.',
        reality: 'Reality: the commander lost the picture in the backlog.',
        consequence: 'Consequence: the station became noise and the run failed.',
        lesson: 'Lesson: unresolved claims are a pressure system.',
        clip: 'memory-the-feed-was-wrong.mp3'
      });
    }
    return;
  }

  const resolvedCount = state.reports.filter((item) => item.resolved).length;
  if (state.score >= 8 && resolvedCount >= 4) {
    state.phase = 'victory';
    if (!state.victoryLogged) {
      state.victoryLogged = true;
      state.lastAnnouncement = 'The commander learned to work the tank instead of the map.';
      addMemoryEvent({
        time: state.time,
        original: 'Original Report: Contacts kept arriving.',
        reality: 'Reality: the commander learned to trust confirmation over instinct.',
        consequence: 'Consequence: the station stabilized and the barrage of claims became usable.',
        lesson: 'Lesson: the battlefield lives inside the commander station.',
        clip: 'memory-original-report.mp3'
      });
    }
  }
}

function addMemoryEvent(event: MemoryEvent) {
  state.memoryEvents.unshift(event);
  while (state.memoryEvents.length > 5) {
    state.memoryEvents.pop();
  }
  speak(event.clip);
}

function pickNextReportId() {
  const unresolved = state.reports.filter((report) => !report.resolved);
  if (unresolved.length === 0) return null;
  unresolved.sort((a, b) => a.createdAt - b.createdAt);
  return unresolved[0].id;
}

function getActiveReport() {
  const selected = state.reports.find((report) => report.id === state.selectedReportId && !report.resolved);
  if (selected) return selected;
  const next = state.reports.find((report) => !report.resolved);
  if (next) state.selectedReportId = next.id;
  return next || null;
}

function render() {
  const activeReport = getActiveReport();
  refs.status.textContent = state.phase === 'live' ? 'Inside tank' : state.phase === 'victory' ? 'Picture held' : 'Station collapse';
  refs.status.className = 'metric ' + (state.phase === 'live' ? 'live' : state.phase === 'victory' ? 'victory' : 'failure');
  refs.doctrine.textContent = 'Observation -> Interpretation -> Commitment -> Revelation -> Memory';
  refs.attention.textContent = 'Attention ' + state.attention.toFixed(1) + ' / 10';
  refs.score.textContent = 'Score ' + state.score.toFixed(0) + ' · Pressure ' + state.pressure.toFixed(1);
  refs.contactCount.textContent = state.reports.filter((report) => !report.resolved).length + ' contacts';
  refs.feedStream.innerHTML = renderSignalStrip();
  refs.activeReport.innerHTML = renderActiveReport(activeReport);
  refs.mapTool.innerHTML = renderMapTool(activeReport);
  refs.commandNote.textContent = state.lastAnnouncement;
  refs.memoryFeed.innerHTML = renderMemoryFeed();
  refs.audioWake.textContent = state.audio.unlocked ? 'Radio net awake' : 'Wake radio net';
  refs.audioWake.disabled = state.audio.unlocked;
  refs.posturePill.textContent = postureLabel(state.posture) + ' · ' + postureHint(state.posture);
  refs.hatchState.textContent = hatchStateLabel(state.posture);
  refs.outsideGlimpse.innerHTML = renderOutsideGlimpse(activeReport);
  refs.postureStrip.innerHTML = renderPostureStrip();
}

function renderPostureStrip() {
  return DECISIONS.map((option) => {
    const posture = decisionToPosture(option.key);
    const active = posture === state.posture;
    return `
      <span class="posture-chip ${active ? 'active' : ''}">
        <span class="hotkey">${option.hotkey}</span>
        <span>${escapeHtml(option.label)}</span>
      </span>
    `;
  }).join('');
}

function renderSignalStrip() {
  const ordered = [...state.reports].sort((a, b) => b.createdAt - a.createdAt);
  if (ordered.length === 0) {
    return '<div class="empty-state">No contacts. The station is listening.</div>';
  }
  return ordered.map((report) => {
    const status = report.resolved ? 'resolved' : getReportStatus(report);
    const age = Math.max(0, state.time - report.createdAt);
    return `
      <article class="signal-card ${status}">
        <div class="signal-topline">
          <strong>${escapeHtml(report.type)}</strong>
          <span>${escapeHtml(report.source)}</span>
        </div>
        <p class="signal-content">${escapeHtml(report.content)}</p>
        <div class="signal-meta">
          <span>channel ${escapeHtml(reportChannel(report))}</span>
          <span>confidence ${Math.round(report.confidence * 100)}%</span>
          <span>age ${formatAge(age)}</span>
        </div>
        <div class="report-tags">
          <span class="tag">${escapeHtml(status)}</span>
          <span class="tag muted">${escapeHtml(report.voice)}</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderActiveReport(report: Report | null) {
  if (!report) {
    return '<div class="empty-state">No active contact selected.</div>';
  }
  const age = Math.max(0, state.time - report.createdAt);
  return `
    <div class="active-card ${report.resolved ? 'resolved' : getReportStatus(report)}">
      <div class="report-artifact artifact-${report.artifact} active-artifact">
        <img src="/tftm/evidence/${artifactFile(report.artifact)}" alt="${escapeHtml(report.type)} carrier" loading="lazy" />
        <span class="artifact-label">${escapeHtml(carrierLabel(report.artifact))}</span>
      </div>
      <div class="report-topline">
        <strong>Current contact</strong>
        <span>${escapeHtml(report.id)}</span>
      </div>
      <h3>${escapeHtml(report.type)}</h3>
      <p class="report-content">${escapeHtml(report.content)}</p>
      <dl class="active-details">
        <div><dt>Source</dt><dd>${escapeHtml(report.source)}</dd></div>
        <div><dt>Channel</dt><dd>${escapeHtml(reportChannel(report))}</dd></div>
        <div><dt>Confidence</dt><dd>${Math.round(report.confidence * 100)}%</dd></div>
        <div><dt>Age</dt><dd>${formatAge(age)}</dd></div>
        <div><dt>Assessment</dt><dd>${escapeHtml(getReportStatus(report))}</dd></div>
        <div><dt>Posture</dt><dd>${escapeHtml(postureLabel(state.posture))}</dd></div>
      </dl>
    </div>
  `;
}

function renderMapTool(report: Report | null) {
  if (!report) {
    return '<div class="map-sheet empty-state">No map note yet. The tank is still listening.</div>';
  }
  const channel = reportChannel(report);
  const x = report.type === 'Scout report' ? '28%' : report.type === 'Radio report' ? '58%' : report.type === 'Visual observation' ? '74%' : '45%';
  const y = report.type === 'Scout report' ? '34%' : report.type === 'Radio report' ? '62%' : report.type === 'Visual observation' ? '41%' : '20%';
  return `
    <div class="map-sheet">
      <div class="map-grid"></div>
      <span class="map-marker" style="left:${x};top:${y};"></span>
      <div class="map-legend">
        <strong>Folded map</strong>
        <span>${escapeHtml(report.source)} · ${escapeHtml(channel)}</span>
      </div>
      <p class="map-caption">A small tool on the commander’s lap, not the main screen.</p>
    </div>
  `;
}

function renderOutsideGlimpse(report: Report | null) {
  if (!report) {
    return '<div class="glimpse-note">No contact. Hatch, optics, and radio are quiet.</div>';
  }
  return `
    <div class="glimpse-note ${report.resolved ? 'resolved' : getReportStatus(report)}">
      <span>${escapeHtml(reportChannel(report))}</span>
      <strong>${escapeHtml(report.source)}</strong>
      <p>${escapeHtml(report.bark)}</p>
    </div>
  `;
}

function renderMemoryFeed() {
  if (state.memoryEvents.length === 0) {
    return '<div class="empty-state">No memory sheet yet. Make a major mistake or stabilize the picture to produce one.</div>';
  }
  return state.memoryEvents.map((event) => `
    <article class="memory-card">
      <img src="/tftm/evidence/hq_dispatch.svg" alt="After-action sheet" class="memory-image" />
      <span class="memory-time">${formatAge(state.time - event.time)} old</span>
      <p><strong>${escapeHtml(event.original)}</strong></p>
      <p>${escapeHtml(event.reality)}</p>
      <p>${escapeHtml(event.consequence)}</p>
      <p>${escapeHtml(event.lesson)}</p>
    </article>
  `).join('');
}

function getReportStatus(report: Report) {
  const age = state.time - report.createdAt;
  if (report.resolved) return 'resolved';
  if (report.assessment === 'wrong') return 'wrong';
  if (age >= 7 || report.assessment === 'stale') return 'stale';
  if (report.assessment === 'incomplete') return 'incomplete';
  return 'solid';
}

function formatAge(age: number) {
  return Math.max(0, Math.ceil(age)).toString() + 's';
}

function hatchStateLabel(posture: Posture) {
  if (posture === 'head-out') return 'hatch open';
  if (posture === 'hatch-cracked') return 'hatch cracked';
  if (posture === 'buttoned-up') return 'buttoned up';
  return 'optics only';
}

function reportChannel(report: Report) {
  if (report.type === 'Scout report') return 'hatch view';
  if (report.type === 'Radio report') return 'radio';
  if (report.type === 'Visual observation') return 'optics';
  return 'intercom';
}

function restart() {
  state.phase = 'live';
  state.posture = 'buttoned-up';
  state.time = 0;
  state.score = 0;
  state.attention = 6;
  state.pressure = 0;
  state.turnCount = 0;
  state.selectedReportId = null;
  state.nextReportAt = 1.4;
  state.nextReportIndex = 0;
  state.reports = buildInitialReports();
  nextReportId = state.reports.length + 1;
  state.memoryEvents = [];
  state.lastAnnouncement = 'Mission restarted. The station is buttoned up again.';
  state.falseReportPresent = true;
  state.fedDoctrineValidated = false;
  state.decisions = { advance: 0, confirm: 0, 'send wingman': 0, hold: 0 };
  state.reportTypesSeen = new Set<FeedType>(['Scout report', 'Radio report', 'Visual observation', 'HQ message']);
  state.victoryLogged = false;
  state.failureLogged = false;
  state.lastSpontaneousAt = 0;
  state.pendingSpeech = [];
  state.currentSpeech = null;
  state.audio = { unlocked: state.audio.unlocked, context: state.audio.context, noiseSources: state.audio.noiseSources, ambientTimer: state.audio.ambientTimer };
  seedInitialSelection();
  render();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(text: string) {
  return text.replace(/[&<>'"]/g, (char) => {
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

function artifactFile(key: ArtifactKey) {
  if (key === 'scout-photo') return 'scout_photo.svg';
  if (key === 'radio-transcript') return 'radio_transcript.svg';
  if (key === 'visual-snapshot' || key === 'scope-snapshot') return 'scope_snapshot.svg';
  return 'hq_dispatch.svg';
}

function carrierLabel(key: ArtifactKey) {
  if (key === 'scout-photo') return 'Scout photograph';
  if (key === 'radio-transcript') return 'Radio transcript';
  if (key === 'visual-snapshot' || key === 'scope-snapshot') return 'Scope snapshot';
  return 'HQ dispatch';
}

function unlockAudio() {
  if (state.audio.unlocked) return;
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    state.lastAnnouncement = 'Audio unavailable on this browser.';
    render();
    return;
  }
  const context = new AudioContextCtor();
  state.audio.context = context;
  state.audio.unlocked = true;
  startAmbient(context);
  flushSpeechQueue();
  render();
}

function startAmbient(context: AudioContext) {
  const master = context.createGain();
  master.gain.value = 0.18;
  master.connect(context.destination);

  const engine = context.createOscillator();
  engine.type = 'sawtooth';
  engine.frequency.value = 44;
  const engineFilter = context.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 110;
  const engineGain = context.createGain();
  engineGain.gain.value = 0.03;
  engine.connect(engineFilter).connect(engineGain).connect(master);
  engine.start();

  const windNoise = createNoiseBuffer(context, 2.5);
  const wind = context.createBufferSource();
  wind.buffer = windNoise;
  wind.loop = true;
  const windFilter = context.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 850;
  windFilter.Q.value = 0.7;
  const windGain = context.createGain();
  windGain.gain.value = 0.015;
  wind.connect(windFilter).connect(windGain).connect(master);
  wind.start();

  const staticNoise = createNoiseBuffer(context, 1.5);
  const staticSource = context.createBufferSource();
  staticSource.buffer = staticNoise;
  staticSource.loop = true;
  const staticFilter = context.createBiquadFilter();
  staticFilter.type = 'highpass';
  staticFilter.frequency.value = 1700;
  const staticGain = context.createGain();
  staticGain.gain.value = 0.008;
  staticSource.connect(staticFilter).connect(staticGain).connect(master);
  staticSource.start();

  state.audio.noiseSources = [wind, staticSource];
  state.audio.ambientTimer = window.setInterval(() => triggerArtilleryBurst(context, master), 22000 + Math.random() * 11000);
}

function createNoiseBuffer(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function triggerArtilleryBurst(context: AudioContext, master: GainNode) {
  if (state.phase !== 'live') return;
  const burst = context.createOscillator();
  burst.type = 'sine';
  burst.frequency.setValueAtTime(82, context.currentTime);
  burst.frequency.exponentialRampToValueAtTime(26, context.currentTime + 0.18);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);
  burst.connect(gain).connect(master);
  burst.start();
  burst.stop(context.currentTime + 0.45);
}

function speak(clip: string) {
  if (!clip) return;
  if (!state.audio.unlocked) {
    state.pendingSpeech = [clip];
    return;
  }
  const source = getAudio(clip);
  if (state.currentSpeech) {
    state.currentSpeech.pause();
    state.currentSpeech.currentTime = 0;
  }
  state.currentSpeech = source;
  source.play().catch(() => {
    state.pendingSpeech = [clip];
  });
}

function flushSpeechQueue() {
  const clip = state.pendingSpeech.pop();
  state.pendingSpeech = [];
  if (clip) {
    speak(clip);
  }
}

function getAudio(clip: string) {
  const url = '/tftm/audio/' + clip;
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.volume = 0.96;
  return audio;
}

type KitbashTankRig = {
  turretPivot: THREE.Group;
  cannonPivot: THREE.Group;
  hatch: THREE.Object3D;
  wheels: THREE.Object3D[];
  treadTextures: THREE.CanvasTexture[];
  trackTravel: number;
};

function createProceduralTankPreview(container: HTMLDivElement) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1114, 8, 18);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(4.6, 2.7, 5.2);
  camera.lookAt(0, 0.75, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const rootGroup = new THREE.Group();
  rootGroup.name = 'procedural_threejs_sherman_preview';
  scene.add(rootGroup);

  const runtimeModelGroup = new THREE.Group();
  runtimeModelGroup.name = 'meshy_runtime_sherman_model';
  runtimeModelGroup.visible = false;
  scene.add(runtimeModelGroup);
  const runtimePivots: Record<string, THREE.Object3D | null> = {
    hull_root: null,
    turret_traverse_pivot: null,
    cannon_elevation_pivot: null,
    left_track_motion: null,
    right_track_motion: null,
    roadwheel_groups: null,
    commander_hatch: null
  };
  loadRuntimeTankModel(runtimeModelGroup, runtimePivots, rootGroup);

  const armor = new THREE.MeshStandardMaterial({ color: 0x5f6b49, roughness: 0.76, metalness: 0.28 });
  const armorDark = new THREE.MeshStandardMaterial({ color: 0x2b3428, roughness: 0.9, metalness: 0.18 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111617, roughness: 0.86, metalness: 0.08 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2e3435, roughness: 0.66, metalness: 0.42 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x8a7a51, roughness: 0.94, metalness: 0.02 });
  const hedge = new THREE.MeshStandardMaterial({ color: 0x3f5a35, roughness: 1, metalness: 0 });
  const mud = new THREE.MeshStandardMaterial({ color: 0x30281d, roughness: 1, metalness: 0 });

  addHardSurfaceShermanHull(rootGroup, armor, armorDark, steel);
  addStaticProceduralTankFallback(rootGroup, armor, armorDark, rubber, steel, canvas);
  addHedgerow(scene, hedge);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), mud);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.03;
  ground.receiveShadow = true;
  scene.add(ground);

  const keyLight = new THREE.DirectionalLight(0xfff4d1, 2.4);
  keyLight.position.set(3.5, 5.2, 2.4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  scene.add(new THREE.HemisphereLight(0x98c6d8, 0x241f18, 1.4));

  const resize = () => {
    const width = Math.max(260, container.clientWidth);
    const height = Math.max(210, Math.round(width * 0.58));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  let rotation = -0.44;
  return {
    update(delta: number, posture: Posture) {
      rotation += delta * 0.18;
      rootGroup.rotation.y = rotation;
      runtimeModelGroup.rotation.y = rotation;
      animateRuntimeTankPivots(runtimePivots, delta, posture, state.time);
      camera.position.y = posture === 'optic-scan' ? 2.35 : 2.7;
      camera.lookAt(0, 0.82, 0);
      renderer.render(scene, camera);
    }
  };
}


type TankModelManifest = {
  status?: string;
  runtime?: {
    glb?: string | null;
    classification?: string;
    animation_policy?: string;
    tread_motion?: string;
    disabled_pivots?: string[];
  };
  required_pivots?: string[];
};

function loadRuntimeTankModel(runtimeModelGroup: THREE.Group, runtimePivots: Record<string, THREE.Object3D | null>, fallbackGroup: THREE.Group) {
  fetch(TANK_MODEL_MANIFEST_URL, { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : null)
    .then((manifest: TankModelManifest | null) => {
      const glb = manifest?.runtime?.glb;
      if (!glb || manifest?.status === 'pending_generation') {
        return;
      }
      const loader = new GLTFLoader();
      loader.load(glb, (gltf) => {
        const model = gltf.scene as THREE.Group;
        model.name = 'm4a3_75_vvss_sherman_alpha_glb';
        normalizeRuntimeTankModel(model);
        runtimeModelGroup.add(model);
        bindRuntimeTankPivots(model, runtimePivots, manifest);
        if (manifest?.runtime?.animation_policy === 'hybrid_runtime_supplements_required' || manifest?.runtime?.animation_policy === 'hybrid_static_treads') {
          addHybridRuntimeTankSupplements(runtimeModelGroup, runtimePivots, manifest);
        }
        runtimeModelGroup.visible = true;
        fallbackGroup.visible = false;
      }, undefined, (error) => {
        console.warn('Tank GLB failed to load; keeping procedural fallback.', error);
      });
    })
    .catch((error) => {
      console.warn('Tank model manifest unavailable; keeping procedural fallback.', error);
    });
}


function normalizeRuntimeTankModel(model: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x || 1, size.y || 1, size.z || 1);
  const scale = 4.25 / longest;
  model.scale.setScalar(scale);
  model.position.x = -center.x * scale;
  model.position.y = -center.y * scale + 0.95;
  model.position.z = -center.z * scale;
}

function addHybridRuntimeTankSupplements(runtimeModelGroup: THREE.Group, runtimePivots: Record<string, THREE.Object3D | null>, manifest: TankModelManifest | null) {
  const rig = new THREE.Group();
  rig.name = 'hybrid_runtime_supplemental_animation_rig';
  runtimeModelGroup.add(rig);

  const steel = new THREE.MeshStandardMaterial({ color: 0x303638, roughness: 0.74, metalness: 0.36 });
  const disabledPivots = new Set(manifest?.runtime?.disabled_pivots || []);

  if (manifest?.runtime?.tread_motion === 'static_fused_mesh') {
    runtimePivots.left_track_motion = null;
    runtimePivots.right_track_motion = null;
    runtimePivots.roadwheel_groups = null;
  }

  if (!disabledPivots.has('left_track_motion') || !disabledPivots.has('right_track_motion') || !disabledPivots.has('roadwheel_groups')) {
    console.warn('Tank tread animation requested without a flat belt/material animation path; keeping fused Meshy tracks static.');
  }
  if (!runtimePivots.turret_traverse_pivot) {
    const turretPivot = new THREE.Group();
    turretPivot.name = 'turret_traverse_pivot';
    turretPivot.position.set(-0.12, 1.58, 0);
    rig.add(turretPivot);
    runtimePivots.turret_traverse_pivot = turretPivot;
  }
  if (!runtimePivots.cannon_elevation_pivot) {
    const cannonPivot = new THREE.Group();
    cannonPivot.name = 'cannon_elevation_pivot';
    cannonPivot.position.set(0.28, 1.62, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.35, 10), steel);
    barrel.name = 'hybrid_cannon_elevation_barrel_marker';
    barrel.position.set(0.68, 0, 0);
    barrel.rotation.z = Math.PI / 2;
    cannonPivot.add(barrel);
    rig.add(cannonPivot);
    runtimePivots.cannon_elevation_pivot = cannonPivot;
  }
  if (!runtimePivots.commander_hatch) {
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 12), steel);
    hatch.name = 'commander_hatch';
    hatch.position.set(-0.34, 1.9, 0.24);
    rig.add(hatch);
    runtimePivots.commander_hatch = hatch;
  }
}

function createHybridTrackBand(root: THREE.Group, name: string, z: number, rubber: THREE.Material, steel: THREE.Material) {
  const group = new THREE.Group();
  group.name = name;
  root.add(group);
  const band = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.12, 0.12), rubber);
  band.name = name + '_belt_marker';
  band.position.set(0.1, 0.22, z);
  group.add(band);
  for (let index = 0; index < 14; index += 1) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.16), steel);
    shoe.name = name + '_moving_shoe';
    shoe.position.set(-1.48 + index * 0.23, 0.3, z);
    group.add(shoe);
  }
  return group;
}

function bindRuntimeTankPivots(model: THREE.Object3D, runtimePivots: Record<string, THREE.Object3D | null>, manifest: TankModelManifest | null) {
  const required = manifest?.required_pivots || TANK_MODEL_REQUIRED_PIVOTS;
  for (const pivotName of required) {
    runtimePivots[pivotName] = findTankObject(model, pivotName) || findTankObject(model, pivotName.replace(/_/g, ' '));
  }
  runtimePivots.turret_traverse_pivot ||= findTankObject(model, 'turret');
  runtimePivots.cannon_elevation_pivot ||= findTankObject(model, 'mantlet') || findTankObject(model, 'barrel') || findTankObject(model, 'gun');
  if (!manifest?.runtime?.disabled_pivots?.includes('left_track_motion')) {
    runtimePivots.left_track_motion ||= findTankObject(model, 'left_track') || findTankObject(model, 'left tread') || findTankObject(model, 'track_l');
  }
  if (!manifest?.runtime?.disabled_pivots?.includes('right_track_motion')) {
    runtimePivots.right_track_motion ||= findTankObject(model, 'right_track') || findTankObject(model, 'right tread') || findTankObject(model, 'track_r');
  }
  runtimePivots.commander_hatch ||= findTankObject(model, 'commander') || findTankObject(model, 'hatch');
}

function findTankObject(root: THREE.Object3D, needle: string) {
  const target = needle.toLowerCase();
  let found: THREE.Object3D | null = null;
  root.traverse((object) => {
    if (!found && object.name && object.name.toLowerCase().includes(target)) {
      found = object;
    }
  });
  return found;
}

function animateRuntimeTankPivots(runtimePivots: Record<string, THREE.Object3D | null>, delta: number, posture: Posture, time: number) {
  if (runtimePivots.turret_traverse_pivot) {
    runtimePivots.turret_traverse_pivot.rotation.y = Math.sin(time * 0.35) * 0.2;
  }
  if (runtimePivots.cannon_elevation_pivot) {
    runtimePivots.cannon_elevation_pivot.rotation.z = Math.sin(time * 0.45) * 0.05;
  }
  // The current Meshy phone model is a fused static body. Rotating whole track or
  // roadwheel groups creates a visual sweep behind the gear instead of belt travel.
  if (runtimePivots.commander_hatch) {
    runtimePivots.commander_hatch.rotation.z = posture === 'head-out' ? -0.65 : posture === 'hatch-cracked' ? -0.24 : 0;
  }
}

function createDebugKitbashAnimatableTank(
  rootGroup: THREE.Group,
  armor: THREE.Material,
  armorDark: THREE.Material,
  rubber: THREE.Material,
  steel: THREE.Material,
  canvas: THREE.Material
): KitbashTankRig {
  const turretPivot = new THREE.Group();
  turretPivot.name = 'kitbash_animatable_tank_turret_traverse_pivot';
  turretPivot.position.set(-0.22, 1.68, 0);
  rootGroup.add(turretPivot);

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.82, 0.58, 14), armor);
  turret.name = 'kitbash_turret_shell';
  turret.scale.set(1.15, 0.92, 0.82);
  turret.castShadow = true;
  turretPivot.add(turret);

  const turretCheekLeft = createBox(turretPivot, [0.42, 0.42, 0.42], [0.48, -0.02, 0.38], armor, [0, 0.22, 0]);
  const turretCheekRight = createBox(turretPivot, [0.42, 0.42, 0.42], [0.48, -0.02, -0.38], armor, [0, -0.22, 0]);
  turretCheekLeft.scale.x = 0.72;
  turretCheekRight.scale.x = 0.72;
  const turretBack = createBox(turretPivot, [0.82, 0.46, 0.98], [-0.6, -0.04, 0], armor);
  turretBack.rotation.z = -0.04;

  const cannonPivot = new THREE.Group();
  cannonPivot.name = 'kitbash_animatable_tank_cannon_elevation_pivot';
  cannonPivot.position.set(0.58, 0.04, 0);
  turretPivot.add(cannonPivot);
  const mantlet = createBox(cannonPivot, [0.3, 0.34, 0.62], [0, 0, 0], steel);
  mantlet.rotation.z = 0.03;
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, 2.18, 12), steel);
  gun.name = 'kitbash_75mm_cannon';
  gun.position.set(0.72, 0, 0);
  gun.rotation.z = Math.PI / 2;
  gun.castShadow = true;
  cannonPivot.add(gun);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.073, 0.18, 12), steel);
  muzzle.name = 'kitbash_75mm_muzzle';
  muzzle.position.set(1.8, 0, 0);
  muzzle.rotation.z = Math.PI / 2;
  muzzle.castShadow = true;
  cannonPivot.add(muzzle);

  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 12), steel);
  hatch.name = 'kitbash_commander_hatch';
  hatch.position.set(-0.2, 0.33, 0.22);
  hatch.castShadow = true;
  turretPivot.add(hatch);
  const loaderHatch = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 10), steel);
  loaderHatch.name = 'kitbash_loader_hatch';
  loaderHatch.position.set(0.08, 0.31, -0.38);
  loaderHatch.castShadow = true;
  turretPivot.add(loaderHatch);

  createBox(rootGroup, [0.7, 0.22, 0.34], [-1.32, 1.48, 0.58], canvas, [0, -0.05, 0]);
  const leftTrack = addAnimatedTrack(rootGroup, 0.98, rubber, steel);
  const rightTrack = addAnimatedTrack(rootGroup, -0.98, rubber, steel);
  addStowage(rootGroup, armorDark, canvas);

  return {
    turretPivot,
    cannonPivot,
    hatch,
    wheels: [...leftTrack.wheels, ...rightTrack.wheels],
    treadTextures: [leftTrack.texture, rightTrack.texture],
    trackTravel: 0
  };
}

function addAnimatedTrack(rootGroup: THREE.Group, z: number, rubber: THREE.Material, steel: THREE.Material) {
  const side = z > 0 ? 1 : -1;
  const texture = createTreadScrollTexture();
  const treadMaterial = new THREE.MeshStandardMaterial({ map: texture, color: 0x1a1f1f, roughness: 0.88, metalness: 0.12 });
  createBox(rootGroup, [4.16, 0.18, 0.28], [0, 0.28, z], treadMaterial);
  createBox(rootGroup, [3.66, 0.16, 0.24], [-0.08, 0.74, z], treadMaterial);

  for (let index = 0; index < 16; index += 1) {
    const x = -1.74 + index * 0.23;
    const shoe = createBox(rootGroup, [0.09, 0.052, 0.34], [x, 0.12, z], rubber);
    shoe.rotation.z = index < 2 ? 0.18 : index > 13 ? -0.18 : 0;
    const topShoe = createBox(rootGroup, [0.09, 0.044, 0.31], [x, 0.88, z], rubber);
    topShoe.rotation.z = index < 2 ? -0.14 : index > 13 ? 0.14 : 0;
  }

  const wheels: THREE.Object3D[] = [];
  const sprocket = addWheel(rootGroup, 1.72, 0.49, z + side * 0.18, 0.28, steel, 14);
  const idler = addWheel(rootGroup, -1.78, 0.5, z + side * 0.18, 0.25, steel, 12);
  sprocket.name = z > 0 ? 'kitbash_left_sprocket' : 'kitbash_right_sprocket';
  idler.name = z > 0 ? 'kitbash_left_idler' : 'kitbash_right_idler';
  sprocket.scale.set(1, 1, 0.58);
  idler.scale.set(1, 1, 0.54);
  wheels.push(sprocket, idler);

  for (const bogieX of [-1.02, 0.02, 1.04]) {
    createBox(rootGroup, [0.72, 0.36, 0.16], [bogieX, 0.52, z + side * 0.2], steel);
    createBox(rootGroup, [0.45, 0.18, 0.12], [bogieX, 0.78, z + side * 0.2], steel, [0, 0, 0.12]);
    wheels.push(addWheel(rootGroup, bogieX - 0.18, 0.42, z + side * 0.3, 0.2, steel, 14));
    wheels.push(addWheel(rootGroup, bogieX + 0.18, 0.42, z + side * 0.3, 0.2, steel, 14));
    wheels.push(addWheel(rootGroup, bogieX, 0.82, z + side * 0.27, 0.1, steel, 10));
  }
  return { texture, wheels };
}

function createTreadScrollTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas unavailable for tread texture');
  }
  context.fillStyle = '#101415';
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let x = -16; x < canvas.width + 16; x += 24) {
    context.fillStyle = '#2d3435';
    context.fillRect(x, 5, 10, 54);
    context.fillStyle = '#0a0d0d';
    context.fillRect(x + 13, 0, 3, 64);
  }
  context.strokeStyle = 'rgba(180, 170, 138, 0.16)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, 12);
  context.lineTo(canvas.width, 12);
  context.moveTo(0, 52);
  context.lineTo(canvas.width, 52);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 1);
  return texture;
}

function animateKitbashTankRig(rig: KitbashTankRig, delta: number, posture: Posture, time: number) {
  rig.trackTravel = (rig.trackTravel + delta * 1.9) % 1;
  for (const texture of rig.treadTextures) {
    texture.offset.x = -rig.trackTravel;
  }
  for (const wheel of rig.wheels) {
    wheel.rotation.z -= delta * 3.8;
  }
  rig.turretPivot.rotation.y = Math.sin(time * 0.35) * 0.22;
  rig.cannonPivot.rotation.z = Math.sin(time * 0.48) * 0.07;
  rig.hatch.rotation.z = posture === 'head-out' ? -0.65 : posture === 'hatch-cracked' ? -0.24 : 0;
}

function addStaticProceduralTankFallback(rootGroup: THREE.Group, armor: THREE.Material, armorDark: THREE.Material, rubber: THREE.Material, steel: THREE.Material, canvas: THREE.Material) {
  const alphaDecals = createAlphaDecalMaterials();

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.82, 0.58, 14), armor);
  turret.position.set(-0.22, 1.68, 0);
  turret.scale.set(1.15, 0.92, 0.82);
  turret.castShadow = true;
  rootGroup.add(turret);

  const turretCheekLeft = createBox(rootGroup, [0.42, 0.42, 0.42], [0.26, 1.66, 0.38], armor, [0, 0.22, 0]);
  const turretCheekRight = createBox(rootGroup, [0.42, 0.42, 0.42], [0.26, 1.66, -0.38], armor, [0, -0.22, 0]);
  turretCheekLeft.scale.x = 0.72;
  turretCheekRight.scale.x = 0.72;
  const turretBack = createBox(rootGroup, [0.82, 0.46, 0.98], [-0.82, 1.64, 0], armor);
  turretBack.rotation.z = -0.04;
  const turretStripe = createBox(rootGroup, [0.08, 0.014, 0.9], [-0.16, 1.98, 0], alphaDecals.crimson, [0, 0, 0]);
  turretStripe.castShadow = false;
  const turretA = createDecalPlane(alphaDecals.whiteA, [0.42, 0.36], [0.03, 1.98, 0.44], [-Math.PI / 2, 0, -0.08]);
  rootGroup.add(turretA);

  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, 2.18, 12), steel);
  gun.position.set(0.98, 1.72, 0);
  gun.rotation.z = Math.PI / 2;
  gun.castShadow = true;
  rootGroup.add(gun);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.073, 0.18, 12), steel);
  muzzle.position.set(2.08, 1.72, 0);
  muzzle.rotation.z = Math.PI / 2;
  muzzle.castShadow = true;
  rootGroup.add(muzzle);
  const mantlet = createBox(rootGroup, [0.3, 0.34, 0.62], [0.36, 1.72, 0], steel);
  mantlet.rotation.z = 0.03;

  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 12), steel);
  hatch.position.set(-0.42, 2.01, 0.22);
  hatch.castShadow = true;
  rootGroup.add(hatch);
  const loaderHatch = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 10), steel);
  loaderHatch.position.set(-0.14, 1.99, -0.38);
  loaderHatch.castShadow = true;
  rootGroup.add(loaderHatch);

  createBox(rootGroup, [0.7, 0.22, 0.34], [-1.32, 1.48, 0.58], canvas, [0, -0.05, 0]);
  addTrack(rootGroup, 0.98, rubber, steel);
  addTrack(rootGroup, -0.98, rubber, steel);
  addStowage(rootGroup, armorDark, canvas);
}

function addHardSurfaceShermanHull(rootGroup: THREE.Group, armor: THREE.Material, armorDark: THREE.Material, steel: THREE.Material) {
  createBox(rootGroup, [4.18, 0.38, 1.56], [0, 0.72, 0], armorDark);
  createBox(rootGroup, [3.74, 0.34, 1.42], [-0.12, 1.1, 0], armor);
  createBox(rootGroup, [3.86, 0.18, 0.2], [-0.12, 1.24, 0.82], armorDark);
  createBox(rootGroup, [3.86, 0.18, 0.2], [-0.12, 1.24, -0.82], armorDark);

  const glacis = createBox(rootGroup, [0.9, 0.2, 1.34], [1.58, 1.27, 0], armor, [0, 0, -0.42]);
  glacis.scale.y = 1.1;
  const lowerNose = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.42, 14), armorDark);
  lowerNose.position.set(1.92, 0.82, 0);
  lowerNose.rotation.x = Math.PI / 2;
  lowerNose.scale.x = 0.78;
  lowerNose.castShadow = true;
  rootGroup.add(lowerNose);

  createBox(rootGroup, [0.48, 0.28, 1.22], [-1.9, 1.14, 0], armorDark, [0, 0, 0.18]);
  createBox(rootGroup, [1.36, 0.1, 1.02], [-1.28, 1.42, 0], armorDark);
  for (let index = 0; index < 5; index += 1) {
    createBox(rootGroup, [0.12, 0.035, 0.9], [-1.76 + index * 0.24, 1.51, 0], steel);
  }

  createBox(rootGroup, [0.18, 0.11, 0.18], [1.32, 1.5, 0.5], steel);
  createBox(rootGroup, [0.18, 0.11, 0.18], [1.32, 1.5, -0.5], steel);
  const bowMg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.34, 8), steel);
  bowMg.position.set(1.73, 1.08, -0.46);
  bowMg.rotation.z = Math.PI / 2;
  bowMg.castShadow = true;
  rootGroup.add(bowMg);
}

function addTrack(rootGroup: THREE.Group, z: number, rubber: THREE.Material, steel: THREE.Material) {
  const side = z > 0 ? 1 : -1;
  createBox(rootGroup, [4.16, 0.18, 0.28], [0, 0.28, z], rubber);
  createBox(rootGroup, [3.66, 0.16, 0.24], [-0.08, 0.74, z], rubber);

  for (let index = 0; index < 22; index += 1) {
    const x = -1.92 + index * 0.18;
    const shoe = createBox(rootGroup, [0.12, 0.08, 0.34], [x, 0.14, z], rubber);
    shoe.rotation.z = index < 2 ? 0.24 : index > 19 ? -0.24 : 0;
    const topShoe = createBox(rootGroup, [0.12, 0.06, 0.31], [x, 0.86, z], rubber);
    topShoe.rotation.z = index < 2 ? -0.18 : index > 19 ? 0.18 : 0;
  }

  const sprocket = addWheel(rootGroup, 1.72, 0.49, z + side * 0.18, 0.28, steel, 14);
  const idler = addWheel(rootGroup, -1.78, 0.5, z + side * 0.18, 0.25, steel, 12);
  sprocket.scale.set(1, 1, 0.58);
  idler.scale.set(1, 1, 0.54);

  for (const bogieX of [-1.02, 0.02, 1.04]) {
    createBox(rootGroup, [0.72, 0.36, 0.16], [bogieX, 0.52, z + side * 0.2], steel);
    createBox(rootGroup, [0.45, 0.18, 0.12], [bogieX, 0.78, z + side * 0.2], steel, [0, 0, 0.12]);
    addWheel(rootGroup, bogieX - 0.18, 0.42, z + side * 0.3, 0.2, steel, 14);
    addWheel(rootGroup, bogieX + 0.18, 0.42, z + side * 0.3, 0.2, steel, 14);
    addWheel(rootGroup, bogieX, 0.82, z + side * 0.27, 0.1, steel, 10);
  }
}

function addStowage(rootGroup: THREE.Group, armorDark: THREE.Material, canvas: THREE.Material) {
  const boxes = [
    { x: -1.28, y: 1.28, z: -0.58, sx: 0.42, sy: 0.24, sz: 0.22, material: armorDark },
    { x: -0.74, y: 1.3, z: -0.6, sx: 0.42, sy: 0.22, sz: 0.2, material: canvas },
    { x: 0.98, y: 1.31, z: 0.6, sx: 0.5, sy: 0.18, sz: 0.16, material: canvas }
  ];

  for (const box of boxes) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(box.sx, box.sy, box.sz), box.material);
    mesh.position.set(box.x, box.y, box.z);
    mesh.castShadow = true;
    rootGroup.add(mesh);
  }
}

function createBox(
  rootGroup: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0]
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  rootGroup.add(mesh);
  return mesh;
}

function addWheel(rootGroup: THREE.Group, x: number, y: number, z: number, radius: number, material: THREE.Material, segments: number) {
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.09, segments), material);
  wheel.position.set(x, y, z);
  wheel.rotation.x = Math.PI / 2;
  wheel.castShadow = true;
  rootGroup.add(wheel);
  return wheel;
}

function createAlphaDecalMaterials() {
  const crimson = new THREE.MeshBasicMaterial({ color: 0x5d161a, side: THREE.DoubleSide });
  const whiteA = new THREE.MeshBasicMaterial({
    map: createLetterTexture('A'),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  return { crimson, whiteA };
}

function createLetterTexture(letter: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas unavailable for tank decal texture');
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(226, 222, 205, 0.94)';
  context.font = 'bold 204px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(letter, 128, 142);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createDecalPlane(material: THREE.Material, size: [number, number], position: [number, number, number], rotation: [number, number, number]) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
  plane.position.set(position[0], position[1], position[2]);
  plane.rotation.set(rotation[0], rotation[1], rotation[2]);
  plane.castShadow = false;
  return plane;
}

function addHedgerow(scene: THREE.Scene, hedge: THREE.Material) {
  for (let index = 0; index < 10; index += 1) {
    const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 + (index % 3) * 0.05, 1), hedge);
    clump.position.set(-3.6 + index * 0.82, 0.58, -2.1 - (index % 2) * 0.18);
    clump.scale.set(1.45, 1.05, 0.74);
    clump.castShadow = true;
    scene.add(clump);
  }
}
