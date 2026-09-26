FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite bakes VITE_* vars into the bundle at build time. Written from build
# args rather than copying .env.prod so unrelated secrets in that file never
# enter an image layer.
ARG VITE_ENV
ARG VITE_LOG_LEVEL
ARG VITE_GATEWAY_URL
ARG VITE_UMAMI_SCRIPT_URL
ARG VITE_UMAMI_WEBSITE_ID
RUN printf 'VITE_ENV=%s\nVITE_LOG_LEVEL=%s\nVITE_GATEWAY_URL=%s\nVITE_UMAMI_SCRIPT_URL=%s\nVITE_UMAMI_WEBSITE_ID=%s\n' \
	"$VITE_ENV" "$VITE_LOG_LEVEL" "$VITE_GATEWAY_URL" "$VITE_UMAMI_SCRIPT_URL" "$VITE_UMAMI_WEBSITE_ID" > .env.prod

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
