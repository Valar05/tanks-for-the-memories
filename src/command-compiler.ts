export type CommandAction =
  | 'report'
  | 'advance'
  | 'halt'
  | 'align'
  | 'fire'
  | 'inspect'
  | 'hold-infantry'
  | 'mark-lane';

export type CommandRecipient = 'wireless-operator' | 'driver' | 'gunner' | 'sapper-team' | 'infantry-liaison';
export type CommandRoute = 'intercom' | 'engineer-net' | 'infantry-net';

export type CompiledCommand = {
  action: CommandAction;
  recipient: CommandRecipient;
  route: CommandRoute;
  canonical: string;
};

type RegistryEntry = CompiledCommand & {
  patterns: RegExp[];
};

const REGISTRY: RegistryEntry[] = [
  {
    action: 'report',
    recipient: 'wireless-operator',
    route: 'intercom',
    canonical: 'wireless operator report',
    patterns: [/\breport\b/, /\bstatus\b/, /\bwhat reaches (us|you)\b/],
  },
  {
    action: 'advance',
    recipient: 'driver',
    route: 'intercom',
    canonical: 'driver advance',
    patterns: [/\bdriver\b.*\b(advance|move|forward)\b/, /\b(advance|move|take us|bring us) (up|forward|on)\b/],
  },
  {
    action: 'halt',
    recipient: 'driver',
    route: 'intercom',
    canonical: 'driver halt',
    patterns: [/\bdriver\b.*\b(halt|stop)\b/, /\b(halt|stop)\b/],
  },
  {
    action: 'align',
    recipient: 'driver',
    route: 'intercom',
    canonical: 'driver square us to the wall seam',
    patterns: [/\b(square|align|straighten)\b.*\b(wall|seam|breach)\b/, /\bwall seam\b.*\b(square|align)\b/],
  },
  {
    action: 'fire',
    recipient: 'gunner',
    route: 'intercom',
    canonical: 'gunner fire petard at the seam',
    patterns: [/\bgunner\b.*\bfire\b.*\b(petard|mortar|seam|wall)\b/, /\bfire\b.*\bpetard\b.*\b(seam|wall)\b/],
  },
  {
    action: 'inspect',
    recipient: 'sapper-team',
    route: 'engineer-net',
    canonical: 'sappers inspect the breach',
    patterns: [/\b(sappers|engineers)\b.*\b(inspect|check|look)\b.*\b(breach|gap|wall)\b/],
  },
  {
    action: 'hold-infantry',
    recipient: 'infantry-liaison',
    route: 'infantry-net',
    canonical: 'infantry hold',
    patterns: [/\binfantry\b.*\b(hold|wait|stay)\b/, /\bhold\b.*\binfantry\b/],
  },
  {
    action: 'mark-lane',
    recipient: 'sapper-team',
    route: 'engineer-net',
    canonical: 'sappers mark the safe lane',
    patterns: [/\b(sappers|engineers)\b.*\b(mark|flag|tape)\b.*\b(lane|route|way)\b/, /\bmark\b.*\b(safe )?(lane|route)\b/],
  },
];

const AMBIGUOUS_JOINS = /\b(and|but|then|while|everyone|all crews|both)\b/;
const FILLER_ONLY = /^(please|maybe|uh|um|hello|hey|do it|do the thing|thing|wall|seam|move|fire)$/;

export function normalizeUtterance(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compileCommand(input: string): CompiledCommand | null {
  const normalized = normalizeUtterance(input);
  if (!normalized || FILLER_ONLY.test(normalized) || AMBIGUOUS_JOINS.test(normalized)) return null;

  const matches = REGISTRY.filter((entry) => entry.patterns.some((pattern) => pattern.test(normalized)));
  if (matches.length !== 1) return null;

  const {action, recipient, route, canonical} = matches[0];
  return {action, recipient, route, canonical};
}

export function routeLabel(route: CommandRoute): string {
  if (route === 'intercom') return 'intercom';
  if (route === 'engineer-net') return 'engineer net';
  return 'infantry net';
}
