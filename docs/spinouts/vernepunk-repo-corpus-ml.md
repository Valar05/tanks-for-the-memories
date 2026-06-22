# Vernepunk Spinout: Repo, Corpus, and ML Plan

## Trigger Thought

WWII tanks are analog machines. The interesting substrate may not be WWII specifically. It may be human crews operating dangerous analog machines under uncertainty.

Synthesis:

> The Black Company as written by a real Jules Verne corpus, in game form.
>
> Not WWII.
>
> Vernepunk.

## Core Reframe

Tanks for the Memories discovered a transferable system:

- crew simulation
- human vision limits
- observer-sourced awareness
- analog machinery
- logistics
- fatigue
- reports
- misidentification
- memory reconstruction
- mission journals

WWII tanks are one expression of that system. Vernepunk may be the more elastic fictional form.

## Keep Tanks Separate

Do not mutate Tanks for the Memories into Vernepunk.

Tanks remains the WWII life-and-command simulation corpus.

Vernepunk becomes a separate project that inherits transferable doctrines:

- crew simulation
- battlefield / expedition awareness
- analog machine procedures
- report latency
- memory reconstruction
- doctrine-first corpus building

## Proposed New Repo

Recommended repo name:

`vernepunk`

Working description:

> Jules Verne expedition fiction as crew simulation: analog machines, unreliable reports, expedition journals, impossible engineering, and company-scale survival.

## Creative North Star

Not generic steampunk.

Not brass goggles.

Not Victorian cosplay.

**Vernepunk** means engineering romance under pressure:

- machines are built from physical principles
- crews matter more than heroes
- exploration is dangerous labor
- reports are partial and delayed
- machines have personality through failure modes
- journals preserve reality after the mission distorts it

## Black Company Ingredient

The Black Company contribution is not its IP.

The reusable pattern is:

- military memoir voice
- professional exhaustion
- company continuity
- grim humor
- camp life
- roster attrition
- logistical consequence
- unreliable narrator records
- veterans adapting to weird events like they are Tuesday's maintenance ticket

Vernepunk version:

A wandering expedition company of engineers, surveyors, mechanics, divers, aeronauts, cartographers, medics, natural philosophers, laborers, and machine crews.

## Corpus Plan

The corpus should support three layers.

### 1. Jules Verne / Scientific Romance Corpus

Targets:

- Jules Verne public-domain novels
- H. G. Wells where appropriate
- early scientific romance
- expedition fiction
- Victorian engineering accounts
- polar, submarine, balloon, volcano, and lost-world narratives

Extraction focus:

- machine descriptions
- expedition logistics
- crew roles
- observational language
- danger escalation
- scientific explanations
- journal/register style
- analog instrumentation

### 2. Real Engineering / Exploration Corpus

Targets:

- steam engineering manuals
- early submarines
- airships and balloons
- tunneling and mining machines
- railroads and armored trains
- polar expeditions
- naval logs
- bridge, boiler, diving, survey, and telegraph manuals

Extraction focus:

- failure modes
- maintenance rituals
- crew procedures
- safety constraints
- instrumentation limits
- repair improvisation
- fuel/water/pressure/heat constraints

### 3. Company Memoir / Campaign Corpus

Targets:

- military memoirs
- expedition journals
- ship logs
- field reports
- after-action reports
- explorer diaries

Extraction focus:

- narrator voice
- roster changes
- morale
- camp routine
- rumors
- report chains
- uncertainty
- local tactical judgment

## ML / Retrieval Plan

Start with retrieval, not model training.

### Phase 1: Corpus Ingestion

Each source becomes structured markdown plus metadata:

```yaml
source:
  title:
  author:
  year:
  public_domain: true/false
  domain: fiction | manual | journal | report
  tags:
  reliability:
  extraction_targets:
```

### Phase 2: Distillation Cards

Every useful excerpt becomes a card:

```yaml
card:
  type: machine | procedure | voice | hazard | observation | logistics | doctrine
  source:
  evidence:
  game_use:
  mechanics:
  confidence:
```

### Phase 3: Embedding Index

Build a searchable retrieval layer over:

- sources
- distillation cards
- doctrine
- character/company notes
- machine grammar
- mission templates

Search questions:

- "How should a boiler failure feel in play?"
- "What does a Verne-style machine description sound like?"
- "What crew roles belong on a tunneling ironclad?"
- "What does unreliable expedition reporting look like?"

### Phase 4: Judgment Layer

Use WWDD/artificial-continuity style retrieval:

- retrieve relevant doctrine
- retrieve source-backed examples
- infer mechanics
- label confidence
- write implementation handoff

Training/fine-tuning only comes later, if retrieval hits limits.

## First Repo Skeleton

Recommended files:

```text
README.md
REPO_DOCTRINE.md
CORPUS_MANIFEST.md
/docs/doctrine/vernepunk-core.md
/docs/doctrine/company-journal-voice.md
/docs/doctrine/analog-machine-simulation.md
/docs/doctrine/expedition-awareness.md
/corpus/README.md
/corpus/sources/
/corpus/distillations/
/ml/README.md
/ml/schema/source.schema.json
/ml/schema/distillation-card.schema.json
/ml/prompts/corpus-extractor.md
/ml/prompts/mechanic-distiller.md
/ml/prompts/retrieval-judge.md
/game/README.md
```

## Smallest Useful Prototype

Do not build the whole world.

Build one scene:

**The expedition company's land engine hears something beneath the ice.**

Systems tested:

- crew roles
- analog instruments
- observer-sourced awareness
- uncertainty
- machine procedure
- journal voice
- player decision under incomplete information

Acceptance criteria:

- At least one machine has crew stations.
- At least one observation arrives through an instrument or crew member.
- The report has confidence/uncertainty.
- The player chooses a procedure, not a magical action.
- The journal records what happened afterward.

## Doctrine Seed Quote

> The machine is analog. The memory is human. The truth arrives late.

## Next Action

Create the Vernepunk repo, seed the doctrine/corpus/ml skeleton, then point Codex at `REPO_DOCTRINE.md` before any implementation.
