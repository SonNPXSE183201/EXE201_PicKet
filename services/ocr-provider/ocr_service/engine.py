from __future__ import annotations

import os
from typing import Any

from .contract import normalize_results


def _flag(name: str) -> bool:
    return os.getenv(name, "0").strip().lower() in {"1", "true", "yes"}


class PpOcrEngine:
    def __init__(self) -> None:
        from paddleocr import PaddleOCR

        threads = max(1, min(4, int(os.getenv("OCR_CPU_THREADS", "2"))))
        self._pipeline = PaddleOCR(
            # Model names and preprocessing switches are env-tunable so candidates
            # can be benchmarked on the Bill corpus without a code change.
            text_detection_model_name=os.getenv("OCR_DET_MODEL", "PP-OCRv5_mobile_det"),
            text_recognition_model_name=os.getenv("OCR_REC_MODEL", "latin_PP-OCRv5_mobile_rec"),
            use_doc_orientation_classify=_flag("OCR_DOC_ORIENTATION"),
            use_doc_unwarping=_flag("OCR_DOC_UNWARPING"),
            use_textline_orientation=_flag("OCR_TEXTLINE_ORIENTATION"),
            device="cpu",
            cpu_threads=threads,
            enable_mkldnn=False,
            engine="paddle",
        )

    def recognize(self, image: Any) -> dict[str, Any]:
        return normalize_results(self._pipeline.predict(image))
