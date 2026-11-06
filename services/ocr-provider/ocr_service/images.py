"""Bounded image decoding shared by the private OCR endpoint and tests."""
from io import BytesIO
import numpy as np
from PIL import Image, ImageOps


def decode_receipt_image(data: bytes, max_pixels: int) -> np.ndarray:
    with Image.open(BytesIO(data)) as image:
        if image.width * image.height > max_pixels:
            raise ValueError("IMAGE_TOO_LARGE")
        image.load()
        upright = ImageOps.exif_transpose(image)
        rgb = upright.convert("RGB")
        # PaddleOCR expects BGR, not RGB. No lossy re-encoding is needed.
        return np.asarray(rgb)[:, :, ::-1].copy()
