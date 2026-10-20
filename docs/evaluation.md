# System evaluation

Evidence for report Section 4 and Appendix A. Earlier development checks are in
[test-log.md](test-log.md). Developer checks are not participant results.

## Criteria from Milestone 1

| ID | Requirements | Pass condition |
| --- | --- | --- |
| RUN-01 | FR-02, FR-05, FR-06; NFR-03 | At least four of five first-time users create and reflect unaided within three minutes per task, identify cue/action and find the latest reflection. |
| RUN-02 | NFR-04 | Touch targets at least 48 by 48 dp; text contrast at least 4.5:1 for normal text or 3:1 for large text. |
| PHY-01 | FR-01 to FR-06; NFR-01, NFR-02, NFR-05 | Functions work offline; data survives app/device restarts; no personal data is transmitted. |
| PHY-02 | FR-03, FR-04; NFR-06 | At least nine of ten reminders appear 15 to 5 minutes before the situation; permission denial disables only reminders and shows feedback. |
| PHY-03 | FR-01 to FR-06; NFR-07 | Core lifecycle works in portrait on four planned emulator configurations and one physical device, without functional failure, clipping or horizontal scrolling. |

The three-minute and nine-of-ten targets are project thresholds.
Architecture and development-process reflection belong in report Section 3.

## Methods

### User tasks — planned

Use the [editable Word testing sheet](user-testing.docx) for prompts and session records.

Version 2 clarifies instructions and questions without changing the task goals or
SEQ scale. Record which version each participant used and any clarification given.
Keep original responses when transferring answers to the revised sheet.

- Recruit classmates through the course consent process. Use participant labels
  and fictional situations. Record first use and optional target-group fit.
- Participants independently create a Carry, reflect after its scheduled time,
  then find that category's latest reflection while preparing another Carry.
- Completion, help and problems are self-reported. After each attempt, use the
  [SEQ](https://measuringu.com/evolution-of-seq/) from 1 (very difficult) to
  7 (very easy). Screenshots are not required.
- Stopwatch timing is optional. Include entering information in Carry. Exclude
  installation, waiting between tasks and completing the sheet. Leave unmeasured
  times missing. Help means the attempt was not unaided.
- Keep RUN-01's original thresholds, but do not claim an independently verified
  pass from self-reports. Participants outside the target group limit conclusions
  about target-user usability. Keep pilot/repeat results separate.

### Interface inspection — planned

- Review Home, Scripture, forms, detail and reflection using Nielsen's heuristics.
  Record the screen, issue, task impact, proposed fix and retest.
- Measure touch areas, colours/contrast and font size/weight; check enlarged text
  and clipping. This is a developer review, not an independent expert panel or
  a full WCAG assessment.

### Device checks

A/B/D checks ran on 11 October 2026, in portrait at default text size,
using fictional records. Network and permission settings were unchanged.

Shared core-loop steps:

1. Browse Scripture, select verses and check the preview.
2. Save a Carry with a category, situation, future schedule and if-then plan.
3. Reopen Carry and check the saved values.
4. After the situation time passes naturally, check Ready to reflect.
5. Save a 4/5 reflection; check its values and Completed history.
6. Reuse the category in a new draft, check its latest reflection, then cancel.

Offline trials must compare stored values before/after app and device restarts,
with network conditions and inspection limits recorded. Reminder trials must
record ten situation times, intended reminder times and observed arrivals,
plus permission denial. These are separate from the core-loop checks below.

## Results

### Device checks

| Device | Configuration | Result | Persistence check |
| --- | --- | --- | --- |
| Carry A | API 24, 320 × 568 dp, x86 | Tested core loop passed; reference lookup also checked. | Saved Carry survived closing the task and relaunching. |
| Carry B | API 31, 360 × 640 dp, x86_64 | Tested core loop passed using book/chapter navigation. | Saved Carry survived closing the task and relaunching. |
| Carry C | API 33, earlier checks | Offline loop, editing/deletion and reminder delivery/tapping recorded in the [test log](test-log.md). Reminders pre-date Home. | App/device restart checks recorded. |
| Carry D | API 36, 600 × 960 dp, x86_64 | Tested core loop passed using book/chapter navigation. | Completed Carry and reflection survived an emulator reboot. |
| Physical phone | Redmi Note 13 Pro 5G; Android 16; HyperOS 3.0.302 | Developer reported successful use on 11 October. Exact build and trial steps were not recorded. | Not documented. |

- No crash, horizontal scrolling or blocking clipping was observed on the A/B/D
  screens checked. Dismissible keyboard overlays covered lower content during entry.
- A/B/D schedules were too close for a 15-minute reminder. Save feedback was
  checked, but reminder delivery and deliberate offline operation were not.

### Screenshot evidence

| Device | Captures |
| --- | --- |
| A | [Saved Carry](evidence/compatibility/carry-a-api24/saved-carry.jpg), [reflection](evidence/compatibility/carry-a-api24/saved-reflection.jpg), [latest reflection](evidence/compatibility/carry-a-api24/latest-reflection-preview.jpg) |
| B | [Saved detail](evidence/compatibility/carry-b-api31/saved-detail.jpg), [reflection](evidence/compatibility/carry-b-api31/saved-reflection.jpg) |
| D | [Saved detail](evidence/compatibility/carry-d-api36/saved-detail.jpg), [reflection](evidence/compatibility/carry-d-api36/saved-reflection.jpg), [latest reflection](evidence/compatibility/carry-d-api36/latest-reflection-preview.jpg), [after reboot](evidence/compatibility/carry-d-api36/restart-persistence.jpg) |

D's reboot capture includes the emulator's diagnostic overlay; it is unedited.

### Tested builds

A used an x86 release rebuild; B/D reused the preserved x86_64 release APK.

## Remaining work and limits

- **RUN-01:** participant trials pending. Record actual sample and target-group fit;
  fewer than five users cannot establish the original four-of-five condition.
- **RUN-02:** heuristic review, touch/contrast measurements and enlarged-text checks pending.
- **PHY-01:** full offline/privacy assessment pending; earlier API 33 checks and
  D reboot persistence are partial evidence, not proof of no transmission.
- **PHY-02:** ten-reminder reliability trial, native denial outcome and Home-build
  reminder delivery/tapping recheck pending.
- **PHY-03:** emulator evidence recorded; a documented phone trial is still needed.
- Record each issue, chosen fix and retest as evaluation continues; update report
  Section 4 and Appendix A. Markdown changes do not update LaTeX automatically.

## Sources

- [Task-based usability testing](https://www.nngroup.com/articles/usability-testing-101/)
- [Heuristic evaluation](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/) and [Nielsen's heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Android touch targets](https://support.google.com/accessibility/android/answer/7101858?hl=en-GB)
- [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
