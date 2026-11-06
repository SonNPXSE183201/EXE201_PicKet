from __future__ import annotations

import asyncio
import hmac
import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated, Any

import numpy as np
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile, status
from PIL import UnidentifiedImageError

from .engine import PpOcrEngine
from .images import decode_receipt_image

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp"}
logger = logging.getLogger("picket.ocr")


def _provider_token() -> str:
    token = os.getenv("OCR_PROVIDER_TOKEN", "").strip()
    if len(token) < 32:
        raise RuntimeError("OCR_PROVIDER_TOKEN must contain at least 32 characters.")
    return token


def _decode_image(data: bytes) -> np.ndarray[Any, Any]:
    try:
        return decode_receipt_image(data, MAX_IMAGE_PIXELS)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        if str(error) == "IMAGE_TOO_LARGE":
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "IMAGE_TOO_LARGE") from error
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "INVALID_IMAGE") from error



@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.provider_token = _provider_token()
    app.state.inference_gate = asyncio.Semaphore(1)
    app.state.engine = await asyncio.to_thread(PpOcrEngine)
    yield


app = FastAPI(
    title="Picket private OCR provider",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "model": "PP-OCRv5-mobile-vi"}


@app.post("/predict")
async def predict(
    file: Annotated[UploadFile, File()],
    language: Annotated[str, Form()] = "vi,en",
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    expected = f"Bearer {app.state.provider_token}"
    if authorization is None or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED")
    if file.content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_IMAGE_TYPE")
    if "vi" not in {part.strip().lower() for part in language.split(",")}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "UNSUPPORTED_LANGUAGE")

    data = await file.read(MAX_IMAGE_BYTES + 1)
    await file.close()
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "EMPTY_IMAGE")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "IMAGE_TOO_LARGE")
    image = await asyncio.to_thread(_decode_image, data)

    try:
        async with app.state.inference_gate:
            return await asyncio.to_thread(app.state.engine.recognize, image)
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("OCR inference failed")
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "OCR_INFERENCE_FAILED",
        ) from error
