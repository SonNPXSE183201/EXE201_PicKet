# syntax=docker/dockerfile:1
FROM python:3.11-slim-bookworm

ARG PRELOAD_MODELS=1
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=1

WORKDIR /app
RUN apt-get update \
    && apt-get install --no-install-recommends -y libgomp1 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 picket

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir --retries 10 --timeout 120 \
      paddlepaddle==3.3.1 \
    && python -m pip install --no-cache-dir --retries 10 --timeout 120 \
      -r requirements.txt

ENV OMP_NUM_THREADS=1 \
    OCR_CPU_THREADS=2

COPY --chown=picket:picket ocr_service ./ocr_service
USER picket
RUN if [ "$PRELOAD_MODELS" = "1" ]; then python -m ocr_service.preload; fi

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "ocr_service.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
