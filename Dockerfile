# Root Dockerfile — Cloud Run target for Firebase Hosting /api rewrite.
# Same image as backend/Dockerfile; kept at root so `gcloud run deploy --source .`
# picks it up automatically.
FROM node:20-slim
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && (npm ci || npm install) --no-audit --no-fund
COPY backend ./backend
COPY data ./data
WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
