"""Calculate unrounded WCAG contrast ratios for selected normal-state text."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
PAIRS = [
    ("Main text / white", "#111111", "#ffffff"),
    ("Supporting text / white", "#555555", "#ffffff"),
    ("Passage text / white", "#333333", "#ffffff"),
    ("Placeholder text / white", "#777777", "#ffffff"),
    ("Validation error / white", "#8a1c1c", "#ffffff"),
    ("Primary button text / dark fill", "#ffffff", "#111111"),
]


def luminance(color):
    rgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    channels = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    return sum(a * b for a, b in zip(channels, (0.2126, 0.7152, 0.0722)))


results = []
for label, foreground, background in PAIRS:
    bright, dark = sorted((luminance(foreground), luminance(background)), reverse=True)
    ratio = (bright + 0.05) / (dark + 0.05)
    result = {"label": label, "foreground": foreground, "background": background, "ratio": ratio, "normal_text_4_5_pass": ratio >= 4.5}
    results.append(result)
    print(f"{label}: {ratio:.6f}:1, {'PASS' if ratio >= 4.5 else 'BELOW 4.5:1'}")
(ROOT / "contrast-results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
