FROM node:20-alpine AS deps
WORKDIR /app
COPY react/package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ARG API_BACKEND_URL=http://app:80
ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:8080
ARG NEXT_PUBLIC_ADMIN_HOST=admin.localhost
ARG NEXT_PUBLIC_JITSI_DOMAIN=calls.disroot.org
ENV API_BACKEND_URL=$API_BACKEND_URL
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN
ENV NEXT_PUBLIC_ADMIN_HOST=$NEXT_PUBLIC_ADMIN_HOST
ENV NEXT_PUBLIC_JITSI_DOMAIN=$NEXT_PUBLIC_JITSI_DOMAIN
COPY --from=deps /app/node_modules ./node_modules
COPY react/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_BACKEND_URL=http://app:80
ENV NEXT_PUBLIC_API_ORIGIN=http://localhost:8080
ENV NEXT_PUBLIC_ADMIN_HOST=admin.localhost
ENV NEXT_PUBLIC_JITSI_DOMAIN=calls.disroot.org
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]