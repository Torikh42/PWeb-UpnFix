# ==============================================================
# Stage 1: Builder
# Menginstall dependensi dan membuild aplikasi Next.js
FROM node:20-alpine AS base

WORKDIR /app

# Copy package files dan install dependencies
COPY package*.json ./
RUN npm install

# Copy seluruh source code
COPY . .

# Build Next.js (gunakan npx next build langsung untuk bypass
# flag --turbopack yang hanya valid di mode development)
RUN npx next build

# ==============================================================
# Stage 2: Runner
# Image production yang ringan, hanya berisi artefak build
# ==============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment ke production
ENV NODE_ENV=production

# Copy file konfigurasi
COPY --from=base /app/package*.json ./
COPY --from=base /app/jsconfig.json ./jsconfig.json
COPY --from=base /app/next.config.mjs ./next.config.mjs

# Copy node_modules, hasil build, asset publik, dan source
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/src ./src

# Copy scripts (untuk init-db.js saat entrypoint)
COPY --from=base /app/scripts ./scripts

# Expose port Next.js
EXPOSE 3000

# Jalankan server Next.js production
CMD ["npm", "start"]
