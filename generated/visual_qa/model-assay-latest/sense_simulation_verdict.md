# Model Assay Visual QA Verdict

Status: red build

Capture:

- Report: `visual_qa_report.json`
- Contact sheet: `contact_sheet.jpg`
- Frames: `frame_000.png` through `frame_007.png`
- Build: `tftm-model-assay-sherman-trapezoid-20260704`

Sense simulation read:

- Barrel attachment still does not convincingly read as a cannon seated in a turret/mantlet socket.
- Barrel verticality is not strong enough as an acceptance signal from the sampled frames.
- Tread still reads as a dark rounded or one-sided ribbon under the hull rather than a Sherman-like trapezoid track volume with readable side/back thickness.
- Captured frames prove the visual QA harness works; they do not prove visual acceptance.

Wake gate:

Do not wake the user for review from this artifact. The next wake requires a fresh visual QA capture whose contact sheet passes the barrel socket and trapezoid tread relationship checks in `docs/doctrine/cloud-visual-truth.md`.
