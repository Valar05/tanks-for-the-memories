# Scratch Mode

Scratch mode is an opt-in local exploration lane for fast model and artifact learning.
It exists for prompts where the user wants Codex to try something, keep the attempt, take notes, and learn from the result without turning the pass into production acceptance work.

## Trigger

Scratch mode starts only when the newest user command explicitly says `scratch mode` or clearly asks for local scratch exploration.

If the newest user command does not invoke scratch mode, the normal project rules still apply: prompt authority, cloud visual truth for acceptance, and the relevant model/material gates.

## Operating Contract

In scratch mode, Codex should:

- follow the newest user prompt directly
- create new scratch artifacts or revisions instead of overwriting accepted assets silently
- keep failed attempts unless the user explicitly asks for cleanup
- take brief notes about the prompt, the artifact, what changed, what failed, and what was learned
- provide a local/manual review URL when a browser surface exists
- label outputs as `scratch`, `experimental`, or equivalent

Scratch mode is allowed to skip cloud gates, Sense Simulation review, and unit-test-suite ritual for that pass.
This is not because those gates are unimportant; it is because scratch mode is not an acceptance lane.

## What Scratch Mode Cannot Claim

Scratch mode cannot claim an artifact is accepted, production-ready, visually validated, or complete through local review alone.

Allowed language:

- `scratch build`
- `manual review build`
- `experimental artifact`
- `local sanity check passed`
- `this taught us X`

Forbidden language:

- `accepted`
- `visually validated`
- `cloud green`
- `production-ready`
- `done` when the result is judged by visuals and has not gone through the accepted lane

## Checks

Scratch mode may run light sanity checks when they help avoid useless handoffs:

- file exists and can be read back
- exporter completed
- GLB or generated asset parses
- local route or server responds
- notes were written

Do not turn scratch mode into a unit-test campaign unless the user asks for that. Tests and validators are optional diagnostics, not entry fees.

## Preservation Rule

Do not delete old scratch attempts, failed models, generated references, manifests, or notes during scratch mode unless the user explicitly asks for deletion or cleanup.

When a scratch result is bad, preserve it as evidence and write down why it failed. The point is to learn faster without hiding the trail.

## Promotion Rule

A scratch artifact can inform a later production pass, but it must be promoted deliberately.

Promotion requires a new user command or plan that names the artifact to promote and switches back to the normal acceptance workflow for whatever kind of asset it is. Until then, scratch artifacts remain local experimental evidence.
