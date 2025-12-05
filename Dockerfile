# Dockerfile para despliegue en Coolify
FROM node:20-alpine AS base

# Instalar dependencias necesarias para build
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Imagen de producción
FROM node:20-alpine AS production

WORKDIR /app

# Copiar solo lo necesario para producción
COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

# Exponer puerto
EXPOSE 5000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5000

# Comando de inicio
CMD ["npm", "run", "start"]




