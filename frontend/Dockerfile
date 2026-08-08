# syntax=docker/dockerfile:1.7

# Etapa 1: compilacion.
# Copiar primero los manifiestos permite que npm ci quede cacheado mientras no cambien
# las dependencias.
FROM node:26-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: servicio de los archivos estaticos.
FROM nginx:alpine AS runtime

LABEL org.opencontainers.image.title="frontend" \
      org.opencontainers.image.description="Interfaz de pedidos" \
      org.opencontainers.image.version="1.0.0"

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

# El builder de Angular emite en dist/<proyecto>/browser.
COPY --from=builder /build/dist/frontend/browser/ /usr/share/nginx/html/

# nginx:alpine trae el usuario nginx sin privilegios. Necesita escribir en estos directorios.
RUN sed -i -e 's|^pid .*|pid /tmp/nginx.pid;|' -e '/^user /d' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /etc/nginx/conf.d

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
