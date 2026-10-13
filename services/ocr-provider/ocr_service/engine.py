from __future__ import annotations

import os
from typing import Any

from .contract import normalize_results


class PpOcrEngine:
    def __init__(self) -> None:
        from paddleocr import PaddleOCR

        threads = max(1, min(4, int(os.getenv("OCR_CPU_THREADS", "2"))))
        self._pipeline = PaddleOCR(
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name="latin_PP-OCRv5_mobile_rec",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            device="cpu",
            cpu_threads=threads,
            enable_mkldnn=False,
            engine="paddle",
        )

    def recognize(self, image: Any) -> dict[str, Any]:
        return normalize_results(self._pipeline.predict(image))
