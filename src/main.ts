import './styles.css';

type FeedType = 'Scout report' | 'Radio report' | 'Visual observation' | 'HQ message';
type Assessment = 'incomplete' | 'stale' | 'wrong' | 'solid';
type DecisionKey = 'advance' | 'confirm' | 'send wingman' | 'hold';
type Phase = 'live' | 'victory' | 'failure';
type ArtifactKey = 'scout-photo' | 'radio-transcript' | 'visual-snapshot' | 'hq-dispatch';
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
  { key: 'advance', label: 'Advance', hotkey: 'A' },
  { key: 'confirm', label: 'Confirm', hotkey: 'B' },
  { key: 'send wingman', label: 'Send wingman', hotkey: 'C' },
  { key: 'hold', label: 'Hold', hotkey: 'D' }
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
  <div class="feed-app">
    <header class="masthead">
      <div class="masthead-copy">
        <p class="eyebrow">WWDD validation required</p>
        <h1>The Feed Is The Battlefield</h1>
        <p class="lede">Reports arrive as Cartesia voice barks, paper, film, and delay. The player spends most of their time interpreting claims rather than directly observing reality.</p>
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
      <section class="panel feed-panel">
        <div class="panel-head">
          <div>
            <h2>Live Feed</h2>
            <p class="panel-subtitle">Claims keep arriving. Older claims keep aging. Attention is the resource.</p>
          </div>
          <span class="pill" data-feed-count></span>
        </div>
        <div class="feed-stream" data-feed-stream></div>
      </section>

      <section class="panel command-panel">
        <div class="panel-head">
          <div>
            <h2>Command Options</h2>
            <p class="panel-subtitle">Concise choices resolve the selected report and change outcomes.</p>
          </div>
        </div>
        <article class="active-report" data-active-report></article>
        <div class="decision-grid" data-decision-grid></div>
        <div class="command-note" data-command-note></div>
      </section>

      <section class="panel memory-panel">
        <div class="panel-head">
          <div>
            <h2>Memory</h2>
            <p class="panel-subtitle">Major mistakes resolve into original report, reality, consequence, and lesson.</p>
          </div>
        </div>
        <div class="memory-feed" data-memory-feed></div>
      </section>
    </main>

    <footer class="footer">
      <span class="footer-chip">A / B / C / D resolve the selected report.</span>
      <span class="footer-chip">Unresolved reports stay live and keep aging.</span>
      <span class="footer-chip">The feed interrupts the player.</span>
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
  feedCount: shell.querySelector<HTMLSpanElement>('[data-feed-count]')!,
  feedStream: shell.querySelector<HTMLDivElement>('[data-feed-stream]')!,
  activeReport: shell.querySelector<HTMLDivElement>('[data-active-report]')!,
  decisionGrid: shell.querySelector<HTMLDivElement>('[data-decision-grid]')!,
  commandNote: shell.querySelector<HTMLDivElement>('[data-command-note]')!,
  memoryFeed: shell.querySelector<HTMLDivElement>('[data-memory-feed]')!,
  audioWake: shell.querySelector<HTMLButtonElement>('[data-audio-wake]')!
};

const state: FeedState = {
  phase: 'live',
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

  document.body.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const card = target?.closest<HTMLElement>('[data-report-id]');
    if (!card) return;
    const id = card.dataset.reportId;
    if (!id) return;
    state.selectedReportId = id;
    render();
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
    state.lastAnnouncement = 'No active report to resolve.';
    return;
  }

  const outcome = resolveReport(report, decision);
  state.decisions[decision] += 1;
  state.turnCount += 1;
  state.selectedReportId = pickNextReportId();
  state.lastAnnouncement = outcome.announcement;
  maybeTransition();
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
    addMemoryEvent(outcome.memory, outcome.clip);
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
      announcement = 'False picture caught before it drove the platoon.';
      text = 'The report was wrong, and the confirmation kept the feed honest.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the visual picture was a hidden anti-tank gun.',
        consequence: 'Consequence: the commander avoided a bad advance and kept the platoon alive.',
        lesson: 'Lesson: a clean-looking visual can still be a lie.',
        clip: 'memory-the-feed-was-wrong.mp3'
      };
      clip = 'memory-the-feed-was-wrong.mp3';
    } else {
      scoreDelta = -2;
      attentionDelta = -1.4;
      pressureDelta = 1.2;
      announcement = 'Wrong report acted on too early.';
      text = 'The feed was mistaken and the rushed order paid for it.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the picture was incomplete and the enemy was not where the report implied.',
        consequence: 'Consequence: the platoon spent attention and tempo on a false lead.',
        lesson: 'Lesson: the first report is not the truth; it is only the first claim.',
        clip: 'memory-original-report.mp3'
      };
    }
  } else if (category === 'incomplete') {
    if (decision === 'confirm' || decision === 'send wingman') {
      scoreDelta = 2;
      attentionDelta = 0.3;
      pressureDelta = -0.2;
      announcement = 'Incomplete report forced a useful second look.';
      text = 'The gap in the picture was treated as a signal, not a finish.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the report was incomplete, so the commander waited for more evidence.',
        consequence: 'Consequence: the feed grew clearer before action.',
        lesson: 'Lesson: incomplete is not useless; it is a prompt to confirm.',
        clip: 'memory-original-report.mp3'
      };
    } else if (decision === 'advance') {
      scoreDelta = stale ? -1 : 0;
      attentionDelta = -0.8;
      pressureDelta = 0.9;
      announcement = 'Advance outran the picture.';
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
      announcement = 'Holding bought time for the feed to breathe.';
      text = 'The pause kept the incomplete report from becoming a trap.';
    }
  } else if (category === 'stale') {
    if (decision === 'hold' || decision === 'confirm') {
      scoreDelta = 2;
      attentionDelta = 0.5;
      pressureDelta = -0.6;
      announcement = 'Stale report treated as stale, not sacred.';
      text = 'The age on the report mattered more than the drama in the wording.';
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
      announcement = 'Stale report pushed into action.';
      text = 'The feed was late and the rushed choice made the lag expensive.';
      memory = {
        time: state.time,
        original: `Original Report: ${report.content}`,
        reality: 'Reality: the report was already stale by the time the order went out.',
        consequence: 'Consequence: the platoon moved on old information.',
        lesson: 'Lesson: the feed must be timed, not merely read.',
        clip: 'memory-original-report.mp3'
      };
    }
  } else {
    if (decision === 'advance') {
      scoreDelta = fresh ? 3 : 2;
      attentionDelta = 0.5;
      pressureDelta = -0.7;
      announcement = 'Solid report converted into action.';
      text = 'The feed supported the move and the commander used it.';
    } else if (decision === 'confirm') {
      scoreDelta = 1;
      attentionDelta = 0.6;
      pressureDelta = -0.2;
      announcement = 'Confirmation strengthened an already decent picture.';
      text = 'The report held up under one more look.';
    } else if (decision === 'send wingman') {
      scoreDelta = 0;
      attentionDelta = 0.2;
      pressureDelta = 0.2;
      announcement = 'Wingman sent to recheck a report that was already good enough.';
      text = 'The extra check cost attention without buying much clarity.';
    } else {
      scoreDelta = 1;
      attentionDelta = 0.8;
      pressureDelta = -0.3;
      announcement = 'Holding preserved the option to act later.';
      text = 'The report was solid, but the commander bought more time instead of spending it.';
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
  state.lastAnnouncement = 'Cross-check generated a new report instead of a map.';
  speak(followup.clip);
}

function maybeSpontaneousCommentary() {
  if (state.time - state.lastSpontaneousAt < 6) return;
  const unresolved = state.reports.filter((item) => !item.resolved).length;
  if (unresolved >= 3) {
    state.lastSpontaneousAt = state.time;
    state.lastAnnouncement = 'The feed is stacking up and attention is the only thing that runs out first.';
  }
}

function maybeTransition() {
  if (state.phase !== 'live') return;
  if (state.attention <= 0 || state.pressure >= 10) {
    state.phase = 'failure';
    if (!state.failureLogged) {
      state.failureLogged = true;
      state.lastAnnouncement = 'Attention collapsed. The feed outran the commander.';
      addMemoryEvent({
        time: state.time,
        original: 'Original Report: Too many reports unresolved at once.',
        reality: 'Reality: the commander lost the picture in the backlog.',
        consequence: 'Consequence: the feed became noise and the run failed.',
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
      state.lastAnnouncement = 'The commander learned to work the feed instead of the map.';
      addMemoryEvent({
        time: state.time,
        original: 'Original Report: The feed kept arriving.',
        reality: 'Reality: the commander learned to trust confirmation over instinct.',
        consequence: 'Consequence: the run stabilized and the barrage of claims became usable.',
        lesson: 'Lesson: the battlefield was the feed.',
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
  refs.status.textContent = state.phase === 'live' ? 'Live feed' : state.phase === 'victory' ? 'Command won the feed' : 'Feed collapse';
  refs.status.className = 'metric ' + (state.phase === 'live' ? 'live' : state.phase === 'victory' ? 'victory' : 'failure');
  refs.doctrine.textContent = 'The Feed Is The Battlefield';
  refs.attention.textContent = 'Attention ' + state.attention.toFixed(1) + ' / 10';
  refs.score.textContent = 'Score ' + state.score.toFixed(0) + ' · Pressure ' + state.pressure.toFixed(1);
  refs.feedCount.textContent = state.reports.filter((report) => !report.resolved).length + ' unresolved';
  refs.feedStream.innerHTML = renderFeed();
  refs.activeReport.innerHTML = renderActiveReport(activeReport);
  refs.commandNote.textContent = state.lastAnnouncement;
  refs.memoryFeed.innerHTML = renderMemoryFeed();
  refs.audioWake.textContent = state.audio.unlocked ? 'Radio net awake' : 'Wake radio net';
  refs.audioWake.disabled = state.audio.unlocked;
}

function renderFeed() {
  const ordered = [...state.reports].sort((a, b) => b.createdAt - a.createdAt);
  if (ordered.length === 0) {
    return '<div class="empty-state">The feed is empty. It will not stay that way for long.</div>';
  }
  return ordered.map((report) => {
    const selected = report.id === state.selectedReportId;
    const status = report.resolved ? 'resolved' : getReportStatus(report);
    const age = Math.max(0, state.time - report.createdAt);
    return `
      <button class="report-card ${selected ? 'selected' : ''} ${status}" data-report-id="${report.id}" type="button">
        <div class="report-artifact artifact-${report.artifact}">
          <img src="/tftm/evidence/${artifactFile(report.artifact)}" alt="${escapeHtml(report.type)} carrier" loading="lazy" />
          <span class="artifact-label">${escapeHtml(carrierLabel(report.artifact))}</span>
        </div>
        <div class="report-topline">
          <strong>${escapeHtml(report.type)}</strong>
          <span>${escapeHtml(report.source)}</span>
        </div>
        <p class="report-content">${escapeHtml(report.content)}</p>
        <div class="report-meta">
          <span>source ${escapeHtml(report.source)}</span>
          <span>confidence ${Math.round(report.confidence * 100)}%</span>
          <span>age ${formatAge(age)}</span>
        </div>
        <div class="report-tags">
          <span class="tag">${escapeHtml(status)}</span>
          <span class="tag muted">${report.resolved ? 'resolved' : report.voice}</span>
        </div>
      </button>
    `;
  }).join('');
}

function renderActiveReport(report: Report | null) {
  if (!report) {
    return '<div class="empty-state">No active report selected.</div>';
  }
  const age = Math.max(0, state.time - report.createdAt);
  return `
    <div class="active-card ${report.resolved ? 'resolved' : getReportStatus(report)}">
      <div class="report-artifact artifact-${report.artifact} active-artifact">
        <img src="/tftm/evidence/${artifactFile(report.artifact)}" alt="${escapeHtml(report.type)} carrier" loading="lazy" />
        <span class="artifact-label">${escapeHtml(carrierLabel(report.artifact))}</span>
      </div>
      <div class="report-topline">
        <strong>Selected report</strong>
        <span>${escapeHtml(report.id)}</span>
      </div>
      <h3>${escapeHtml(report.type)}</h3>
      <p class="report-content">${escapeHtml(report.content)}</p>
      <dl class="active-details">
        <div><dt>Source</dt><dd>${escapeHtml(report.source)}</dd></div>
        <div><dt>Confidence</dt><dd>${Math.round(report.confidence * 100)}%</dd></div>
        <div><dt>Age</dt><dd>${formatAge(age)}</dd></div>
        <div><dt>Assessment</dt><dd>${escapeHtml(getReportStatus(report))}</dd></div>
      </dl>
    </div>
  `;
}

function renderMemoryFeed() {
  if (state.memoryEvents.length === 0) {
    return '<div class="empty-state">No memory report yet. Make a major mistake or stabilize the feed to produce one.</div>';
  }
  return state.memoryEvents.map((event) => `
    <article class="memory-card">
      <img src="/tftm/evidence/${artifactFile('hq-dispatch') }" alt="after-action sheet" class="memory-image" />
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

function restart() {
  state.phase = 'live';
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
  state.lastAnnouncement = 'Mission restarted. The feed is live again.';
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
  if (key === 'visual-snapshot') return 'scope_snapshot.svg';
  return 'hq_dispatch.svg';
}

function carrierLabel(key: ArtifactKey) {
  if (key === 'scout-photo') return 'Scout photograph';
  if (key === 'radio-transcript') return 'Radio transcript';
  if (key === 'visual-snapshot') return 'Scope snapshot';
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

function renderMemoryCard(event: MemoryEvent) {
  return `
    <article class="memory-card">
      <img src="/tftm/evidence/hq_dispatch.svg" alt="After-action sheet" class="memory-image" />
      <span class="memory-time">${formatAge(state.time - event.time)} old</span>
      <p><strong>${escapeHtml(event.original)}</strong></p>
      <p>${escapeHtml(event.reality)}</p>
      <p>${escapeHtml(event.consequence)}</p>
      <p>${escapeHtml(event.lesson)}</p>
    </article>
  `;
}