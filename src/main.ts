import './styles.css';

type FeedType = 'Scout report' | 'Radio report' | 'Visual observation' | 'HQ message';
type Assessment = 'incomplete' | 'stale' | 'wrong' | 'solid';
type DecisionKey = 'advance' | 'confirm' | 'send wingman' | 'hold';
type Phase = 'live' | 'victory' | 'failure';

type Report = {
  id: string;
  type: FeedType;
  source: string;
  confidence: number;
  createdAt: number;
  content: string;
  assessment: Assessment;
  resolved: boolean;
  resolvedAt: number | null;
  decision: DecisionKey | null;
  outcome: string;
};

type MemoryEvent = {
  time: number;
  text: string;
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
};

type DecisionOption = {
  key: DecisionKey;
  label: string;
  hotkey: string;
};

const REPORT_TYPES: FeedType[] = ['Scout report', 'Radio report', 'Visual observation', 'HQ message'];
const DECISIONS: DecisionOption[] = [
  { key: 'advance', label: 'Advance immediately', hotkey: 'A' },
  { key: 'confirm', label: 'Request confirmation', hotkey: 'B' },
  { key: 'send wingman', label: 'Send wingman', hotkey: 'C' },
  { key: 'hold', label: 'Hold position', hotkey: 'D' }
];

let nextReportId = 1;

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
        <p class="lede">The player spends most of their time interpreting reports rather than directly observing reality.</p>
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
            <p class="panel-subtitle">Claims keep arriving. Old ones keep aging. Attention is the resource.</p>
          </div>
          <span class="pill" data-feed-count></span>
        </div>
        <div class="feed-stream" data-feed-stream></div>
      </section>

      <section class="panel command-panel">
        <div class="panel-head">
          <div>
            <h2>Command Options</h2>
            <p class="panel-subtitle">Multiple-choice orders resolve the selected report.</p>
          </div>
        </div>
        <article class="active-report" data-active-report></article>
        <div class="decision-grid" data-decision-grid></div>
        <div class="command-note" data-command-note></div>
      </section>

      <section class="panel validation-panel">
        <div class="panel-head">
          <div>
            <h2>WWDD Validation</h2>
            <p class="panel-subtitle">Green only if the feed itself becomes the gameplay surface.</p>
          </div>
        </div>
        <dl class="validation-grid">
          <div>
            <dt>Status</dt>
            <dd data-validation-status></dd>
          </div>
          <div>
            <dt>Doctrine</dt>
            <dd data-validation-doctrine></dd>
          </div>
          <div>
            <dt>Feed Types Implemented</dt>
            <dd data-validation-types></dd>
          </div>
          <div>
            <dt>Player Decisions</dt>
            <dd data-validation-decisions></dd>
          </div>
          <div>
            <dt>False Report Present</dt>
            <dd data-validation-false></dd>
          </div>
          <div>
            <dt>Memory Event Produced</dt>
            <dd data-validation-memory></dd>
          </div>
          <div>
            <dt>Commit</dt>
            <dd data-validation-commit></dd>
          </div>
        </dl>
        <div class="memory-feed" data-memory-feed></div>
      </section>
    </main>

    <footer class="footer">
      <span class="footer-chip">A / B / C / D resolve the selected report.</span>
      <span class="footer-chip">Unresolved reports stay live and keep aging.</span>
      <span class="footer-chip">Attention collapses first; reality comes later.</span>
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
  activeReport: shell.querySelector<HTMLElement>('[data-active-report]')!,
  decisionGrid: shell.querySelector<HTMLDivElement>('[data-decision-grid]')!,
  commandNote: shell.querySelector<HTMLDivElement>('[data-command-note]')!,
  validationStatus: shell.querySelector<HTMLElement>('[data-validation-status]')!,
  validationDoctrine: shell.querySelector<HTMLElement>('[data-validation-doctrine]')!,
  validationTypes: shell.querySelector<HTMLElement>('[data-validation-types]')!,
  validationDecisions: shell.querySelector<HTMLElement>('[data-validation-decisions]')!,
  validationFalse: shell.querySelector<HTMLElement>('[data-validation-false]')!,
  validationMemory: shell.querySelector<HTMLElement>('[data-validation-memory]')!,
  validationCommit: shell.querySelector<HTMLElement>('[data-validation-commit]')!,
  memoryFeed: shell.querySelector<HTMLDivElement>('[data-memory-feed]')!
};

const state: FeedState = {
  phase: 'live',
  time: 0,
  score: 0,
  attention: 6,
  pressure: 0,
  turnCount: 0,
  selectedReportId: null,
  nextReportAt: 1.5,
  nextReportIndex: 0,
  reports: buildInitialReports(),
  memoryEvents: [],
  lastAnnouncement: 'Mission start. The feed is already active.',
  falseReportPresent: true,
  fedDoctrineValidated: false,
  decisions: {
    advance: 0,
    confirm: 0,
    'send wingman': 0,
    hold: 0
  },
  reportTypesSeen: new Set<FeedType>(REPORT_TYPES),
  victoryLogged: false,
  failureLogged: false,
  lastSpontaneousAt: 0
};

nextReportId = state.reports.length + 1;
seedInitialSelection();
bindControls();
render();
requestAnimationFrame(tick);

function buildInitialReports(): Report[] {
  return [
    createReport({
      type: 'Scout report',
      source: 'Scout Team Blue',
      confidence: 0.62,
      content: 'Scout says the orchard edge may hide armor. The hedge breaks the silhouette, so the picture is incomplete.',
      assessment: 'incomplete'
    }, 0),
    createReport({
      type: 'Radio report',
      source: 'Relay Net',
      confidence: 0.43,
      content: 'Wingman reports movement on the left track. The message arrived late enough to be stale on arrival.',
      assessment: 'stale'
    }, 0),
    createReport({
      type: 'Visual observation',
      source: 'Command binoculars',
      confidence: 0.71,
      content: 'A muzzle flash or a fence post. The glass says one thing and the dust says another.',
      assessment: 'wrong'
    }, 0),
    createReport({
      type: 'HQ message',
      source: 'Battalion HQ',
      confidence: 0.89,
      content: 'Hold until the picture is clear. Do not spend attention on every blur in the hedgerow.',
      assessment: 'solid'
    }, 0)
  ];
}

function createReport(
  input: Omit<Report, 'id' | 'resolved' | 'resolvedAt' | 'decision' | 'outcome'>,
  createdAt = state.time
): Report {
  const id = 'R' + String(nextReportId++).padStart(3, '0');
  return {
    id,
    type: input.type,
    source: input.source,
    confidence: clamp(input.confidence, 0, 1),
    createdAt,
    content: input.content,
    assessment: input.assessment,
    resolved: false,
    resolvedAt: null,
    decision: null,
    outcome: ''
  };
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

  window.addEventListener('keydown', (event) => {
    if (state.phase !== 'live') {
      if (event.key.toLowerCase() === 'r') {
        restart();
      }
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
    if (!card) {
      return;
    }
    const reportId = card.dataset.reportId;
    if (!reportId) {
      return;
    }
    state.selectedReportId = reportId;
    render();
  });
}

function seedInitialSelection() {
  const unresolved = state.reports.find((report) => !report.resolved);
  state.selectedReportId = unresolved ? unresolved.id : null;
}

let lastTick = 0;
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
    if (report.resolved) {
      continue;
    }
    const age = state.time - report.createdAt;
    if (age > 10 && report.assessment === 'incomplete') {
      report.assessment = 'stale';
    }
    if (age > 12 && report.assessment === 'solid') {
      report.assessment = 'stale';
    }
  }
}

function drainAttention(delta: number) {
  const unresolved = state.reports.filter((report) => !report.resolved).length;
  state.pressure = clamp(state.pressure + unresolved * delta * 0.045, 0, 10);
  const drain = 0.06 + unresolved * 0.03 + state.pressure * 0.01;
  state.attention = clamp(state.attention - drain * delta, 0, 10);
}

function maybeSpawnReport() {
  if (state.time < state.nextReportAt || state.phase !== 'live') {
    return;
  }

  const report = createFeedReport(state.nextReportIndex);
  state.nextReportIndex += 1;
  state.reports.unshift(report);
  state.reportTypesSeen.add(report.type);
  state.selectedReportId = report.id;
  state.lastAnnouncement = report.source + ' pushes a new claim into the feed.';

  const unresolved = state.reports.filter((item) => !item.resolved).length;
  const pressureDelay = unresolved >= 4 ? 2.2 : 3.6;
  const cadence = clamp(pressureDelay - state.pressure * 0.12, 1.8, 4.4);
  state.nextReportAt = state.time + cadence;
}

function createFeedReport(index: number): Report {
  const type = REPORT_TYPES[index % REPORT_TYPES.length];
  const templates: Record<FeedType, Array<Omit<Report, 'id' | 'resolved' | 'resolvedAt' | 'decision' | 'outcome'>>> = {
    'Scout report': [
      {
        type,
        source: 'Scout Team Echo',
        confidence: 0.58,
        content: 'Scout says a boxy shape may be behind the orchard fence, but the hedge still cuts the lane.',
        assessment: 'incomplete'
      },
      {
        type,
        source: 'Scout Team Able',
        confidence: 0.67,
        content: 'Scout claims the left shoulder is clear enough for a short push, though the view is still partial.',
        assessment: 'solid'
      }
    ],
    'Radio report': [
      {
        type,
        source: 'Relay Net',
        confidence: 0.46,
        content: 'Radio says movement was seen on the old track, but the message has already gone soft and late.',
        assessment: 'stale'
      },
      {
        type,
        source: 'Wingman Net',
        confidence: 0.63,
        content: 'Wingman reports a careful pause on the right flank. The net is clear, but the picture is still narrow.',
        assessment: 'incomplete'
      }
    ],
    'Visual observation': [
      {
        type,
        source: 'Command binoculars',
        confidence: 0.72,
        content: 'A muzzle flash or a fence post. The dust line makes the object look convincing and maybe wrong.',
        assessment: 'wrong'
      },
      {
        type,
        source: 'Gunner sight',
        confidence: 0.81,
        content: 'Scope picture looks clean enough to act on, but only if the feed is still fresh when you choose.',
        assessment: 'solid'
      }
    ],
    'HQ message': [
      {
        type,
        source: 'Battalion HQ',
        confidence: 0.9,
        content: 'Hold until the picture is clear. HQ is late enough that the line may already have changed.',
        assessment: 'stale'
      },
      {
        type,
        source: 'Battalion HQ',
        confidence: 0.92,
        content: 'Advance on the verified lane. Two reports now point the same way, so the feed can support action.',
        assessment: 'solid'
      }
    ]
  };
  const pool = templates[type];
  const template = pool[index % pool.length];
  return createReport(template, state.time + 0.3);
}

function chooseDecision(decision: DecisionKey) {
  if (state.phase !== 'live') {
    return;
  }
  const report = getActiveReport();
  if (!report || report.resolved) {
    state.lastAnnouncement = 'No active report to resolve.';
    return;
  }

  resolveReport(report, decision);
  state.decisions[decision] += 1;
  state.turnCount += 1;
  state.selectedReportId = pickNextReportId();
  maybeRecordMemory(report, decision);
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
  state.lastAnnouncement = outcome.announcement;
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

  if (category === 'wrong') {
    if (decision === 'confirm' || decision === 'hold') {
      scoreDelta = 2;
      attentionDelta = 0.7;
      pressureDelta = -0.5;
      announcement = 'False picture caught before it drove the platoon.';
      text = 'The report was wrong, and the confirmation kept the feed honest.';
    } else {
      scoreDelta = -2;
      attentionDelta = -1.4;
      pressureDelta = 1.2;
      announcement = 'Wrong report acted on too early.';
      text = 'The feed was mistaken and the rushed order paid for it.';
    }
  } else if (category === 'incomplete') {
    if (decision === 'confirm' || decision === 'send wingman') {
      scoreDelta = 2;
      attentionDelta = 0.3;
      pressureDelta = -0.2;
      announcement = 'Incomplete report forced a useful second look.';
      text = 'The gap in the picture was treated as a signal, not a finish.';
    } else if (decision === 'advance') {
      scoreDelta = stale ? -1 : 0;
      attentionDelta = -0.8;
      pressureDelta = 0.9;
      announcement = 'Advance outran the picture.';
      text = 'The commander moved on a report that had not finished talking.';
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
    } else {
      scoreDelta = -1;
      attentionDelta = -1.1;
      pressureDelta = 0.8;
      announcement = 'Stale report pushed into action.';
      text = 'The feed was late and the rushed choice made the lag expensive.';
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

  if (decision === 'send wingman') {
    spawnFollowupReport(report);
  }

  return { scoreDelta, attentionDelta, pressureDelta, announcement, text };
}

function spawnFollowupReport(sourceReport: Report) {
  const followupType: FeedType = sourceReport.type === 'Scout report' ? 'Radio report' : 'Scout report';
  const followup = createReport({
    type: followupType,
    source: sourceReport.type === 'Scout report' ? 'Wingman Sherman' : 'Scout Team Blue',
    confidence: clamp(sourceReport.confidence + 0.12, 0, 1),
    content: 'Follow-up arrives because the commander spent attention to cross-check the first claim.',
    assessment: sourceReport.assessment === 'wrong' ? 'incomplete' : 'solid'
  }, state.time + 0.3);
  state.reports.unshift(followup);
  state.reportTypesSeen.add(followup.type);
  state.lastAnnouncement = 'Cross-check generated a new report instead of a map.';
}

function maybeRecordMemory(report: Report, decision: DecisionKey) {
  const resolvedCount = state.reports.filter((item) => item.resolved).length;
  const wrongCaught = report.assessment === 'wrong' && (decision === 'confirm' || decision === 'hold');
  const pattern = decision === 'confirm' && resolvedCount >= 2;
  const backlog = state.reports.filter((item) => !item.resolved).length >= 4;

  if (wrongCaught) {
    addMemoryEvent('Memory: the commander stopped trusting the first clean-looking visual when the feed said the picture was unstable.');
  } else if (pattern && !state.fedDoctrineValidated) {
    state.fedDoctrineValidated = true;
    addMemoryEvent('Memory: confirmation is becoming a habit, which is exactly what the feed asked for.');
  } else if (backlog) {
    addMemoryEvent('Memory: unresolved reports are now competing for attention instead of waiting politely.');
  }
}

function addMemoryEvent(text: string) {
  const event = { time: state.time, text };
  const last = state.memoryEvents[0];
  if (!last || last.text !== text) {
    state.memoryEvents.unshift(event);
    while (state.memoryEvents.length > 5) {
      state.memoryEvents.pop();
    }
  }
}

function maybeSpontaneousCommentary() {
  if (state.time - state.lastSpontaneousAt < 6) {
    return;
  }
  const unresolved = state.reports.filter((item) => !item.resolved).length;
  if (unresolved >= 3) {
    state.lastSpontaneousAt = state.time;
    const report = getActiveReport();
    const label = report ? report.type.toLowerCase() : 'the feed';
    addMemoryEvent('Commentary: ' + label + ' is still waiting while the next claim arrives.');
  }
}

function maybeTransition() {
  if (state.phase !== 'live') {
    return;
  }

  if (state.attention <= 0 || state.pressure >= 10) {
    state.phase = 'failure';
    if (!state.failureLogged) {
      state.failureLogged = true;
      state.lastAnnouncement = 'Attention collapsed. The feed kept moving.';
      addMemoryEvent('Memory: the command lost the feed to overload.');
    }
    return;
  }

  const resolvedCount = state.reports.filter((item) => item.resolved).length;
  if (state.score >= 8 && resolvedCount >= 4) {
    state.phase = 'victory';
    if (!state.victoryLogged) {
      state.victoryLogged = true;
      state.lastAnnouncement = 'The commander is reading the feed instead of chasing the map.';
      addMemoryEvent('Memory: the battlefield was the feed, and the feed started yielding reliable command.');
    }
  }
}

function pickNextReportId() {
  const unresolved = state.reports.filter((report) => !report.resolved);
  if (unresolved.length === 0) {
    return null;
  }
  unresolved.sort((a, b) => a.createdAt - b.createdAt);
  return unresolved[0].id;
}

function getActiveReport() {
  const selected = state.reports.find((report) => report.id === state.selectedReportId && !report.resolved);
  if (selected) {
    return selected;
  }
  const next = state.reports.find((report) => !report.resolved);
  if (next) {
    state.selectedReportId = next.id;
  }
  return next || null;
}

function render() {
  const activeReport = getActiveReport();
  if (!state.selectedReportId && activeReport) {
    state.selectedReportId = activeReport.id;
  }

  refs.status.textContent = state.phase === 'live' ? 'Live feed' : state.phase === 'victory' ? 'Command won the feed' : 'Feed collapse';
  refs.status.className = 'metric ' + (state.phase === 'live' ? 'live' : state.phase === 'victory' ? 'victory' : 'failure');
  refs.doctrine.textContent = 'The Feed Is The Battlefield';
  refs.attention.textContent = 'Attention ' + state.attention.toFixed(1) + ' / 10';
  refs.score.textContent = 'Score ' + state.score.toFixed(0) + ' · Pressure ' + state.pressure.toFixed(1);
  refs.feedCount.textContent = state.reports.filter((report) => !report.resolved).length + ' unresolved';
  refs.feedStream.innerHTML = renderFeed();
  refs.activeReport.innerHTML = renderActiveReport(activeReport);
  refs.commandNote.textContent = state.lastAnnouncement;
  refs.validationStatus.textContent = state.phase.toUpperCase();
  refs.validationDoctrine.textContent = 'The Feed Is The Battlefield';
  refs.validationTypes.textContent = REPORT_TYPES.join(', ');
  refs.validationDecisions.textContent = DECISIONS.map((option) => option.label).join(' · ');
  refs.validationFalse.textContent = state.falseReportPresent ? 'yes' : 'no';
  refs.validationMemory.textContent = state.memoryEvents[0]?.text || 'pending';
  refs.validationCommit.textContent = 'pending';
  refs.memoryFeed.innerHTML = renderMemoryFeed();
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
          <span class="tag muted">${report.decision ? escapeHtml(report.decision) : 'unresolved'}</span>
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
    return '<div class="empty-state">No memory event yet. Resolve a report to produce one.</div>';
  }
  return state.memoryEvents.map((event) => `
    <div class="memory-card">
      <span class="memory-time">${formatAge(state.time - event.time)}</span>
      <p>${escapeHtml(event.text)}</p>
    </div>
  `).join('');
}

function getReportStatus(report: Report) {
  const age = state.time - report.createdAt;
  if (report.resolved) {
    return 'resolved';
  }
  if (report.assessment === 'wrong') {
    return 'wrong';
  }
  if (age >= 7 || report.assessment === 'stale') {
    return 'stale';
  }
  if (report.assessment === 'incomplete') {
    return 'incomplete';
  }
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
  state.nextReportAt = 1.5;
  state.nextReportIndex = 0;
  state.reports = buildInitialReports();
  nextReportId = state.reports.length + 1;
  state.memoryEvents = [];
  state.lastAnnouncement = 'Mission restarted. The feed is live again.';
  state.falseReportPresent = true;
  state.fedDoctrineValidated = false;
  state.decisions = {
    advance: 0,
    confirm: 0,
    'send wingman': 0,
    hold: 0
  };
  state.reportTypesSeen = new Set<FeedType>(REPORT_TYPES);
  state.victoryLogged = false;
  state.failureLogged = false;
  state.lastSpontaneousAt = 0;
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
