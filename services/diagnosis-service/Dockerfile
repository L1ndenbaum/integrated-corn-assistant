# syntax=docker/dockerfile:1.5
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ARG MODEL_URL=https://github.com/L1ndenbaum/integrated-corn-assistant/releases/download/model-v1/corn_disease_model_20251004_183823.pth

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

RUN curl -L --retry 3 --retry-delay 2 "$MODEL_URL" -o /app/corn_disease_model_20251004_183823.pth

COPY . ./

EXPOSE 8085
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8085"]
