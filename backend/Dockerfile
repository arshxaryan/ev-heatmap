FROM node:20-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci || npm install
COPY backend ./backend
COPY data ./data
WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
