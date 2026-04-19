# Stage 1: Build
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:20-slim
WORKDIR /app

# Copiar solo lo necesario para producciÃ³n
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY server.js ./

# Escuchar en el puerto provisto por la variable de entorno
ENV PORT=8080
EXPOSE $PORT

# El entrypoint coincide con nuestro archivo principal de inicio
CMD ["node", "server.js"]
