from __future__ import annotations

from collections.abc import Iterable, Mapping
from math import isfinite
from typing import Any

MAX_RAW_TEXT_CHARS = 32_000
MAX_LINES = 160
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
            lines.append(
                {
                    "text": text,
                    "confidence": confidence,
                    "box": _plain(box),
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
