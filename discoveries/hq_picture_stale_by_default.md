# Discovery: HQ picture is stale by default

## Discovery
Higher headquarters should never see a live map. Their picture is an accumulation of late, scattered, filtered reports.

## Historical Evidence
- source_library/03_cross-channel-attack-ch9.md:16-21 - supply shortfalls and late reports blocked a clean breakout.
- source_library/04_utah-beach-to-cherbourg-carentan.md:16-21 - artillery communications were unavailable and some men never received the order.

## Why It Matters
This justifies an information-lag layer in the command tree and prevents the player from assuming HQ has perfect strategic knowledge.

## Simulation Variable
- Name: `hq_picture_freshness`
- Definition: How current the highest command picture is relative to ground truth.
- Range: 0-100
- Related: `report_delay`, `report_accuracy`

## Mechanic Candidate
Delayed command map with stale-state propagation.

## Pressure System Impact
Decision quality drops when the command picture falls behind reality.

## Confidence
- 0.95

## Sources
- source_library/03_cross-channel-attack-ch9.md
- source_library/04_utah-beach-to-cherbourg-carentan.md

## Tags
- pressure, command, information
