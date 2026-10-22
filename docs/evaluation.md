# System evaluation

Methods, results and evidence status for report Section 4. Earlier development
checks are in the [test log](test-log.md). All results below are recorded evidence;
this documentation cleanup did not rerun tests.

## Criteria from Milestone 1

| ID | Requirements | Pass condition |
| --- | --- | --- |
| RUN-01 | FR-02, FR-05, FR-06; NFR-03 | At least four of five first-time users create and reflect unaided within three minutes per task, identify cue/action and find the latest reflection. |
| RUN-02 | NFR-04 | Touch areas at least 48 by 48 dp; contrast at least 4.5:1 for normal text or 3:1 for large text. |
| PHY-01 | FR-01 to FR-06; NFR-01, NFR-02, NFR-05 | Functions work offline; data survives app/device restarts; no personal data is transmitted. |
| PHY-02 | FR-03, FR-04; NFR-06 | At least nine of ten reminders arrive 15 to 5 minutes before the situation; permission denial disables only reminders and shows feedback. |
| PHY-03 | FR-01 to FR-06; NFR-07 | Core lifecycle works in portrait on four planned emulator configurations and one physical device, without functional failure, clipping or horizontal scrolling. |

The timing and reminder totals are project targets, not industry standards.

## Participant results

Classmates tested creation, reflection and category-based retrieval remotely.
The [blank sheet](user-testing.docx) requested completion, help, problems,
[SEQ ease ratings](https://measuringu.com/evolution-of-seq/) (1 difficult to 7 easy)
and optional times. Timing included app entry, not installation, waiting or sheet completion.

[De-identified records](evidence/participants/README.md) link the complete sheets
and separate researcher clarifications. P01, P03 and P05 returned answers; P02
consented but installation was blocked. P04 showed app use but returned no sheet.
All four records describe first-time users; none fully matched the target group.

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

- Outcomes and times are self-reported; NM means not measured. Eight of nine
  task entries were marked complete. No app-task results are assigned to P02/P04.
- P03 later saved a Carry while moving to task 2, then completed reflection and
  retrieval. His initial No remains; no retry time was recorded.
- P01 reported help for all tasks despite listing no problems. Follow-up concerned
  reflection entry and the sheet; exact assistance per task is unclear.
- P01 requested clearer reminder feedback and more colour; P03 suggested first-use
  tips; P05 suggested no change. A form-first flow is a developer proposal, not a
  cause demonstrated by the sheets. Proposed changes are not implemented or retested.

## Interface checks

Home, creation and reflection were reviewed on Carry 1.0.0, emulator C
(Android 13, portrait, 412 by 915 dp). The review used status-feedback and
error-recovery heuristics, empty submissions, and normal/150% system text.
Native clickable bounds were divided by 4 at 640 dpi; contrast used source colour pairs.

### Touch measurements

| Control | Native bounds (px) | Clickable area (dp) |
| --- | --- | --- |
| New Carry | [80,824][1568,1032] | 372 by 52 |
| Category name | [80,992][1568,1184] | 372 by 48 |
| Choose date | [80,3056][800,3312] | 180 by 64 |
| Save Carry | [852,3244][1568,3452] | 179 by 52 |
| Reflection rating 1 | [80,1568][352,1760] | 68 by 48 |
| Save reflection | [852,3152][1568,3360] | 179 by 52 |

All six normal-text samples met 48 by 48 dp. Controls were fully scrolled into view;
measurements describe their clickable areas, not just icons or labels.

### Text contrast

| Foreground / background | Ratio | Normal-text result |
| --- | --- | --- |
| #111111 / #ffffff | 18.883061:1 | Pass |
| #555555 / #ffffff | 7.455178:1 | Pass |
| #333333 / #ffffff | 12.634654:1 | Pass |
| #777777 / #ffffff (placeholder) | 4.478089:1 | Fail |
| #8a1c1c / #ffffff (error) | 9.277568:1 | Pass |
| #ffffff / #111111 (button) | 18.883061:1 | Pass |

Unrounded values determine the 4.5:1 result. The [calculation script](evidence/interface-2026-10-22/check_contrast.py)
and [full-precision results](evidence/interface-2026-10-22/contrast-results.json) are retained.

### Observations and captures

- Empty forms showed field-specific errors without saving incomplete records.
  One labelled fictional Carry enabled reflection inspection; no reflection was saved.
- At 150% text, fields and save controls remained reachable by scrolling. The
  Scripture heading and Change passage action crowded their row; Save reflection
  wrapped to two lines in a 179 by 72 dp button.
- Stacking the crowded row and darkening placeholders are future work, not retested fixes.
  This sampled review did not cover TalkBack, landscape or every screen/state.

[Validation capture](evidence/interface-2026-10-22/reflection-validation-top.png) |
[Enlarged-text capture](evidence/interface-2026-10-22/create-large-middle-verified.png) |
[All screenshots and measurement files](evidence/interface-2026-10-22/)

Existing records were not edited or deleted; network and permission settings were
unchanged. Text size was restored to normal ([restoration record](evidence/interface-2026-10-22/font-restoration.json)).

## Device checks

A/B/D checks used fictional records in portrait at default text size on 11 October.
The sequence was Scripture selection, creation/reopening, waiting for Ready,
reflection, Completed history and latest-reflection reuse in a cancelled draft.

| Device | Configuration | Recorded result | Captures |
| --- | --- | --- | --- |
| A | API 24, 320 by 568 dp, x86 | Core loop and reference lookup passed; saved Carry survived relaunch. | [A](evidence/compatibility/carry-a-api24/) |
| B | API 31, 360 by 640 dp, x86_64 | Core loop passed; saved Carry survived relaunch. | [B](evidence/compatibility/carry-b-api31/) |
| C | API 33, 412 by 915 dp, x86_64 | Earlier offline loop, editing/deletion, reminder delivery/tapping and app/device restarts recorded. | [Test log](test-log.md) |
| D | API 36, 600 by 960 dp, x86_64 | Core loop passed; completed Carry and reflection survived reboot. | [D](evidence/compatibility/carry-d-api36/) |
| Physical phone | Redmi Note 13 Pro 5G, Android 16, HyperOS 3.0.302 | Successful use reported; exact build, steps and persistence trial not documented. | No formal trial |

No crashes, horizontal scrolling or blocking clipping were observed in the sampled
A/B/D screens. D's reboot capture retains the diagnostic overlay. A used an x86
release rebuild; B/D reused the x86_64 release. Network/permission settings were
unchanged; these compatibility runs did not verify deliberate offline operation
or reminder delivery. Earlier C reminder checks preceded Home.

## Criteria status

| Criterion | Status and reason |
| --- | --- |
| RUN-01 | Not established: three returned sheets, assistance and an installation block do not demonstrate four of five unaided completions. |
| RUN-02 | Not met in sampled screens: touch areas passed, but placeholder contrast was below 4.5:1. Enlarged-text crowding also needs refinement. |
| PHY-01 | Partial: offline/restart evidence exists; full offline/privacy and no-transmission assessment was not completed. |
| PHY-02 | Not established: delivery/tapping was demonstrated, but ten-trial reliability and Home-build rechecks were not completed. Native permission denial is not established by the retained records; automated coverage is recorded in the test log. |
| PHY-03 | Partial: four emulator configurations have checks; reported phone use is not a documented physical-device trial. |

Uncompleted checks are future evaluation work, not scheduled trials or passes.
Short sessions and a non-target sample cannot establish longer-term usefulness.

## Method sources

- [Unmoderated usability testing](https://www.nngroup.com/articles/unmoderated-usability-testing/)
- [Heuristic evaluation procedure](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/) and [Nielsen's heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Android touch targets](https://support.google.com/accessibility/android/answer/7101858?hl=en-GB)
- [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
