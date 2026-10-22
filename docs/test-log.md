# Test log

Recorded development checks. Formal criteria and evaluation results are in
[evaluation.md](evaluation.md). These are historical results, not a fresh test run.

## Automated results

Recorded on 9 October 2026 at code checkpoint `970e2c2`.

| Check | Result | Coverage |
| --- | --- | --- |
| Jest | 54 cases passed | Domain rules, workflows, ViewModels, Home, category preview and navigation |
| Personal SQLite | 9 checks passed | Category reuse, persistence, guarded writes, reflection integrity and rollback |
| Publisher source | 2 checks passed | Dataset integrity and comparison with the pinned export |
| Bible integration | Passed | Bundled database ordering, passage resolution, empty text and invalid selections |
| TypeScript, Expo lint and Prettier | Passed | Types and source consistency |

Commands are in the [README](../README.md#checks). Tests focus on core workflows
and realistic failures; they do not cover every timing race or damaged database.

## Installed-app checks

These checks used release builds on emulator C (Android 13/API 33), without Metro.

| Check | Recorded result | Evidence |
| --- | --- | --- |
| Feature checks, 2-6 October | Scripture browsing/lookup, validation, draft preservation, editing, deletion and reflection were checked offline. Some checks used prepared test records. | [Feature captures](evidence/) |
| Category reuse, 6 October | Prepared Carries supplied reflection history. A reflection entered through the form became the latest category insight and survived reboot. | [Category captures](evidence/category-reflection/) |
| Integrated workflow, 8 October (`f14047e`) | Full offline loop, edited reminder delivery/tapping, reflection, reuse and restart persistence passed. A separate deletion check retained the category and cancelled its alarm. | [Workflow captures](evidence/full-loop/) |
| Home, 9 October (`970e2c2`) | Offline launch, New Carry, Save/Cancel, Back navigation and draft preservation passed. Home refreshed after creation/deletion and retained groups after app restart. | [Home captures](evidence/home/) |

The integrated run used airplane mode with Wi-Fi off, real scheduled waits and
form entries, not inserted reflections or clock changes. An edited reminder
replaced its old alarm; the replacement appeared within the project timing window
and opened the correct Carry.

## Reminder trial times

Developer-reported reminder-trial times on emulator C.

| Trial | Situation time | Expected reminder time | Recorded notification arrival time |
| --- | --- | --- | --- |
| 1 | 14:15 | 14:00 | 14:00 |
| 2 | 14:20 | 14:05 | 14:05 |
| 3 | 14:25 | 14:10 | 14:11 |
| 4 | 14:30 | 14:15 | 14:15 |
| 5 | 14:35 | 14:20 | 14:20 |
| 6 | 14:40 | 14:25 | 14:26 |
| 7 | 14:45 | 14:30 | 14:30 |
| 8 | 14:50 | 14:35 | 14:35 |
| 9 | 14:55 | 14:40 | Not recorded |
| 10 | 15:00 | 14:45 | 14:46 |

## Evidence limits

- Earlier documented reminder delivery/tapping preceded Home.
- Permission-denial handling has automated coverage. The earlier native-log entry
  lacks trial details, so it is not counted as a documented native pass.
- Controlled failures and prepared records are not native fault-injection or
  independent user-test evidence. No full privacy or no-transmission assessment
  was completed.
- Later multi-device, participant and interface results are in
  [evaluation.md](evaluation.md), not part of these development checkpoints.

Earlier build troubleshooting and detailed check histories remain in Git history.
