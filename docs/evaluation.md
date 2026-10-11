# System evaluation

Evaluation in progress; participant trials and reminder reliability testing
remain pending. Earlier feature checks are in
[test-log.md](test-log.md), not participant results. The report summarises
findings in Section 4 and criteria in Appendix A. Keep that summary updated
when results are added here; Markdown is not automatically imported into LaTeX.

## Criteria from Milestone 1

| ID | Requirements | Pass condition | Current evidence |
| --- | --- | --- | --- |
| RUN-01 | FR-02, FR-05, FR-06; NFR-03 | At least four of five first-time users create and reflect unaided within three minutes per task, identify cue/action and find the latest reflection. | Participant testing pending. |
| RUN-02 | NFR-04 | Interactive areas at least 48 by 48 dp; text contrast at least 4.5:1 for normal text or 3:1 for large text. | Measurements pending. |
| PHY-01 | FR-01 to FR-06; NFR-01, NFR-02, NFR-05 | Functions work offline; data survives app/device restarts; no personal data is transmitted. | API 33 offline/restart checks exist; privacy evidence is limited. |
| PHY-02 | FR-03, FR-04; NFR-06 | At least nine of ten reminders appear 15 to 5 minutes before the situation; permission denial disables only reminders and shows feedback. | Representative checks exist; ten-trial test pending. |
| PHY-03 | FR-01 to FR-06; NFR-07 | Core lifecycle works in portrait on four planned emulator configurations and one physical device, without functional failure, clipping or horizontal scrolling. | API 24, 31 and 36 portrait loops and earlier API 33 checks recorded; phone use reported by the developer. Formal coverage remains partial because the phone build and exact trial steps were not recorded. |

The three-minute and nine-of-ten targets are project thresholds, not universal
standards. DEV/LOG and SCN-01's diagram comparison belong in report Section 3;
the executed lifecycle remains functional evidence here.

## Procedures

### Participant tasks - RUN-01

- Retain the original five-user target. Availability may be limited to three;
  record the actual sample and target-group fit, not a four-of-five pass.
- Confirm course recruitment arrangements and consent before starting. Use
  anonymous IDs and fictional scenarios; do not publish names, consent forms
  or personal reflection answers.
- Pilot a 10-15-minute session. Do not count a trained/pilot participant as a
  new first-time user in later trials.
- Tasks: create a Carry and identify its cue/action; reflect on a prepared
  Ready Carry; retrieve its category's latest reflection in a new draft.
- Give goals, not interface instructions. Time each task after its scenario is
  understood; record completion, seconds, help and errors. Help means the
  attempt was not unaided. Retrieval has no three-minute pass limit.
- End with a brief ease rating and comments. Prepared records test the
  reflection interface, not real reminder delivery or elapsed-time transitions.

### Interface inspection - RUN-02 and usability findings

- Review Home, Scripture, forms, detail and reflection against Nielsen's ten
  heuristics. Record the screen, heuristic, observation, task impact and change.
- This is a developer-led review, not an independent expert panel. It does
  not replace user testing.
- Measure touch areas in dp, including usable padding. Record foreground and
  background colours, font size/weight and calculated contrast. Inspect enlarged
  text and clipping separately. These checks do not establish full WCAG compliance.

### Operational trials - PHY-01 to PHY-03

- Record build, device/API, initial data, radio/permission settings and steps.
- Offline: compare saved values before and after app/device restarts. Record
  the network-inspection method and limits; no recorded traffic alone is not
  proof of no attempted connections.
- Reminders: record ten situation times, intended reminder times and observed
  arrivals, plus permission denial. Distinguish arrival from when it was noticed.
- Compatibility: run the portrait core lifecycle on API 24, 31, 33 and 36
  emulators and the planned API 36 physical phone. Log each configuration's
  result separately. These trials do not require participants.

## Results

Add one record per task, measurement or trial using this format:

```text
Criterion / trial / anonymous participant ID if applicable:
Build / device / conditions:
Steps and expected result:
Observed result and measurements:
Evidence link:
Conclusion: pending / partial / pass / fail
Issue, change and retest if applicable:
```

Summarise completion/time/help by participant, reminder successes out of ten,
accessibility measurements and device outcomes. Distinguish observed failures
from incomplete coverage. Compare user findings with inspection findings;
record fixes and retests, or explain unresolved issues.

### Physical phone - developer-reported use

- Reported on 11 October: Redmi Note 13 Pro 5G, Android 16, HyperOS 3.0.302.
- The developer reported that the app works fine on this phone.
- Build, exact steps and measurements were not recorded. This is preliminary
  evidence, not a complete PHY-03 pass or a participant-testing result.

### Carry A - portrait core-loop check

- Checked on 11 October: API 24, 320 by 568 dp, mdpi, x86.
- Carry was not installed. The original release APK supports API 24 but
  contains only x86_64 native libraries, which do not match this emulator.
- Initial x86 rebuilds failed because of Windows path length and Expo
  autolinking under a drive-root mapping. Mapping the parent directory so
  the project was at `R:\Carry` allowed the offline release build to succeed.
- Gradle reported `BUILD SUCCESSFUL in 1m 47s`. APK metadata confirms x86
  native libraries, minimum API 24 and package `com.eirikenriquez.carry`.
  The 36,655,513-byte APK is saved at
  `.expo/compat-a-preserved/app-release-x86-20261011.apk` (local, ignored).
- Installation on `emulator-5554` returned `Success`. The original x86_64 APK
  was preserved and the temporary drive mapping removed; no app code,
  configuration or dependencies were changed.

#### Observed trial

- Build: x86 release APK above; SHA-256
  `853F20F54167977D8C86FD1D685430437A4C213C92B95C72C3A9CBABC5411C80`.
  Portrait, default text size; no network, permission or clock settings changed.
- Home launched without a crash. Book/chapter browsing reached Genesis 43;
  selecting verses 1-2 displayed the matching passage preview and opened the form.
- Saved one synthetic Carry in category `Compatibility A check`, situation
  `A fictional meeting leaves me tense.`, with plan
  `If I feel tense, then I will pause and listen.` and situation time
  11 October, 3:32 PM as displayed by the emulator. Detail values matched.
- Saving near the situation time showed that it was too close for a 15-minute
  reminder. No reminder was linked; delivery was not tested.
- Closed Carry's task from Android recent apps and relaunched from its icon.
  The record remained. After the scheduled time passed naturally, Home and
  detail showed `Ready to reflect`; no clock or database shortcut was used.
- Saved a reflection with alignment 4/5, response
  `Synthetic check: I paused and listened.` and insight
  `Synthetic check: pausing helped me respond calmly.` Detail showed the
  matching values and `Completed`; Home listed it in Completed history.
- Opened `John 3:16` through reference navigation. In a new draft, selecting
  the existing category displayed the saved rating, response and insight in
  the latest-reflection preview. Left this second draft unsaved and returned Home.
- No crash, horizontal scrolling or blocking clipping was observed in these
  screens. Vertical scrolling reached the lower controls. The keyboard covered
  lower form content while open, but Android Back dismissed it without leaving
  the form and retained entered text. Initial automated missed clicks were not
  treated as app defects; the main agent completed the save/reopen checks.
- Conclusion: the tested portrait core loop passed on A. Overall PHY-03 remains
  partial; the phone's exact build and trial steps were not recorded. Reminder arrival, device
  reboot, deliberate offline/network checks, enlarged text and measured
  accessibility remain untested in this trial. This was not participant testing.
- One completed synthetic Carry and reflection remain on A; no existing data
  was deleted. Original captures remain in the ignored local folder
  `.expo/compat-a-evidence-20261011-root/`. Repository copies:
  [saved Carry](evidence/compatibility/carry-a-api24/saved-carry.jpg),
  [saved reflection](evidence/compatibility/carry-a-api24/saved-reflection.jpg)
  and [latest reflection](evidence/compatibility/carry-a-api24/latest-reflection-preview.jpg).

### Carry B - portrait core-loop check

- Checked on 11 October: `Carry_B_API31`, API 31, x86_64,
  720 by 1280 px at 320 dpi (360 by 640 dp), portrait, default text size.
- Reused the preserved x86_64 release APK without rebuilding. SHA-256
  `8445AA351FE36715807752072A5768B461141688A7CFEBF50A63FCE6C7A4C559`
  matched; installation on `emulator-5554` returned `Success` without clearing data.
- Home and New Carry opened. Book-based navigation reached Genesis 1;
  selecting verse 1 showed the matching preview, and Use in a Carry opened
  the creation form with that passage. No crash or blocking clipping was
  observed in these screens.
- Initial automated entry intended as `John 3:16` produced only `v`; Ctrl+A
  appended `a`. Continuing with individual unmodified letter keys worked.
  This was an automation/input limitation, not a confirmed app defect.
- Saved a synthetic Carry: category `btestt`, situation `test`, Genesis 1:1,
  plan `if tense then pause`, scheduled for 11 October at 3:57 PM as displayed
  by the emulator. Closed its task through Android recent apps and relaunched;
  Home retained the record and displayed the matching values.
- After the situation time passed naturally, reopening at 3:58 PM showed
  `Ready to reflect` on Home and detail. Detail stated that no reminder was
  linked; the initial save feedback said it was too close for a 15-minute
  reminder. No clock or database shortcut was used.
- Saved a synthetic reflection with alignment 4/5, response `paused` and insight
  `stay calm`. Detail showed `Completed` and matching values. A new Genesis 1:1
  draft using the `btestt` category chip showed the same latest reflection,
  dated 11 October at 4:04 PM as displayed by the emulator.
- Cancelled the second draft without saving it and returned Home. The single
  test Carry appeared in Completed history; Upcoming and Ready were empty.
- Conclusion: the tested portrait core loop passed on B, with no observed crash,
  horizontal scrolling or blocking clipping. Overall PHY-03 remains partial;
  the phone's exact build and trial steps were not recorded. Reminder arrival,
  offline/network checks, device reboot and measured accessibility remain
  untested here. The reference shortcut was not retested after the input issue;
  the successful trial used book/chapter navigation. This was not participant testing.
- One completed synthetic Carry and reflection remain on B. No existing data
  was deleted and no app code, settings or Git state was changed.
- Repository screenshots: [saved detail](evidence/compatibility/carry-b-api31/saved-detail.jpg)
  and [saved reflection](evidence/compatibility/carry-b-api31/saved-reflection.jpg).
  Originals and the additional passage/form captures remain in the ignored
  local folder `.expo/compat-b-evidence-20261011-root/`.

### Carry D - portrait core-loop check

- Checked on 11 October: `Carry_D_API36`, API 36, x86_64,
  1200 by 1920 px at 320 dpi (600 by 960 dp), portrait.
- Reused the preserved x86_64 release APK without rebuilding. SHA-256
  `8445AA351FE36715807752072A5768B461141688A7CFEBF50A63FCE6C7A4C559`
  matched; installation on `emulator-5554` returned `Success` without clearing data.
- Portrait, default text size; no network, permission or clock settings changed.
- Home opened. Book/chapter browsing reached Genesis 1; selecting verse 1
  showed its passage preview and opened the creation form.
- Saved one synthetic Carry: category `dtes`, situation `test`, Genesis 1:1,
  plan `If tense then pause`, scheduled for 11 October at 8:55 PM as displayed
  by the emulator. Detail showed the matching values. Save feedback stated
  that it was too close for a 15-minute reminder; no reminder was linked.
- Reopened Carry from the launcher and confirmed the record remained. This
  resumed the app, not a confirmed process restart. After the situation time
  passed naturally, detail showed `Ready to reflect`; no clock or database
  shortcut was used.
- Saved a reflection with alignment 4/5, response `paused` and insight
  `Stay calm`. Detail showed `Completed` and matching values. A new Genesis 1:1
  draft using the existing `dtes` category chip showed the same latest
  reflection, dated 11 October at 8:56 PM as displayed by the emulator.
- Left the second draft unsaved and returned Home. The single test Carry
  appeared in Completed history; Upcoming and Ready were empty.
- Restarted the verified `Carry_D_API36` emulator using ADB, observed its boot
  screen and relaunched Carry from the Android launcher. Home still showed one
  Completed record. Detail retained the passage, category, situation, plan,
  schedule, rating, response and insight recorded above.
- Conclusion: the tested portrait core loop and device-restart persistence
  check passed on D. No crash, horizontal scrolling or app-content clipping was
  observed on the screens checked. The keyboard/input overlay temporarily
  covered content during entry. Reminder arrival, deliberate offline/network
  checks, enlarged text and measured accessibility remain untested here.
  This was not participant testing or a complete formal NFR evaluation.
- One completed synthetic Carry and reflection remain on D; no existing data
  was deleted. Repository screenshots: [saved detail](evidence/compatibility/carry-d-api36/saved-detail.jpg),
  [saved reflection](evidence/compatibility/carry-d-api36/saved-reflection.jpg),
  [latest reflection](evidence/compatibility/carry-d-api36/latest-reflection-preview.jpg)
  and [after reboot](evidence/compatibility/carry-d-api36/restart-persistence.jpg).
  The emulator's diagnostic overlay is visible in the reboot capture; the
  original was not edited. Originals remain in `.expo/compat-d-evidence-20261011/` (local, ignored).

## Sources

- [NN/g task-based usability testing](https://www.nngroup.com/articles/usability-testing-101/): observed tasks, completion/time and feedback.
- [NN/g heuristic evaluation](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/), using [Nielsen's heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): structured interface inspection; solo review is a limitation.
- [Android touch targets](https://support.google.com/accessibility/android/answer/7101858?hl=en-GB): 48 by 48 dp interactive areas.
- [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4.5:1 normal text and 3:1 large text.
