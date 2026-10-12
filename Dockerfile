# ── Stage 1: Build React frontend ──
FROM node:20-alpine AS frontend-build

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build


# ── Stage 2: Install Python dependencies ──
FROM python:3.11-slim AS python-deps

WORKDIR /deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 3: Final image ──
FROM python:3.11-slim

# Install Nginx
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/nginx/sites-enabled/default

# Copy Python packages
COPY --from=python-deps /install /usr/local

# Copy backend source
COPY backend/ /app/backend/

# Copy built frontend to Nginx html dir
COPY --from=frontend-build /build/dist /usr/share/nginx/html

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and prepare entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
