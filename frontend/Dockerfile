# build stage
FROM node:20-slim AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend ./frontend
ENV VITE_API_URL=/api
RUN npm run build

# serve with nginx; /api proxied to the backend container
FROM nginx:1.27-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
