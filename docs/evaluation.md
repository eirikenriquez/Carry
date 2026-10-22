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

### Task-based user testing

Use the [editable Word testing sheet](user-testing.docx) for prompts and session records.

The de-identified [response records and complete answers](evidence/participants/README.md)
retain submitted task outcomes and separate follow-up clarifications. Original
private records are retained outside the repository.

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

### Interface inspection

- The review sampled Home, creation and reflection on Carry C, using Nielsen's
  status-feedback and error-recovery heuristics. Empty-form submissions checked
  validation; normal and 150% system text checked reachability and layout.
- Native UIAutomator bounds were converted from pixels to dp using the configured
  density. Source colour pairs supplied unrounded WCAG contrast calculations.
  [Captures, measurements and calculation](evidence/interface-2026-10-22/README.md)
  record the method and findings. This is a developer review, not an independent
  expert panel or full accessibility assessment.

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

### Participant tasks

P01, P03 and P05 returned sheets. P02 consented but could not install the APK
because Samsung Auto Blocker blocked it; all tasks were not attempted. P04
showed the app in use but did not return a sheet, so no task results are assigned.
All four written records describe first-time users, none with full target-group
fit. P05 is Christian but aged 30, outside the planned 18–29 range.

| ID | Task | Completed | Help | SEQ / 7 | Time (s) |
| --- | --- | --- | --- | --- | --- |
| P01 | Create | Yes | Yes | 7 | 10 |
| P01 | Reflect | Yes | Yes | 6 | 5 |
| P01 | Retrieve | Yes | Yes | 7 | 30 |
| P03 | Create | No | No | 3 | NM |
| P03 | Reflect | Yes | No | 6 | 37 |
| P03 | Retrieve | Yes | No | 6 | 25 |
| P05 | Create | Yes | No | 6 | 180 |
| P05 | Reflect | Yes | No | 7 | 180 |
| P05 | Retrieve | Yes | No | 7 | 20 |

These are self-reports; NM means not measured. Eight of nine entries were marked
completed. P03 later saved a Carry while moving to task 2, then completed tasks 2
and 3, as clarified by the researcher. His original unsuccessful result is kept;
the retry has no recorded time. P01's Help entries remain Yes despite a problems
response of None. Follow-up questions concerned reflection entry and the sheet's
wording. These records do not establish the four-of-five unaided RUN-01 condition.

P01 requested a more prominent reminder warning and more colour. P03 suggested
first-use tips; P05 suggested no change. Clearer first-use guidance, a form-first
creation flow and reminder feedback are proposed improvements, not implemented
or retested fixes. The creation-flow proposal is an interpretation of the feedback,
not a cause demonstrated by the task sheets.

### Interface findings

- Sampled touch areas met 48 by 48 dp: New Carry 372 by 52 dp, category input
  372 by 48 dp and reflection ratings 68 by 48 dp. The evidence log lists all six samples.
- Empty creation and reflection submissions showed field-specific errors without
  saving incomplete records. One labelled fictional Carry enabled reflection-form
  inspection; no reflection was saved.
- Fields and save controls remained reachable at 150% text. The creation form's
  Scripture heading and Change passage action crowded the right edge. Stacking
  this row as text grows is future work.
- Normal-state placeholder text (#777777 on white) measured 4.478089:1, below
  RUN-02's 4.5:1 threshold. Other sampled pairs met it. RUN-02 is not met in the
  sampled screens; a darker placeholder colour and enlarged-text layout fix
  remain future work. No full accessibility pass is claimed.

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

## Criteria status and limits

| Criterion | Evidence status |
| --- | --- |
| RUN-01 | Not established. Three returned task sheets, reported assistance and one installation block do not demonstrate four of five unaided users meeting every condition. |
| RUN-02 | Not met in the sampled screens. Touch samples met 48 dp; placeholder contrast was below 4.5:1. Enlarged-text crowding also warrants refinement. |
| PHY-01 | Partial evidence. Earlier API 33 offline/restart checks and D reboot persistence were recorded; a full offline/privacy assessment was not completed. No-transmission is not established. |
| PHY-02 | Not established. Earlier reminder delivery/tapping was checked. Ten-trial reliability, native permission denial and Home-build delivery/tapping recheck were not completed. |
| PHY-03 | Partial evidence. Four emulator configurations have recorded checks; phone use was reported without a documented trial. The full criterion is not established. |

The uncompleted technical checks are future evaluation work, not scheduled trials
or successful results. Proposed changes need implementation and retesting before
their effects can be assessed. The small, non-target sample and self-reported
outcomes limit usability conclusions. These sessions do not establish long-term
use or spiritual benefit.

## Sources

- [Task-based usability testing](https://www.nngroup.com/articles/usability-testing-101/)
- [Heuristic evaluation](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/) and [Nielsen's heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Android touch targets](https://support.google.com/accessibility/android/answer/7101858?hl=en-GB)
- [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
