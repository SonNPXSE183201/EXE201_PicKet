from __future__ import annotations

from collections.abc import Iterable, Mapping
from math import isfinite
from typing import Any

MAX_RAW_TEXT_CHARS = 32_000
# Bound the response while allowing long multi-item receipts to retain their
# spatial rows. 20 MP is the input pixel ceiling; 1,000 text regions is a
# generous output ceiling for that image size without permitting unbounded JSON.
MAX_LINES = 1000
MAX_LINE_CHARS = 500


def _plain(value: Any) -> Any:
    if hasattr(value, "tolist"):
        return value.tolist()
    return value


def _result_payload(result: Any) -> Mapping[str, Any]:
    if isinstance(result, Mapping):
        value: Any = result
    else:
        value = getattr(result, "json", {})
        if callable(value):
            value = value()
    if not isinstance(value, Mapping):
        return {}
    nested = value.get("res")
    return nested if isinstance(nested, Mapping) else value


def normalize_results(results: Iterable[Any]) -> dict[str, Any]:
    lines: list[dict[str, Any]] = []
    for result in results:
        payload = _result_payload(result)
        texts = _plain(payload.get("rec_texts", []))
        scores = _plain(payload.get("rec_scores", []))
        polygons = _plain(payload.get("rec_polys", []))
        if not isinstance(texts, list):
            continue
        for index, raw_text in enumerate(texts):
            if len(lines) >= MAX_LINES:
                break
            text = str(raw_text).strip()[:MAX_LINE_CHARS]
            if not text:
                continue
            score = scores[index] if isinstance(scores, list) and index < len(scores) else 0
            try:
                confidence = float(score)
            except (TypeError, ValueError):
                confidence = 0.0
            if not isfinite(confidence):
                confidence = 0.0
            confidence = min(1.0, max(0.0, confidence))
            box = polygons[index] if isinstance(polygons, list) and index < len(polygons) else []
            box = _plain(box)
            if not isinstance(box, list):
                box = []
            # Keep only finite numeric coordinate pairs. Paddle returns a
            # quadrilateral for detected text regions, while older/partial
            # engine results may omit geometry entirely.
            points: list[list[float]] = []
            for point in box:
                if not isinstance(point, (list, tuple)) or len(point) != 2:
                    continue
                try:
                    x, y = float(point[0]), float(point[1])
                except (TypeError, ValueError):
                    continue
                if isfinite(x) and isfinite(y):
                    points.append([x, y])
            lines.append(
                {
                    "text": text,
                    "confidence": confidence,
                    "box": points,
                }
            )

    raw_text = "\n".join(line["text"] for line in lines)[:MAX_RAW_TEXT_CHARS]
    confidence = (
        sum(line["confidence"] for line in lines) / len(lines) if lines else 0.0
    )
    return {
        "rawText": raw_text,
        "merchant": None,
        "amount": None,
        "date": None,
        "confidence": confidence,
        "lines": lines,
    }
