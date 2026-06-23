export type AwarenessStatus = 'suspected-armor' | 'confirmed-armor';
export type AwarenessResolutionKind = 'false-positive' | 'misidentification' | 'underestimation';

export type AwarenessSighting = {
  observer: string;
  sourceUnit: string;
  time: number;
  label: string;
  confidence: number;
  confirmed?: boolean;
};

export type AwarenessContact = {
  id: number;
  observer: string;
  sourceUnit: string;
  label: string;
  status: AwarenessStatus;
  confidence: number;
  firstSeenAt: number;
  lastSeenAt: number;
  revealShown: boolean;
  resolvedAt: number | null;
  resolutionKind: AwarenessResolutionKind | null;
  realityLabel: string | null;
  realityReport: string | null;
  notes: string[];
};

export type AwarenessState = {
  version: 1;
  nextContactId: number;
  lastRevealAt: number | null;
  contacts: AwarenessContact[];
};

export type AwarenessTransition = {
  contact: AwarenessContact;
  created: boolean;
  statusChanged: boolean;
  shouldReveal: boolean;
  revealText: string;
  reportSubject: string;
  chipText: string;
  resolutionText?: string;
};

export function createAwarenessState(): AwarenessState {
  return {
    version: 1,
    nextContactId: 1,
    lastRevealAt: null,
    contacts: []
  };
}

export function cloneAwarenessState(state: AwarenessState): AwarenessState {
  return {
    version: 1,
    nextContactId: state.nextContactId,
    lastRevealAt: state.lastRevealAt,
    contacts: state.contacts.map(cloneContact)
  };
}

export function recordEnemyTankContact(state: AwarenessState, sighting: AwarenessSighting): AwarenessTransition {
  const created = state.contacts.length === 0;
  const contact = created ? createContact(state, sighting) : state.contacts[0];
  if (!contact) {
    throw new Error('awareness contact creation failed');
  }
  const previousStatus = contact.status;

  contact.label = sighting.label;
  contact.lastSeenAt = sighting.time;
  contact.confidence = clamp(Math.max(contact.confidence, sighting.confidence), 0, 1);
  contact.status = sighting.confirmed || contact.confidence >= 0.82 ? 'confirmed-armor' : 'suspected-armor';
  contact.notes.push(buildObservationNote(sighting, contact.status));
  while (contact.notes.length > 6) {
    contact.notes.shift();
  }

  const shouldReveal = !contact.revealShown;
  if (shouldReveal) {
    contact.revealShown = true;
    state.lastRevealAt = sighting.time;
  }

  const reportSubject = contact.status === 'confirmed-armor'
    ? 'Confirmed armor spotted by ' + sighting.observer + ' at ' + sighting.label
    : 'Suspected armor spotted by ' + sighting.observer + ' at ' + sighting.label;

  return {
    contact: cloneContact(contact),
    created,
    statusChanged: previousStatus !== contact.status,
    shouldReveal,
    revealText: buildRevealText(sighting, contact.status),
    reportSubject,
    chipText: buildChipText(contact)
  };
}

export function resolveEnemyPicture(state: AwarenessState, input: {
  observer: string;
  sourceUnit: string;
  time: number;
  kind: AwarenessResolutionKind;
  realityLabel: string;
  consequence: string;
}): AwarenessTransition {
  const contact = state.contacts[0];
  if (!contact) {
    throw new Error('awareness contact resolution failed');
  }

  contact.resolvedAt = input.time;
  contact.resolutionKind = input.kind;
  contact.realityLabel = input.realityLabel;
  contact.realityReport = input.consequence;
  contact.lastSeenAt = input.time;
  contact.notes.push(buildResolutionNote(input, contact));
  while (contact.notes.length > 6) {
    contact.notes.shift();
  }

  return {
    contact: cloneContact(contact),
    created: false,
    statusChanged: false,
    shouldReveal: true,
    revealText: input.observer + ' proves the picture wrong: ' + input.realityLabel + '.',
    reportSubject: 'Reality resolved by ' + input.observer + ': ' + input.realityLabel,
    chipText: buildChipText(contact),
    resolutionText: input.consequence
  };
}

export function getPrimaryContact(state: AwarenessState) {
  return state.contacts[0] ? cloneContact(state.contacts[0]) : null;
}

function createContact(state: AwarenessState, sighting: AwarenessSighting): AwarenessContact {
  const status: AwarenessStatus = sighting.confirmed || sighting.confidence >= 0.82 ? 'confirmed-armor' : 'suspected-armor';
  const contact: AwarenessContact = {
    id: state.nextContactId++,
    observer: sighting.observer,
    sourceUnit: sighting.sourceUnit,
    label: sighting.label,
    status,
    confidence: clamp(sighting.confidence, 0, 1),
    firstSeenAt: sighting.time,
    lastSeenAt: sighting.time,
    revealShown: false,
    resolvedAt: null,
    resolutionKind: null,
    realityLabel: null,
    realityReport: null,
    notes: [buildObservationNote(sighting, status)]
  };
  state.contacts = [contact];
  return contact;
}

function buildObservationNote(sighting: AwarenessSighting, status: AwarenessStatus) {
  return sighting.observer + ' reported ' + status.replace('-', ' ') + ' from ' + sighting.sourceUnit + ' at ' + sighting.label + '.';
}

function buildResolutionNote(input: {
  observer: string;
  sourceUnit: string;
  time: number;
  kind: AwarenessResolutionKind;
  realityLabel: string;
  consequence: string;
}, contact: AwarenessContact) {
  return input.observer + ' corrected ' + contact.observer + "'s picture from " + contact.status.replace('-', ' ') + ' to ' + input.realityLabel + ' (' + input.kind + ').';
}

function buildRevealText(sighting: AwarenessSighting, status: AwarenessStatus) {
  return sighting.observer + ' sees ' + status.replace('-', ' ') + ' at ' + sighting.label + '.';
}

function buildChipText(contact: AwarenessContact) {
  const base = contact.observer + ' · ' + contact.status.replace('-', ' ') + ' · ' + Math.round(contact.confidence * 100) + '%';
  if (contact.realityLabel) {
    return base + ' → ' + contact.realityLabel;
  }
  return base;
}

function cloneContact(contact: AwarenessContact): AwarenessContact {
  return {
    id: contact.id,
    observer: contact.observer,
    sourceUnit: contact.sourceUnit,
    label: contact.label,
    status: contact.status,
    confidence: contact.confidence,
    firstSeenAt: contact.firstSeenAt,
    lastSeenAt: contact.lastSeenAt,
    revealShown: contact.revealShown,
    resolvedAt: contact.resolvedAt,
    resolutionKind: contact.resolutionKind,
    realityLabel: contact.realityLabel,
    realityReport: contact.realityReport,
    notes: [...contact.notes]
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
