export type CrewRole = 'commander' | 'gunner' | 'driver' | 'loader';
export type CrewEventKind = 'observation' | 'complaint' | 'joke' | 'fear' | 'request' | 'reaction' | 'note' | 'injury' | 'promotion';
export type BattleOutcome = 'failure' | 'victory';

export type CrewMember = {
  role: CrewRole;
  name: string;
  age: number;
  rank: string;
  fatigue: number;
  fear: number;
  morale: number;
  experience: number;
  trait: string;
  injury: string | null;
  memoryTags: string[];
};

export type CrewLogEntry = {
  id: number;
  time: number;
  role: CrewRole | 'crew';
  kind: CrewEventKind;
  text: string;
};

export type CrewBattleFlags = {
  underFireLogged: boolean;
  longDriveLogged: boolean;
  lowAmmoLogged: boolean;
  wreckLogged: boolean;
  victoryLogged: boolean;
  lossLogged: boolean;
};

export type CrewBattleSnapshot = Record<CrewRole, CrewMember>;

export type CrewState = {
  version: 1;
  battleIndex: number;
  nextLogId: number;
  nextChatterAt: number;
  battleClock: number;
  movingSeconds: number;
  pressureSeconds: number;
  quietSeconds: number;
  crew: Record<CrewRole, CrewMember>;
  battleStart: CrewBattleSnapshot;
  battleStartAmmo: number;
  log: CrewLogEntry[];
  notableMoments: string[];
  promotions: string[];
  injuries: string[];
  newTraits: string[];
  flags: CrewBattleFlags;
};

export type CrewBattleContext = {
  time: number;
  delta: number;
  phase: 'live' | 'failure' | 'victory';
  ammo: number;
  playerIntent: string;
  moving: boolean;
  underFire: boolean;
  enemyKnown: boolean;
  enemyRevealed: boolean;
  enemyDestroyed: boolean;
  friendlyLoss: boolean;
};

export type CrewModifiers = {
  spottingBonus: number;
  attackBonus: number;
  driveSpeedMultiplier: number;
  reportBonus: number;
  commanderConfidence: number;
  crewMorale: number;
  crewFear: number;
};

export type BattleRecap = {
  crewChanges: string[];
  notableMoments: string[];
  promotions: string[];
  injuries: string[];
  newTraits: string[];
  ammoSummary: string;
};

const STORAGE_KEY = 'tftm-crew-state-v1';
const ROLE_ORDER: CrewRole[] = ['commander', 'gunner', 'driver', 'loader'];

function baseMembers(): Record<CrewRole, CrewMember> {
  return {
    commander: makeMember('commander', 'Lt. Cal Mercer', 29, '2nd Lt.', 'methodical', 58, 32, 64, 58),
    gunner: makeMember('gunner', 'Sgt. Wade Harlan', 24, 'Cpl.', 'hawk-eyed', 47, 24, 60, 63),
    driver: makeMember('driver', 'Cpl. Ben Dorsey', 22, 'Pfc.', 'steady hands', 52, 28, 57, 45),
    loader: makeMember('loader', 'Pvt. Lou Rivas', 19, 'Pvt.', 'gallows humor', 61, 36, 51, 34)
  };
}

function makeMember(role: CrewRole, name: string, age: number, rank: string, trait: string, fatigue: number, fear: number, morale: number, experience: number): CrewMember {
  return {
    role,
    name,
    age,
    rank,
    fatigue: clamp(fatigue, 0, 100),
    fear: clamp(fear, 0, 100),
    morale: clamp(morale, 0, 100),
    experience: clamp(experience, 0, 100),
    trait,
    injury: null,
    memoryTags: []
  };
}

function cloneMember(member: CrewMember): CrewMember {
  return {
    role: member.role,
    name: member.name,
    age: member.age,
    rank: member.rank,
    fatigue: member.fatigue,
    fear: member.fear,
    morale: member.morale,
    experience: member.experience,
    trait: member.trait,
    injury: member.injury,
    memoryTags: [...member.memoryTags]
  };
}

function createBattleSnapshot(crew: Record<CrewRole, CrewMember>): CrewBattleSnapshot {
  return {
    commander: cloneMember(crew.commander),
    gunner: cloneMember(crew.gunner),
    driver: cloneMember(crew.driver),
    loader: cloneMember(crew.loader)
  };
}

function defaultFlags(): CrewBattleFlags {
  return {
    underFireLogged: false,
    longDriveLogged: false,
    lowAmmoLogged: false,
    wreckLogged: false,
    victoryLogged: false,
    lossLogged: false
  };
}

function createDefaultState(): CrewState {
  const crew = baseMembers();
  return {
    version: 1,
    battleIndex: 1,
    nextLogId: 1,
    nextChatterAt: 0,
    battleClock: 0,
    movingSeconds: 0,
    pressureSeconds: 0,
    quietSeconds: 0,
    crew,
    battleStart: createBattleSnapshot(crew),
    battleStartAmmo: 6,
    log: [],
    notableMoments: [],
    promotions: [],
    injuries: [],
    newTraits: [],
    flags: defaultFlags()
  };
}

export function loadCrewState(): CrewState {
  const fallback = createDefaultState();
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<CrewState>;
    const crew = parsed.crew ? normalizeCrew(parsed.crew as Record<CrewRole, Partial<CrewMember>>) : baseMembers();
    return {
      version: 1,
      battleIndex: typeof parsed.battleIndex === 'number' ? parsed.battleIndex : fallback.battleIndex,
      nextLogId: typeof parsed.nextLogId === 'number' ? parsed.nextLogId : fallback.nextLogId,
      nextChatterAt: typeof parsed.nextChatterAt === 'number' ? parsed.nextChatterAt : fallback.nextChatterAt,
      battleClock: typeof parsed.battleClock === 'number' ? parsed.battleClock : fallback.battleClock,
      movingSeconds: typeof parsed.movingSeconds === 'number' ? parsed.movingSeconds : fallback.movingSeconds,
      pressureSeconds: typeof parsed.pressureSeconds === 'number' ? parsed.pressureSeconds : fallback.pressureSeconds,
      quietSeconds: typeof parsed.quietSeconds === 'number' ? parsed.quietSeconds : fallback.quietSeconds,
      crew,
      battleStart: parsed.battleStart ? normalizeSnapshot(parsed.battleStart as Record<CrewRole, Partial<CrewMember>>) : createBattleSnapshot(crew),
      battleStartAmmo: typeof parsed.battleStartAmmo === 'number' ? parsed.battleStartAmmo : fallback.battleStartAmmo,
      log: Array.isArray(parsed.log) ? parsed.log.map(normalizeLogEntry).filter((entry): entry is CrewLogEntry => Boolean(entry)).slice(-16) : [],
      notableMoments: Array.isArray(parsed.notableMoments) ? parsed.notableMoments.map(String).slice(-16) : [],
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions.map(String).slice(-12) : [],
      injuries: Array.isArray(parsed.injuries) ? parsed.injuries.map(String).slice(-12) : [],
      newTraits: Array.isArray(parsed.newTraits) ? parsed.newTraits.map(String).slice(-12) : [],
      flags: normalizeFlags(parsed.flags)
    };
  } catch {
    return fallback;
  }
}

export function saveCrewState(state: CrewState) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage pressure.
  }
}

export function beginBattle(state: CrewState, ammo: number, gameTime = 0) {
  state.battleStart = createBattleSnapshot(state.crew);
  state.battleStartAmmo = ammo;
  state.battleClock = 0;
  state.movingSeconds = 0;
  state.pressureSeconds = 0;
  state.quietSeconds = 0;
  state.nextChatterAt = gameTime + 1.8;
  state.log = [];
  state.notableMoments = [];
  state.promotions = [];
  state.injuries = [];
  state.newTraits = [];
  state.flags = defaultFlags();
  addLog(state, 'crew', 'note', 'Crew settled into the tank and waited for the next order.', gameTime);
  saveCrewState(state);
}

export function tickCrewState(state: CrewState, context: CrewBattleContext) {
  if (context.phase !== 'live') {
    return;
  }

  state.battleClock += context.delta;
  state.movingSeconds = context.moving ? state.movingSeconds + context.delta : Math.max(0, state.movingSeconds - context.delta * 0.75);
  state.pressureSeconds = context.underFire ? state.pressureSeconds + context.delta : Math.max(0, state.pressureSeconds - context.delta * 0.75);
  state.quietSeconds = context.moving || context.underFire ? 0 : state.quietSeconds + context.delta;

  driftCrew(state, context);

  if (context.underFire && !state.flags.underFireLogged) {
    registerBattleEvent(state, 'taking-fire', context.time, 'The crew hunkered down as rounds cracked close to the hedge.');
    state.flags.underFireLogged = true;
  }
  if (context.moving && state.movingSeconds >= 12 && !state.flags.longDriveLogged) {
    registerBattleEvent(state, 'note', context.time, 'The lane kept stretching and the driver started feeling every rut.');
    state.flags.longDriveLogged = true;
  }
  if (context.ammo <= 2 && !state.flags.lowAmmoLogged) {
    registerBattleEvent(state, 'low-ammo', context.time, 'The loader counted the remaining rounds twice.');
    state.flags.lowAmmoLogged = true;
  }
  if (context.enemyDestroyed && !state.flags.wreckLogged) {
    registerBattleEvent(state, 'destroyed-tank', context.time, 'The crew finally saw the wreck and learned what the hedge had hidden.');
    state.flags.wreckLogged = true;
  }
  if (context.friendlyLoss && !state.flags.lossLogged) {
    registerBattleEvent(state, 'friendly-loss', context.time, 'A friendly vehicle fell back hard enough to leave a hole in the line.');
    state.flags.lossLogged = true;
  }

  if (context.time >= state.nextChatterAt) {
    const chatter = generateChatter(state, context);
    addLog(state, chatter.role, chatter.kind, chatter.text, context.time);
    state.nextChatterAt = context.time + chatterDelay(state, context);
  }

  saveCrewState(state);
}

export function registerBattleEvent(state: CrewState, kind: 'taking-fire' | 'low-ammo' | 'destroyed-tank' | 'victory' | 'friendly-loss' | 'note', time: number, detail: string) {
  const entryKind: CrewEventKind = kind === 'taking-fire' || kind === 'low-ammo' || kind === 'destroyed-tank' || kind === 'victory' || kind === 'friendly-loss' ? 'reaction' : 'note';
  addLog(state, 'crew', entryKind, detail, time);

  if (kind === 'taking-fire') {
    applyPressure(state, 8, 14, -4, 3);
    maybeInjureCrew(state, time, 'shell shock and a grazing cut from the ambush');
    pushMoment(state, 'Took fire before the picture was clear.');
  } else if (kind === 'low-ammo') {
    applyPressure(state, 1, 10, -4, 1);
    pushMoment(state, 'Ammo reserve dropped into the crew chatter.');
  } else if (kind === 'destroyed-tank') {
    applyPressure(state, 2, 6, 5, 4);
    pushMoment(state, 'Saw the burning wreck and realized how thin the hedge line was.');
    bumpExperience(state, 3);
  } else if (kind === 'victory') {
    applyPressure(state, -4, -10, 10, 5);
    pushMoment(state, 'Victory settled the crew down after the hard part.');
    bumpExperience(state, 4);
  } else if (kind === 'friendly-loss') {
    applyPressure(state, 4, 18, -12, 7);
    maybeInjureCrew(state, time, 'sickening shock from a nearby friendly loss');
    pushMoment(state, 'A friendly loss made the crew talk quieter.');
  } else {
    applyPressure(state, 0, 2, 0, 1);
  }

  saveCrewState(state);
}

export function noteCrewSighting(state: CrewState, time: number, detail: string) {
  addLog(state, 'commander', 'observation', detail, time);
  pushMoment(state, detail);
  bumpExperience(state, 1.5);
  saveCrewState(state);
}

export function getCrewModifiers(state: CrewState): CrewModifiers {
  const commander = state.crew.commander;
  const gunner = state.crew.gunner;
  const driver = state.crew.driver;
  const loader = state.crew.loader;
  const crewMorale = average(state.crew, 'morale');
  const crewFear = average(state.crew, 'fear');

  const spottingBonus = clamp(
    ((gunner.experience * 0.45) + (commander.experience * 0.18) + (commander.morale * 0.08) - (gunner.fear * 0.06) - (crewFear * 0.02)) / 100,
    -0.08,
    0.32
  );
  const attackBonus = clamp(
    ((gunner.experience * 0.5) + (commander.morale * 0.15) + (loader.experience * 0.08) - (loader.fear * 0.08)) / 100,
    -0.06,
    0.3
  );
  const driveSpeedMultiplier = clamp(
    1 - (driver.fatigue / 260) - (driver.fear / 650) + traitDriveBonus(driver.trait) + ((driver.morale - 50) / 180),
    0.72,
    1.1
  );
  const reportBonus = clamp(
    ((commander.experience * 0.45) + (commander.morale * 0.28) - (commander.fear * 0.14)) / 100,
    -0.08,
    0.32
  );
  const commanderConfidence = clamp((commander.morale + commander.experience * 0.8 - commander.fear * 0.5) / 2, 0, 100);

  return { spottingBonus, attackBonus, driveSpeedMultiplier, reportBonus, commanderConfidence, crewMorale, crewFear };
}

export function buildCrewPanelHtml(state: CrewState, ammo: number, phase: 'live' | 'failure' | 'victory') {
  const mods = getCrewModifiers(state);
  const summary = summarizeCrewState(state, ammo, phase, mods);
  return {
    summary,
    cards: ROLE_ORDER.map((role) => renderCrewCard(state.crew[role])).join(''),
    log: state.log.length === 0 ? '<div class="empty-state">No crew chatter yet. Pressure, movement, and contact will make them talk.</div>' : state.log.slice().reverse().map(renderLogEntry).join('')
  };
}

export function buildAfterActionHtml(state: CrewState, outcome: BattleOutcome, message: string, lesson: string, ammoEnd: number) {
  const recap = finalizeBattle(state, outcome, ammoEnd);
  const ammoSpent = Math.max(0, state.battleStartAmmo - ammoEnd);
  const lessonLines = (lesson || 'A scout report on the hidden enemy.')
    .split(/\n+/)
    .filter((line) => line.trim().length > 0)
    .map((line) => '<p>' + escapeHtml(line) + '</p>')
    .join('');
  return [
    '<h3>After-action report</h3>',
    '<p>' + escapeHtml(message) + '</p>',
    '<p><strong>What the picture got wrong:</strong></p>',
    lessonLines,
    '<p><strong>Ammo used:</strong> ' + ammoSpent + ' rounds (' + state.battleStartAmmo + ' started, ' + ammoEnd + ' left).</p>',
    renderListSection('Crew changes', recap.crewChanges),
    renderListSection('Notable moments', recap.notableMoments),
    renderListSection('Promotions', recap.promotions),
    renderListSection('Injuries', recap.injuries),
    renderListSection('New traits', recap.newTraits),
    '<p><strong>Memory:</strong> ' + escapeHtml(outcome === 'victory' ? 'The crew remembered how the lane opened after the contact was silenced.' : 'The crew remembered the ambush and the price of guessing wrong.') + '</p>',
    '<button type="button" data-restart-button>Restart checkpoint</button>'
  ].join('');
}

function finalizeBattle(state: CrewState, outcome: BattleOutcome, ammoEnd: number): BattleRecap {
  const crewChanges: string[] = [];
  const promotions: string[] = [];
  const injuries: string[] = [];
  const newTraits: string[] = [];

  for (const role of ROLE_ORDER) {
    const current = state.crew[role];
    const start = state.battleStart[role];
    const diffs = diffMember(current, start);
    if (diffs.length > 0) {
      crewChanges.push(current.name + ': ' + diffs.join(', '));
    }

    const promotion = maybePromote(current, state.battleIndex, outcome);
    if (promotion) {
      promotions.push(promotion);
      addLog(state, current.role, 'promotion', promotion, state.battleClock);
    }

    const traitChange = maybeShiftTrait(current, outcome);
    if (traitChange) {
      newTraits.push(traitChange);
      addLog(state, current.role, 'note', traitChange, state.battleClock);
    }

    if (current.injury) {
      injuries.push(current.name + ': ' + current.injury);
    }
  }

  if (crewChanges.length === 0) {
    crewChanges.push('The crew ended the fight with no major state change, but they still carried the memory of it.');
  }
  if (state.notableMoments.length === 0) {
    state.notableMoments.push(outcome === 'victory' ? 'The crew survived without a memorable spike in pressure.' : 'The battle ended before the crew got a clean picture.');
  }

  state.promotions = unique(promotions);
  state.injuries = unique(injuries);
  state.newTraits = unique(newTraits);
  state.battleIndex += 1;
  state.flags = defaultFlags();
  state.movingSeconds = 0;
  state.pressureSeconds = 0;
  state.quietSeconds = 0;
  state.nextChatterAt = state.battleClock + 4;
  saveCrewState(state);

  return {
    crewChanges,
    notableMoments: [...state.notableMoments].slice(-8),
    promotions: unique(promotions),
    injuries: unique(injuries),
    newTraits: unique(newTraits),
    ammoSummary: 'Ammo started at ' + state.battleStartAmmo + ' and ended at ' + ammoEnd + '.'
  };
}

function renderCrewCard(member: CrewMember) {
  const injuryText = member.injury ? '<span class="crew-injury">' + escapeHtml(member.injury) + '</span>' : '<span class="crew-injury crew-injury-none">No injury</span>';
  return [
    '<article class="crew-card crew-card-' + member.role + '">',
    '  <div class="crew-card-head">',
    '    <div>',
    '      <strong>' + escapeHtml(member.name) + '</strong>',
    '      <span>' + escapeHtml(member.rank) + ' · ' + escapeHtml(member.role) + '</span>',
    '    </div>',
    '    <span class="crew-age">' + member.age + '</span>',
    '  </div>',
    '  <div class="crew-trait">' + escapeHtml(member.trait) + '</div>',
    '  <div class="crew-stats">',
    statRow('Fatigue', member.fatigue, 'fatigue'),
    statRow('Fear', member.fear, 'fear'),
    statRow('Morale', member.morale, 'morale'),
    statRow('Experience', member.experience, 'experience'),
    '  </div>',
    '  <div class="crew-footer">' + injuryText + '</div>',
    '</article>'
  ].join('');
}

function statRow(label: string, value: number, kind: string) {
  return [
    '<div class="crew-stat crew-stat-' + kind + '">',
    '  <span>' + label + '</span>',
    '  <div class="crew-meter"><i style="width:' + clamp(value, 0, 100) + '%"></i></div>',
    '  <strong>' + Math.round(value) + '</strong>',
    '</div>'
  ].join('');
}

function renderLogEntry(entry: CrewLogEntry) {
  return [
    '<div class="crew-log-entry crew-log-' + entry.kind + '">',
    '  <span class="crew-log-role">' + escapeHtml(entry.role.toUpperCase()) + '</span>',
    '  <span class="crew-log-kind">' + escapeHtml(entry.kind) + '</span>',
    '  <p>' + escapeHtml(entry.text) + '</p>',
    '</div>'
  ].join('');
}

function renderListSection(title: string, items: string[]) {
  if (items.length === 0) {
    return '<p><strong>' + escapeHtml(title) + ':</strong> none.</p>';
  }
  return '<div class="aar-section"><strong>' + escapeHtml(title) + ':</strong><ul>' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>';
}

function summarizeCrewState(state: CrewState, ammo: number, phase: 'live' | 'failure' | 'victory', mods: CrewModifiers) {
  const moodWord = phase === 'victory'
    ? 'Crew relieved'
    : phase === 'failure'
      ? 'Crew shaken'
      : mods.crewFear > 55
        ? 'Crew on edge'
        : mods.crewMorale > 60
          ? 'Crew steady'
          : 'Crew alert';
  return moodWord + ' · ammo ' + ammo + ' · morale ' + Math.round(mods.crewMorale) + ' · fear ' + Math.round(mods.crewFear) + ' · battle ' + state.battleIndex;
}

function chatterDelay(state: CrewState, context: CrewBattleContext) {
  const base = context.underFire ? 2.8 : context.ammo <= 2 ? 4.1 : context.moving ? 4.8 : 6.2;
  const moraleFactor = clamp((60 - average(state.crew, 'morale')) / 25, -0.6, 0.9);
  return base + moraleFactor + Math.random() * 2.2;
}

function generateChatter(state: CrewState, context: CrewBattleContext) {
  const speaker = chooseSpeaker(state, context);
  const member = state.crew[speaker];
  let kind: CrewEventKind = 'reaction';
  let text = '';

  if (context.underFire) {
    if (speaker === 'loader') {
      kind = 'fear';
      text = pick([
        'I heard that one bite the hedge. I do not like how close that was.',
        'If he fires again before I settle the rounds, we are all going to hear about it.',
        'My hands are moving faster than my head right now.'
      ]);
    } else if (speaker === 'driver') {
      kind = 'complaint';
      text = pick([
        'The track feels like it is hopping under me. Hold him off until I can breathe.',
        'Every rut sounds bigger when the gun starts talking.',
        'I can keep her straight, but not if everybody keeps shouting at once.'
      ]);
    } else if (speaker === 'gunner') {
      kind = 'observation';
      text = pick([
        'I had a flicker on the right hedge. Give me one more look and I can call it.',
        'That muzzle flash was enough for me. He is right of the lane.',
        'I am seeing movement where the hedge opens. Range is short and ugly.'
      ]);
    } else {
      kind = 'request';
      text = pick([
        'Keep the tank steady. I need the picture before I give the order.',
        'Driver, hold the line. Gunner, stay on that hedge.',
        'I need the crew calm and the turret moving only when it matters.'
      ]);
    }
  } else if (context.ammo <= 2) {
    if (speaker === 'loader') {
      kind = 'request';
      text = pick([
        'We are down to the last sensible shells. Do not waste the next one.',
        'I counted the rounds twice. The count is not getting better.',
        'If we keep firing like this, the rack will answer back.'
      ]);
    } else if (speaker === 'commander') {
      kind = 'observation';
      text = pick([
        'Ammo is getting thin. Every shot has to earn its place.',
        'We are down to the point where the next decision matters more than the last one.',
        'Keep your heads in it. The ammo rack is not a suggestion.'
      ]);
    } else if (speaker === 'gunner') {
      kind = 'fear';
      text = pick([
        'I can make the next shot count, but I would rather not test the rest of the rack.',
        'That is a short stack of rounds for a long lane.',
        'I hate shooting with the rack looking back at me.'
      ]);
    } else {
      kind = 'complaint';
      text = pick([
        'The tank feels heavier when the ammo gets light.',
        'I do not like being this close to empty.',
        'We had better not turn this into a counting exercise.'
      ]);
    }
  } else if (context.moving) {
    if (speaker === 'driver') {
      kind = 'complaint';
      text = pick([
        'This lane keeps dragging on. My back knows every rut now.',
        'I can feel the road in my teeth. Somebody else can ride the easy jobs.',
        'We have been driving long enough for the tank to start feeling like a second skin.'
      ]);
    } else if (speaker === 'loader') {
      kind = 'joke';
      text = pick([
        'If we go any slower, the hedges will charge us rent.',
        'I am starting to think the road is just a rumor.',
        'This tank rides like a church pew on a bad day.'
      ]);
    } else if (speaker === 'gunner') {
      kind = 'observation';
      text = pick([
        'The lane opens a little on the right. I would like that checked before we roll past it.',
        'I keep seeing trouble-shaped gaps in the hedges.',
        'Movement on the ground is hard to read when everything is green and wet.'
      ]);
    } else {
      kind = 'request';
      text = pick([
        'Keep the tank moving but do not outrun the picture.',
        'I want a report before we commit to the next hedge line.',
        'Stay alert. The quiet parts in Normandy always charge interest.'
      ]);
    }
  } else if (context.enemyDestroyed) {
    if (speaker === 'commander') {
      kind = 'reaction';
      text = pick([
        'Good. Now we have the lane and a memory to match it.',
        'That is what a clean report looks like after a hard fight.',
        'The crew can breathe. We earned that silence.'
      ]);
    } else if (speaker === 'gunner') {
      kind = 'observation';
      text = pick([
        'The wreck will keep that hedge honest for a while.',
        'Burning steel makes a better map marker than any paper report.',
        'I am glad that was his engine smoke and not ours.'
      ]);
    } else if (speaker === 'loader') {
      kind = 'joke';
      text = pick([
        'I prefer the kind of smoke that comes from winning.',
        'I was starting to think the hedge was going to outlast us.',
        'That one finally stopped arguing with the loader rack.'
      ]);
    } else {
      kind = 'reaction';
      text = pick([
        'Keep your heads up. This is the part where people start forgetting how close it was.',
        'I want the crew calm, not careless. We still have to cross the lane.',
        'Good work. Let the silence settle before we call it easy.'
      ]);
    }
  } else if (context.friendlyLoss) {
    kind = 'fear';
    text = pick([
      'That was a bad one. I am still hearing it.',
      'We are not the only tank that had a rough minute here.',
      'A friendly loss changes the whole lane. Everyone feels it.'
    ]);
  } else if (member.memoryTags.length > 0) {
    kind = 'observation';
    text = pick([
      'I keep thinking about that hedge line. It was quieter than it should have been.',
      'That last lesson is going to stay with me for a while.',
      'The crew knows better than to trust a clean-looking lane now.'
    ]);
  } else if (speaker === 'loader') {
    kind = 'joke';
    text = pick([
      'The tank smells like old fuel and bad choices. I think that means it is working.',
      'If the hedges start talking back, I am taking a break.',
      'I would like one Normandy lane that does not try to eat us.'
    ]);
  } else if (speaker === 'driver') {
    kind = 'complaint';
    text = pick([
      'A quiet tank still feels like a heavy tank.',
      'I would rather drive on dry ground, but nobody asked me.',
      'Every mile in here feels longer than the last one.'
    ]);
  } else if (speaker === 'gunner') {
    kind = 'observation';
    text = pick([
      'I can read the hedge better when the tank holds still.',
      'The sight picture is honest when the lane is calm.',
      'I am watching for anything that looks too neat to be natural.'
    ]);
  } else {
    kind = 'request';
    text = pick([
      'Keep the crew informed. The tank runs better when nobody guesses.',
      'I need clean reports and fewer assumptions.',
      'If you see something off, say it early.'
    ]);
  }

  applyChatterEffect(state, member, kind, context);
  return { role: speaker, kind, text };
}

function chooseSpeaker(state: CrewState, context: CrewBattleContext): CrewRole {
  if (context.underFire) {
    if (state.crew.commander.fear >= 65) return 'commander';
    if (state.crew.gunner.experience >= state.crew.loader.experience) return 'gunner';
    return 'loader';
  }
  if (context.ammo <= 2) {
    return 'loader';
  }
  if (context.moving) {
    return 'driver';
  }
  if (context.enemyDestroyed || context.enemyKnown) {
    if (state.crew.commander.morale >= state.crew.gunner.morale) return 'commander';
    return 'gunner';
  }
  const weighted: Array<[CrewRole, number]> = [
    ['commander', state.crew.commander.morale],
    ['gunner', state.crew.gunner.experience],
    ['driver', 100 - state.crew.driver.fatigue],
    ['loader', 100 - state.crew.loader.fear]
  ];
  weighted.sort((a, b) => b[1] - a[1]);
  return weighted[0][0];
}

function applyChatterEffect(state: CrewState, member: CrewMember, kind: CrewEventKind, context: CrewBattleContext) {
  if (kind === 'joke') {
    member.morale = clamp(member.morale + 1.8, 0, 100);
    member.fear = clamp(member.fear - 0.7, 0, 100);
  } else if (kind === 'observation') {
    member.experience = clamp(member.experience + 0.8, 0, 100);
  } else if (kind === 'complaint') {
    member.fatigue = clamp(member.fatigue + 0.5, 0, 100);
    member.morale = clamp(member.morale - 0.5, 0, 100);
  } else if (kind === 'fear') {
    member.fear = clamp(member.fear + 1.6, 0, 100);
    member.morale = clamp(member.morale - 0.8, 0, 100);
  } else if (kind === 'request') {
    member.experience = clamp(member.experience + 0.4, 0, 100);
    if (context.enemyKnown || context.enemyDestroyed) {
      member.morale = clamp(member.morale + 0.4, 0, 100);
    }
  } else if (kind === 'reaction') {
    member.morale = clamp(member.morale + (context.enemyDestroyed ? 1.5 : 0.5), 0, 100);
    member.fear = clamp(member.fear - (context.enemyDestroyed ? 1.2 : 0.3), 0, 100);
  }

  if (member.role === 'loader' && context.ammo <= 2) {
    member.fear = clamp(member.fear + 1.2, 0, 100);
  }
  if (member.role === 'driver' && context.moving) {
    member.fatigue = clamp(member.fatigue + 0.8, 0, 100);
  }
  if (member.role === 'gunner' && (context.enemyKnown || context.enemyRevealed || context.enemyDestroyed)) {
    member.experience = clamp(member.experience + 0.6, 0, 100);
  }
  if (member.role === 'commander') {
    member.experience = clamp(member.experience + 0.3, 0, 100);
  }

  maybeShapeTraitFromBehavior(member);
  bumpMemory(member, kind, context);
}

function driftCrew(state: CrewState, context: CrewBattleContext) {
  for (const role of ROLE_ORDER) {
    const member = state.crew[role];
    const traits = traitProfile(member.trait);
    const movingPressure = context.moving ? (role === 'driver' ? 2.0 : 0.5) : 0;
    const firePressure = context.underFire ? (role === 'commander' ? 1.1 : role === 'gunner' ? 1.4 : role === 'loader' ? 1.6 : 0.9) : 0;
    const ammoPressure = context.ammo <= 2 && role === 'loader' ? 1.2 : 0;

    member.fatigue = clamp(member.fatigue + context.delta * (0.15 + movingPressure * 0.1 + firePressure * 0.04 + ammoPressure * 0.04), 0, 100);
    member.fear = clamp(member.fear + context.delta * (0.08 + firePressure * 0.08 + ammoPressure * 0.05 - traits.fearRecovery), 0, 100);
    member.morale = clamp(member.morale + context.delta * (traits.moraleDrift - firePressure * 0.03 - ammoPressure * 0.02), 0, 100);
    member.experience = clamp(member.experience + context.delta * (traits.experienceDrift + (context.enemyKnown || context.enemyDestroyed ? 0.12 : 0.04)), 0, 100);
    maybeShapeTraitFromBehavior(member);
  }
}

function traitProfile(trait: string) {
  const lower = trait.toLowerCase();
  return {
    fearRecovery: lower.includes('steady') || lower.includes('calm') ? 0.04 : lower.includes('jumpy') || lower.includes('nervous') ? -0.02 : 0.01,
    moraleDrift: lower.includes('humor') ? 0.03 : lower.includes('methodical') ? 0.02 : lower.includes('jumpy') ? -0.02 : 0,
    experienceDrift: lower.includes('hawk') || lower.includes('methodical') ? 0.07 : lower.includes('steady') ? 0.05 : 0.03
  };
}

function maybeShapeTraitFromBehavior(member: CrewMember) {
  if (member.role === 'loader' && member.fear >= 72 && member.trait !== 'jumpy') {
    member.trait = 'jumpy';
    pushTraitLine(member, 'jumpy');
  }
  if (member.role === 'gunner' && member.experience >= 70 && member.trait !== 'hawk-eyed') {
    member.trait = 'hawk-eyed';
    pushTraitLine(member, 'hawk-eyed');
  }
  if (member.role === 'driver' && member.morale >= 64 && member.fear <= 40 && member.trait !== 'steady hands') {
    member.trait = 'steady hands';
    pushTraitLine(member, 'steady hands');
  }
  if (member.role === 'commander' && member.morale >= 70 && member.trait !== 'methodical') {
    member.trait = 'methodical';
    pushTraitLine(member, 'methodical');
  }
}

function pushTraitLine(member: CrewMember, trait: string) {
  const note = member.name + ' settled into a ' + trait + ' rhythm.';
  member.memoryTags.push(note);
  while (member.memoryTags.length > 6) {
    member.memoryTags.shift();
  }
}

function bumpMemory(member: CrewMember, kind: CrewEventKind, context: CrewBattleContext) {
  if (kind === 'fear' || kind === 'reaction' || kind === 'note') {
    const tag = context.enemyDestroyed ? 'burning wreck' : context.underFire ? 'under fire' : context.moving ? 'road weariness' : 'quiet lane';
    member.memoryTags.push(tag);
    while (member.memoryTags.length > 6) {
      member.memoryTags.shift();
    }
  }
}

function applyPressure(state: CrewState, fatigueDelta: number, fearDelta: number, moraleDelta: number, experienceDelta: number) {
  for (const role of ROLE_ORDER) {
    const member = state.crew[role];
    member.fatigue = clamp(member.fatigue + fatigueDelta + roleFatigueBias(role), 0, 100);
    member.fear = clamp(member.fear + fearDelta + roleFearBias(role), 0, 100);
    member.morale = clamp(member.morale + moraleDelta + roleMoraleBias(role), 0, 100);
    member.experience = clamp(member.experience + experienceDelta + roleExperienceBias(role), 0, 100);
    maybeShapeTraitFromBehavior(member);
  }
}

function roleFatigueBias(role: CrewRole) {
  if (role === 'driver') return 2;
  if (role === 'loader') return 1.5;
  if (role === 'gunner') return 1;
  return 0.5;
}

function roleFearBias(role: CrewRole) {
  if (role === 'loader') return 2;
  if (role === 'gunner') return 1;
  if (role === 'driver') return 1;
  return 0.5;
}

function roleMoraleBias(role: CrewRole) {
  if (role === 'commander') return 0.7;
  if (role === 'gunner') return 0.4;
  if (role === 'driver') return 0.2;
  return 0;
}

function roleExperienceBias(role: CrewRole) {
  if (role === 'gunner') return 1.2;
  if (role === 'commander') return 1;
  if (role === 'driver') return 0.8;
  return 0.7;
}

function bumpExperience(state: CrewState, amount: number) {
  for (const role of ROLE_ORDER) {
    const member = state.crew[role];
    member.experience = clamp(member.experience + amount * (role === 'gunner' ? 1.25 : role === 'commander' ? 1 : role === 'driver' ? 0.8 : 0.7), 0, 100);
  }
}

function maybeInjureCrew(state: CrewState, time: number, injury: string) {
  const candidates = [state.crew.loader, state.crew.driver, state.crew.gunner, state.crew.commander].filter((member) => !member.injury);
  if (candidates.length === 0) {
    return;
  }
  const target = candidates.sort((a, b) => b.fear - a.fear)[0];
  if (Math.random() < 0.55) {
    target.injury = injury;
    state.injuries.push(target.name + ': ' + injury);
    addLog(state, target.role, 'injury', target.name + ' took an injury: ' + injury + '.', time);
  }
}

function maybePromote(member: CrewMember, battleIndex: number, outcome: BattleOutcome) {
  const experienceBonus = outcome === 'victory' ? 2 : 0;
  const score = member.experience + experienceBonus + (member.morale > 60 ? 4 : 0) - (member.fear > 70 ? 5 : 0) + Math.min(5, battleIndex * 0.25);
  if (member.role === 'loader' && member.rank === 'Pvt.' && score >= 38) {
    member.rank = 'Pfc.';
    return member.name + ' was promoted to Pfc. after proving he could keep loading under pressure.';
  }
  if (member.role === 'driver' && member.rank === 'Pfc.' && score >= 46) {
    member.rank = 'Cpl.';
    return member.name + ' was promoted to Cpl. after keeping the tank moving through the lane.';
  }
  if (member.role === 'gunner' && member.rank === 'Cpl.' && score >= 52) {
    member.rank = 'Sgt.';
    return member.name + ' was promoted to Sgt. for fast eyes and fast corrections.';
  }
  if (member.role === 'commander' && member.rank === '2nd Lt.' && score >= 62) {
    member.rank = '1st Lt.';
    return member.name + ' was promoted to 1st Lt. for keeping the crew oriented through the fight.';
  }
  return '';
}

function maybeShiftTrait(member: CrewMember, outcome: BattleOutcome) {
  if (member.role === 'loader' && member.fear >= 70 && member.trait !== 'jumpy') {
    member.trait = 'jumpy';
    return member.name + ' picked up the new trait jumpy under fire.';
  }
  if (member.role === 'gunner' && member.experience >= 68 && member.trait !== 'hawk-eyed') {
    member.trait = 'hawk-eyed';
    return member.name + ' picked up a harder-edged hawk-eyed trait.';
  }
  if (member.role === 'driver' && member.morale >= 65 && member.fear <= 42 && member.trait !== 'steady hands') {
    member.trait = 'steady hands';
    return member.name + ' settled into a steadier driving style.';
  }
  if (member.role === 'commander' && outcome === 'victory' && member.morale >= 70 && member.trait !== 'methodical') {
    member.trait = 'methodical';
    return member.name + ' became more methodical about the next order.';
  }
  return '';
}

function addLog(state: CrewState, role: CrewRole | 'crew', kind: CrewEventKind, text: string, time: number) {
  state.log.push({ id: state.nextLogId++, time, role, kind, text });
  while (state.log.length > 16) {
    state.log.shift();
  }
}

function pushMoment(state: CrewState, text: string) {
  state.notableMoments.push(text);
  while (state.notableMoments.length > 12) {
    state.notableMoments.shift();
  }
}

function diffMember(current: CrewMember, start: CrewMember) {
  const pieces: string[] = [];
  pushDiff(pieces, 'fatigue', current.fatigue - start.fatigue);
  pushDiff(pieces, 'fear', current.fear - start.fear);
  pushDiff(pieces, 'morale', current.morale - start.morale);
  pushDiff(pieces, 'experience', current.experience - start.experience);
  if (current.trait !== start.trait) {
    pieces.push('trait shifted from ' + start.trait + ' to ' + current.trait);
  }
  if ((current.injury || '') !== (start.injury || '')) {
    pieces.push(current.injury ? 'injury: ' + current.injury : 'injury cleared');
  }
  return pieces;
}

function pushDiff(list: string[], label: string, delta: number) {
  if (Math.abs(delta) < 1) {
    return;
  }
  const sign = delta > 0 ? '+' : '';
  list.push(label + ' ' + sign + Math.round(delta));
}



function normalizeCrew(raw: Record<CrewRole, Partial<CrewMember>>) {
  const fallback = baseMembers();
  return {
    commander: normalizeMember(raw.commander, fallback.commander),
    gunner: normalizeMember(raw.gunner, fallback.gunner),
    driver: normalizeMember(raw.driver, fallback.driver),
    loader: normalizeMember(raw.loader, fallback.loader)
  };
}

function normalizeSnapshot(raw: Record<CrewRole, Partial<CrewMember>>) {
  const crew = normalizeCrew(raw);
  return createBattleSnapshot(crew);
}

function normalizeMember(raw: Partial<CrewMember> | undefined, fallback: CrewMember): CrewMember {
  if (!raw) {
    return cloneMember(fallback);
  }
  return {
    role: isRole(raw.role) ? raw.role : fallback.role,
    name: typeof raw.name === 'string' ? raw.name : fallback.name,
    age: typeof raw.age === 'number' ? raw.age : fallback.age,
    rank: typeof raw.rank === 'string' ? raw.rank : fallback.rank,
    fatigue: clamp(typeof raw.fatigue === 'number' ? raw.fatigue : fallback.fatigue, 0, 100),
    fear: clamp(typeof raw.fear === 'number' ? raw.fear : fallback.fear, 0, 100),
    morale: clamp(typeof raw.morale === 'number' ? raw.morale : fallback.morale, 0, 100),
    experience: clamp(typeof raw.experience === 'number' ? raw.experience : fallback.experience, 0, 100),
    trait: typeof raw.trait === 'string' ? raw.trait : fallback.trait,
    injury: typeof raw.injury === 'string' ? raw.injury : null,
    memoryTags: Array.isArray(raw.memoryTags) ? raw.memoryTags.map(String).slice(-6) : []
  };
}

function normalizeFlags(raw: unknown): CrewBattleFlags {
  const fallback = defaultFlags();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const flags = raw as Partial<CrewBattleFlags>;
  return {
    underFireLogged: Boolean(flags.underFireLogged),
    longDriveLogged: Boolean(flags.longDriveLogged),
    lowAmmoLogged: Boolean(flags.lowAmmoLogged),
    wreckLogged: Boolean(flags.wreckLogged),
    victoryLogged: Boolean(flags.victoryLogged),
    lossLogged: Boolean(flags.lossLogged)
  };
}

function normalizeLogEntry(raw: unknown): CrewLogEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const entry = raw as Partial<CrewLogEntry>;
  if (typeof entry.id !== 'number' || typeof entry.time !== 'number' || typeof entry.text !== 'string' || typeof entry.kind !== 'string') {
    return null;
  }
  return {
    id: entry.id,
    time: entry.time,
    role: isRole(entry.role) ? entry.role : 'crew',
    kind: isEventKind(entry.kind) ? entry.kind : 'note',
    text: entry.text
  };
}

function isRole(value: unknown): value is CrewRole {
  return value === 'commander' || value === 'gunner' || value === 'driver' || value === 'loader';
}

function isEventKind(value: unknown): value is CrewEventKind {
  return value === 'observation' || value === 'complaint' || value === 'joke' || value === 'fear' || value === 'request' || value === 'reaction' || value === 'note' || value === 'injury' || value === 'promotion';
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(crew: Record<CrewRole, CrewMember>, key: keyof Pick<CrewMember, 'fatigue' | 'fear' | 'morale' | 'experience'>) {
  return ROLE_ORDER.reduce((sum, role) => sum + crew[role][key], 0) / ROLE_ORDER.length;
}

function traitDriveBonus(trait: string) {
  const lower = trait.toLowerCase();
  if (lower.includes('steady')) return 0.06;
  if (lower.includes('jumpy') || lower.includes('nervous')) return -0.08;
  return 0;
}

function pick<T>(values: T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function unique(values: string[]) {
  return [...new Set(values)].filter(Boolean);
}
