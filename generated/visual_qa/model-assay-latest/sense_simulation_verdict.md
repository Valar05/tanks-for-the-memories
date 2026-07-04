# Model Assay Visual QA Verdict

Status: captured red build for the previous no-socket assay; current socketed assay is deployed but not visually captured.

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

Current breaker action:

- Generated a new Meshy `sherman_mantlet_socket_v1` asset to attack the barrel-seat failure.
- Wired it as a separate Meshy mantlet/socket part sharing the gun elevation pivot with the barrel.
- Rebuilt and deployed the cloud packet with the socketed build token `tftm-model-assay-socketed-trapezoid-20260704a`.

Current capture blocker:

- Local visual QA now fails before capture with `no-browser-requests`; Chrome does not request the temporary local URL.
- Programmatic `screencap` failed with `Capturing failed`.
- This means the current socketed build is not visually accepted or rejected by fresh pixels yet.

Wake gate:

Do not wake the user for review from this artifact. The next wake requires a fresh capture of the current socketed cloud build whose contact sheet or screenshot passes the barrel socket and trapezoid tread relationship checks in `docs/doctrine/cloud-visual-truth.md`.
