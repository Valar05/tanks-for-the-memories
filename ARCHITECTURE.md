# Architecture

## Loop

Information -> Order -> Consequence -> Memory

## Systems

- Command parser accepts typed commands first and optional speech later.
- Orders are queued and executed against the platoon state machine.
- The information ledger stores reports with id, type, source, subject, approximate position, confidence, created time, and expiry time.
- Hidden contacts only become known through report generation or line of sight.
- Failure produces an after-action report and restarts the checkpoint.

## Views

- Hatch open: broad outside awareness, more exposed.
- Buttoned up: narrower and safer.
- Gunner scope: tight forward focus.
- Map / report: tactical board with uncertainty and report timing.

## Runtime pieces

- src/main.ts builds the Three.js bocage lane, the command HUD, the report ledger, the map/report board, and the tank command model.
- src/styles.css handles the field-log visual language and responsive panels.
- scripts/smoke.mjs validates the repo shape and source markers before a real build.
