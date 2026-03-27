# ── Stage 1: Build frontend ────────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/Fronend
COPY Fronend/package.json Fronend/package-lock.json ./
RUN npm ci
COPY Fronend/ ./
RUN npm run build

# ── Stage 2: Python backend + built frontend ──────────────────────────
FROM python:3.10-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-build /app/Fronend/dist /app/Fronend/dist

EXPOSE 5000
ENV PORT=5000
ENV FLASK_DEBUG=false

CMD ["python", "app.py"]
