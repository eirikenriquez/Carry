# Carry interface checks — 22 October 2026

Developer-led checks for report Section 4.3, not participant outcomes or a full accessibility audit. No app source was changed.

## Configuration and method

- Existing Carry_C_API33 emulator, serial emulator-5554, Android 13 / API 33.
- Installed package com.eirikenriquez.carry, versionName 1.0.0, versionCode 1, lastUpdateTime 2026-10-09 12:15:29.
- Portrait display 1648 × 3660 px at 640 dpi, equivalent to 412 × 915 dp. Divide native pixel bounds by 4 to obtain dp.
- UIAutomator XML, native screenshots and source inspection. Normal and 1.5 system font scale. Source colour definitions were used for contrast calculations, with unrounded ratios compared against 4.5:1.
- Review focused on feedback and error recovery, along with selected touch areas, normal-state text contrast and enlarged-text layout. No screen-reader, disabled-state, landscape or app-wide compliance claim.

## Measured normal-text touch areas

| Screen / control | Native bounds (px) | Interactive area (dp) |
| --- | --- | --- |
| Home / New Carry | [80,824][1568,1032] | 372 × 52 |
| Creation / Category name | [80,992][1568,1184] | 372 × 48 |
| Creation / Choose date | [80,3056][800,3312] | 180 × 64 |
| Creation / Save Carry | [852,3244][1568,3452] | 179 × 52 |
| Reflection / Rating 1 | [80,1568][352,1760] | 68 × 48 |
| Reflection / Save reflection | [852,3152][1568,3360] | 179 × 52 |

These sampled areas meet 48 × 48 dp. Partially offscreen controls were scrolled fully into view before measuring. Dimensions are not inferred from icon/text size alone.

## Contrast samples

| Foreground / background | Ratio | 4.5:1 result |
| --- | --- | --- |
| #111111 / #ffffff | 18.883061 | Pass |
| #555555 / #ffffff | 7.455178 | Pass |
| #333333 / #ffffff | 12.634654 | Pass |
| #777777 / #ffffff — placeholders | 4.478089 | Fail |
| #8a1c1c / #ffffff — errors | 9.277568 | Pass |
| #ffffff / #111111 — primary button | 18.883061 | Pass |

Definitions are in src/screens/CarryFormScreen.tsx, src/components/carry-form/CarryCategoryField.tsx, src/components/carry-form/CarryPassageField.tsx, src/screens/ReflectionFormScreen.tsx and related screen styles. Calculation script and full-precision results are retained with the captures.

## Observations

- An empty creation form showed field-specific errors and did not create a record.
- At 1.5 font scale, creation fields and Save/Cancel remained reachable by scrolling.
- The enlarged creation form's Scripture row crowded the action against the right edge. The heading occupied [80,656][908,800], while Change passage occupied [940,632][1648,824]. The intended right content edge was x=1568. Proposed change: wrap or stack the row.
- Proposed contrast/layout fixes were not implemented or retested.
- The reflection form displayed the saved fictional situation and plan, a labelled required alignment scale and required prompts for what happened and what was learned. Empty Save showed “Choose an alignment rating.”, “Describe what happened.” and “Add an insight.” field errors. No reflection was saved.
- At 1.5 font scale, reflection inputs and Save/Cancel remained reachable by scrolling. Save reflection wrapped onto two lines inside its 179 × 72 dp button ([852,3164][1568,3452]).

## Test data and restoration

One new fictional Carry was saved through the normal UI and is retained: **Interface review only - fictional**, category **Interface check**, Genesis 1:1, plan **If rushed then I will pause**, scheduled for 22 October 2026 at 1:46 pm emulator local time. The prior completed **Offline loop check** record was not edited or deleted. No clock, radio, network or notification permission settings were changed. Reflection inspection does not count as a completed participant task or reminder reliability test.

The original system font setting was unset/default. Android normalised restoration to explicit 1.0, which is the equivalent normal size. See font-restoration.json.

The final normal-text Home capture retains the fictional Carry under Ready to reflect and the original Offline loop check under Completed. The reflection remains unsaved.

## Capture provenance

This folder contains selected native screenshots, UIAutomator XML and JSON control summaries from the interface check, plus the contrast calculation and font-restoration records. Capture names distinguish normal text, enlarged text and validation feedback. Loading-state and misdirected navigation captures are excluded. No screenshots are participant task evidence.

Run the contrast calculation from the repository root with `python docs/evidence/interface-2026-10-22/check_contrast.py`. It reads the documented source colour pairs and writes `contrast-results.json`; it does not operate the app. Source files are under `src/` in this repository. The results are bounded to the sampled colours and native control areas, not an app-wide accessibility certification.
