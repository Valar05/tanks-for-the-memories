# Tanks for the Memories

Static first playable: a text and Cartesia-read audio game about conducting a Churchill AVRE breach through other people's hands.

## Current Slice

The playable surface is one Royal Engineers operation in a Churchill AVRE. The player is not the driver, gunner, radio operator, or a detached tactical cursor. The player speaks or types operational intent, and the bounded radio command organ routes valid commands to the capable recipient.

Incomprehensible input is radio silence: no action, no acknowledgement, no invented correction, and no relationship mutation.

## Run

```sh
npm install
npm run smoke
npm run dev
```

## Commands

- `report`
- `driver advance`
- `driver halt`
- `square us to the wall`
- `infantry hold`
- `gunner fire petard at the seam`
- `sappers inspect the breach`
- `engineers mark the lane`

Typed commands and browser speech recognition use the same compiler. Runtime does not use an LLM or autonomous agent.

## Audio

Authored text is canonical and visible. Cartesia audio is generated during development and served as static WAV files from `public/audio/`.

```sh
CARTESIA_API_KEY='...' CARTESIA_VOICE_ID='...' npm run audio:generate
```

If `CARTESIA_VOICE_ID` is omitted, the generator uses the temporary repo-default British voice `ef191366-f52f-447a-a398-ed8c0f2943a1`. Never commit credentials.

## Deployment

GitHub Pages is configured through `.github/workflows/pages.yml`. Repository Pages settings must use GitHub Actions as the source. Do not merge or treat production Pages as authorized until Drew approves.

## Doctrine

See [REPO_DOCTRINE.md](./REPO_DOCTRINE.md) and [AVRE Radio Command Organ](./docs/doctrine/avre-radio-command-organ.md).
